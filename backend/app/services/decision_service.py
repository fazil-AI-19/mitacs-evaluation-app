import logging
from typing import Any, Dict

from app.database import SessionLocal
from app.models.decision import Decision, Recommendation
from app.models.proposal import Proposal, ProposalStatus
from app.models.review import AgentReview, ReviewType

logger = logging.getLogger(__name__)


def persist_crew_results(
    proposal_id: int,
    preliminary_data: Dict[str, Any],
    research_data: Dict[str, Any],
    decision_data: Dict[str, Any],
) -> None:
    """
    Persist the three CrewAI output dicts to the database.
    Updates proposal status to awaiting_review on success.
    """
    db = SessionLocal()
    try:
        # Save preliminary review
        prelim_review = AgentReview(
            proposal_id=proposal_id,
            review_type=ReviewType.preliminary,
            structured_output=preliminary_data,
        )
        db.add(prelim_review)

        # Save research review
        research_review = AgentReview(
            proposal_id=proposal_id,
            review_type=ReviewType.research,
            structured_output=research_data,
        )
        db.add(research_review)

        # Map recommendation string to Recommendation enum
        rec_str = decision_data.get("recommendation", "reject").lower()
        try:
            recommendation = Recommendation(rec_str)
        except ValueError:
            recommendation = Recommendation.reject

        decision = Decision(
            proposal_id=proposal_id,
            ai_score=round(float(decision_data.get("final_score", 0)), 1),
            ai_recommendation=recommendation,
            ai_justification=decision_data.get("justification", ""),
            strengths=decision_data.get("strengths", []),
            weaknesses=decision_data.get("weaknesses", []),
            action_items=decision_data.get("action_items", []),
        )
        db.add(decision)

        # Update proposal status
        proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if proposal:
            proposal.status = ProposalStatus.awaiting_review

        db.commit()
        logger.info(f"Crew results persisted for proposal {proposal_id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to persist crew results for proposal {proposal_id}: {e}")
        raise
    finally:
        db.close()
