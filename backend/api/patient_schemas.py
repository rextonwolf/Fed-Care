"""
Pydantic schemas for patient profiles and longitudinal prediction history.
"""

from pydantic import BaseModel
from pydantic import Field

from typing import List
from typing import Optional


class PatientCreate(BaseModel):
    display_name: str = Field(..., min_length=1, max_length=255)
    medical_record_number: Optional[str] = Field(None, max_length=64)
    notes: Optional[str] = None


class PatientUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    medical_record_number: Optional[str] = Field(None, max_length=64)
    notes: Optional[str] = None


class PatientSummary(BaseModel):
    id: int
    patient_uid: str
    display_name: str
    medical_record_number: Optional[str] = None
    prediction_count: int = 0
    latest_risk_probability: Optional[float] = None
    latest_risk_category: Optional[str] = None
    last_prediction_at: Optional[str] = None
    created_at: str


class PatientDetail(PatientSummary):
    notes: Optional[str] = None
    updated_at: str


class PredictionHistoryItem(BaseModel):
    id: int
    risk_probability: float
    risk_category: Optional[str] = None
    model_version: Optional[str] = None
    source: str = "manual"
    timestamp: Optional[str] = None
    age: Optional[float] = None
    ap_hi: Optional[float] = None
    ap_lo: Optional[float] = None
    cholesterol: Optional[float] = None


class PatientHistoryResponse(BaseModel):
    patient: PatientDetail
    predictions: List[PredictionHistoryItem]
    count: int
    risk_trend: List[dict]


class PatientListResponse(BaseModel):
    patients: List[PatientSummary]
    count: int


class PatientSearchResponse(BaseModel):
    """Results for GET /patients/search — empty list means no match (create new)."""

    query: str
    results: List[PatientSummary]
    count: int
