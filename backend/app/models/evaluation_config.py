from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON

from app.database import Base


class EvaluationConfig(Base):
    __tablename__ = "evaluation_configs"

    id = Column(Integer, primary_key=True)  # singleton row — always id=1
    config_data = Column(JSON, nullable=False)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
