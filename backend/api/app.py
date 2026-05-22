from fastapi import FastAPI
from fastapi import Depends
from fastapi import HTTPException

from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session

from typing import List

import sys
import os

# Backend root on PYTHONPATH (config, database, auth, ML modules)
sys.path.insert(
    0,
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),
)

from config import settings

from schemas import PatientData

from predictor import predict

from explainability_service import run_explainability

from database.database import engine
from database.database import SessionLocal

from database.models import Base
from database.models import PredictionLog

from database.crud import create_prediction_log

from analytics_schemas import SystemMetricsResponse
from analytics_schemas import PredictionAnalyticsResponse
from analytics_schemas import RecentActivityResponse

from analytics_service import get_system_metrics
from analytics_service import get_prediction_analytics
from analytics_service import get_recent_activity

from fairness_schemas import FairnessMetricsResponse
from fairness_schemas import FairnessTrendsResponse

from fairness_service import get_fairness_metrics
from fairness_service import get_fairness_trends

from federated_schemas import FederatedStatusResponse
from federated_schemas import FederatedClientsResponse
from federated_schemas import FederatedRoundsResponse

from federated_service import get_federated_status
from federated_service import get_federated_clients
from federated_service import get_federated_rounds

from auth.users import users_db

from auth.auth_handler import create_access_token

from auth.auth_bearer import JWTBearer


Base.metadata.create_all(bind=engine)


def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()


app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    debug=settings.debug,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/logs",
    dependencies=[Depends(JWTBearer())]
)
def get_logs(db: Session = Depends(get_db)):

    logs = db.query(PredictionLog).all()

    results = []

    for log in logs:

        results.append({

            "id": log.id,

            "predicted_risk": log.risk_probability,

            "timestamp": (
                log.timestamp.isoformat()
                if log.timestamp
                else None
            ),

            "model_version": getattr(
                log,
                "model_version",
                "FTTransformer v1"
            )
        })

    return results


@app.get("/")
def home():

    return {
        "message": "Federated Healthcare AI API Running"
    }


# ---------------------------------------------------------------------------
# Enterprise analytics (PostgreSQL / PredictionLog aggregates)
# ---------------------------------------------------------------------------


@app.get(
    "/system-metrics",
    response_model=SystemMetricsResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Analytics"],
    summary="Platform KPIs for executive dashboard",
)
def system_metrics(db: Session = Depends(get_db)):
    """
    Aggregate counts, risk averages, log volume, and deployment health signals.
    """
    return get_system_metrics(db)


@app.get(
    "/prediction-analytics",
    response_model=PredictionAnalyticsResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Analytics"],
    summary="Risk and vitals analytics for charts",
)
def prediction_analytics(db: Session = Depends(get_db)):
    """
    Risk distribution, population vitals averages, and daily prediction trends.
    """
    return get_prediction_analytics(db)


@app.get(
    "/recent-activity",
    response_model=RecentActivityResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Analytics"],
    summary="Latest prediction audit trail",
)
def recent_activity(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """
    Latest prediction logs ordered by timestamp (newest first).
    """
    if limit < 1 or limit > 500:
        raise HTTPException(
            status_code=400,
            detail="limit must be between 1 and 500",
        )

    return get_recent_activity(db, limit=limit)


# ---------------------------------------------------------------------------
# Fairness & bias monitoring (PostgreSQL / PredictionLog cohort analysis)
# ---------------------------------------------------------------------------


@app.get(
    "/fairness-metrics",
    response_model=FairnessMetricsResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Fairness"],
    summary="Demographic parity and protected-group fairness KPIs",
)
def fairness_metrics(db: Session = Depends(get_db)):
    """
    Real-time fairness statistics from stored predictions:
    parity score, gender distribution, subgroup positive rates, and risk breakdowns.
    """
    return get_fairness_metrics(db)


@app.get(
    "/fairness-trends",
    response_model=FairnessTrendsResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Fairness"],
    summary="Temporal fairness metrics and bias drift signals",
)
def fairness_trends(
    days: int = 90,
    db: Session = Depends(get_db),
):
    """
    Fairness metrics over time, per-subgroup prediction trends,
    and week-over-week bias drift indicators for compliance dashboards.
    """
    if days < 7 or days > 365:
        raise HTTPException(
            status_code=400,
            detail="days must be between 7 and 365",
        )

    return get_fairness_trends(db, days=days)


# ---------------------------------------------------------------------------
# Federated learning monitoring (PostgreSQL / prediction-log telemetry)
# ---------------------------------------------------------------------------


@app.get(
    "/federated-status",
    response_model=FederatedStatusResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Federated"],
    summary="Global FL coordinator status",
)
def federated_status(db: Session = Depends(get_db)):
    """
    Active clients, current round, sync/aggregation health, and training sample totals
    derived from live hospital prediction activity.
    """
    return get_federated_status(db)


@app.get(
    "/federated-clients",
    response_model=FederatedClientsResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Federated"],
    summary="Per-hospital federated client telemetry",
)
def federated_clients(db: Session = Depends(get_db)):
    """
    Hospital client registry with sample counts, latency, model version,
    and synchronization state from partitioned prediction logs.
    """
    return get_federated_clients(db)


@app.get(
    "/federated-rounds",
    response_model=FederatedRoundsResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Federated"],
    summary="Federated training round history",
)
def federated_rounds(db: Session = Depends(get_db)):
    """
    Round history with aggregation metrics, duration, participating clients,
    and simulated accuracy progression for Recharts dashboards.
    """
    return get_federated_rounds(db)


@app.post(
    "/predict",
    dependencies=[Depends(JWTBearer())]
)
def predict_risk(data: PatientData):

    db = SessionLocal()

    result = predict(data)

    create_prediction_log(
        db,
        data,
        result
    )

    db.close()

    return result


@app.post(
    "/explainability",
    dependencies=[Depends(JWTBearer())],
)
def explainability(data: PatientData):
    """
    SHAP-based explainability for a single patient record.
    Returns risk scores (via predictor) and feature attributions.
    """
    return run_explainability(data)


@app.post("/login")
def login(username: str, password: str):

    user = users_db.get(username)

    if not user or user["password"] != password:

        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    token = create_access_token({

        "username": username,
        "role": user["role"]
    })

    return {
        "access_token": token
    }