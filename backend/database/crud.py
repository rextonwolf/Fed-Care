from sqlalchemy.orm import Session

from backend.config import settings
from backend.database.models import PredictionLog


def create_prediction_log(
    db: Session,
    patient_data,
    prediction_result,
    source: str = "manual",
):

    log = PredictionLog(
        patient_id=getattr(patient_data, "patient_id", None),
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

    db.add(log)

    if log.patient_id:
        from backend.database.models import Patient
        patient = db.query(Patient).filter(Patient.id == log.patient_id).first()
        if patient:
            from datetime import datetime
            patient.updated_at = datetime.utcnow()

    db.commit()

    db.refresh(log)

    return log