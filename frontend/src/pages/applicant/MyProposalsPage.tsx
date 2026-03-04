import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyProposals } from '../../api/proposals';
import { getDecision } from '../../api/decisions';
import Navbar from '../../components/layout/Navbar';
import ProposalStatusBadge from '../../components/proposals/ProposalStatusBadge';
import DecisionCard from '../../components/decisions/DecisionCard';
import { useProposalStatus } from '../../hooks/useProposalStatus';
import type { Decision, Proposal } from '../../types';

function ProposalRow({ proposal }: { proposal: Proposal }) {
  const isActive = proposal.status === 'pending' || proposal.status === 'processing';
  const { status } = useProposalStatus(proposal.id, isActive);
  const displayStatus = (status ?? proposal.status) as Proposal['status'];

  const [decision, setDecision] = useState<Decision | null>(null);
  const [showDecision, setShowDecision] = useState(false);

  const fetchDecision = async () => {
    try {
      const d = await getDecision(proposal.id);
      setDecision(d);
      setShowDecision(true);
    } catch {
      // Not yet finalized
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-5 mb-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{proposal.title}</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {proposal.institution} — submitted{' '}
            {new Date(proposal.submitted_at).toLocaleDateString()}
          </p>
        </div>
        <ProposalStatusBadge status={displayStatus} />
      </div>

      {displayStatus === 'decided' && !showDecision && (
        <button
          onClick={fetchDecision}
          className="mt-3 text-sm text-mitacs-blue hover:underline"
        >
          View Feedback
        </button>
      )}

      {showDecision && decision && (
        <div className="mt-4">
          <DecisionCard decision={decision} />
        </div>
      )}

      {displayStatus === 'error' && (
        <p className="mt-2 text-sm text-red-600">
          An error occurred during processing. Please contact support.
        </p>
      )}
    </div>
  );
}

export default function MyProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProposals()
      .then(setProposals)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Proposals</h1>
          <Link
            to="/applicant/submit"
            className="bg-mitacs-blue hover:bg-mitacs-navy text-white text-sm font-medium px-4 py-2 rounded"
          >
            Submit New
          </Link>
        </div>

        {loading && <p className="text-gray-500 text-sm">Loading proposals...</p>}

        {!loading && proposals.length === 0 && (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <p className="text-gray-500 mb-4">You haven't submitted any proposals yet.</p>
            <Link
              to="/applicant/submit"
              className="text-mitacs-blue hover:underline text-sm font-medium"
            >
              Submit your first proposal
            </Link>
          </div>
        )}

        {proposals.map((p) => (
          <ProposalRow key={p.id} proposal={p} />
        ))}
      </main>
    </div>
  );
}
