import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as roleService from '../services/roleService.js';
import { getDisplayIdentity } from '../services/profileService.js';
import { useAuth } from '../hooks/useAuth.js';

// Single source of truth for the current user's roles. Before, useRoles() was a
// plain hook, so every consumer (navbar, guards, pages) fetched roles on its own —
// firing getCurrentUserRoles + getActiveRole multiple times per page load. This
// provider fetches once per auth change and shares the result. The public useRoles()
// API is unchanged (see ../hooks/useRoles.js).
const defaultValue = {
  roles: [],
  activeRole: null,
  displayName: '',
  loading: false,
  error: null,
  hasRole: () => false,
  refreshRoles: async () => ({ data: [], error: null }),
  refetchRoles: async () => ({ data: [], error: null }),
  setActiveRole: async () => ({ data: null, error: null }),
};

const RolesContext = createContext(defaultValue);

export function RolesProvider({ children }) {
  const { isAuthenticated, user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [activeRole, setActiveRoleState] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(Boolean(isAuthenticated));
  const [error, setError] = useState(null);

  const refreshRoles = useCallback(async () => {
    if (!isAuthenticated) {
      setRoles([]);
      setActiveRoleState(null);
      setDisplayName('');
      setLoading(false);
      return { data: [], error: null };
    }

    setLoading(true);
    const [rolesResult, currentRoleResult, identityResult] = await Promise.all([
      roleService.getCurrentUserRoles(),
      roleService.getActiveRole(),
      getDisplayIdentity(),
    ]);
    const roleNames = roleService.normalizeRoleNames(rolesResult.data ?? []);
    setRoles(roleNames);
    setActiveRoleState(roleService.normalizeRoleName(currentRoleResult.data));
    setDisplayName(identityResult.data?.displayName || '');
    setError(rolesResult.error);
    setLoading(false);

    return { data: roleNames, error: rolesResult.error };
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

  const value = {
    roles,
    activeRole,
    displayName,
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

  return <RolesContext.Provider value={value}>{children}</RolesContext.Provider>;
}

export function useRolesContext() {
  return useContext(RolesContext);
}

export { RolesContext };
