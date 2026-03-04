import client from './client';
import type { Decision } from '../types';

export async function getDecision(proposalId: number): Promise<Decision> {
  const res = await client.get<Decision>(`/decisions/${proposalId}`);
  return res.data;
}

export async function overrideDecision(
  proposalId: number,
  finalRecommendation: string,
  reviewerComments?: string
): Promise<Decision> {
  const res = await client.post<Decision>(`/decisions/${proposalId}/override`, {
    final_recommendation: finalRecommendation,
    reviewer_comments: reviewerComments,
  });
  return res.data;
}
