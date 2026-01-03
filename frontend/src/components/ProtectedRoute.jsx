import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles.length > 0) {
    const userRole = user.role ? user.role.toUpperCase() : '';
    const allowedRoles = roles.map(r => r.toUpperCase());
    
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />; // Or unauthorized page
    }
  }

  return children;
};

export default ProtectedRoute;
