# Evaluation Pipeline

Technical reference for the Mitacs Accelerate proposal evaluation pipeline. Covers the full lifecycle from upload through AI evaluation to reviewer decision.

---

## Overview

When a proposal is uploaded, a three-stage CrewAI pipeline runs automatically in the background. Three specialised AI agents work sequentially — each reads the uploaded `.docx` file and produces structured Pydantic output that feeds into the next stage. After all agents complete, all scores are recomputed deterministically in Python to ensure consistency regardless of LLM variance.

```
Upload → [Agent 1: Preliminary Review] → [Agent 2: Research Review] → [Agent 3: Decision] → Score Recomputation → Stored Results → Reviewer Action
```

---

## Stage 0 — Upload & Queue

**File:** `backend/app/routers/proposals.py`

1. The uploaded `.docx` is saved to disk at a UUID-named path under the configured uploads directory.
2. A `Proposal` database row is created with `status = pending`.
3. A FastAPI `BackgroundTask` is queued to call `run_crew_pipeline(proposal_id, docx_path)`.
4. The response is returned to the client immediately. The proposal status flips to `processing` at the start of the background task.

---

## Stage 1 — Preliminary Review Agent

**File:** `backend/app/crew/evaluation_crew.py` → `preliminary_review_agent` + `preliminary_review_task`

### What it checks

- **Section presence:** Whether each enabled required section is present in the document (configurable in the Preliminary Review tab).
- **PI eligibility:** The Principal Investigator must be tenured or tenure-track faculty at a Canadian academic institution.
- **Industry/non-profit partner:** A partner must be identified with their role and a stated cash or in-kind contribution.
- **Formatting compliance:** General assessment of standard Mitacs page and formatting guidelines.

### How the task description is built

`_build_preliminary_description()` reads `config.preliminary.required_sections` at runtime and injects:
- The list of enabled section labels that must be checked.
- Explicit instructions to mark disabled sections as `false` in `sections_present` and not to penalise the proposal for their absence.
- Any custom `prompt_additions` set by the reviewer.

### Output model

`build_preliminary_output_model(sections)` generates a Pydantic model dynamically from the sections list:
- `sections_present: Dict[str, bool]` — one key per configured section.
- `completeness_score: float` — LLM estimate (overwritten by Python in Stage 5).
- `eligibility_issues: List[str]`
- `formatting_issues: List[str]`
- `summary: str`

### Tool

`DOCXSearchTool` — semantic chunk search over the proposal using an embedded vector index. Each agent gets a uniquely named ChromaDB collection to prevent cross-contamination.

---

## Stage 2 — Research Review Agent

**File:** `backend/app/crew/evaluation_crew.py` → `research_review_agent` + `research_review_task`

### Criterion types

All criteria are configured in `config.research_review.criteria`. Each criterion has a `key`, `label`, `enabled` flag, and optionally `is_policy`, `is_custom`, and `description` fields.

| Type | `is_policy` | `is_custom` | Score range | Counts toward Scientific Merit score? |
|---|---|---|---|---|
| Standard | `false` | `false` | 1–5 | **Yes** |
| Policy | `true` | `false` | 0–5 (0 = N/A) | No |
| Custom | `false` | `true` | 1–5 | No |

### Standard criteria (built-in)

Six core Mitacs academic merit criteria with hardcoded rubrics in `_CRITERION_RUBRICS`:

| # | Key | What is assessed |
|---|---|---|
| 1 | `technical_merit` | Soundness and rigour of methods; risk mitigation |
| 2 | `research_qualification` | Does the project generate new knowledge vs. routine development? |
| 3 | `objective_definition` | Are objectives SMART and aligned to the research problem? |
| 4 | `methodology` | Is the approach detailed, justified, and appropriate? |
| 5 | `work_plan_feasibility` | Timeline and resources matched to scope |
| 6 | `intern_development` | Meaningful learning opportunity at the correct degree level |

**Scoring calibration (standard criteria only):** 5 is exceptional (no gaps). Most real proposals land 2–4. The agent is instructed to re-read critically if scoring mostly 4s and 5s, and to ask "What specific gap prevents a lower score?" before finalising any score above 3.

### Policy criteria (built-in)

Two compliance criteria that use a 0–5 scale where 0 = Not Applicable:

**Indigenous Research Policy (`indigenous_research_policy`):**
Score 0 only if the project has no connection to Indigenous peoples, communities, lands, data, or knowledge. When applicable, the agent assesses four sub-requirements: (a) community support and respect for culture/protocols, (b) collaborative practices and partnership, (c) access and use governance for outputs/data, (d) team experience in Indigenous research and intern mentorship. The agent errs toward applicability when in doubt.

**Research Security (`research_security`):**
Score 0 only if none of six flags apply: (a) STRA involvement, (b) NRO affiliations or high-risk foreign entities, (c) critical minerals/infrastructure/dual-use technology, (d) sensitive personal data, (e) export-controlled goods or software, (f) IP transfer to a non-academic partner. When any flag applies, compliance with the Mitacs Research Security Plan (Aug 2024) is assessed.

Policy scores are excluded from the Scientific Merit Score average.

### Custom criteria

Added by reviewers in the Research Review config tab. Custom criteria assess domain relevance or sector fit, not academic rigour.

**With reviewer rubric:** The agent uses the `description` field verbatim, prefixed as `REVIEWER-DEFINED RUBRIC:`. If only endpoints are defined (e.g. what scores 5 and what scores 1), intermediate scores are interpolated proportionally.

**Without rubric:** The agent assesses how directly the proposal's purpose, field of application, and intended impact relate to the criterion's domain:
- 5: The proposal is directly and primarily about this domain.
- 3: The proposal has meaningful but partial relevance.
- 1: No meaningful relationship.

**Important:** Custom criteria use a different calibration than standard criteria. The agent is explicitly told not to apply the strict Mitacs 2–3 average calibration. It must reason about what the proposal *does* and *who it benefits*, not just keyword matching. Before scoring below 3, the agent must ask: "Is this proposal genuinely unrelated to this domain?"

Custom scores are not included in the Scientific Merit Score.

### How the task description is built

`_build_research_description()` at runtime:
1. Partitions criteria into standard, policy, and custom groups.
2. For each criterion: injects the full rubric block (from `_CRITERION_RUBRICS` for built-ins, or verbatim reviewer description for custom).
3. Disabled criteria receive a stub: assign score 0, comment "Disabled per reviewer configuration."
4. Prepends a **"DOCUMENT OVERVIEW FIRST"** instruction — the agent must read the title, abstract/executive summary, and project description before scoring anything.
5. Adds separate scoring calibration sections: strict calibration for standard, domain-relevance guidance for custom.
6. Comment instructions apply to all criteria: evidence-based, cite specific sections/quotes, no vague statements, two actionable steps for scores 1–4.

### Expected output

`_build_research_expected_output(criteria)` generates a dynamic `expected_output` string listing every criterion field by name. This is injected into the task at creation time to prevent the LLM from hallucinating or omitting fields.

### Output model

`build_research_output_model(criteria)` in `backend/app/schemas/agent_outputs.py` generates a Pydantic model dynamically:
- `{key}_score: int` — one field per criterion in the current config.
- `criteria_comments: Dict[str, str]` — one comment per criterion.
- `overall_scientific_score: float` — LLM estimate (overwritten by Python in Stage 5).
- `summary: str` — includes primary domain, key strengths, critical weaknesses, and readiness assessment.

Only criteria present in the current config produce fields. Deleted criteria have no fields in the model and are never scored.

---

## Stage 3 — Decision Agent

**File:** `backend/app/crew/evaluation_crew.py` → `decision_agent` + `decision_task`

Receives preliminary and research review outputs as context. The task description is built by `_build_decision_description()`, which injects the configured weights and thresholds from the live config so the agent's reasoning matches the Python recomputation.

Output (static `DecisionOutput` Pydantic model):
- `final_score: float` — overwritten by Python in Stage 5.
- `recommendation: Recommendation` — `accept` | `revise_and_resubmit` | `reject` — overwritten by Python.
- `ai_justification: str` — minimum 150 words explaining the score.
- `strengths: List[str]`
- `weaknesses: List[str]`
- `action_items: List[str]`

---

## Stage 4 — Score Recomputation

**File:** `backend/app/services/proposal_service.py` → `_recompute_scores()`

After all three agents complete, scores are recalculated in Python using the live saved config. LLM estimates are replaced. This guarantees determinism regardless of LLM variance across runs.

### Completeness score

```
completeness_score = (sections_present_count / enabled_sections_count) × 100
```

Disabled and deleted sections do not contribute.

### Scientific Merit score

Only enabled standard (non-policy, non-custom) criteria are included:

```
eligible_scores = [score for each enabled standard criterion where score > 0]
avg = mean(eligible_scores)
scientific_score = ((avg − 1) / 4) × 80 + 20
```

Scale: avg 1.0 → score 20, avg 3.0 → score 60, avg 5.0 → score 100.

Disabled criteria (score 0) are excluded from the average. Policy and Custom criteria are always excluded.

### Final score and recommendation

```
final_score = (completeness_score × completeness_weight) + (scientific_score × scientific_weight)
```

Weights and thresholds are read from the live config (configurable in the Decision tab):

| Final Score | Recommendation |
|---|---|
| ≥ accept threshold (default 90) | Accept |
| ≥ revise threshold (default 60) | Revise & Resubmit |
| < revise threshold | Reject |

---

## Stage 5 — Persist & Update Status

**File:** `backend/app/services/decision_service.py` → `persist_crew_results()`

- Preliminary review stored as an `AgentReview` row (`review_type = "preliminary"`).
- Research review stored as an `AgentReview` row (`review_type = "research"`).
- Decision stored as a `Decision` row with `ai_recommendation`, `ai_score`, `ai_justification`, `strengths`, `weaknesses`, `action_items`.
- Proposal `status` updated to `reviewed`.

---

## Stage 6 — Reviewer Action

The reviewer sees the AI Decision and Reviewer Decision panels at the top of the proposal detail page. The AI recommendation is pre-populated in the override form. The reviewer can:

- Accept the AI recommendation as-is (submit the form without changing the dropdown).
- Override the recommendation by selecting a different value and optionally adding reviewer comments.
- Submit to finalize — this sets `decided_at`, `final_recommendation`, `is_overridden`, and `reviewer_comments` on the Decision row.

---

## Configuration Effects

Config lives in the `evaluation_config` table as a JSON blob. It is read fresh at the start of each pipeline run via `get_or_create_config(db)`. Changes apply to the **next uploaded proposal** — already-evaluated proposals are not re-scored.

| Config change | Effect on future proposals |
|---|---|
| **Disable a criterion** | Agent receives stub instruction: score 0, comment "Disabled". Excluded from scientific average |
| **Delete a criterion** | Agent never sees it; no field in Pydantic model; not in any score calculation |
| **Add a custom criterion** | Agent scores it in a separate section with its own calibration; not in scientific average |
| **Add a custom section** | Checked for presence; counted in completeness score |
| **Disable a required section** | Marked `false` in `sections_present`; not counted in completeness score |
| **Change weights** | Python recomputation uses new weights |
| **Change thresholds** | Recommendation boundaries use new thresholds |
| **Add prompt additions** | Appended to the relevant agent's task description |

---

## Error Handling

If any stage throws an exception, the proposal `status` is set to `error`. The full traceback is logged via the Python `logging` module. No partial results are persisted on failure.

---

## Tech Stack

| Component | Technology |
|---|---|
| API layer | FastAPI (Python) |
| Background task | FastAPI `BackgroundTasks` + `asyncio.run_in_executor` |
| AI orchestration | CrewAI |
| LLM | Configurable via `LLM_MODEL` env var; `temperature=0` for score consistency |
| Semantic document search | `DOCXSearchTool` (ChromaDB vector index, one collection per agent per proposal) |
| Structured output | Pydantic v2 dynamic models (`build_preliminary_output_model`, `build_research_output_model`) |
| Database | SQLite via SQLAlchemy ORM |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS 3 with Mitacs brand tokens |
