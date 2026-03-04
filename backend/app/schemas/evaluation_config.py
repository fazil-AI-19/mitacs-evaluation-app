from datetime import datetime
from typing import Any

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Default configuration — mirrors the current tasks.yaml values exactly.
# Stored in DB on first GET if no row exists.
# ---------------------------------------------------------------------------
DEFAULT_CONFIG: dict[str, Any] = {
    "preliminary": {
        "required_sections": [
            {"key": "executive_summary",    "label": "Executive Summary",           "enabled": True, "is_custom": False},
            {"key": "project_description",  "label": "Project Description",         "enabled": True, "is_custom": False},
            {"key": "research_objectives",  "label": "Research Objectives",         "enabled": True, "is_custom": False},
            {"key": "methodology",          "label": "Methodology",                 "enabled": True, "is_custom": False},
            {"key": "timeline",             "label": "Timeline",                    "enabled": True, "is_custom": False},
            {"key": "budget_justification", "label": "Budget Justification",        "enabled": True, "is_custom": False},
            {"key": "academic_partner",     "label": "Academic Partner Details",    "enabled": True, "is_custom": False},
            {"key": "industry_partner",     "label": "Industry/Non-profit Partner", "enabled": True, "is_custom": False},
            {"key": "expected_outcomes",    "label": "Expected Outcomes",           "enabled": True, "is_custom": False},
            {"key": "hqp_training_plan",    "label": "HQP Training Plan",           "enabled": True, "is_custom": False},
        ],
        "prompt_additions": "",
    },
    "research_review": {
        "criteria": [
            {"key": "technical_merit",            "label": "Technical Merit",            "enabled": True, "is_policy": False, "is_custom": False, "description": ""},
            {"key": "research_qualification",     "label": "Research Qualification",     "enabled": True, "is_policy": False, "is_custom": False, "description": ""},
            {"key": "objective_definition",       "label": "Objective Definition",       "enabled": True, "is_policy": False, "is_custom": False, "description": ""},
            {"key": "methodology",                "label": "Methodology",                "enabled": True, "is_policy": False, "is_custom": False, "description": ""},
            {"key": "work_plan_feasibility",      "label": "Work Plan Feasibility",      "enabled": True, "is_policy": False, "is_custom": False, "description": ""},
            {"key": "intern_development",         "label": "Intern Development",         "enabled": True, "is_policy": False, "is_custom": False, "description": ""},
            {"key": "indigenous_research_policy", "label": "Indigenous Research Policy", "enabled": True, "is_policy": True,  "is_custom": False, "description": ""},
            {"key": "research_security",          "label": "Research Security",          "enabled": True, "is_policy": True,  "is_custom": False, "description": ""},
        ],
        "prompt_additions": "",
    },
    "decision": {
        "weights": {
            "completeness": 0.5,
            "scientific": 0.5,
        },
        "thresholds": {
            "accept": 90,
            "revise_and_resubmit": 60,
        },
    },
}


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class EvaluationConfigRead(BaseModel):
    id: int
    config_data: dict[str, Any]
    updated_at: datetime

    model_config = {"from_attributes": True}


class EvaluationConfigUpdate(BaseModel):
    config_data: dict[str, Any]
