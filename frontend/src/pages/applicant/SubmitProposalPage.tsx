import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProposalUploadForm from '../../components/proposals/ProposalUploadForm';
import Navbar from '../../components/layout/Navbar';
import { downloadTestProposal, submitTestProposal } from '../../api/proposals';

const REQUIRED_SECTIONS = [
  'Executive Summary',
  'Project Description',
  'Research Objectives',
  'Methodology',
  'Timeline',
  'Budget Justification',
  'Academic Partner',
  'Industry / Non-Profit Partner',
  'Expected Outcomes',
  'HQP Training Plan',
];

export default function SubmitProposalPage() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  async function handleDownloadTest() {
    setDownloading(true);
    try {
      await downloadTestProposal();
    } catch {
      // ignore
    } finally {
      setDownloading(false);
    }
  }

  async function handleSubmitTest() {
    setSubmitting(true);
    setTestError(null);
    try {
      await submitTestProposal();
      setTestSubmitted(true);
    } catch (err: any) {
      setTestError(err?.response?.data?.detail ?? 'Failed to submit test proposal.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Submit a Proposal</h1>
          <p className="text-gray-600 text-sm">
            Upload your Mitacs Accelerate research proposal as a{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">.docx</code> file.
            The system will automatically review it and results can be seen in the{' '}
            <Link to="/reviewer/proposals" className="text-mitacs-blue hover:underline font-medium">
              Reviewer Dashboard
            </Link>
            .
          </p>
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

          {/* Left column — Upload (wider) */}
          <div className="lg:col-span-3 space-y-0 bg-white shadow rounded-lg overflow-hidden">
            {/* Upload section */}
            <div className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Upload your proposal</h2>
              <ProposalUploadForm
                onSuccess={() => navigate('/applicant/proposals')}
              />
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 mx-6" />

            {/* Test proposal section */}
            <div className="p-6">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                Try a sample proposal
              </p>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.348.35A3.003 3.003 0 0012 21a3 3 0 01-2.12-.878l-.35-.35z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 mb-1">
                    AI-Powered Pest Detection for Crop Management
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    A sample research proposal by Dr. Wei Chen (University of Saskatchewan) that uses
                    computer vision and IoT sensors to detect crop pests in real time. Use it to see
                    how the evaluation pipeline works without writing your own proposal.
                  </p>

                  {testSubmitted ? (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Submitted for evaluation. Check the{' '}
                      <Link to="/applicant/proposals" className="font-medium underline">
                        My Proposals
                      </Link>{' '}
                      page to track progress.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={handleDownloadTest}
                        disabled={downloading}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {downloading ? (
                          <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        )}
                        {downloading ? 'Downloading…' : 'Download sample'}
                      </button>

                      <button
                        onClick={handleSubmitTest}
                        disabled={submitting}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-mitacs-blue hover:bg-mitacs-navy text-white transition-colors disabled:opacity-50"
                      >
                        {submitting ? (
                          <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                        {submitting ? 'Submitting…' : 'Submit for evaluation'}
                      </button>
                    </div>
                  )}

                  {testError && (
                    <p className="mt-2 text-xs text-red-600">{testError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right column — Template + required sections (narrower) */}
          <div className="lg:col-span-2 bg-white shadow rounded-lg p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-mitacs-light flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 text-mitacs-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Proposal template</h2>
                <p className="text-xs text-gray-500">
                  Download the official template with all required sections, placeholder guidance,
                  example tables, and eligibility reminders.
                </p>
              </div>
            </div>

            <a
              href="/proposal_template.docx"
              download="Mitacs_Accelerate_Proposal_Template.docx"
              className="inline-flex items-center gap-2 bg-mitacs-blue hover:bg-mitacs-navy text-white text-sm font-medium px-4 py-2 rounded transition-colors mb-5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download template (.docx)
            </a>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Required sections</p>
              <ul className="space-y-1">
                {REQUIRED_SECTIONS.map((section) => (
                  <li key={section} className="flex items-center gap-1.5 text-sm text-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-mitacs-blue flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {section}
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
