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