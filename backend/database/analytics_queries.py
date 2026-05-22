"""
SQLAlchemy aggregation queries for analytics dashboards.
Reads from PredictionLog; no writes.
"""

from datetime import datetime
from datetime import timedelta

from sqlalchemy import func
from sqlalchemy import case
from sqlalchemy import or_
from sqlalchemy import desc
from sqlalchemy.orm import Session

from config import settings
from database.models import PredictionLog


# Align with predictor.py threshold (probability > 0.5 => High Risk)
HIGH_RISK_THRESHOLD = 0.5
DEFAULT_MODEL_VERSION = settings.default_model_version

# Risk distribution tiers for pie/bar charts (enterprise dashboards)
RISK_TIER_LOW = "Low Risk"
RISK_TIER_MEDIUM = "Medium Risk"
RISK_TIER_HIGH = "High Risk"


def _high_risk_condition():
    return or_(
        PredictionLog.risk_category == "High Risk",
        PredictionLog.risk_probability > HIGH_RISK_THRESHOLD,
    )


def _low_risk_condition():
    return or_(
        PredictionLog.risk_category == "Low Risk",
        PredictionLog.risk_probability <= HIGH_RISK_THRESHOLD,
    )


def count_predictions(db: Session) -> int:
    return db.query(func.count(PredictionLog.id)).scalar() or 0


def count_high_risk(db: Session) -> int:
    return (
        db.query(func.count(PredictionLog.id))
        .filter(_high_risk_condition())
        .scalar()
        or 0
    )


def count_low_risk(db: Session) -> int:
    return (
        db.query(func.count(PredictionLog.id))
        .filter(_low_risk_condition())
        .scalar()
        or 0
    )


def average_risk_score(db: Session) -> float:
    value = db.query(func.avg(PredictionLog.risk_probability)).scalar()
    return round(float(value or 0.0), 4)


def latest_model_version(db: Session) -> str:
    row = (
        db.query(PredictionLog.model_version)
        .filter(PredictionLog.model_version.isnot(None))
        .order_by(desc(PredictionLog.timestamp))
        .first()
    )
    if row and row[0]:
        return row[0]
    return DEFAULT_MODEL_VERSION


def recent_prediction_within_hours(
    db: Session,
    hours: int = 24,
) -> bool:
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    return (
        db.query(PredictionLog.id)
        .filter(PredictionLog.timestamp >= cutoff)
        .limit(1)
        .first()
        is not None
    )


def risk_distribution_counts(db: Session) -> dict:
    """
    Three-tier distribution by probability for dashboard charts.
    Low < 0.33, Medium 0.33–0.67, High > 0.67.
    """
    low_expr = case(
        (PredictionLog.risk_probability < 0.33, 1),
        else_=0,
    )
    medium_expr = case(
        (
            (PredictionLog.risk_probability >= 0.33)
            & (PredictionLog.risk_probability <= 0.67),
            1,
        ),
        else_=0,
    )
    high_expr = case(
        (PredictionLog.risk_probability > 0.67, 1),
        else_=0,
    )

    row = db.query(
        func.sum(low_expr).label("low"),
        func.sum(medium_expr).label("medium"),
        func.sum(high_expr).label("high"),
    ).one()

    return {
        RISK_TIER_LOW: int(row.low or 0),
        RISK_TIER_MEDIUM: int(row.medium or 0),
        RISK_TIER_HIGH: int(row.high or 0),
    }


def average_vitals(db: Session) -> dict:
    row = db.query(
        func.avg(PredictionLog.ap_hi).label("ap_hi"),
        func.avg(PredictionLog.ap_lo).label("ap_lo"),
        func.avg(PredictionLog.cholesterol).label("cholesterol"),
        func.avg(PredictionLog.age).label("age"),
    ).one()

    return {
        "ap_hi": round(float(row.ap_hi or 0.0), 2),
        "ap_lo": round(float(row.ap_lo or 0.0), 2),
        "cholesterol": round(float(row.cholesterol or 0.0), 2),
        "age": round(float(row.age or 0.0), 2),
    }


def prediction_trends_by_day(db: Session, days: int = 30) -> list:
    cutoff = datetime.utcnow() - timedelta(days=days)
    day_bucket = func.date_trunc("day", PredictionLog.timestamp)

    rows = (
        db.query(
            day_bucket.label("day"),
            func.count(PredictionLog.id).label("count"),
            func.avg(PredictionLog.risk_probability).label("avg_risk"),
        )
        .filter(PredictionLog.timestamp >= cutoff)
        .group_by(day_bucket)
        .order_by(day_bucket)
        .all()
    )

    trends = []
    for row in rows:
        day_val = row.day
        if hasattr(day_val, "date"):
            date_str = day_val.date().isoformat()
        elif hasattr(day_val, "isoformat"):
            date_str = day_val.isoformat()[:10]
        else:
            date_str = str(day_val)[:10]

        trends.append({
            "date": date_str,
            "count": int(row.count or 0),
            "average_risk_score": round(float(row.avg_risk or 0.0), 4),
        })

    return trends


def fetch_recent_logs(db: Session, limit: int = 50) -> list:
    return (
        db.query(PredictionLog)
        .order_by(desc(PredictionLog.timestamp))
        .limit(limit)
        .all()
    )
