import React from 'react';
import { Navigate, Outlet, useSearchParams } from 'react-router-dom';
import LoadingState from '../ui/LoadingState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useRoles } from '../../hooks/useRoles.js';
import { getSafeRedirect } from '../../utils/authRedirect.js';

export function getRoleHomePath(roles = [], activeRole = null) {
  if (roles.includes('admin')) return '/admin';
  if (activeRole === 'creator' || roles.includes('creator')) return '/creator';
  return '/reader/library';
}

function canUseRedirect(redirect, roles = []) {
  if (!redirect) return false;
  if (roles.includes('admin')) return false;
  if (redirect.startsWith('/admin')) return false;
  if (redirect.startsWith('/creator')) return roles.includes('creator');
  return true;
}

export function getPostLoginPath(roles = [], activeRole = null, redirect = null) {
  if (roles.includes('admin')) return '/admin';
  if (canUseRedirect(redirect, roles)) return redirect;
  return getRoleHomePath(roles, activeRole);
}

function RedirectAuthenticatedRoute() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { roles, activeRole, loading: rolesLoading } = useRoles();
  const [searchParams] = useSearchParams();

  if (authLoading || (isAuthenticated && rolesLoading)) {
    return <LoadingState message="Preparando tu sesion..." />;
  }

  if (isAuthenticated) {
    return <Navigate to={getPostLoginPath(roles, activeRole, getSafeRedirect(searchParams))} replace />;
  }

  return <Outlet />;
}

export default RedirectAuthenticatedRoute;
