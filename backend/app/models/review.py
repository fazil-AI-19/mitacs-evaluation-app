import enum
from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Enum, ForeignKey, Integer, Text

from app.database import Base


class ReviewType(str, enum.Enum):
    preliminary = "preliminary"
    research = "research"


class AgentReview(Base):
    __tablename__ = "agent_reviews"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey("proposals.id"), nullable=False, index=True)
    review_type = Column(Enum(ReviewType), nullable=False)
    raw_output = Column(Text, nullable=True)
    structured_output = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
