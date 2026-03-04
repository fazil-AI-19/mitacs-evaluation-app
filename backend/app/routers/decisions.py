from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_role
from app.database import get_db
from app.models.decision import Decision, Recommendation
from app.models.proposal import Proposal, ProposalStatus
from app.models.user import User, UserRole
from app.schemas.decision import DecisionOverrideRequest, DecisionRead

router = APIRouter(prefix="/decisions", tags=["decisions"])


@router.get("/{proposal_id}", response_model=DecisionRead)
def get_decision(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    decision = db.query(Decision).filter(Decision.proposal_id == proposal_id).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    # Applicants can only see decision once reviewer has finalized it
    if current_user.role == UserRole.applicant:
        proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if not proposal or proposal.applicant_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        if decision.decided_at is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Decision not yet finalized by reviewer",
            )
    return decision


@router.post("/{proposal_id}/override", response_model=DecisionRead)
def override_decision(
    proposal_id: int,
    payload: DecisionOverrideRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.reviewer)),
):
    decision = db.query(Decision).filter(Decision.proposal_id == proposal_id).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    try:
        final_rec = Recommendation(payload.final_recommendation)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid recommendation value: {payload.final_recommendation}",
        )

    is_overridden = final_rec != decision.ai_recommendation
    decision.final_recommendation = final_rec
    decision.reviewer_id = current_user.id
    decision.reviewer_comments = payload.reviewer_comments
    decision.is_overridden = is_overridden
    decision.decided_at = datetime.utcnow()

    # Update proposal status
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if proposal:
        proposal.status = ProposalStatus.decided

    db.commit()
    db.refresh(decision)
    return decision
