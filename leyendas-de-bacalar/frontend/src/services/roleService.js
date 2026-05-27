import { getCurrentUser } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

const ACTIVE_ROLE_KEY = 'leyendas_active_role';
export const adminRoles = ['admin'];

function getClient() {
  if (!supabase) {
    return { data: null, error: getSupabaseConfigError() };
  }

  return { data: supabase, error: null };
}

function normalizeRoles(rows = []) {
  return rows
    .map((row) => row.roles?.name ?? row.role?.name ?? row.role_name ?? row.name)
    .filter(Boolean);
}

export async function getCurrentUserRoles() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data: userData, error: userError } = await getCurrentUser();
  if (userError) return { data: [], error: userError };
  if (!userData.user) return { data: [], error: null };

  const { data, error } = await client
    .from('user_roles')
    .select('*, roles(name)')
    .eq('user_id', userData.user.id);

  return { data: normalizeRoles(data), error };
}

export async function hasRole(role) {
  const { data, error } = await getCurrentUserRoles();
  return { data: data.includes(role), error };
}

export async function hasAnyRole(allowedRoles = []) {
  const { data, error } = await getCurrentUserRoles();
  return {
    data: allowedRoles.some((role) => data.includes(role)),
    error,
  };
}

export function isAdminRole(role) {
  return adminRoles.includes(role);
}

export function hasAdminRole(roles = []) {
  return roles.some(isAdminRole);
}

export async function getActiveRole() {
  const { data: roles, error } = await getCurrentUserRoles();
  if (error) return { data: null, error };

  const storedRole = localStorage.getItem(ACTIVE_ROLE_KEY);
  const activeRole = roles.includes(storedRole) ? storedRole : roles[0] ?? null;

  return { data: activeRole, error: null };
}

export async function setActiveRole(role) {
  const { data: roles, error } = await getCurrentUserRoles();
  if (error) return { data: null, error };
  if (!roles.includes(role)) {
    return { data: null, error: new Error('The current user does not have this role.') };
  }

  localStorage.setItem(ACTIVE_ROLE_KEY, role);
  return { data: role, error: null };
}
