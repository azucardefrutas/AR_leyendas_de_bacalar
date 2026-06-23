import React from 'react';
import { Navigate } from 'react-router-dom';
import LoadingState from '../ui/LoadingState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useRoles } from '../../hooks/useRoles.js';
import HomePage from '../../pages/public/HomePage.jsx';

function RoleAwareHomeRoute() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { roles, activeRole, loading: rolesLoading } = useRoles();

  if (authLoading || (isAuthenticated && rolesLoading)) {
    return <LoadingState message="Cargando inicio..." />;
  }

  if (isAuthenticated && roles.includes('admin')) {
    return <Navigate to="/admin" replace />;
  }

  return <HomePage />;
}

export default RoleAwareHomeRoute;
