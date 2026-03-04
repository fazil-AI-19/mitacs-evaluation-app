import { useState } from 'react';
import { overrideDecision } from '../../api/decisions';
import type { Decision, Recommendation } from '../../types';

interface Props {
  decision: Decision;
  onUpdate: (updated: Decision) => void;
}

const OPTIONS: { value: Recommendation; label: string }[] = [
  { value: 'accept', label: 'Accept' },
  { value: 'reject', label: 'Reject' },
  { value: 'revise_and_resubmit', label: 'Revise & Resubmit' },
];

export default function ReviewerOverrideForm({ decision, onUpdate }: Props) {
  const [recommendation, setRecommendation] = useState<Recommendation>(
    decision.ai_recommendation
  );
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(!!decision.decided_at);
  const [error, setError] = useState<string | null>(null);

  if (submitted && decision.decided_at) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-4 text-sm text-green-800">
        Decision finalized on {new Date(decision.decided_at).toLocaleString()}.
        Final recommendation: <strong>{recommendation}</strong>.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      const updated = await overrideDecision(decision.proposal_id, recommendation, comments);
      onUpdate(updated);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to submit decision');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold text-gray-800">Reviewer Decision</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Final Recommendation
        </label>
        <select
          value={recommendation}
          onChange={(e) => setRecommendation(e.target.value as Recommendation)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitacs-focus"
        >
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
              {opt.value === decision.ai_recommendation ? ' (AI recommended)' : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Reviewer Comments (optional)
        </label>
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitacs-focus"
          placeholder="Add any additional comments for the applicant..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-mitacs-blue hover:bg-mitacs-navy disabled:opacity-50 text-white font-medium py-2 px-6 rounded transition"
      >
        {loading ? 'Submitting...' : 'Finalize Decision'}
      </button>
    </form>
  );
}
