import { useState } from 'react';
import type { Decision, Recommendation } from '../../types';

interface Props {
  decision: Decision;
}

const REC_STYLES: Record<Recommendation, string> = {
  accept: 'bg-green-100 text-green-800',
  reject: 'bg-red-100 text-red-800',
  revise_and_resubmit: 'bg-orange-100 text-orange-800',
};

const REC_LABELS: Record<Recommendation, string> = {
  accept: 'Accept',
  reject: 'Reject',
  revise_and_resubmit: 'Revise & Resubmit',
};

export default function DecisionCard({ decision }: Props) {
  const [showJustification, setShowJustification] = useState(false);
  const displayRec = (decision.final_recommendation ?? decision.ai_recommendation) as Recommendation;

  return (
    <div>
      <div className="flex items-center gap-6 mb-4">
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-800">{decision.ai_score}</div>
          <div className="text-xs text-gray-500 mt-1">AI Score / 100</div>
        </div>
        <div>
          <span
            className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${REC_STYLES[displayRec]}`}
          >
            {REC_LABELS[displayRec]}
          </span>
          {decision.is_overridden && (
            <div className="text-xs text-gray-500 mt-1">Reviewer overrode AI recommendation</div>
          )}
        </div>
      </div>

      {/* Justification */}
      <div className="mb-4">
        <button
          className="text-sm font-medium text-mitacs-blue hover:underline"
          onClick={() => setShowJustification(!showJustification)}
        >
          {showJustification ? 'Hide' : 'Show'} Justification
        </button>
        {showJustification && (
          <p className="mt-2 text-sm text-gray-600 leading-relaxed border-t pt-2">
            {decision.ai_justification}
          </p>
        )}
      </div>

      {/* Strengths */}
      {decision.strengths?.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Strengths</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
            {decision.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {/* Weaknesses */}
      {decision.weaknesses?.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Weaknesses</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
            {decision.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Action items */}
      {decision.action_items?.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-1">Action Items for Revision</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
            {decision.action_items.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {/* Reviewer comments */}
      {decision.reviewer_comments && (
        <div className="mt-3 bg-blue-50 rounded p-3">
          <h4 className="text-sm font-medium text-blue-800 mb-1">Reviewer Comments</h4>
          <p className="text-sm text-blue-700">{decision.reviewer_comments}</p>
        </div>
      )}
    </div>
  );
}
