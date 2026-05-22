"""
Pydantic response models for federated learning monitoring APIs.
Structured for enterprise FL ops dashboards and Recharts visualizations.
"""

from pydantic import BaseModel
from pydantic import Field

from typing import Any
from typing import Dict
from typing import List
from typing import Optional


class FederatedStatusResponse(BaseModel):
    active_clients: int
    total_clients: int
    global_model_version: str
    current_round: int
    synchronization_status: str
    average_client_latency: float
    aggregation_status: str
    total_training_samples: int
    computed_at: str


class FederatedClientItem(BaseModel):
    client_id: str
    hospital_name: str
    region: Optional[str] = None
    training_samples: int
    last_active: Optional[str] = None
    latency: float
    local_model_version: str
    synchronization_state: str
    current_round: int = 0


class FederatedClientsResponse(BaseModel):
    clients: List[FederatedClientItem]
    count: int
    computed_at: str


class AggregationMetrics(BaseModel):
    fedavg_weighted_samples: int
    participating_clients: int
    convergence_delta: Optional[float] = None
    client_ids: Optional[List[str]] = None


class FederatedRoundItem(BaseModel):
    round_number: int
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    round_duration_seconds: int
    participating_clients: int
    aggregated_samples: int
    model_accuracy: float = Field(
        ...,
        description="Simulated global accuracy progression for dashboard charts",
    )
    aggregation_loss: float
    aggregation_metrics: AggregationMetrics


class FederatedRoundsResponse(BaseModel):
    rounds: List[FederatedRoundItem]
    count: int
    accuracy_progression: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Recharts-friendly { round, accuracy, loss } series",
    )
    computed_at: str
