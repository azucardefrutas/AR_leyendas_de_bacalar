import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingState from '../ui/LoadingState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getLoginPathForRedirect } from '../../utils/authRedirect.js';

function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState message="Verificando sesion..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to={getLoginPathForRedirect(location)} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
