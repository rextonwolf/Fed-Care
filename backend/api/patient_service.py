"""
Patient profile and longitudinal history service layer.
"""

from fastapi import HTTPException
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from backend.database import patient_crud as pc

from backend.api.patient_schemas import PatientCreate
from backend.api.patient_schemas import PatientDetail
from backend.api.patient_schemas import PatientHistoryResponse
from backend.api.patient_schemas import PatientListResponse
from backend.api.patient_schemas import PatientSummary
from backend.api.patient_schemas import PatientUpdate
from backend.api.patient_schemas import PredictionHistoryItem


def _handle_db_error(exc: Exception) -> None:
    raise HTTPException(
        status_code=503,
        detail={
            "error": "patient_service_unavailable",
            "message": "Unable to access patient records.",
            "detail": str(exc),
        },
    ) from exc


def _iso(dt) -> str:
    if not dt:
        return ""
    return dt.replace(microsecond=0).isoformat() + "Z"


def _to_summary(db: Session, patient) -> PatientSummary:
    stats = pc.patient_summary_stats(db, patient.id)
    latest = stats["latest"]
    return PatientSummary(
        id=patient.id,
        patient_uid=patient.patient_uid,
        display_name=patient.display_name,
        medical_record_number=patient.medical_record_number,
        prediction_count=stats["prediction_count"],
        latest_risk_probability=latest.risk_probability if latest else None,
        latest_risk_category=latest.risk_category if latest else None,
        last_prediction_at=_iso(stats["last_prediction_at"]) or None,
        created_at=_iso(patient.created_at),
    )


def _to_detail(db: Session, patient) -> PatientDetail:
    summary = _to_summary(db, patient)
    return PatientDetail(
        **summary.model_dump(),
        notes=patient.notes,
        updated_at=_iso(patient.updated_at),
    )


def create_patient_record(db: Session, payload: PatientCreate) -> PatientDetail:
    try:
        patient = pc.create_patient(
            db,
            display_name=payload.display_name,
            medical_record_number=payload.medical_record_number,
            notes=payload.notes,
        )
        return _to_detail(db, patient)
    except SQLAlchemyError as exc:
        _handle_db_error(exc)


def list_patient_records(db: Session) -> PatientListResponse:
    try:
        patients = pc.list_patients(db)
        return PatientListResponse(
            patients=[_to_summary(db, p) for p in patients],
            count=len(patients),
        )
    except SQLAlchemyError as exc:
        _handle_db_error(exc)


def get_patient_detail(db: Session, patient_id: int) -> PatientDetail:
    try:
        patient = pc.get_patient(db, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        return _to_detail(db, patient)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        _handle_db_error(exc)


def get_patient_history(
    db: Session,
    patient_id: int,
    limit: int = 50,
) -> PatientHistoryResponse:
    try:
        patient = pc.get_patient(db, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")

        logs = pc.get_patient_predictions(db, patient_id, limit=limit)
        predictions = []
        risk_trend = []

        for log in logs:
            ts = _iso(log.timestamp) if log.timestamp else None
            predictions.append(
                PredictionHistoryItem(
                    id=log.id,
                    risk_probability=log.risk_probability,
                    risk_category=log.risk_category,
                    model_version=log.model_version,
                    source=log.source or "manual",
                    timestamp=ts,
                    age=log.age,
                    ap_hi=log.ap_hi,
                    ap_lo=log.ap_lo,
                    cholesterol=log.cholesterol,
                )
            )

        for log in reversed(logs):
            if log.timestamp:
                risk_trend.append(
                    {
                        "date": log.timestamp.date().isoformat(),
                        "risk": round(float(log.risk_probability or 0), 4),
                        "category": log.risk_category,
                    }
                )

        return PatientHistoryResponse(
            patient=_to_detail(db, patient),
            predictions=predictions,
            count=len(predictions),
            risk_trend=risk_trend,
        )
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        _handle_db_error(exc)


def update_patient_record(
    db: Session,
    patient_id: int,
    payload: PatientUpdate,
) -> PatientDetail:
    try:
        patient = pc.get_patient(db, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        updated = pc.update_patient(
            db,
            patient,
            display_name=payload.display_name,
            medical_record_number=payload.medical_record_number,
            notes=payload.notes,
        )
        return _to_detail(db, updated)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        _handle_db_error(exc)
