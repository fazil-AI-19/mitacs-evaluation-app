import { useEffect, useRef, useState } from 'react';
import { getProposalStatus } from '../api/proposals';
import type { ProposalStatus } from '../types';

const TERMINAL_STATUSES: ProposalStatus[] = ['awaiting_review', 'decided', 'error'];

export function useProposalStatus(proposalId: number, enabled: boolean) {
  const [status, setStatus] = useState<ProposalStatus | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
        const data = await getProposalStatus(proposalId);
        setStatus(data.status as ProposalStatus);
        setUpdatedAt(data.updated_at);
        if (TERMINAL_STATUSES.includes(data.status as ProposalStatus)) {
          clearInterval(intervalRef.current!);
          setIsPolling(false);
        }
      } catch {
        // silently ignore polling errors
      }
    };

    setIsPolling(true);
    poll(); // immediate first call
    intervalRef.current = setInterval(poll, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPolling(false);
    };
  }, [proposalId, enabled]);

  return { status, updatedAt, isPolling };
}
