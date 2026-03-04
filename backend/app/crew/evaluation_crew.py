import os
from typing import Any

from crewai import Agent, Crew, LLM, Process, Task
from crewai.project import CrewBase, agent, crew, task
from app.crew.tools import DocxReadTool

from app.config import settings
from app.schemas.agent_outputs import (
    DecisionOutput,
    build_preliminary_output_model,
    build_research_output_model,
)
from app.schemas.evaluation_config import DEFAULT_CONFIG

# Resolve config directory paths relative to this file
_CONFIG_DIR = os.path.join(os.path.dirname(__file__), "config")

# ---------------------------------------------------------------------------
# Mapping of criterion key → full rubric block (injected into research task)
# ---------------------------------------------------------------------------
_CRITERION_RUBRICS: dict[str, str] = {
    "technical_merit": """    1. Technical Merit (technical_merit_score):
       - 5: Technically sound, rigorous, and scientifically excellent. Methods are
            well-justified with clear validation and risk mitigation.
       - 4: Mostly sound with minor gaps. Small technical uncertainties exist.
       - 3: Adequate but with notable technical weaknesses that need addressing.
       - 2: Significant technical gaps; core methods lack justification.
       - 1: Fundamentally flawed or unclear technical approach.
       - 0: DISABLED — assign 0 and comment "Disabled per reviewer configuration.\"""",

    "research_qualification": """    2. Research Qualification (research_qualification_score):
       Does this project qualify as research? Does it contribute to new knowledge
       rather than being a routine development or consulting activity?
       - 5: Clearly experimental/empirical/theoretical; strong contribution to knowledge.
       - 4: Qualifies as research; knowledge contribution reasonably demonstrated.
       - 3: Research qualification is present but contribution to knowledge is weak.
       - 2: Primarily development or application; minimal new knowledge generation.
       - 1: Does not qualify as research.
       - 0: DISABLED — assign 0 and comment "Disabled per reviewer configuration.\"""",

    "objective_definition": """    3. Objective Definition (objective_definition_score):
       Are the objectives well-defined and reasonable? Do they directly address the
       stated research problem?
       - 5: Objectives are SMART (specific, measurable, achievable, relevant, time-bound)
            and directly address the problem.
       - 4: Objectives are clear and reasonable with minor alignment gaps.
       - 3: Objectives are stated but partially vague or not fully addressing the problem.
       - 2: Objectives are ambiguous or misaligned with the stated problem.
       - 1: No clear objectives stated.
       - 0: DISABLED — assign 0 and comment "Disabled per reviewer configuration.\"""",

    "methodology": """    4. Methodology (methodology_score):
       Is the approach well-defined, detailed, and appropriate for achieving the objectives?
       - 5: Approach is detailed, well-justified, appropriate, with controls and contingencies.
       - 4: Approach is appropriate with minor methodological gaps.
       - 3: Approach is mentioned but lacks detail or justification.
       - 2: Approach is vague or inappropriate for the objectives.
       - 1: No methodology described.
       - 0: DISABLED — assign 0 and comment "Disabled per reviewer configuration.\"""",

    "work_plan_feasibility": """    5. Work Plan Feasibility (work_plan_feasibility_score):
       Is the work plan achievable given the proposed timeline and available resources
       (team expertise, equipment, budget)?
       - 5: Fully feasible; timeline and resources are well-matched to scope.
       - 4: Largely feasible with minor concerns about timeline or resources.
       - 3: Feasibility questionable; some tasks may be under-resourced or rushed.
       - 2: Significant feasibility concerns; timeline or resources clearly insufficient.
       - 1: Work plan is not feasible.
       - 0: DISABLED — assign 0 and comment "Disabled per reviewer configuration.\"""",

    "intern_development": """    6. Intern Development (intern_development_score):
       Does the project offer an appropriate and meaningful learning opportunity for an
       intern at their stated degree level (undergraduate, master's, PhD, postdoc)?
       - 5: Role is tailored to degree level, with clear mentorship and skills development plan.
       - 4: Good development opportunity; mentorship is adequate.
       - 3: Some development value but mentorship plan or degree-level alignment is weak.
       - 2: Intern role appears peripheral or not aligned with degree level.
       - 1: No meaningful intern development component.
       - 0: DISABLED — assign 0 and comment "Disabled per reviewer configuration.\"""",

    "indigenous_research_policy": """    7. Indigenous Research Policy (indigenous_research_policy_score):
       First determine applicability. Assign score 0 ONLY if the project has
       NO connection whatsoever to Indigenous peoples, communities, organisations,
       lands, data, or knowledge. Assign score 1-5 if ANY of the following
       triggers are present — even partially or implicitly:
         - Involvement of Indigenous communities, groups, or organisations
           (as partners, collaborators, co-designers, advisors, or beneficiaries)
         - Participation of Indigenous individuals as research subjects, knowledge
           holders, co-investigators, or co-applicants
         - Use of Indigenous traditional knowledge, cultural heritage, or
           community-held data
         - Research conducted on Indigenous lands or territories
         - Community co-design or co-governance of the research process
         - Research whose primary intended beneficiaries are Indigenous peoples
         - Explicit reference to Indigenous data sovereignty, governance principles,
           or self-determination in the proposal
       When in doubt, err on the side of assigning a compliance score (1-5) rather
       than 0. A genuine "Not Applicable" is only appropriate when the proposal
       contains no mention of Indigenous peoples, communities, or knowledge at all.
       - If NOT APPLICABLE (no Indigenous connection of any kind): assign score 0.
       - If APPLICABLE: assess all four sub-requirements:
         (a) Community support and respect for Indigenous culture and protocols
         (b) Collaborative research practices and partnership with Indigenous communities
         (c) Access and use governance for research outputs and data
         (d) Team experience/expertise in Indigenous research and intern mentorship plan
         Score 1-5 based on how thoroughly all four are addressed.
       - If DISABLED per reviewer config: assign 0 and comment "Disabled per reviewer configuration.\"""",

    "research_security": """    8. Research Security (research_security_score):
       Check whether any of these six flags apply to this proposal:
       (a) STRA (Security and Trust Risk Assessment) involvement required
       (b) Affiliations with Named Research Organizations (NROs) or high-risk foreign entities
       (c) Research involving critical minerals, critical infrastructure, or dual-use technology
       (d) Sensitive personal data collection or processing
       (e) Export-controlled goods, technologies, or software
       (f) Intellectual property transfer or licensing to a non-academic partner
       - If NONE of (a)-(f) apply: assign score 0 and note "Not Applicable".
       - If ANY flag applies: assess compliance with Mitacs Research Security Plan (Aug 2024):
         assess STRA/NRO declarations, IP protection clarity, and demonstrated benefits to Canada.
         Score 1-5 based on adequacy of security measures and disclosures.
       - If DISABLED per reviewer config: assign 0 and comment "Disabled per reviewer configuration.\"""",
}

# Ordered list of all criteria keys for consistent rendering
_CRITERIA_ORDER = [
    "technical_merit",
    "research_qualification",
    "objective_definition",
    "methodology",
    "work_plan_feasibility",
    "intern_development",
    "indigenous_research_policy",
    "research_security",
]


@CrewBase
class EvaluationCrew:
    """Three-stage Mitacs proposal evaluation crew."""

    agents_config = os.path.join(_CONFIG_DIR, "agents.yaml")
    tasks_config = os.path.join(_CONFIG_DIR, "tasks.yaml")

    def __init__(self, docx_path: str = "", config: dict | None = None):
        # Must be set before @CrewBase calls _initialize_crew_instance (which
        # invokes @agent methods and constructs DOCXSearchTool with this path).
        self._docx_path = docx_path
        self._config = config if config is not None else DEFAULT_CONFIG
        # temperature=0 ensures scores are consistent across repeated evaluations
        # of the same proposal. Uses the model configured in settings (LLM_MODEL env var).
        self._llm = LLM(model=settings.llm_model, temperature=0)

    # ------------------------------------------------------------------
    # Private helpers — build dynamic task descriptions from config
    # ------------------------------------------------------------------

    def _enabled_sections(self) -> list[dict]:
        return [
            s for s in self._config.get("preliminary", {}).get("required_sections", [])
            if s.get("enabled", True)
        ]

    def _enabled_criteria(self) -> set[str]:
        return {
            c["key"]
            for c in self._config.get("research_review", {}).get("criteria", [])
            if c.get("enabled", True)
        }

    def _build_preliminary_description(self) -> str:
        all_section_keys = [
            "executive_summary", "project_description", "research_objectives",
            "methodology", "timeline", "budget_justification", "academic_partner",
            "industry_partner", "expected_outcomes", "hqp_training_plan",
        ]
        enabled_sections = self._enabled_sections()
        enabled_keys = {s["key"] for s in enabled_sections}
        disabled_sections = [
            s for s in self._config.get("preliminary", {}).get("required_sections", [])
            if not s.get("enabled", True)
        ]

        if enabled_sections:
            section_list = ", ".join(s["label"] for s in enabled_sections)
        else:
            section_list = "(none — all sections have been disabled by the reviewer)"

        prompt_additions = self._config.get("preliminary", {}).get("prompt_additions", "").strip()

        description = (
            f"Read the research proposal document at the path provided. The file path is: {{docx_path}}\n\n"
            "Review the document for the following Mitacs requirements:\n\n"
            f"1. Presence of all REQUIRED sections (these are the ONLY sections you must check): {section_list}\n"
            "2. Eligibility: The PI must be a tenured or tenure-track faculty member at\n"
            "   a Canadian academic institution. An industry or non-profit partner must be\n"
            "   clearly identified with their role and cash or in-kind contribution stated.\n"
            "3. Formatting: The proposal should appear compliant with standard Mitacs\n"
            "   page and formatting guidelines.\n\n"
            "For each REQUIRED criterion, determine whether it PASSES or FAILS, and quote the\n"
            "relevant excerpt or note its absence. Produce a structured completeness report.\n\n"
        )

        if disabled_sections:
            disabled_labels = ", ".join(s["label"] for s in disabled_sections)
            disabled_keys = ", ".join(s["key"] for s in disabled_sections)
            description += (
                f"IMPORTANT — DISABLED SECTIONS (not required for this evaluation): {disabled_labels}\n"
                f"For the keys [{disabled_keys}] in sections_present, output false.\n"
                "Do NOT mention these disabled sections anywhere in the summary, "
                "eligibility_issues, or formatting_issues. Do NOT treat their absence "
                "as a deficiency. Do NOT penalize the proposal for not having these "
                "sections. Act as if these sections do not exist as requirements.\n\n"
            )

        description += (
            "The completeness_score should reflect ONLY the required (non-disabled) sections listed above. "
            "A proposal that has all required sections present should score near 100."
        )

        if prompt_additions:
            description += f"\n\nADDITIONAL REVIEWER INSTRUCTIONS:\n{prompt_additions}"

        return description

    def _build_research_description(self) -> str:
        all_criteria = self._config.get("research_review", {}).get("criteria", [])
        enabled_keys = self._enabled_criteria()

        # Partition into three groups using existing is_custom / is_policy flags
        standard_criteria = [
            c for c in all_criteria
            if not c.get("is_policy", False) and not c.get("is_custom", False)
        ]
        policy_criteria = [c for c in all_criteria if c.get("is_policy", False)]
        custom_criteria = [
            c for c in all_criteria
            if c.get("is_custom", False) and not c.get("is_policy", False)
        ]

        # --- Build STANDARD Mitacs scoring criteria blocks ---
        scoring_blocks = []
        for idx, c in enumerate(standard_criteria, start=1):
            key = c["key"]
            rubric = _CRITERION_RUBRICS.get(
                key,
                f"    {idx}. {c['label']} ({key}_score):\n"
                "       Assess quality and rigour. Score 1-5.",
            )
            if key not in enabled_keys:
                first_line = rubric.split("\n")[0]
                rubric = (
                    f"{first_line}\n"
                    "       DISABLED — assign score 0 and comment "
                    '"Disabled per reviewer configuration."'
                )
            scoring_blocks.append(rubric)

        # --- Build POLICY criteria blocks (unchanged logic) ---
        policy_blocks = []
        for c in policy_criteria:
            key = c["key"]
            if key in _CRITERION_RUBRICS:
                rubric = _CRITERION_RUBRICS[key]
            else:
                desc = c.get("description", "Assess compliance and score 0-5 (0 = Not Applicable).")
                rubric = f"    {c['label']} ({key}_score):\n       {desc}"
            if key not in enabled_keys:
                first_line = rubric.split("\n")[0]
                rubric = (
                    f"{first_line}\n"
                    "       DISABLED — assign score 0 and comment "
                    '"Disabled per reviewer configuration."'
                )
            policy_blocks.append(rubric)

        # --- Build CUSTOM criteria blocks (separate rubric framework) ---
        custom_blocks = []
        for idx, c in enumerate(custom_criteria, start=1):
            key = c["key"]
            if key not in enabled_keys:
                rubric = (
                    f"    {idx}. {c['label']} ({key}_score):\n"
                    "       DISABLED — assign score 0 and comment "
                    '"Disabled per reviewer configuration."'
                )
            else:
                desc = c.get("description", "").strip()
                if desc:
                    # User provided their own rubric — use it VERBATIM
                    rubric = (
                        f"    {idx}. {c['label']} ({key}_score):\n"
                        f"       REVIEWER-DEFINED RUBRIC: {desc}\n"
                        "       Apply the scoring rules above exactly as written by the reviewer.\n"
                        "       If the reviewer's rubric defines what each score level means, follow that.\n"
                        "       If it only defines endpoints (e.g. what deserves 5 and what deserves 1),\n"
                        "       interpolate intermediate scores proportionally."
                    )
                else:
                    # No description — use domain-relevance default
                    rubric = (
                        f"    {idx}. {c['label']} ({key}_score):\n"
                        f"       Assess whether the proposal's primary purpose, field of application, or\n"
                        f"       intended impact relates to '{c['label']}'.\n"
                        "       - 5: The proposal is directly and primarily about this domain.\n"
                        "       - 4: The proposal has strong, clear connections to this domain.\n"
                        "       - 3: The proposal has meaningful but partial relevance to this domain.\n"
                        "       - 2: The proposal has only tangential or incidental connection.\n"
                        "       - 1: The proposal has no meaningful relationship to this domain."
                    )
            custom_blocks.append(rubric)

        # Only standard (non-policy, non-custom) criteria count toward overall score
        active_scoring = [c["key"] for c in standard_criteria if c["key"] in enabled_keys]

        prompt_additions = self._config.get("research_review", {}).get("prompt_additions", "").strip()

        # ---- Assemble the full description ----
        description = (
            f"Read the research proposal document at the path provided. The file path is: {{docx_path}}\n\n"
            "IMPORTANT — DOCUMENT OVERVIEW FIRST:\n"
            "Before scoring ANY criterion, read the proposal's title, abstract/executive summary,\n"
            "and project description to understand the overall purpose, domain, and field of\n"
            "application. This overview context is essential for accurately scoring all criteria,\n"
            "especially custom criteria that assess domain relevance.\n\n"
            "Evaluate the proposal against the criteria below.\n"
            "Score each criterion and provide a written comment as described.\n\n"
        )

        # Section 1: Standard Mitacs criteria
        if scoring_blocks:
            description += "STANDARD MITACS SCORING CRITERIA (score 1-5 when enabled; score 0 if DISABLED):\n\n"
            description += "\n\n".join(scoring_blocks)
            description += (
                "\n\n    SCORING CALIBRATION (applies ONLY to the standard Mitacs criteria above):\n"
                "    A score of 5 is exceptional — only give 5 if the criterion is addressed\n"
                "    thoroughly with no meaningful gaps. Most real proposals have gaps; if you\n"
                "    find yourself giving mostly 4s and 5s, re-read the proposal more critically.\n"
                "    - Score 5: Excellent, no meaningful gaps.\n"
                "    - Score 4: Good, only minor gaps.\n"
                "    - Score 3: Adequate, but notable weaknesses present.\n"
                "    - Score 2: Significant deficiencies; missing key elements.\n"
                "    - Score 1: Fundamentally missing or flawed.\n"
                '    Before finalising any standard criteria score above 3, ask: "What specific\n'
                '    gap or weakness prevents a lower score?"\n\n'
            )

        # Section 2: Policy criteria
        if policy_blocks:
            description += "    POLICY CRITERIA (score 0-5; assign 0 if Not Applicable OR if DISABLED):\n\n"
            description += "\n\n".join(policy_blocks)
            description += "\n\n"

        # Section 3: Custom criteria — completely separate with own calibration
        if custom_blocks:
            description += (
                "    CUSTOM REVIEWER CRITERIA (score 1-5 when enabled; score 0 if DISABLED):\n\n"
                "    IMPORTANT: These criteria were defined by the reviewer and have DIFFERENT\n"
                "    scoring standards than the standard Mitacs criteria above. Do NOT apply the\n"
                '    strict Mitacs calibration ("most proposals score 2-3") to these criteria.\n'
                "    These criteria typically assess domain relevance, sector fit, or thematic\n"
                "    alignment — NOT academic rigour. Score each custom criterion according to\n"
                "    its own rubric definition below.\n\n"
                "    CRITICAL INSTRUCTION FOR CUSTOM CRITERIA:\n"
                "    - Base your assessment on the FULL proposal context (title, abstract, project\n"
                "      description, objectives, methodology) — not just semantic keyword matches.\n"
                "    - A proposal about 'beef cattle production using IoT sensors' IS about\n"
                "      'Agriculture or Farming Impact' even if those exact words never appear.\n"
                "    - Think about what the proposal DOES and WHO it benefits, not what keywords it uses.\n"
                "    - Before scoring below 3, ask yourself: 'Is this proposal genuinely unrelated\n"
                "      to this criterion\\'s domain?' If you cannot confidently say yes, score 3+.\n\n"
            )
            description += "\n\n".join(custom_blocks)
            description += "\n\n"

        # Comment instructions (applies to all)
        description += (
            "    COMMENT INSTRUCTIONS for all criteria:\n"
            "    - Start each comment by stating what evidence you found (or did not find).\n"
            "    - Cite specific evidence from the proposal: quote directly, reference section\n"
            "      names/headings, or describe specific content you observed.\n"
            "    - Do NOT write vague comments like 'the proposal does not address this criterion.'\n"
            "      Instead, specify what you searched for and what was present or absent.\n"
            "    - For any enabled standard criterion with score 1-4: include at least two\n"
            "      specific actionable improvement steps that reference what is missing.\n"
            "    - For policy criteria scoring 1-4: address each applicable sub-requirement\n"
            "      and include actionable steps.\n"
            "    - For policy criteria scoring 0: briefly state why the criterion is not applicable.\n"
            "    - For custom criteria: explain how the proposal relates (or does not relate) to\n"
            "      the criterion's domain, citing specific proposal content as evidence.\n"
            "    - For any DISABLED criterion (score 0): comment \"Disabled per reviewer configuration.\"\n\n"
        )

        # Overall score — only standard criteria
        description += (
            "    OVERALL SCORE:\n"
            "    Compute overall_scientific_score as the average of ENABLED standard scoring\n"
            "    (non-policy, non-custom) criteria only\n"
            f"    (currently enabled: {', '.join(active_scoring) if active_scoring else 'none'}),\n"
            "    then scale to 0-100 proportionally where 5=100 and 1=20.\n"
            "    Formula: ((sum_of_enabled_scores / count_of_enabled) - 1) / 4 * 80 + 20.\n"
            "    Do NOT include policy criteria or custom criteria in this calculation.\n"
            "    Note: The system will recompute this in Python; provide your best estimate."
        )

        if prompt_additions:
            description += f"\n\nADDITIONAL REVIEWER INSTRUCTIONS:\n{prompt_additions}"

        return description

    def _build_research_expected_output(self, criteria: list[dict]) -> str:
        """Build an expected_output string that lists ALL configured criteria fields."""
        score_lines = []
        comment_keys = []
        for c in criteria:
            key = c["key"]
            label = c["label"]
            is_policy = c.get("is_policy", False)
            is_custom = c.get("is_custom", False)

            if is_policy:
                score_lines.append(f"- {key}_score: integer 0-5 (0 = Not Applicable or Disabled)")
            elif is_custom:
                score_lines.append(f"- {key}_score: integer 1-5 (0 only if Disabled; per custom rubric)")
            else:
                score_lines.append(f"- {key}_score: integer 1-5 (0 only if Disabled)")
            comment_keys.append(f'"{key}"')

        scores_block = "\n    ".join(score_lines)
        comments_block = ", ".join(comment_keys)

        return (
            "A JSON object with these exact fields:\n"
            f"    {scores_block}\n"
            f"    - criteria_comments: object with keys {comments_block},\n"
            "      each mapping to a string comment explaining the score with evidence\n"
            "    - overall_scientific_score: number 0-100 (average of enabled standard "
            "criteria only, scaled proportionally)\n"
            "    - summary: string with a narrative summary of the overall scientific "
            "merit assessment including the proposal's primary domain"
        )

    def _build_decision_description(self) -> str:
        decision_cfg = self._config.get("decision", {})
        weights = decision_cfg.get("weights", {"completeness": 0.5, "scientific": 0.5})
        thresholds = decision_cfg.get("thresholds", {"accept": 90, "revise_and_resubmit": 60})

        completeness_w = weights.get("completeness", 0.5)
        scientific_w = weights.get("scientific", 0.5)
        accept_t = thresholds.get("accept", 90)
        revise_t = thresholds.get("revise_and_resubmit", 60)

        return (
            "Using the completeness review and scientific merit review outputs provided\n"
            f"as context, produce a final evaluation for proposal ID {{proposal_id}}.\n\n"
            f"Scoring weights:\n"
            f"- Completeness score (from preliminary review): {int(completeness_w * 100)}%\n"
            f"- Scientific merit score (from research review): {int(scientific_w * 100)}%\n\n"
            f"Compute: final_score = (completeness_score * {completeness_w}) + (overall_scientific_score * {scientific_w})\n"
            "Round to one decimal place.\n\n"
            "Apply decision thresholds:\n"
            f"- final_score >= {accept_t}: recommendation = \"accept\"\n"
            f"- final_score >= {revise_t} and < {accept_t}: recommendation = \"revise_and_resubmit\"\n"
            f"- final_score < {revise_t}: recommendation = \"reject\"\n\n"
            "Write a detailed justification (at least 150 words) explaining the score,\n"
            "highlighting the proposal strengths, and listing specific actionable items\n"
            "for revision if applicable."
        )

    # ------------------------------------------------------------------
    # Agents
    # ------------------------------------------------------------------

    @agent
    def preliminary_review_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["preliminary_review_agent"],
            llm=self._llm,
            tools=[DocxReadTool(docx_path=self._docx_path)],
        )

    @agent
    def research_review_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["research_review_agent"],
            llm=self._llm,
            tools=[DocxReadTool(docx_path=self._docx_path)],
        )

    @agent
    def decision_agent(self) -> Agent:
        return Agent(
            config=self.agents_config["decision_agent"],
            llm=self._llm,
        )

    # ------------------------------------------------------------------
    # Tasks — descriptions injected from config at construction time
    # ------------------------------------------------------------------

    @task
    def preliminary_review_task(self) -> Task:
        base_cfg = dict(self.tasks_config["preliminary_review_task"])
        base_cfg["description"] = self._build_preliminary_description()
        sections = self._config.get("preliminary", {}).get("required_sections", [])
        return Task(
            config=base_cfg,
            output_pydantic=build_preliminary_output_model(sections),
        )

    @task
    def research_review_task(self) -> Task:
        base_cfg = dict(self.tasks_config["research_review_task"])
        base_cfg["description"] = self._build_research_description()
        criteria = self._config.get("research_review", {}).get("criteria", [])
        base_cfg["expected_output"] = self._build_research_expected_output(criteria)
        return Task(
            config=base_cfg,
            output_pydantic=build_research_output_model(criteria),
        )

    @task
    def decision_task(self) -> Task:
        base_cfg = dict(self.tasks_config["decision_task"])
        base_cfg["description"] = self._build_decision_description()
        return Task(
            config=base_cfg,
            output_pydantic=DecisionOutput,
        )

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
        )

    def kickoff(self, proposal_id: int, docx_path: str) -> dict[str, Any]:
        """
        Run the full evaluation pipeline.
        Returns a dict with keys: preliminary, research, decision
        (each a dict from the respective Pydantic model).
        """
        crew_instance = self.crew()
        crew_instance.kickoff(
            inputs={"proposal_id": proposal_id, "docx_path": docx_path}
        )

        # Extract structured outputs from each task
        preliminary_output = crew_instance.tasks[0].output
        research_output = crew_instance.tasks[1].output
        decision_output = crew_instance.tasks[2].output

        def to_dict(task_output) -> dict:
            if hasattr(task_output, "pydantic") and task_output.pydantic:
                return task_output.pydantic.model_dump()
            # Fallback: try to parse raw JSON output
            import json

            try:
                raw = task_output.raw or ""
                # Strip markdown code fences if present
                if "```" in raw:
                    lines = raw.split("\n")
                    raw = "\n".join(
                        l for l in lines if not l.strip().startswith("```")
                    )
                return json.loads(raw)
            except Exception:
                return {"raw": task_output.raw}

        return {
            "preliminary": to_dict(preliminary_output),
            "research": to_dict(research_output),
            "decision": to_dict(decision_output),
        }
