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

from backend.database.models import Hospital
from backend.database.models import Patient
from backend.database.models import PredictionLog


def _default_hospital_id(db: Session) -> int | None:
    hospital = db.query(Hospital).order_by(Hospital.id.asc()).first()
    return hospital.id if hospital else None


def create_patient(
    db: Session,
    display_name: str,
    medical_record_number: Optional[str] = None,
    notes: Optional[str] = None,
    hospital_id: Optional[int] = None,
) -> Patient:
    patient = Patient(
        patient_uid=str(uuid.uuid4()),
        display_name=display_name,
        medical_record_number=medical_record_number,
        notes=notes,
        hospital_id=(hospital_id if hospital_id is not None else _default_hospital_id(db)),
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def get_patient(db: Session, patient_id: int, hospital_id: Optional[int] = None) -> Optional[Patient]:
    q = db.query(Patient).filter(Patient.id == patient_id)
    if hospital_id is not None:
        q = q.filter(Patient.hospital_id == hospital_id)
    return q.first()


def get_patient_by_uid(db: Session, patient_uid: str, hospital_id: Optional[int] = None) -> Optional[Patient]:
    q = db.query(Patient).filter(Patient.patient_uid == patient_uid.strip())
    if hospital_id is not None:
        q = q.filter(Patient.hospital_id == hospital_id)
    return q.first()


def search_patients(
    db: Session,
    query: str,
    limit: int = 20,
    hospital_id: Optional[int] = None,
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
    exact_uid = get_patient_by_uid(db, q, hospital_id=hospital_id)
    if exact_uid:
        return [exact_uid]

    q = db.query(Patient).filter(or_(*filters))
    if hospital_id is not None:
        q = q.filter(Patient.hospital_id == hospital_id)

    return q.order_by(desc(Patient.updated_at)).limit(limit).all()


def list_patients(db: Session, limit: int = 100, hospital_id: Optional[int] = None) -> List[Patient]:
    q = db.query(Patient)
    if hospital_id is not None:
        q = q.filter(Patient.hospital_id == hospital_id)
    return q.order_by(desc(Patient.updated_at)).limit(limit).all()


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
    hospital_id: Optional[int] = None,
) -> List[PredictionLog]:
    q = db.query(PredictionLog).filter(PredictionLog.patient_id == patient_id)
    if hospital_id is not None:
        q = q.filter(PredictionLog.hospital_id == hospital_id)
    return q.order_by(desc(PredictionLog.timestamp)).limit(limit).all()


def patient_summary_stats(db: Session, patient_id: int, hospital_id: Optional[int] = None) -> dict:
    q = db.query(
        func.count(PredictionLog.id).label("count"),
        func.max(PredictionLog.timestamp).label("last_ts"),
    ).filter(PredictionLog.patient_id == patient_id)
    if hospital_id is not None:
        q = q.filter(PredictionLog.hospital_id == hospital_id)
    row = q.one()
    latest_q = db.query(PredictionLog).filter(PredictionLog.patient_id == patient_id)
    if hospital_id is not None:
        latest_q = latest_q.filter(PredictionLog.hospital_id == hospital_id)
    latest = latest_q.order_by(desc(PredictionLog.timestamp)).first()
    return {
        "prediction_count": int(row.count or 0),
        "last_prediction_at": row.last_ts,
        "latest": latest,
    }
