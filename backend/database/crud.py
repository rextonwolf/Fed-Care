from sqlalchemy.orm import Session

from config import settings
from database.models import Hospital
from database.models import Patient
from database.models import PredictionLog


def _default_hospital_id(db: Session) -> int | None:
    hospital = db.query(Hospital).order_by(Hospital.id.asc()).first()
    return hospital.id if hospital else None


def create_prediction_log(
    db: Session,
    patient_data,
    prediction_result,
    source: str = "manual",
    hospital_id: int | None = None,
):

    log = PredictionLog(
        patient_id=getattr(patient_data, "patient_id", None),
        hospital_id=None,
        age=patient_data.age,
        gender=patient_data.gender,
        height=patient_data.height,
        weight=patient_data.weight,

        ap_hi=patient_data.ap_hi,
        ap_lo=patient_data.ap_lo,

        cholesterol=patient_data.cholesterol,
        gluc=patient_data.gluc,

        smoke=patient_data.smoke,
        alco=patient_data.alco,
        active=patient_data.active,

        risk_probability=prediction_result[
            "risk_probability"
        ],

        risk_category=prediction_result[
            "risk_category"
        ],

        model_version=settings.default_model_version,
        source=source,
    )

    # Prefer hospital from the caller (current_user), then patient, then default
    if hospital_id is not None:
        log.hospital_id = hospital_id
    elif log.patient_id:
        patient = db.query(Patient).filter(Patient.id == log.patient_id).first()
        if patient:
            log.hospital_id = patient.hospital_id or _default_hospital_id(db)
    if log.hospital_id is None:
        log.hospital_id = _default_hospital_id(db)

    db.add(log)

    if log.patient_id:
        patient = db.query(Patient).filter(Patient.id == log.patient_id).first()
        if patient:
            from datetime import datetime
            patient.updated_at = datetime.utcnow()

    db.commit()

    db.refresh(log)

    return log