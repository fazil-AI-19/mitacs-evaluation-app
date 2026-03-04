from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel


class AgentReviewRead(BaseModel):
    id: int
    proposal_id: int
    review_type: str
    structured_output: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}
