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

function normalizeRoleValue(value) {
  if (value === null || value === undefined) return null;
  const role = String(value).trim().toLowerCase();
  return role || null;
}

function collectRoleNames(value) {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectRoleNames);
  if (typeof value !== 'object') return [];

  return [
    value.name,
    value.role_name,
    value.roleName,
    value.role,
    value.roles,
  ].flatMap(collectRoleNames);
}

export function normalizeRoleName(role) {
  return normalizeRoleValue(collectRoleNames(role)[0]);
}

export function normalizeRoleNames(roles = []) {
  const roleNames = collectRoleNames(roles).map(normalizeRoleValue).filter(Boolean);
  return [...new Set(roleNames)];
}

function normalizeRoles(rows = []) {
  return normalizeRoleNames(rows);
}

function getFallbackActiveRole(roles = []) {
  return ['admin', 'creator', 'reader'].find((role) => roles.includes(role)) ?? null;
}

async function resolveRoleNamesFromRows(client, rows = []) {
  const roleNames = normalizeRoles(rows);
  if (roleNames.length || !rows.length) return { data: roleNames, error: null };

  const roleIds = [
    ...new Set(
      rows
        .map((row) => row?.role_id ?? row?.roleId)
        .filter(Boolean),
    ),
  ];

  if (!roleIds.length) return { data: [], error: null };

  const { data, error } = await client
    .from('roles')
    .select('id, name')
    .in('id', roleIds);

  return { data: normalizeRoles(data ?? []), error };
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

  if (error) {
    const { data: fallbackData, error: fallbackError } = await client
      .from('user_roles')
      .select('*')
      .eq('user_id', userData.user.id);

    if (fallbackError) return { data: [], error };
    return resolveRoleNamesFromRows(client, fallbackData ?? []);
  }

  return resolveRoleNamesFromRows(client, data ?? []);
}

export async function hasRole(role) {
  const { data, error } = await getCurrentUserRoles();
  const roleName = normalizeRoleName(role);
  return { data: roleName ? data.includes(roleName) : false, error };
}

export async function hasAnyRole(allowedRoles = []) {
  const { data, error } = await getCurrentUserRoles();
  const roleNames = normalizeRoleNames(allowedRoles);
  return {
    data: roleNames.some((role) => data.includes(role)),
    error,
  };
}

export function isAdminRole(role) {
  const roleName = normalizeRoleName(role);
  return roleName ? adminRoles.includes(roleName) : false;
}

export function hasAdminRole(roles = []) {
  return normalizeRoleNames(roles).some(isAdminRole);
}

export async function getActiveRole() {
  const { data: roles, error } = await getCurrentUserRoles();
  if (error) return { data: null, error };

  const storedRole = normalizeRoleName(localStorage.getItem(ACTIVE_ROLE_KEY));
  const activeRole = roles.includes(storedRole) ? storedRole : getFallbackActiveRole(roles);

  return { data: activeRole, error: null };
}

export async function setActiveRole(role) {
  const { data: roles, error } = await getCurrentUserRoles();
  if (error) return { data: null, error };
  const roleName = normalizeRoleName(role);
  if (!roleName || !roles.includes(roleName)) {
    return { data: null, error: new Error('The current user does not have this role.') };
  }

  localStorage.setItem(ACTIVE_ROLE_KEY, roleName);
  return { data: roleName, error: null };
}
