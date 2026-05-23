from pydantic import BaseModel, Field
from typing import Optional


class PatientData(BaseModel):
    """Cardiovascular risk payload — core fields required; extended cohort features optional."""

    patient_id: Optional[int] = None

    # Core (cardio.csv / production defaults)
    age: float
    gender: float
    height: float
    weight: float
    ap_hi: float
    ap_lo: float
    cholesterol: float
    gluc: float
    smoke: float
    alco: float
    active: float
    symptoms: list[str] = []

    # UCI heart disease extensions (median-imputed when omitted)
    cp: Optional[float] = Field(None, description="Chest pain type (encoded)")
    restecg: Optional[float] = Field(None, description="Resting ECG result (encoded)")
    thalch: Optional[float] = Field(None, description="Max heart rate achieved")
    exang: Optional[float] = Field(None, description="Exercise induced angina")
    oldpeak: Optional[float] = Field(None, description="ST depression")
    slope: Optional[float] = Field(None, description="Slope of peak exercise ST segment")
    ca: Optional[float] = Field(None, description="Major vessels (encoded)")
    thal: Optional[float] = Field(None, description="Thalassemia (encoded)")

    # MIMIC / lab extensions
    heart_rate: Optional[float] = None
    creatinine: Optional[float] = None
    bmi: Optional[float] = None
    insulin: Optional[float] = None
    hemoglobin: Optional[float] = None
