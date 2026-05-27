import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import LoadingState from '../ui/LoadingState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useRoles } from '../../hooks/useRoles.js';

export function getRoleHomePath(roles = [], activeRole = null) {
  if (activeRole === 'admin' || (!activeRole && roles.includes('admin'))) return '/admin';
  if (activeRole === 'creator' || (!activeRole && roles.includes('creator'))) return '/creator';
  return '/reader/library';
}

function RedirectAuthenticatedRoute() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { roles, activeRole, loading: rolesLoading } = useRoles();

  if (authLoading || (isAuthenticated && rolesLoading)) {
    return <LoadingState message="Preparando tu sesion..." />;
  }

  if (isAuthenticated) {
    return <Navigate to={getRoleHomePath(roles, activeRole)} replace />;
  }

  return <Outlet />;
}

export default RedirectAuthenticatedRoute;
