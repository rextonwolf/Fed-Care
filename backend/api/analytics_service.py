"""
Analytics business logic: aggregates DB metrics into dashboard-ready payloads.
"""

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from database import analytics_queries as aq

from analytics_schemas import SystemMetricsResponse
from analytics_schemas import PredictionAnalyticsResponse
from analytics_schemas import RecentActivityResponse
from analytics_schemas import RiskDistributionItem
from analytics_schemas import BloodPressureAverages
from analytics_schemas import PredictionTrendPoint
from analytics_schemas import RecentActivityItem


def _handle_db_error(exc: Exception) -> None:
    raise HTTPException(
        status_code=503,
        detail={
            "error": "analytics_unavailable",
            "message": "Unable to retrieve analytics from the database.",
            "detail": str(exc),
        },
    ) from exc


def get_system_metrics(db: Session) -> SystemMetricsResponse:
    try:
        total = aq.count_predictions(db)
        high_risk = aq.count_high_risk(db)
        low_risk = aq.count_low_risk(db)
        avg_risk = aq.average_risk_score(db)
        model_version = aq.latest_model_version(db)

        if total == 0:
            system_status = "initializing"
        elif aq.recent_prediction_within_hours(db, hours=24):
            system_status = "operational"
        else:
            system_status = "idle"

        return SystemMetricsResponse(
            total_predictions=total,
            high_risk_patients=high_risk,
            low_risk_patients=low_risk,
            average_risk_score=avg_risk,
            total_logs=total,
            system_status=system_status,
            model_version=model_version,
        )
    except SQLAlchemyError as exc:
        _handle_db_error(exc)


def get_prediction_analytics(db: Session) -> PredictionAnalyticsResponse:
    try:
        distribution_raw = aq.risk_distribution_counts(db)
        total = sum(distribution_raw.values()) or 1

        risk_distribution = []
        for category, count in distribution_raw.items():
            risk_distribution.append(
                RiskDistributionItem(
                    category=category,
                    count=count,
                    percentage=round((count / total) * 100, 2),
                )
            )

        vitals = aq.average_vitals(db)
        trends_raw = aq.prediction_trends_by_day(db)

        return PredictionAnalyticsResponse(
            risk_distribution=risk_distribution,
            average_blood_pressure=BloodPressureAverages(
                systolic=vitals["ap_hi"],
                diastolic=vitals["ap_lo"],
            ),
            average_cholesterol=vitals["cholesterol"],
            average_age=vitals["age"],
            prediction_trends=[
                PredictionTrendPoint(**point) for point in trends_raw
            ],
        )
    except SQLAlchemyError as exc:
        _handle_db_error(exc)


def get_recent_activity(
    db: Session,
    limit: int = 50,
) -> RecentActivityResponse:
    try:
        logs = aq.fetch_recent_logs(db, limit=limit)
        activities = []

        for log in logs:
            activities.append(
                RecentActivityItem(
                    id=log.id,
                    predicted_risk=log.risk_probability,
                    risk_category=log.risk_category,
                    age=log.age,
                    ap_hi=log.ap_hi,
                    ap_lo=log.ap_lo,
                    cholesterol=log.cholesterol,
                    timestamp=(
                        log.timestamp.isoformat()
                        if log.timestamp
                        else None
                    ),
                    model_version=log.model_version
                    or aq.DEFAULT_MODEL_VERSION,
                )
            )

        return RecentActivityResponse(
            activities=activities,
            count=len(activities),
        )
    except SQLAlchemyError as exc:
        _handle_db_error(exc)
