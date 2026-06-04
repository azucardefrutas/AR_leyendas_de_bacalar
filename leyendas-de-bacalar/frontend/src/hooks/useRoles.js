import { useCallback, useEffect, useState } from 'react';
import * as roleService from '../services/roleService.js';
import { useAuth } from './useAuth.js';

export function useRoles() {
  const { isAuthenticated, user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [activeRole, setActiveRoleState] = useState(null);
  const [loading, setLoading] = useState(Boolean(isAuthenticated));
  const [error, setError] = useState(null);

  const refreshRoles = useCallback(async () => {
    if (!isAuthenticated) {
      setRoles([]);
      setActiveRoleState(null);
      setLoading(false);
      return { data: [], error: null };
    }

    setLoading(true);
    const { data, error: rolesError } = await roleService.getCurrentUserRoles();
    const { data: currentRole } = await roleService.getActiveRole();
    const roleNames = roleService.normalizeRoleNames(data ?? []);
    setRoles(roleNames);
    setActiveRoleState(roleService.normalizeRoleName(currentRole));
    setError(rolesError);
    setLoading(false);

    return { data: roleNames, error: rolesError };
  }, [isAuthenticated]);

  async function setActiveRole(role) {
    const { data, error: roleError } = await roleService.setActiveRole(role);
    if (!roleError) setActiveRoleState(data);
    setError(roleError);

    return { data, error: roleError };
  }

  useEffect(() => {
    refreshRoles();
  }, [refreshRoles, user?.id]);

  return {
    roles,
    activeRole,
    loading,
    error,
    hasRole: (role) => {
      const roleName = roleService.normalizeRoleName(role);
      return roleName ? roles.includes(roleName) : false;
    },
    refreshRoles,
    refetchRoles: refreshRoles,
    setActiveRole,
  };
}
