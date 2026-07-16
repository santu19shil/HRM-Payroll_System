import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, loading, user } = useAuth();

  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const allowDevPreview = import.meta.env.DEV && isLocalhost;

  if (allowDevPreview) {
    return children;
  }

  if (!isAuthenticated) {
    // Keep debug visibility; if this triggers, AuthContext couldn't validate the token via /auth/me
    // eslint-disable-next-line no-console
    console.log('[ProtectedRoute] not authenticated, redirecting to /login', { locationPath: location?.pathname });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Password change is now handled by a modal in DashboardLayout
  // No redirect needed

  // Optional role check (used by App.jsx)
  if (requiredRole) {
    const userRole = user?.role || user?.role_name;

    // Normalize for common backend variants (case/whitespace)
    const normalize = (r) => (r ?? '').toString().trim().toUpperCase();
    const expected = normalize(requiredRole);
    const actual = normalize(userRole);

    // Helpful debug log (keep until issue resolved)
    // eslint-disable-next-line no-console
    console.log('[ProtectedRoute] role check', { expected: requiredRole, actual: userRole, actualNormalized: actual });

    if (!actual || actual !== expected) {
      // If you see this redirect in the console log above, the user role stored in token differs.
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}
