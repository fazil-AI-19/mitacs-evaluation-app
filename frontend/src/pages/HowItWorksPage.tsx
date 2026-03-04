import Navbar from '../components/layout/Navbar';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">How it Works</h1>
          <p className="text-sm text-gray-500">
            Technical overview of how proposals are evaluated using AI agents.
          </p>
        </div>

        {/* Pipeline Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Pipeline Overview</h2>
          <p className="text-sm text-gray-500 mb-6">
            When a proposal is uploaded, the system automatically runs a three-stage AI
            evaluation using <span className="font-medium text-gray-700">CrewAI</span> — a
            framework that orchestrates multiple specialized AI agents working sequentially.
            Each agent reads the uploaded{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">.docx</code> file and produces
            a structured output that feeds into the next stage.
          </p>
          <ol className="space-y-5">
            {[
              {
                step: '1',
                color: 'bg-mitacs-blue',
                title: 'Upload & Queue',
                body: 'The proposal file is saved to disk and the evaluation is queued as a background task. The proposal status changes to "Processing" immediately, so the reviewer can see it is being evaluated.',
              },
              {
                step: '2',
                color: 'bg-purple-500',
                title: 'Agent 1 — Preliminary Review',
                body: 'Checks whether all required sections are present, verifies PI eligibility (tenured/tenure-track faculty at a Canadian institution), and confirms an industry or non-profit partner is identified with a stated contribution. Produces a completeness score (0–100%) based on how many enabled required sections are present.',
              },
              {
                step: '3',
                color: 'bg-indigo-500',
                title: 'Agent 2 — Research Review',
                body: 'Scores the proposal against each enabled evaluation criterion (1–5 per criterion) and writes an evidence-based comment for each. Three types of criteria exist: Standard (academic rigour), Policy (compliance, e.g. Indigenous Research Policy), and Custom (reviewer-defined, e.g. sector fit).',
              },
              {
                step: '4',
                color: 'bg-teal-500',
                title: 'Agent 3 — Decision',
                body: 'Synthesizes both reviews to produce a final score, a recommendation (Accept / Revise & Resubmit / Reject), a written justification, and lists of strengths, weaknesses, and action items.',
              },
              {
                step: '5',
                color: 'bg-gray-500',
                title: 'Score Recomputation',
                body: 'After the agents complete, the system recalculates all scores in Python — independently of the LLM — to guarantee they always reflect your current configuration (enabled sections, weights, thresholds). The LLM estimate is replaced with the authoritative computed value.',
              },
              {
                step: '6',
                color: 'bg-green-600',
                title: 'Reviewer Decision',
                body: 'Results are stored and the proposal status changes to "Reviewed". The human reviewer sees the AI decision at the top of the review page, and can accept or override the recommendation before the applicant is notified.',
              },
            ].map(({ step, color, title, body }) => (
              <li key={step} className="flex gap-4">
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full ${color} text-white text-xs font-bold flex items-center justify-center mt-0.5`}
                >
                  {step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Criterion types */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Criterion Types</h2>
          <p className="text-sm text-gray-500 mb-4">
            The Research Review agent handles three categories of criteria with different scoring rules.
          </p>
          <div className="space-y-4">
            <div className="border border-gray-100 rounded-md p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Standard Criteria{' '}
                <span className="font-normal text-gray-400">(score 1–5)</span>
              </p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Core Mitacs academic merit criteria — Technical Merit, Research Qualification,
                Objective Definition, Methodology, Work Plan Feasibility, and Intern Development.
                Scored with strict calibration where 5 is exceptional and most real proposals
                land between 2–4. These are the only criteria that count toward the Scientific
                Merit Score.
              </p>
            </div>
            <div className="border border-gray-100 rounded-md p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Policy Criteria{' '}
                <span className="font-normal text-gray-400">(score 0–5, where 0 = Not Applicable)</span>
              </p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Compliance criteria such as Indigenous Research Policy and Research Security.
                The agent first determines whether the criterion applies to this proposal at all.
                If it does not apply (e.g. no Indigenous connection), the agent assigns 0 and notes
                "Not Applicable". Policy scores are excluded from the Scientific Merit Score average.
              </p>
            </div>
            <div className="border border-gray-100 rounded-md p-4">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Custom Criteria{' '}
                <span className="font-normal text-gray-400">(score 1–5, reviewer-defined rubric)</span>
              </p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Added by reviewers in the Evaluation Config page. Custom criteria assess domain
                relevance or sector fit, not academic rigour. If you provide a scoring rubric,
                the agent follows it exactly. If you leave the rubric blank, the agent assesses
                how directly the proposal's purpose and intended impact relate to the criterion's
                domain. Custom scores are not included in the Scientific Merit Score.
              </p>
            </div>
          </div>
        </div>

        {/* Score formula */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Score Calculation</h2>
          <p className="text-sm text-gray-500 mb-4">
            All scores are recomputed deterministically in Python after the AI agents finish.
          </p>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-36 font-medium text-gray-700">Completeness</span>
              <span className="text-gray-500">
                % of enabled required sections present in the proposal (0–100).
              </span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-36 font-medium text-gray-700">Scientific Merit</span>
              <span className="text-gray-500">
                Average of enabled <em>standard</em> criteria scores (1–5), scaled to 0–100 using{' '}
                <code className="bg-gray-100 px-1 rounded text-xs">((avg − 1) / 4) × 80 + 20</code>.
                Policy and Custom criteria are excluded.
              </span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-36 font-medium text-gray-700">Final Score</span>
              <span className="text-gray-500">
                <code className="bg-gray-100 px-1 rounded text-xs">
                  (Completeness × completeness weight) + (Scientific × scientific weight)
                </code>
                . Weights are configured in the Decision tab.
              </span>
            </div>
            <div className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-36 font-medium text-gray-700">Recommendation</span>
              <span className="text-gray-500">
                Final score is compared to Accept and Revise &amp; Resubmit thresholds
                (configurable in the Decision tab) to produce Accept / Revise &amp; Resubmit / Reject.
              </span>
            </div>
          </div>
        </div>

        {/* Config effect note */}
        <div className="bg-mitacs-light border border-mitacs-blue/20 rounded-lg p-4 text-sm text-mitacs-navy">
          <p className="font-semibold mb-1">Configuration takes effect immediately</p>
          <p className="leading-relaxed text-mitacs-navy/80">
            Changes saved in the Evaluation Config page (enabling/disabling criteria, updating weights
            or thresholds, adding custom criteria) apply to the <em>next</em> proposal uploaded.
            Already-evaluated proposals are not re-scored. Deleting a criterion removes it from all
            future evaluations — the LLM will not be asked to score it and it will not appear in results.
          </p>
        </div>
      </main>
    </div>
  );
}
