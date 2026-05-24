"""
Fairness analytics service layer.
Transforms PredictionLog aggregates into enterprise dashboard payloads.
"""

from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database import fairness_queries as fq

from api.fairness_schemas import BiasDriftIndicator
from api.fairness_schemas import FairnessMetricsResponse
from api.fairness_schemas import FairnessTrendPoint
from api.fairness_schemas import FairnessTrendsResponse
from api.fairness_schemas import GenderDistributionItem
from api.fairness_schemas import ProtectedGroupStat
from api.fairness_schemas import RiskByGenderRow
from api.fairness_schemas import SubgroupPositiveRate
from api.fairness_schemas import SubgroupTrendPoint


def _handle_db_error(exc: Exception) -> None:
    raise HTTPException(
        status_code=503,
        detail={
            "error": "fairness_analytics_unavailable",
            "message": "Unable to retrieve fairness analytics from the database.",
            "detail": str(exc),
        },
    ) from exc


def _utc_now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def get_fairness_metrics(db: Session) -> FairnessMetricsResponse:
    try:
        sample_size = fq.count_all_predictions(db)
        pop_rate = fq.population_positive_rate(db)

        gender_rates = fq.fetch_gender_positive_rates(db)
        fairness_gap = fq.compute_fairness_gap(gender_rates)
        parity_score = fq.compute_demographic_parity_score(fairness_gap)

        gender_distribution = [
            GenderDistributionItem(**item)
            for item in fq.fetch_gender_distribution(db)
        ]

        risk_by_gender = [
            RiskByGenderRow(**row)
            for row in fq.fetch_risk_distribution_by_gender(db)
        ]

        protected_stats = [
            ProtectedGroupStat(**stat)
            for stat in fq.fetch_protected_group_statistics(db)
        ]

        # Gender + age subgroup positive rates (Recharts bar comparison)
        gender_subgroups = fq.fetch_subgroup_rates(
            db, fq.gender_label_expr(), "gender"
        )
        age_subgroups = fq.fetch_subgroup_rates(
            db, fq.age_group_expr(), "age"
        )

        subgroup_rates = []
        for item in gender_subgroups + age_subgroups:
            subgroup_rates.append(
                SubgroupPositiveRate(
                    group=item["group"],
                    attribute=item["attribute"],
                    positive_prediction_rate=item["positive_prediction_rate"],
                    count=item["count"],
                    benchmark_rate=pop_rate,
                )
            )

        return FairnessMetricsResponse(
            demographic_parity_score=parity_score,
            fairness_gap=fairness_gap,
            population_positive_rate=pop_rate,
            gender_distribution=gender_distribution,
            risk_distribution_by_gender=risk_by_gender,
            protected_group_statistics=protected_stats,
            subgroup_positive_prediction_rates=subgroup_rates,
            sample_size=sample_size,
            computed_at=_utc_now_iso(),
        )
    except SQLAlchemyError as exc:
        _handle_db_error(exc)


def get_fairness_trends(
    db: Session,
    days: int = 90,
) -> FairnessTrendsResponse:
    try:
        sample_size = fq.count_all_predictions(db)

        metrics_over_time = [
            FairnessTrendPoint(**point)
            for point in fq.fetch_fairness_trends_by_day(db, days=days)
        ]

        subgroup_trends = [
            SubgroupTrendPoint(**point)
            for point in fq.fetch_subgroup_trends_by_day(db, days=days)
        ]

        drift_indicators = [
            BiasDriftIndicator(**item)
            for item in fq.compute_bias_drift_indicators(db)
        ]

        return FairnessTrendsResponse(
            fairness_metrics_over_time=metrics_over_time,
            subgroup_prediction_trends=subgroup_trends,
            bias_drift_indicators=drift_indicators,
            sample_size=sample_size,
            computed_at=_utc_now_iso(),
        )
    except SQLAlchemyError as exc:
        _handle_db_error(exc)
