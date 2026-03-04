import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProposalById, downloadProposal } from '../../api/proposals';
import { getReviewsForProposal } from '../../api/reviews';
import { getDecision } from '../../api/decisions';
import { getConfig } from '../../api/config';
import Navbar from '../../components/layout/Navbar';
import ProposalStatusBadge from '../../components/proposals/ProposalStatusBadge';
import PreliminaryReviewPanel from '../../components/reviews/PreliminaryReviewPanel';
import ResearchReviewPanel from '../../components/reviews/ResearchReviewPanel';
import DecisionCard from '../../components/decisions/DecisionCard';
import ReviewerOverrideForm from '../../components/decisions/ReviewerOverrideForm';
import type {
  AgentReview,
  Decision,
  EvaluationConfig,
  Proposal,
  PreliminaryReview,
  ResearchReview,
} from '../../types';

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const proposalId = Number(id);

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [reviews, setReviews] = useState<AgentReview[]>([]);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [evalConfig, setEvalConfig] = useState<EvaluationConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([
      getProposalById(proposalId),
      getReviewsForProposal(proposalId).catch(() => [] as AgentReview[]),
      getDecision(proposalId).catch(() => null),
      getConfig().catch(() => null),
    ])
      .then(([p, r, d, cfg]) => {
        setProposal(p);
        setReviews(r);
        setDecision(d);
        setEvalConfig(cfg);
      })
      .catch(() => setError('Failed to load proposal details'))
      .finally(() => setLoading(false));
  }, [proposalId]);

  const handleDownload = async () => {
    if (!proposal) return;
    setDownloading(true);
    try {
      await downloadProposal(proposalId, proposal.original_filename);
    } finally {
      setDownloading(false);
    }
  };

  const prelimReview = reviews.find((r) => r.review_type === 'preliminary');
  const researchReview = reviews.find((r) => r.review_type === 'research');

  const enabledSections: Set<string> | null = evalConfig
    ? new Set(
        evalConfig.preliminary.required_sections
          .filter((s) => s.enabled)
          .map((s) => s.key)
      )
    : null;

  const enabledCriteria = evalConfig?.research_review.criteria ?? [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center py-20 text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-4">
            {error ?? 'Proposal not found'}
          </div>
          <Link to="/reviewer/dashboard" className="mt-4 inline-block text-sm text-mitacs-blue hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isFinalized = !!(decision?.decided_at);
  const isProcessing = proposal.status === 'processing';

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-6">

        <Link to="/reviewer/dashboard" className="inline-flex items-center gap-1 text-sm text-mitacs-blue hover:underline">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{proposal.title}</h1>
            <ProposalStatusBadge status={proposal.status} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm text-gray-600 mb-4">
            <p><span className="font-medium text-gray-700">Applicant:</span> {proposal.applicant_name}</p>
            <p><span className="font-medium text-gray-700">Institution:</span> {proposal.institution}</p>
            <p>
              <span className="font-medium text-gray-700">Submitted:</span>{' '}
              {new Date(proposal.submitted_at).toLocaleString()}
            </p>
            <p className="flex items-center gap-1.5">
              <span className="font-medium text-gray-700">Proposal:</span>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="text-mitacs-blue hover:text-mitacs-navy hover:underline disabled:opacity-50 font-medium truncate max-w-xs"
                title={`Download ${proposal.original_filename}`}
              >
                {downloading ? 'Downloading...' : proposal.original_filename}
              </button>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 text-mitacs-blue flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </p>
          </div>
        </div>

        {/* Processing banner */}
        {isProcessing && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 flex items-center gap-2">
            <svg className="h-4 w-4 text-yellow-600 flex-shrink-0 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            The AI pipeline is currently processing this proposal. Please check back shortly.
          </div>
        )}

        {/* Decision section — shown up top when available */}
        {decision && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Decision */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-mitacs-blue"></span>
                AI Decision
              </h2>
              <DecisionCard decision={decision} />
            </div>

            {/* Reviewer Decision */}
            <div className={`bg-white shadow rounded-lg p-6 ${isFinalized ? 'border border-green-200' : 'border border-mitacs-light'}`}>
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${isFinalized ? 'bg-green-500' : 'bg-orange-400'}`}></span>
                Reviewer Decision
              </h2>
              <ReviewerOverrideForm decision={decision} onUpdate={setDecision} />
            </div>
          </div>
        )}

        {/* Reviews section */}
        {(prelimReview || researchReview) && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Detailed Reviews
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {prelimReview?.structured_output && (
                <div className="bg-white shadow rounded-lg p-6">
                  <PreliminaryReviewPanel
                    review={prelimReview.structured_output as PreliminaryReview}
                    enabledSections={enabledSections}
                  />
                </div>
              )}
              {researchReview?.structured_output && (
                <div className="bg-white shadow rounded-lg p-6">
                  <ResearchReviewPanel
                    review={researchReview.structured_output as ResearchReview}
                    criteria={enabledCriteria}
                  />
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
