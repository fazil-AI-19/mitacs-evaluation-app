import client from './client';
import type { Proposal } from '../types';

export async function submitProposal(formData: FormData): Promise<Proposal> {
  const res = await client.post<Proposal>('/proposals/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getMyProposals(): Promise<Proposal[]> {
  const res = await client.get<Proposal[]>('/proposals/my');
  return res.data;
}

export async function getAllProposals(status?: string): Promise<Proposal[]> {
  const params = status ? { status_filter: status } : {};
  const res = await client.get<Proposal[]>('/proposals/', { params });
  return res.data;
}

export async function getProposalById(id: number): Promise<Proposal> {
  const res = await client.get<Proposal>(`/proposals/${id}`);
  return res.data;
}

export async function getProposalStatus(
  id: number
): Promise<{ id: number; status: string; updated_at: string }> {
  const res = await client.get(`/proposals/${id}/status`);
  return res.data;
}

export async function downloadProposal(id: number, filename: string): Promise<void> {
  const res = await client.get(`/proposals/${id}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadTestProposal(): Promise<void> {
  const res = await client.get('/proposals/test-sample', { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'AI_Pest_Control_Sample_Proposal.docx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function submitTestProposal(): Promise<Proposal> {
  const res = await client.post<Proposal>('/proposals/submit-test');
  return res.data;
}
