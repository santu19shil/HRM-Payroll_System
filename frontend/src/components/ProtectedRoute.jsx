import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ChangePasswordPage from '../pages/ChangePasswordPage';

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

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.must_change_password || user?.mustChangePassword) {
    if (location.pathname !== '/change-password') {
      return <Navigate to="/change-password" replace />;
    }
    return <ChangePasswordPage />;
  }

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const allowDevPreview = import.meta.env.DEV && isLocalhost;

  if (allowDevPreview) {
    return children;
  }

  if (requiredRole) {
    const userRole = user?.role || user?.role_name;

    const normalize = (r) => (r ?? '').toString().trim().toUpperCase();
    const expected = normalize(requiredRole);
    const actual = normalize(userRole);

    if (!actual || actual !== expected) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}
