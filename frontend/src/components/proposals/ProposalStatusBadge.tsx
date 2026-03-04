import type { ProposalStatus } from '../../types';

const CONFIG: Record<
  ProposalStatus,
  { label: string; className: string }
> = {
  pending: { label: 'Pending', className: 'bg-gray-100 text-gray-700' },
  processing: { label: 'Processing...', className: 'bg-yellow-100 text-yellow-800 animate-pulse' },
  awaiting_review: { label: 'Awaiting Review', className: 'bg-blue-100 text-blue-800' },
  decided: { label: 'Decided', className: 'bg-green-100 text-green-800' },
  error: { label: 'Error', className: 'bg-red-100 text-red-800' },
};

export default function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  const { label, className } = CONFIG[status] ?? CONFIG.pending;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
