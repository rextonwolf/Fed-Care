from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Float
from sqlalchemy import String
from sqlalchemy import DateTime

from datetime import datetime

from database.database import Base


class PredictionLog(Base):

    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, index=True)

    age = Column(Float)
    gender = Column(Float)
    height = Column(Float)
    weight = Column(Float)

    ap_hi = Column(Float)
    ap_lo = Column(Float)

    cholesterol = Column(Float)
    gluc = Column(Float)

    smoke = Column(Float)
    alco = Column(Float)
    active = Column(Float)

    risk_probability = Column(Float)

    risk_category = Column(String)

    model_version = Column(String)

    timestamp = Column(
        DateTime,
        default=datetime.utcnow
    )


class FederatedClient(Base):
    """
    Hospital FL client registry. Prediction logs are partitioned by
    log id modulo partition_index for per-site activity telemetry.
    """

    __tablename__ = "federated_clients"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String, unique=True, index=True, nullable=False)
    hospital_name = Column(String, nullable=False)
    partition_index = Column(Integer, nullable=False)
    region = Column(String, default="US")


class FederatedRound(Base):
    """Materialized federated training round snapshot (synced from prediction activity)."""

    __tablename__ = "federated_rounds"

    id = Column(Integer, primary_key=True, index=True)
    round_number = Column(Integer, unique=True, index=True, nullable=False)
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    participating_clients = Column(Integer, default=0)
    aggregated_samples = Column(Integer, default=0)
    model_accuracy = Column(Float, default=0.0)
    aggregation_loss = Column(Float, default=0.0)
    aggregation_status = Column(String, default="complete")
    created_at = Column(DateTime, default=datetime.utcnow)