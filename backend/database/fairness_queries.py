"""
Fairness analytics SQLAlchemy queries over PredictionLog.
Computes demographic parity, subgroup rates, and temporal drift signals.
"""

from datetime import datetime
from datetime import timedelta
from typing import Dict
from typing import List
from typing import Optional
from typing import Tuple

from sqlalchemy import func
from sqlalchemy import case
from sqlalchemy.orm import Session

from backend.database.analytics_queries import _high_risk_condition
from backend.database.models import PredictionLog


# Cardiovascular cohort encoding: 1 = female, 2 = male (Kaggle cardio train)
GENDER_FEMALE = 1.0
GENDER_MALE = 2.0

RISK_TIER_LOW = "Low Risk"
RISK_TIER_MEDIUM = "Medium Risk"
RISK_TIER_HIGH = "High Risk"

FAIRNESS_GAP_THRESHOLD_LOW = 0.05
FAIRNESS_GAP_THRESHOLD_MEDIUM = 0.10


def gender_label_expr():
    """Map stored gender codes to human-readable protected groups."""
    return case(
        (PredictionLog.gender == GENDER_FEMALE, "Female"),
        (PredictionLog.gender == GENDER_MALE, "Male"),
        else_="Unknown",
    )


def age_group_expr():
    """Age buckets for secondary protected-attribute analysis."""
    return case(
        (PredictionLog.age < 45, "Young"),
        (PredictionLog.age < 60, "Middle"),
        else_="Senior",
    )


def positive_prediction_expr():
    """Binary positive class: high-risk prediction (prob > threshold)."""
    return case((_high_risk_condition(), 1), else_=0)


def _risk_tier_expr(tier: str):
    if tier == RISK_TIER_LOW:
        return case((PredictionLog.risk_probability < 0.33, 1), else_=0)
    if tier == RISK_TIER_MEDIUM:
        return case(
            (
                (PredictionLog.risk_probability >= 0.33)
                & (PredictionLog.risk_probability <= 0.67),
                1,
            ),
            else_=0,
        )
    return case((PredictionLog.risk_probability > 0.67, 1), else_=0)


def count_all_predictions(db: Session) -> int:
    return db.query(func.count(PredictionLog.id)).scalar() or 0


def population_positive_rate(db: Session) -> float:
    total = count_all_predictions(db)
    if total == 0:
        return 0.0
    positive_sum = (
        db.query(func.sum(positive_prediction_expr())).scalar() or 0
    )
    return round(float(positive_sum) / total, 4)


def fetch_gender_distribution(db: Session) -> List[dict]:
    group_col = gender_label_expr().label("group")
    rows = (
        db.query(
            group_col,
            func.count(PredictionLog.id).label("count"),
        )
        .group_by(group_col)
        .order_by(group_col)
        .all()
    )
    total = sum(int(r.count or 0) for r in rows) or 1
    return [
        {
            "group": r.group,
            "count": int(r.count or 0),
            "percentage": round((int(r.count or 0) / total) * 100, 2),
        }
        for r in rows
    ]


def fetch_subgroup_rates(
    db: Session,
    group_expr,
    attribute_name: str,
) -> List[dict]:
    group_col = group_expr.label("group")
    positive_expr = positive_prediction_expr()

    rows = (
        db.query(
            group_col,
            func.count(PredictionLog.id).label("count"),
            func.avg(positive_expr).label("positive_rate"),
        )
        .group_by(group_col)
        .order_by(group_col)
        .all()
    )

    return [
        {
            "group": r.group,
            "attribute": attribute_name,
            "count": int(r.count or 0),
            "positive_prediction_rate": round(float(r.positive_rate or 0.0), 4),
        }
        for r in rows
    ]


def fetch_protected_group_statistics(db: Session) -> List[dict]:
    """Per-gender cohort stats for fairness scorecards."""
    group_col = gender_label_expr().label("group")
    positive_expr = positive_prediction_expr()
    low_expr = case((_high_risk_condition(), 0), else_=1)

    rows = (
        db.query(
            group_col,
            func.count(PredictionLog.id).label("count"),
            func.avg(positive_expr).label("positive_rate"),
            func.avg(PredictionLog.risk_probability).label("avg_risk"),
            func.avg(PredictionLog.age).label("avg_age"),
            func.sum(positive_expr).label("high_risk_count"),
            func.sum(low_expr).label("low_risk_count"),
        )
        .group_by(group_col)
        .order_by(group_col)
        .all()
    )

    stats = []
    for r in rows:
        stats.append(
            {
                "group": r.group,
                "attribute": "gender",
                "count": int(r.count or 0),
                "positive_prediction_rate": round(
                    float(r.positive_rate or 0.0), 4
                ),
                "average_risk_score": round(float(r.avg_risk or 0.0), 4),
                "average_age": round(float(r.avg_age or 0.0), 2),
                "high_risk_count": int(r.high_risk_count or 0),
                "low_risk_count": int(r.low_risk_count or 0),
            }
        )
    return stats


def fetch_risk_distribution_by_gender(db: Session) -> List[dict]:
    """
    Pivot risk tiers × gender for stacked Recharts bars.
    Keys: female, male, unknown (lowercase for frontend chart compatibility).
    """
    group_col = gender_label_expr().label("gender")
    tiers = [RISK_TIER_LOW, RISK_TIER_MEDIUM, RISK_TIER_HIGH]
    pivot: Dict[str, Dict[str, int]] = {
        tier: {"category": tier, "female": 0, "male": 0, "unknown": 0}
        for tier in tiers
    }

    for tier in tiers:
        tier_expr = _risk_tier_expr(tier)
        rows = (
            db.query(
                group_col,
                func.sum(tier_expr).label("count"),
            )
            .group_by(group_col)
            .all()
        )
        for r in rows:
            key = (r.gender or "unknown").lower()
            if key not in pivot[tier]:
                key = "unknown"
            pivot[tier][key] = int(r.count or 0)

    return list(pivot.values())


def compute_fairness_gap(positive_rates: List[float]) -> float:
    """Demographic parity gap: max(positive rate) − min(positive rate)."""
    if not positive_rates:
        return 0.0
    return round(max(positive_rates) - min(positive_rates), 4)


def compute_demographic_parity_score(fairness_gap: float) -> float:
    """
    Fairness index in [0, 1]: 1.0 when parity gap is zero.
    score = max(0, 1 − gap)
    """
    return round(max(0.0, 1.0 - fairness_gap), 4)


def aggregate_fairness_from_rates(
    rates: List[float],
) -> Tuple[float, float]:
    gap = compute_fairness_gap(rates)
    score = compute_demographic_parity_score(gap)
    return score, gap


def fetch_gender_positive_rates(db: Session) -> List[float]:
    rows = fetch_subgroup_rates(db, gender_label_expr(), "gender")
    return [r["positive_prediction_rate"] for r in rows if r["count"] > 0]


def fetch_fairness_trends_by_day(db: Session, days: int = 90) -> List[dict]:
    """Daily demographic parity score and gap for line charts."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    day_bucket = func.date_trunc("day", PredictionLog.timestamp)
    group_col = gender_label_expr().label("gender")
    positive_expr = positive_prediction_expr()

    # Per-day, per-gender positive rates then aggregate gap in Python
    rows = (
        db.query(
            day_bucket.label("day"),
            group_col,
            func.count(PredictionLog.id).label("count"),
            func.avg(positive_expr).label("positive_rate"),
        )
        .filter(PredictionLog.timestamp >= cutoff)
        .group_by(day_bucket, group_col)
        .order_by(day_bucket)
        .all()
    )

    by_day: Dict[str, dict] = {}
    for r in rows:
        day_val = r.day
        if hasattr(day_val, "date"):
            date_str = day_val.date().isoformat()
        elif hasattr(day_val, "isoformat"):
            date_str = day_val.isoformat()[:10]
        else:
            date_str = str(day_val)[:10]

        if date_str not in by_day:
            by_day[date_str] = {
                "rates": [],
                "prediction_count": 0,
                "positive_sum": 0.0,
            }

        cnt = int(r.count or 0)
        rate = float(r.positive_rate or 0.0)
        by_day[date_str]["rates"].append(rate)
        by_day[date_str]["prediction_count"] += cnt
        by_day[date_str]["positive_sum"] += rate * cnt

    trends = []
    for date_str in sorted(by_day.keys()):
        bucket = by_day[date_str]
        rates = bucket["rates"]
        gap = compute_fairness_gap(rates)
        score = compute_demographic_parity_score(gap)
        total = bucket["prediction_count"] or 1
        pop_rate = round(bucket["positive_sum"] / total, 4)

        trends.append(
            {
                "date": date_str,
                "demographic_parity_score": score,
                "fairness_gap": gap,
                "population_positive_rate": pop_rate,
                "prediction_count": bucket["prediction_count"],
            }
        )

    return trends


def fetch_subgroup_trends_by_day(
    db: Session,
    days: int = 90,
) -> List[dict]:
    """Daily positive prediction rate per gender subgroup."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    day_bucket = func.date_trunc("day", PredictionLog.timestamp)
    group_col = gender_label_expr().label("group")
    positive_expr = positive_prediction_expr()

    rows = (
        db.query(
            day_bucket.label("day"),
            group_col,
            func.count(PredictionLog.id).label("count"),
            func.avg(positive_expr).label("positive_rate"),
        )
        .filter(PredictionLog.timestamp >= cutoff)
        .group_by(day_bucket, group_col)
        .order_by(day_bucket, group_col)
        .all()
    )

    trends = []
    for r in rows:
        day_val = r.day
        if hasattr(day_val, "date"):
            date_str = day_val.date().isoformat()
        elif hasattr(day_val, "isoformat"):
            date_str = day_val.isoformat()[:10]
        else:
            date_str = str(day_val)[:10]

        trends.append(
            {
                "date": date_str,
                "group": r.group,
                "attribute": "gender",
                "positive_prediction_rate": round(
                    float(r.positive_rate or 0.0), 4
                ),
                "prediction_count": int(r.count or 0),
            }
        )

    return trends


def _fairness_gap_for_window(
    db: Session,
    start: datetime,
    end: Optional[datetime] = None,
) -> Optional[float]:
    """Parity gap within a time window; None if insufficient data."""
    positive_expr = positive_prediction_expr()
    group_col = gender_label_expr().label("group")

    query = db.query(
        group_col,
        func.avg(positive_expr).label("positive_rate"),
        func.count(PredictionLog.id).label("count"),
    ).filter(PredictionLog.timestamp >= start)

    if end is not None:
        query = query.filter(PredictionLog.timestamp < end)

    rows = query.group_by(group_col).all()
    rates = [
        float(r.positive_rate or 0.0)
        for r in rows
        if int(r.count or 0) > 0
    ]
    if len(rates) < 2:
        return None
    return compute_fairness_gap(rates)


def _drift_severity(delta: float) -> str:
    abs_delta = abs(delta)
    if abs_delta < FAIRNESS_GAP_THRESHOLD_LOW:
        return "low"
    if abs_delta < FAIRNESS_GAP_THRESHOLD_MEDIUM:
        return "medium"
    return "high"


def _drift_status(severity: str, delta: float) -> str:
    if severity == "high":
        return "action_required"
    if severity == "medium" or delta > 0:
        return "monitor"
    return "within_threshold"


def compute_bias_drift_indicators(db: Session) -> List[dict]:
    """
    Compare recent vs prior weekly windows to surface parity drift.
    Suitable for compliance alert panels on the fairness dashboard.
    """
    now = datetime.utcnow()
    recent_start = now - timedelta(days=7)
    baseline_start = now - timedelta(days=14)
    baseline_end = recent_start

    recent_gap = _fairness_gap_for_window(db, recent_start)
    baseline_gap = _fairness_gap_for_window(
        db, baseline_start, end=baseline_end
    )

    indicators: List[dict] = []

    if recent_gap is None and baseline_gap is None:
        return indicators

    recent_val = recent_gap if recent_gap is not None else 0.0
    baseline_val = baseline_gap if baseline_gap is not None else recent_val
    drift_delta = round(recent_val - baseline_val, 4)
    severity = _drift_severity(drift_delta)
    status = _drift_status(severity, drift_delta)

    if drift_delta > 0:
        message = (
            f"Gender demographic parity gap widened by {drift_delta:.2f} "
            f"vs. prior 7-day window (recent: {recent_val:.2f})."
        )
    elif drift_delta < 0:
        message = (
            f"Gender demographic parity gap improved by "
            f"{abs(drift_delta):.2f} vs. prior 7-day window."
        )
    else:
        message = "Gender demographic parity gap stable week-over-week."

    indicators.append(
        {
            "indicator_id": "DRIFT-GENDER-PARITY",
            "attribute": "gender",
            "metric": "demographic_parity_gap",
            "recent_value": recent_val,
            "baseline_value": baseline_val,
            "drift_delta": drift_delta,
            "severity": severity,
            "status": status,
            "message": message,
        }
    )

    # Age subgroup drift on senior cohort positive rate
    positive_expr = positive_prediction_expr()

    def _senior_rate_window(start: datetime, end: Optional[datetime]) -> Optional[float]:
        q = (
            db.query(func.avg(positive_expr))
            .filter(PredictionLog.age >= 60)
            .filter(PredictionLog.timestamp >= start)
        )
        if end is not None:
            q = q.filter(PredictionLog.timestamp < end)
        val = q.scalar()
        if val is None:
            return None
        cnt = (
            db.query(func.count(PredictionLog.id))
            .filter(PredictionLog.age >= 60)
            .filter(PredictionLog.timestamp >= start)
        )
        if end is not None:
            cnt = cnt.filter(PredictionLog.timestamp < end)
        if (cnt.scalar() or 0) < 3:
            return None
        return round(float(val), 4)

    recent_senior = _senior_rate_window(recent_start, None)
    baseline_senior = _senior_rate_window(baseline_start, baseline_end)

    if recent_senior is not None and baseline_senior is not None:
        senior_delta = round(recent_senior - baseline_senior, 4)
        senior_severity = _drift_severity(senior_delta)
        indicators.append(
            {
                "indicator_id": "DRIFT-AGE-SENIOR",
                "attribute": "age",
                "metric": "senior_positive_prediction_rate",
                "recent_value": recent_senior,
                "baseline_value": baseline_senior,
                "drift_delta": senior_delta,
                "severity": senior_severity,
                "status": _drift_status(senior_severity, senior_delta),
                "message": (
                    f"Senior (65+) positive prediction rate shifted by "
                    f"{senior_delta:+.2f} week-over-week."
                ),
            }
        )

    return indicators
