import type { PreliminaryReview } from '../../types';

interface Props {
  review: PreliminaryReview;
  enabledSections: Set<string> | null;
}

export default function PreliminaryReviewPanel({ review, enabledSections }: Props) {
  const sectionLabels: Record<string, string> = {
    executive_summary: 'Executive Summary',
    project_description: 'Project Description',
    research_objectives: 'Research Objectives',
    methodology: 'Methodology',
    timeline: 'Timeline',
    budget_justification: 'Budget Justification',
    academic_partner: 'Academic Partner',
    industry_partner: 'Industry Partner',
    expected_outcomes: 'Expected Outcomes',
    hqp_training_plan: 'HQP Training Plan',
  };

  return (
    <div>
      <h3 className="font-semibold text-gray-800 mb-3">Preliminary Review</h3>

      {/* Score */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Completeness Score</span>
          <span className="font-medium">{review.completeness_score.toFixed(0)}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-mitacs-blue h-2 rounded-full transition-all"
            style={{ width: `${review.completeness_score}%` }}
          />
        </div>
      </div>

      {/* Sections checklist */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Required Sections</h4>
        <ul className="space-y-1">
          {Object.entries(review.sections_present).map(([key, present]) => {
            const isDisabled = enabledSections !== null && !enabledSections.has(key);

            if (isDisabled) {
              return (
                <li key={key} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">—</span>
                  <span className="text-gray-400 line-through">
                    {sectionLabels[key] ?? key}
                  </span>
                  <span className="text-xs text-gray-400 italic">not required</span>
                </li>
              );
            }

            return (
              <li key={key} className="flex items-center gap-2 text-sm">
                <span className={present ? 'text-green-600' : 'text-red-600'}>
                  {present ? '✓' : '✗'}
                </span>
                <span className={present ? 'text-gray-700' : 'text-red-700'}>
                  {sectionLabels[key] ?? key}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Eligibility issues */}
      {review.eligibility_issues.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Eligibility Issues</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
            {review.eligibility_issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Formatting issues */}
      {review.formatting_issues.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Formatting Issues</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-orange-700">
            {review.formatting_issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-1">Summary</h4>
        <p className="text-sm text-gray-600 leading-relaxed">{review.summary}</p>
      </div>
    </div>
  );
}
