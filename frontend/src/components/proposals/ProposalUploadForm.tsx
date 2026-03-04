import { useState, useRef } from 'react';
import { submitProposal } from '../../api/proposals';

interface Props {
  onSuccess: () => void;
}

export default function ProposalUploadForm({ onSuccess }: Props) {
  const [title, setTitle] = useState('');
  const [applicantName, setApplicantName] = useState('');
  const [institution, setInstitution] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!file) { setError('Please select a .docx file'); return; }
    if (!file.name.endsWith('.docx')) { setError('Only .docx files are accepted'); return; }

    const fd = new FormData();
    fd.append('title', title);
    fd.append('applicant_name', applicantName);
    fd.append('institution', institution);
    fd.append('file', file);

    try {
      setLoading(true);
      await submitProposal(fd);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Proposal Title</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitacs-focus"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Applicant Name</label>
        <input
          type="text"
          required
          value={applicantName}
          onChange={(e) => setApplicantName(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitacs-focus"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
        <input
          type="text"
          required
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mitacs-focus"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Proposal Document (.docx)
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".docx"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-mitacs-light file:text-mitacs-blue hover:file:bg-blue-100"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-mitacs-blue hover:bg-mitacs-navy disabled:opacity-50 text-white font-medium py-2 px-4 rounded transition"
      >
        {loading ? 'Submitting...' : 'Submit Proposal'}
      </button>
    </form>
  );
}
