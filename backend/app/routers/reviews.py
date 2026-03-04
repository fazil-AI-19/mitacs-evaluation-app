from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.dependencies import require_role
from app.database import get_db
from app.models.review import AgentReview
from app.models.user import UserRole
from app.schemas.review import AgentReviewRead

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("/{proposal_id}", response_model=List[AgentReviewRead])
def get_reviews(
    proposal_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_role(UserRole.reviewer)),
):
    reviews = (
        db.query(AgentReview)
        .filter(AgentReview.proposal_id == proposal_id)
        .order_by(AgentReview.created_at)
        .all()
    )
    return reviews
