import client from './client';
import type { AgentReview } from '../types';

export async function getReviewsForProposal(proposalId: number): Promise<AgentReview[]> {
  const res = await client.get<AgentReview[]>(`/reviews/${proposalId}`);
  return res.data;
}
