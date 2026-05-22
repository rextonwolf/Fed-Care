"""
Pydantic response models for enterprise analytics endpoints.
Structured for dashboard consumption (KPIs, charts, activity feeds).
"""

from pydantic import BaseModel
from pydantic import Field

from typing import List
from typing import Optional


class RiskDistributionItem(BaseModel):
    category: str
    count: int
    percentage: float


class BloodPressureAverages(BaseModel):
    systolic: float
    diastolic: float


class PredictionTrendPoint(BaseModel):
    date: str
    count: int
    average_risk_score: float


class SystemMetricsResponse(BaseModel):
    total_predictions: int
    high_risk_patients: int
    low_risk_patients: int
    average_risk_score: float
    total_logs: int
    system_status: str
    model_version: str


class PredictionAnalyticsResponse(BaseModel):
    risk_distribution: List[RiskDistributionItem]
    average_blood_pressure: BloodPressureAverages
    average_cholesterol: float
    average_age: float
    prediction_trends: List[PredictionTrendPoint]


class RecentActivityItem(BaseModel):
    id: int
    predicted_risk: float = Field(
        ...,
        description="Model risk probability (0–1)"
    )
    risk_category: Optional[str] = None
    age: Optional[float] = None
    ap_hi: Optional[float] = None
    ap_lo: Optional[float] = None
    cholesterol: Optional[float] = None
    timestamp: Optional[str] = None
    model_version: Optional[str] = None


class RecentActivityResponse(BaseModel):
    activities: List[RecentActivityItem]
    count: int
