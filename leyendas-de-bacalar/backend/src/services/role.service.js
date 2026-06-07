import { supabaseAdmin } from '../config/supabaseAdmin.js';

class RoleServiceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RoleServiceError';
  }
}

const uniqueStrings = (values) =>
  [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))];

export const getUserRoleNames = async (userId) => {
  if (!userId) {
    return [];
  }

  const { data: relationRows, error: relationError } = await supabaseAdmin
    .from('user_roles')
    .select('role_id')
    .eq('user_id', userId);

  if (relationError) {
    throw new RoleServiceError('Could not load user role relations.');
  }

  const roleIds = uniqueStrings((relationRows ?? []).map((row) => row.role_id));

  if (roleIds.length === 0) {
    return [];
  }

  const { data: roleRows, error: roleError } = await supabaseAdmin
    .from('roles')
    .select('id, name')
    .in('id', roleIds);

  if (roleError) {
    throw new RoleServiceError('Could not load role names.');
  }

  return uniqueStrings((roleRows ?? []).map((row) => row.name));
};

export const userHasRole = async (userId, allowedRoles) => {
  const roles = await getUserRoleNames(userId);
  const allowedRoleSet = new Set(allowedRoles);

  return roles.some((role) => allowedRoleSet.has(role));
};
