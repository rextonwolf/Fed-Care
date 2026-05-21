from fastapi import FastAPI
from fastapi import Depends
from fastapi import HTTPException

from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session

from typing import List

import sys
import os

sys.path.append(
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..")
    )
)

from schemas import PatientData

from predictor import predict

from explainability_service import run_explainability

from database.database import engine
from database.database import SessionLocal

from database.models import Base
from database.models import PredictionLog

from database.crud import create_prediction_log

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
    title="Federated Healthcare AI API",
    version="1.0.0"
)


_cors_raw = os.getenv("CORS_ORIGINS", "*")
_cors_origins = (
    ["*"]
    if _cors_raw.strip() == "*"
    else [origin.strip() for origin in _cors_raw.split(",") if origin.strip()]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
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