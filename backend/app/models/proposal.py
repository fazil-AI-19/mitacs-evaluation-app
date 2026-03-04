import enum
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String

from app.database import Base


class ProposalStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    awaiting_review = "awaiting_review"
    decided = "decided"
    error = "error"


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    applicant_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(500), nullable=False)
    applicant_name = Column(String(255), nullable=False)
    institution = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=False)
    status = Column(
        Enum(ProposalStatus), nullable=False, default=ProposalStatus.pending
    )
    submitted_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
