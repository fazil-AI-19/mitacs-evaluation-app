from typing import List

from pydantic import BaseModel, Field, create_model


# ---------------------------------------------------------------------------
# Dynamic output model factories
#
# OpenAI structured output requires all properties to be explicitly declared
# (no open-ended dicts). These factories build Pydantic models at evaluation
# time from whatever sections / criteria the reviewer has configured.
# ---------------------------------------------------------------------------


def build_preliminary_output_model(sections: list[dict]) -> type[BaseModel]:
    """
    Build a PreliminaryReviewOutput model whose sections_present sub-model
    has exactly the fields matching the configured sections list.
    """
    section_fields: dict = {
        s["key"]: (bool, Field(description=f"Whether '{s['label']}' section is present"))
        for s in sections
    }
    SectionsPresentModel = create_model("SectionsPresent", **section_fields)

    return create_model(
        "PreliminaryReviewOutput",
        sections_present=(
            SectionsPresentModel,
            Field(description="Presence of each required Mitacs section"),
        ),
        eligibility_issues=(
            List[str],
            Field(description="Eligibility deficiencies found; empty list if none"),
        ),
        formatting_issues=(
            List[str],
            Field(description="Formatting problems found; empty list if none"),
        ),
        completeness_score=(
            float,
            Field(description="Structural completeness score 0-100"),
        ),
        summary=(
            str,
            Field(description="Short narrative summary of the completeness assessment"),
        ),
    )


def build_research_output_model(criteria: list[dict]) -> type[BaseModel]:
    """
    Build a ResearchReviewOutput model whose score fields and criteria_comments
    sub-model have exactly the fields matching the configured criteria list.
    """
    score_fields: dict = {}
    comment_fields: dict = {}

    for c in criteria:
        key, label = c["key"], c["label"]
        is_policy = c.get("is_policy", False)
        score_desc = (
            f"{label} compliance score. 0=Not Applicable, 1-5=compliance level."
            if is_policy
            else f"{label} score, 1-5. Assign 0 only if DISABLED per reviewer config."
        )
        score_fields[f"{key}_score"] = (
            int,
            Field(ge=0, le=5, description=score_desc),
        )
        comment_fields[key] = (
            str,
            Field(
                description=(
                    f"Written rationale for {label}. "
                    "Begin with the evidence found (or not found) in the proposal. "
                    "For scores 1-4: cite specific sections or quotes, then include "
                    "at least two actionable steps. "
                    "For score 5: cite what made it exceptional. "
                    "For score 0 (N/A or disabled): briefly state why."
                )
            ),
        )

    CriteriaCommentsModel = create_model("CriteriaComments", **comment_fields)

    return create_model(
        "ResearchReviewOutput",
        **score_fields,
        criteria_comments=(
            CriteriaCommentsModel,
            Field(description="Written rationale for each of the evaluation criteria"),
        ),
        overall_scientific_score=(
            float,
            Field(
                default=0.0,
                description=(
                    "Overall scientific merit score 0-100, computed as the average of "
                    "non-policy, enabled criteria scaled proportionally (5=100, 1=20). "
                    "Do NOT include policy criteria in this calculation. "
                    "Python will recompute this; provide your best estimate."
                ),
            ),
        ),
        summary=(
            str,
            Field(description=(
                "Narrative summary of the scientific merit assessment. Include: "
                "(1) the proposal's primary research domain and application area, "
                "(2) key strengths across the evaluated criteria, "
                "(3) most critical weaknesses or gaps, and "
                "(4) an overall assessment of readiness for funding. "
                "This summary should give a reviewer a quick understanding of what "
                "the proposal is about and how well it scored."
            )),
        ),
    )


# ---------------------------------------------------------------------------
# DecisionOutput — static (not affected by config)
# ---------------------------------------------------------------------------


class DecisionOutput(BaseModel):
    proposal_id: int = Field(description="Database ID of the evaluated proposal")
    final_score: float = Field(description="Weighted final score 0-100")
    recommendation: str = Field(
        description="Exactly one of: accept, reject, revise_and_resubmit"
    )
    justification: str = Field(
        description="Detailed written justification for the decision (minimum 150 words)"
    )
    strengths: List[str] = Field(
        description="Notable strengths identified in the proposal; empty list if none"
    )
    weaknesses: List[str] = Field(
        description="Significant weaknesses or gaps; empty list if none"
    )
    action_items: List[str] = Field(
        description="Specific actionable revision items; empty list for accept or reject"
    )
