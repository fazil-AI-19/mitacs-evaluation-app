import asyncio
import logging
import traceback
from typing import Any, Dict

from app.database import SessionLocal
from app.models.proposal import Proposal, ProposalStatus

logger = logging.getLogger(__name__)


def _recompute_scores(results: Dict[str, Any], config: Dict[str, Any]) -> None:
    """
    Recompute completeness_score, final_score, and recommendation in Python
    so they always reflect the current config (enabled sections, weights,
    thresholds) regardless of what the LLM produced.
    """
    prelim = results.get("preliminary", {})
    research = results.get("research", {})
    decision = results.get("decision", {})

    # --- Completeness score ---
    sections_cfg = config.get("preliminary", {}).get("required_sections", [])
    enabled_keys = [s["key"] for s in sections_cfg if s.get("enabled", True)]
    if enabled_keys:
        sections_present = prelim.get("sections_present", {})
        present_count = sum(1 for k in enabled_keys if sections_present.get(k, False))
        completeness_score = round(present_count / len(enabled_keys) * 100, 1)
    else:
        completeness_score = 100.0
    prelim["completeness_score"] = completeness_score

    # --- Scientific score — recompute from config's non-policy, non-custom, non-disabled criteria ---
    scoring_criteria = [
        c for c in config.get("research_review", {}).get("criteria", [])
        if c.get("enabled", True) and not c.get("is_policy", False) and not c.get("is_custom", False)
    ]
    scoring_keys = [f"{c['key']}_score" for c in scoring_criteria]
    scores = [research.get(k, 0) for k in scoring_keys]
    active_scores = [s for s in scores if s > 0]
    if active_scores:
        avg = sum(active_scores) / len(active_scores)
        scientific_score = round(((avg - 1) / 4) * 80 + 20, 1)
    else:
        scientific_score = 0.0
    research["overall_scientific_score"] = scientific_score

    # --- Final score & recommendation ---
    decision_cfg = config.get("decision", {})
    weights = decision_cfg.get("weights", {"completeness": 0.5, "scientific": 0.5})
    thresholds = decision_cfg.get("thresholds", {"accept": 90, "revise_and_resubmit": 60})

    completeness_w = float(weights.get("completeness", 0.5))
    scientific_w = float(weights.get("scientific", 0.5))
    accept_t = float(thresholds.get("accept", 90))
    revise_t = float(thresholds.get("revise_and_resubmit", 60))

    final_score = round(completeness_score * completeness_w + scientific_score * scientific_w, 1)
    decision["final_score"] = final_score

    if final_score >= accept_t:
        decision["recommendation"] = "accept"
    elif final_score >= revise_t:
        decision["recommendation"] = "revise_and_resubmit"
    else:
        decision["recommendation"] = "reject"



async def run_crew_pipeline(proposal_id: int, docx_path: str) -> None:
    """
    Background task: run the CrewAI evaluation pipeline for a proposal.
    Called via FastAPI BackgroundTasks after upload.
    """
    db = SessionLocal()
    try:
        proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if not proposal:
            logger.error(f"Proposal {proposal_id} not found when starting pipeline")
            return

        # Mark as processing
        proposal.status = ProposalStatus.processing
        db.commit()

        # Import here to avoid circular load-time imports
        from app.crew.evaluation_crew import EvaluationCrew
        from app.routers.evaluation_config import get_or_create_config
        from app.services.decision_service import persist_crew_results

        eval_config = get_or_create_config(db)
        crew = EvaluationCrew(docx_path=docx_path, config=eval_config.config_data)

        # crew.kickoff() is synchronous — offload to thread pool
        loop = asyncio.get_event_loop()
        results: Dict[str, Any] = await loop.run_in_executor(
            None, crew.kickoff, proposal_id, docx_path
        )

        # Recompute scores in Python so they always match configured
        # sections, weights, and thresholds (regardless of LLM output)
        _recompute_scores(results, eval_config.config_data)

        await loop.run_in_executor(
            None,
            persist_crew_results,
            proposal_id,
            results["preliminary"],
            results["research"],
            results["decision"],
        )

    except Exception:
        logger.error(
            f"Pipeline failed for proposal {proposal_id}:\n{traceback.format_exc()}"
        )
        try:
            proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
            if proposal:
                proposal.status = ProposalStatus.error
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
