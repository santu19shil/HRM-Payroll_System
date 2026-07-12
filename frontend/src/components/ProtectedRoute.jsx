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

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Password change is now handled by a modal in DashboardLayout
  // No redirect needed

  // Optional role check (used by App.jsx)
  if (requiredRole) {
    const userRole = user?.role || user?.role_name;
    if (!userRole || userRole !== requiredRole) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}
