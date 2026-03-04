from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ProposalCreate(BaseModel):
    title: str
    applicant_name: str
    institution: str


class ProposalRead(BaseModel):
    id: int
    applicant_id: int
    title: str
    applicant_name: str
    institution: str
    original_filename: str
    status: str
    submitted_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DecisionSummary(BaseModel):
    ai_score: float
    ai_recommendation: str
    final_recommendation: Optional[str] = None
    is_overridden: bool

    model_config = {"from_attributes": True}


class ProposalWithDecision(ProposalRead):
    decision: Optional[DecisionSummary] = None


class ProposalStatusRead(BaseModel):
    id: int
    status: str
    updated_at: datetime

    model_config = {"from_attributes": True}
