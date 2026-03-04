import React from 'react';

interface Props {
  role?: 'applicant' | 'reviewer';
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  return <>{children}</>;
}

