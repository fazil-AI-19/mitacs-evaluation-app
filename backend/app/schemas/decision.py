from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class DecisionRead(BaseModel):
    id: int
    proposal_id: int
    ai_score: float
    ai_recommendation: str
    ai_justification: str
    strengths: Optional[List[str]] = []
    weaknesses: Optional[List[str]] = []
    action_items: Optional[List[str]] = []
    final_recommendation: Optional[str] = None
    reviewer_id: Optional[int] = None
    reviewer_comments: Optional[str] = None
    is_overridden: bool
    decided_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DecisionOverrideRequest(BaseModel):
    final_recommendation: str  # accept | reject | revise_and_resubmit
    reviewer_comments: Optional[str] = None
