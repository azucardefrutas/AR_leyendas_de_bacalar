import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import LoadingState from '../ui/LoadingState.jsx';
import { useRoles } from '../../hooks/useRoles.js';
import { normalizeRoleNames } from '../../services/roleService.js';

function RoleGuard({ allowedRoles = [] }) {
  const { roles, activeRole, loading, error } = useRoles();
  const roleNames = normalizeRoleNames(roles);
  const allowedRoleNames = normalizeRoleNames(allowedRoles);
  const isAdmin = roleNames.includes('admin');

  if (loading) {
    return <LoadingState message="Verificando permisos..." />;
  }

  if (allowedRoleNames.includes('admin') && import.meta.env.DEV) {
    console.log('[AdminAccess] roles detectados:', roleNames);
    console.log('[AdminAccess] activeRole:', activeRole);
    console.log('[AdminAccess] isAdmin:', isAdmin);
  }

  if (error) {
    if (allowedRoleNames.includes('admin') && import.meta.env.DEV) {
      console.error('[AdminAccess] Error cargando roles:', error);
    }
    return <Navigate to="/access-denied" replace />;
  }

  const canEnter = allowedRoleNames.some((role) => roleNames.includes(role));

  if (!canEnter) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}

export default RoleGuard;
