import { useRolesContext } from '../context/RolesContext.jsx';

// Roles now live in a single shared provider (RolesProvider, mounted in main.jsx)
// so a page load fetches the user's roles once instead of once per consumer. The
// public API (roles, activeRole, loading, error, hasRole, refreshRoles,
// refetchRoles, setActiveRole) is unchanged, so existing callers keep working.
export function useRoles() {
  return useRolesContext();
}
