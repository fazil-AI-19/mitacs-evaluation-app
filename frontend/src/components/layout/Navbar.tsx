import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-mitacs-blue text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold tracking-tight">
          Mitacs Proposal Evaluation
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/applicant/submit" className="hover:underline text-sm">
            Submit Proposal
          </Link>
          <Link to="/applicant/proposals" className="hover:underline text-sm">
            Applicant Dashboard
          </Link>
          <Link to="/reviewer/dashboard" className="hover:underline text-sm">
            Reviewer Dashboard
          </Link>
          <Link to="/reviewer/config" className="hover:underline text-sm">
            Evaluation Config
          </Link>
          <Link to="/how-it-works" className="hover:underline text-sm">
            How it Works
          </Link>
        </div>
      </div>
    </nav>
  );
}

