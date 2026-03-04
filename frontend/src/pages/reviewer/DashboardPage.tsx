import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllProposals } from '../../api/proposals';
import Navbar from '../../components/layout/Navbar';
import ProposalStatusBadge from '../../components/proposals/ProposalStatusBadge';
import type { DecisionSummary, Proposal, ProposalStatus, Recommendation } from '../../types';

const PAGE_SIZE = 10;

const STATUS_TABS: { label: string; value: ProposalStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Processing', value: 'processing' },
  { label: 'Awaiting Review', value: 'awaiting_review' },
  { label: 'Decided', value: 'decided' },
];

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

function RecPill({ rec }: { rec: Recommendation }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${REC_STYLES[rec]}`}>
      {REC_LABELS[rec]}
    </span>
  );
}

function ReviewerDecisionCell({ decision }: { decision?: DecisionSummary | null }) {
  if (!decision?.final_recommendation) {
    return <span className="text-gray-400 text-xs">—</span>;
  }
  return (
    <div className="space-y-0.5">
      <RecPill rec={decision.final_recommendation as Recommendation} />
      {decision.is_overridden && (
        <div className="text-xs text-gray-400">Override</div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeTab, setActiveTab] = useState<ProposalStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    getAllProposals(activeTab || undefined)
      .then(setProposals)
      .finally(() => setLoading(false));
  }, [activeTab]);

  const totalPages = Math.max(1, Math.ceil(proposals.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageProposals = proposals.slice(start, start + PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Reviewer Dashboard</h1>

        {/* Status filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                activeTab === tab.value
                  ? 'bg-mitacs-blue text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-500 text-sm">Loading proposals...</p>}

        {!loading && proposals.length === 0 && (
          <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500 text-sm">
            No proposals found.
          </div>
        )}

        {!loading && proposals.length > 0 && (
          <>
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Title</th>
                    <th className="px-4 py-3 text-left">Applicant</th>
                    <th className="px-4 py-3 text-left">Submitted</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">AI Recommendation</th>
                    <th className="px-4 py-3 text-left">Reviewer Decision</th>
                    <th className="px-4 py-3 text-left">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageProposals.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                        {p.title}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.applicant_name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(p.submitted_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <ProposalStatusBadge status={p.status} />
                      </td>
                      <td className="px-4 py-3">
                        {p.decision ? (
                          <RecPill rec={p.decision.ai_recommendation as Recommendation} />
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <ReviewerDecisionCell decision={p.decision} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/reviewer/proposals/${p.id}`}
                          className="text-mitacs-blue hover:underline font-medium"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing {start + 1}–{Math.min(start + PAGE_SIZE, proposals.length)} of{' '}
                {proposals.length} proposal{proposals.length !== 1 ? 's' : ''}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-3 py-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1.5 text-xs text-gray-500">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-3 py-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
