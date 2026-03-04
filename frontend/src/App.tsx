import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import SubmitProposalPage from './pages/applicant/SubmitProposalPage';
import MyProposalsPage from './pages/applicant/MyProposalsPage';
import DashboardPage from './pages/reviewer/DashboardPage';
import ProposalDetailPage from './pages/reviewer/ProposalDetailPage';
import EvaluationConfigPage from './pages/reviewer/EvaluationConfigPage';
import HowItWorksPage from './pages/HowItWorksPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/applicant/submit" replace />} />

          {/* Applicant routes */}
          <Route
            path="/applicant/submit"
            element={
              <ProtectedRoute>
                <SubmitProposalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/applicant/proposals"
            element={
              <ProtectedRoute>
                <MyProposalsPage />
              </ProtectedRoute>
            }
          />

          {/* Reviewer routes */}
          <Route
            path="/reviewer/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviewer/proposals/:id"
            element={
              <ProtectedRoute>
                <ProposalDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reviewer/config"
            element={
              <ProtectedRoute>
                <EvaluationConfigPage />
              </ProtectedRoute>
            }
          />

          <Route path="/how-it-works" element={<HowItWorksPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

