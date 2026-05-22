"""
Pydantic models for fairness / bias monitoring APIs.
Structured for Recharts dashboards and enterprise compliance views.
"""

from pydantic import BaseModel
from pydantic import Field

from typing import List
from typing import Optional


class GenderDistributionItem(BaseModel):
    group: str
    count: int
    percentage: float


class RiskByGenderRow(BaseModel):
    """Stacked bar chart row: risk tier × gender counts."""
    category: str
    female: int = 0
    male: int = 0
    unknown: int = 0


class ProtectedGroupStat(BaseModel):
    group: str
    attribute: str
    count: int
    positive_prediction_rate: float
    average_risk_score: float
    average_age: float
    high_risk_count: int
    low_risk_count: int


class SubgroupPositiveRate(BaseModel):
    group: str
    attribute: str
    positive_prediction_rate: float
    count: int
    benchmark_rate: Optional[float] = Field(
        None,
        description="Population-wide positive rate for comparison bars",
    )


class FairnessMetricsResponse(BaseModel):
    demographic_parity_score: float
    fairness_gap: float
    population_positive_rate: float
    gender_distribution: List[GenderDistributionItem]
    risk_distribution_by_gender: List[RiskByGenderRow]
    protected_group_statistics: List[ProtectedGroupStat]
    subgroup_positive_prediction_rates: List[SubgroupPositiveRate]
    sample_size: int
    computed_at: str


class FairnessTrendPoint(BaseModel):
    date: str
    demographic_parity_score: float
    fairness_gap: float
    population_positive_rate: float
    prediction_count: int


class SubgroupTrendPoint(BaseModel):
    date: str
    group: str
    attribute: str
    positive_prediction_rate: float
    prediction_count: int


class BiasDriftIndicator(BaseModel):
    indicator_id: str
    attribute: str
    metric: str
    recent_value: float
    baseline_value: float
    drift_delta: float
    severity: str
    status: str
    message: str


class FairnessTrendsResponse(BaseModel):
    fairness_metrics_over_time: List[FairnessTrendPoint]
    subgroup_prediction_trends: List[SubgroupTrendPoint]
    bias_drift_indicators: List[BiasDriftIndicator]
    sample_size: int
    computed_at: str
