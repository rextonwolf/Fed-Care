import sys
import os
sys.path.append(
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..")
    )
)
from typing import List
from knowledge_graph.kg_reasoner import analyze_symptom_consistency
from pathlib import Path

from datetime import datetime

from fastapi import Depends
from fastapi import FastAPI
from fastapi import File
from fastapi import HTTPException
from fastapi import UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.api.analytics_schemas import PredictionAnalyticsResponse
from backend.api.analytics_schemas import RecentActivityResponse
from backend.api.analytics_schemas import SystemMetricsResponse
from backend.api.analytics_service import get_prediction_analytics
from backend.api.analytics_service import get_recent_activity
from backend.api.analytics_service import get_system_metrics
from backend.api.dataset_service import create_dataset_upload_record
from backend.api.dataset_service import get_uploaded_datasets
from backend.api.dataset_schemas import DatasetUploadResponse
from backend.api.explainability_service import run_explainability
from backend.api.fairness_schemas import FairnessMetricsResponse
from backend.api.fairness_schemas import FairnessTrendsResponse
from backend.api.fairness_service import get_fairness_metrics
from backend.api.fairness_service import get_fairness_trends
from backend.api.federated_schemas import FederatedClientsResponse
from backend.api.federated_schemas import FederatedRoundsResponse
from backend.api.federated_schemas import FederatedStatusResponse
from backend.api.federated_service import get_federated_clients
from backend.api.federated_service import get_federated_rounds
from backend.api.federated_service import get_federated_status
from backend.api.neuro_symbolic_service import validate_patient_prediction
from backend.validation.uncertainty_engine import validate_prediction as validate_uncertainty
from backend.api.patient_schemas import PatientCreate
from backend.api.patient_schemas import PatientDetail
from backend.api.patient_schemas import PatientHistoryResponse
from backend.api.patient_schemas import PatientListResponse
from backend.api.patient_schemas import PatientUpdate
from backend.api.patient_lookup_service import search_patients as lookup_search_patients
from backend.api.patient_schemas import PatientSearchResponse
from backend.api.patient_service import create_patient_record
from backend.api.patient_service import get_patient_detail
from backend.api.patient_service import get_patient_history
from backend.api.patient_service import list_patient_records
from backend.api.patient_service import update_patient_record
from backend.api.predictor import predict
from backend.api.schemas import PatientData
from backend.auth.auth_bearer import JWTBearer
from backend.auth.auth_handler import create_access_token
from backend.auth.users import users_db
from backend.config import BACKEND_ROOT
from backend.config import settings
from backend.database import patient_crud as patient_db
from backend.database.crud import create_prediction_log
from backend.database.database import SessionLocal
from backend.database.database import engine
from backend.database.models import Base
from backend.database.models import PredictionLog
from backend.database.schema_compat import ensure_schema_compat
from backend.database.seed_data import seed_reference_data


Base.metadata.create_all(bind=engine)
ensure_schema_compat(engine)

UPLOADS_ROOT = BACKEND_ROOT / "uploads"
UPLOADS_ROOT.mkdir(parents=True, exist_ok=True)

db = SessionLocal()
try:
    seed_reference_data(db)
finally:
    db.close()


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


@app.get("/logs")
def get_logs(current_user: dict = Depends(JWTBearer()), db: Session = Depends(get_db)):
    q = db.query(PredictionLog)
    if current_user and current_user.get("role") != "admin":
        q = q.filter(PredictionLog.hospital_id == current_user.get("hospital_id"))

    logs = q.all()
    results = []
    for log in logs:
        results.append({
            "id": log.id,
            "predicted_risk": log.risk_probability,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            "model_version": getattr(log, "model_version", "FTTransformer v1"),
        })
    return results


@app.get("/")
def home():
    return {"message": "Federated Healthcare AI API Running"}


@app.get(
    "/system-metrics",
    response_model=SystemMetricsResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Analytics"],
    summary="Platform KPIs for executive dashboard",
)
def system_metrics(db: Session = Depends(get_db), current_user: dict = Depends(JWTBearer())):
    return get_system_metrics(db, current_user=current_user)


@app.get(
    "/prediction-analytics",
    response_model=PredictionAnalyticsResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Analytics"],
    summary="Risk and vitals analytics for charts",
)
def prediction_analytics(db: Session = Depends(get_db), current_user: dict = Depends(JWTBearer())):
    return get_prediction_analytics(db, current_user=current_user)


@app.get(
    "/recent-activity",
    response_model=RecentActivityResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Analytics"],
    summary="Latest prediction audit trail",
)
def recent_activity(limit: int = 50, db: Session = Depends(get_db), current_user: dict = Depends(JWTBearer())):
    if limit < 1 or limit > 500:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 500")
    return get_recent_activity(db, limit=limit, current_user=current_user)


@app.post(
    "/dataset-uploads",
    response_model=DatasetUploadResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Datasets"],
    summary="Upload a validated CSV dataset for federated simulation",
)
def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(JWTBearer()),
):
    filename = Path(file.filename).name
    if not filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    contents = file.file.read()
    destination = UPLOADS_ROOT / f"{datetime.utcnow():%Y%m%d%H%M%S}_{filename}"
    with open(destination, "wb") as handle:
        handle.write(contents)

    return create_dataset_upload_record(db, filename=file.filename, current_user=current_user)


@app.get(
    "/dataset-uploads",
    response_model=list[DatasetUploadResponse],
    dependencies=[Depends(JWTBearer())],
    tags=["Datasets"],
    summary="List validated dataset uploads",
)
def list_dataset_uploads(db: Session = Depends(get_db), current_user: dict = Depends(JWTBearer())):
    return get_uploaded_datasets(db, current_user=current_user)


@app.get(
    "/fairness-metrics",
    response_model=FairnessMetricsResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Fairness"],
    summary="Demographic parity and protected-group fairness KPIs",
)
def fairness_metrics(db: Session = Depends(get_db)):
    return get_fairness_metrics(db)


@app.get(
    "/fairness-trends",
    response_model=FairnessTrendsResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Fairness"],
    summary="Temporal fairness metrics and bias drift signals",
)
def fairness_trends(days: int = 90, db: Session = Depends(get_db)):
    if days < 7 or days > 365:
        raise HTTPException(status_code=400, detail="days must be between 7 and 365")
    return get_fairness_trends(db, days=days)


@app.get(
    "/federated-status",
    response_model=FederatedStatusResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Federated"],
    summary="Global FL coordinator status",
)
def federated_status(db: Session = Depends(get_db)):
    return get_federated_status(db)


@app.get(
    "/federated-clients",
    response_model=FederatedClientsResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Federated"],
    summary="Per-hospital federated client telemetry",
)
def federated_clients(db: Session = Depends(get_db)):
    return get_federated_clients(db)


@app.get(
    "/federated-rounds",
    response_model=FederatedRoundsResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Federated"],
    summary="Federated training round history",
)
def federated_rounds(db: Session = Depends(get_db)):
    return get_federated_rounds(db)


@app.post(
    "/patients",
    response_model=PatientDetail,
    dependencies=[Depends(JWTBearer())],
    tags=["Patients"],
    summary="Create a patient profile",
)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db), current_user: dict = Depends(JWTBearer())):
    return create_patient_record(db, payload, current_user=current_user)


@app.get(
    "/patients",
    response_model=PatientListResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Patients"],
    summary="List patient profiles",
)
def list_patients(db: Session = Depends(get_db), current_user: dict = Depends(JWTBearer())):
    return list_patient_records(db, current_user=current_user)


@app.get(
    "/patients/search",
    response_model=PatientSearchResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Patients"],
    summary="Search patients by UUID or name",
)
def search_patients_endpoint(
    q: str = "",
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: dict = Depends(JWTBearer()),
):
    hospital_id = None
    if current_user and current_user.get("role") != "admin":
        hospital_id = current_user.get("hospital_id")
    return lookup_search_patients(db, q=q, limit=limit, hospital_id=hospital_id)


@app.get(
    "/patients/{patient_id}",
    response_model=PatientDetail,
    dependencies=[Depends(JWTBearer())],
    tags=["Patients"],
    summary="Get patient profile",
)
def get_patient(patient_id: int, db: Session = Depends(get_db), current_user: dict = Depends(JWTBearer())):
    return get_patient_detail(db, patient_id, current_user=current_user)


@app.get(
    "/patients/{patient_id}/history",
    response_model=PatientHistoryResponse,
    dependencies=[Depends(JWTBearer())],
    tags=["Patients"],
    summary="Longitudinal prediction history for a patient",
)
def patient_history(patient_id: int, limit: int = 50, db: Session = Depends(get_db), current_user: dict = Depends(JWTBearer())):
    if limit < 1 or limit > 200:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 200")
    return get_patient_history(db, patient_id, limit=limit, current_user=current_user)


@app.patch(
    "/patients/{patient_id}",
    response_model=PatientDetail,
    dependencies=[Depends(JWTBearer())],
    tags=["Patients"],
    summary="Update patient profile",
)
def patch_patient(
    patient_id: int,
    payload: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(JWTBearer()),
):
    return update_patient_record(db, patient_id, payload, current_user=current_user)


@app.post("/predict")
def predict_risk(data: PatientData, current_user: dict = Depends(JWTBearer())):
    db = SessionLocal()

    if data.patient_id is not None:
        # enforce hospital scoping for non-admins
        if current_user and current_user.get("role") != "admin":
            ok = patient_db.get_patient(db, data.patient_id, hospital_id=current_user.get("hospital_id"))
        else:
            ok = patient_db.get_patient(db, data.patient_id)

        if not ok:
            db.close()
            raise HTTPException(status_code=404, detail="Patient not found")

    result = predict(data)

    create_prediction_log(db, data, result, hospital_id=(current_user.get("hospital_id") if current_user and current_user.get("role") != "admin" else None))

    try:
        validation = validate_patient_prediction(
            data.model_dump(),
            result
        )

        result = {
            **result,
            "neuro_symbolic_validation": validation
        }

    except Exception:
        pass

    try:
        # Tier 1 uncertainty validation
        uv = validate_uncertainty(
            data.model_dump(),
            result
        )

        result = {
            **result,
            **uv
        }

    except Exception:
        pass

    try:
        # Knowledge graph symptom reasoning
        kg_result = analyze_symptom_consistency(
            symptoms=data.symptoms,
            risk_score=result["risk_probability"]
        )

        result = {
            **result,
            **kg_result
        }

    except Exception:
        pass

    db.close()

    return result


@app.post("/explainability", dependencies=[Depends(JWTBearer())])
def explainability(data: PatientData):
    return run_explainability(data)


@app.post("/login")
def login(username: str, password: str):
    user = users_db.get(username)
    valid_passwords = user.get("passwords") if user else None
    is_valid_password = bool(
        user
        and (
            (valid_passwords is not None and password in valid_passwords)
            or user["password"] == password
        )
    )
    if not is_valid_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token_payload = {"username": username, "role": user["role"]}
    # Include hospital_id from persistent DB user when available (keeps login contract)
    db = SessionLocal()
    try:
        from backend.database.models import User as DBUser

        db_user = db.query(DBUser).filter(DBUser.username == username).first()
        if db_user and getattr(db_user, "hospital_id", None) is not None:
            token_payload["hospital_id"] = db_user.hospital_id
    finally:
        db.close()

    token = create_access_token(token_payload)
    return {"access_token": token}
