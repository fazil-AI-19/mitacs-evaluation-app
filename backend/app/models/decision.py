import enum
from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Enum, ForeignKey, Integer, Text

from app.database import Base


class Recommendation(str, enum.Enum):
    accept = "accept"
    reject = "reject"
    revise_and_resubmit = "revise_and_resubmit"


class Decision(Base):
    __tablename__ = "decisions"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(
        Integer, ForeignKey("proposals.id"), nullable=False, unique=True, index=True
    )
    ai_score = Column(Integer, nullable=False)  # 0–100
    ai_recommendation = Column(Enum(Recommendation), nullable=False)
    ai_justification = Column(Text, nullable=False)
    strengths = Column(JSON, nullable=True)
    weaknesses = Column(JSON, nullable=True)
    action_items = Column(JSON, nullable=True)
    # Human reviewer fields (null until reviewer acts)
    final_recommendation = Column(Enum(Recommendation), nullable=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewer_comments = Column(Text, nullable=True)
    is_overridden = Column(Boolean, nullable=False, default=False)
    decided_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
