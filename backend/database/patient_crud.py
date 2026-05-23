"""
CRUD operations for patient profiles and longitudinal prediction history.
"""

import uuid
from datetime import datetime
from typing import List
from typing import Optional

from sqlalchemy import desc
from sqlalchemy import func
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.database.models import Patient
from backend.database.models import PredictionLog


def create_patient(
    db: Session,
    display_name: str,
    medical_record_number: Optional[str] = None,
    notes: Optional[str] = None,
) -> Patient:
    patient = Patient(
        patient_uid=str(uuid.uuid4()),
        display_name=display_name,
        medical_record_number=medical_record_number,
        notes=notes,
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def get_patient(db: Session, patient_id: int) -> Optional[Patient]:
    return db.query(Patient).filter(Patient.id == patient_id).first()


def get_patient_by_uid(db: Session, patient_uid: str) -> Optional[Patient]:
    return (
        db.query(Patient)
        .filter(Patient.patient_uid == patient_uid.strip())
        .first()
    )


def search_patients(
    db: Session,
    query: str,
    limit: int = 20,
) -> List[Patient]:
    """
    Search by display name (partial), patient UUID, or MRN.
    """
    q = (query or "").strip()
    if not q:
        return []

    pattern = f"%{q}%"
    filters = [
        Patient.display_name.ilike(pattern),
        Patient.patient_uid.ilike(pattern),
        Patient.medical_record_number.ilike(pattern),
    ]

    # Prefer exact UUID hit when query looks like a full UUID
    exact_uid = get_patient_by_uid(db, q)
    if exact_uid:
        return [exact_uid]

    return (
        db.query(Patient)
        .filter(or_(*filters))
        .order_by(desc(Patient.updated_at))
        .limit(limit)
        .all()
    )


def list_patients(db: Session, limit: int = 100) -> List[Patient]:
    return (
        db.query(Patient)
        .order_by(desc(Patient.updated_at))
        .limit(limit)
        .all()
    )


def update_patient(
    db: Session,
    patient: Patient,
    display_name: Optional[str] = None,
    medical_record_number: Optional[str] = None,
    notes: Optional[str] = None,
) -> Patient:
    if display_name is not None:
        patient.display_name = display_name
    if medical_record_number is not None:
        patient.medical_record_number = medical_record_number
    if notes is not None:
        patient.notes = notes
    patient.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(patient)
    return patient


def get_patient_predictions(
    db: Session,
    patient_id: int,
    limit: int = 50,
) -> List[PredictionLog]:
    return (
        db.query(PredictionLog)
        .filter(PredictionLog.patient_id == patient_id)
        .order_by(desc(PredictionLog.timestamp))
        .limit(limit)
        .all()
    )


def patient_summary_stats(db: Session, patient_id: int) -> dict:
    row = (
        db.query(
            func.count(PredictionLog.id).label("count"),
            func.max(PredictionLog.timestamp).label("last_ts"),
        )
        .filter(PredictionLog.patient_id == patient_id)
        .one()
    )
    latest = (
        db.query(PredictionLog)
        .filter(PredictionLog.patient_id == patient_id)
        .order_by(desc(PredictionLog.timestamp))
        .first()
    )
    return {
        "prediction_count": int(row.count or 0),
        "last_prediction_at": row.last_ts,
        "latest": latest,
    }
