import { friendlyAdminError, getAdminClient } from './adminService.js';
import { normalizeRoleNames } from './roleService.js';

const USER_PROFILE_COLUMNS = 'id, full_name, username, avatar_url, bio, status, active_role, created_at, updated_at';

function attachRolesToProfiles(profiles = [], roleRows = []) {
  const rolesByUserId = new Map();

  roleRows.forEach((row) => {
    const userId = row?.user_id;
    if (!userId) return;

    const currentRoles = rolesByUserId.get(userId) ?? [];
    rolesByUserId.set(userId, normalizeRoleNames([...currentRoles, row]));
  });

  return profiles.map((profile) => {
    const roleNames = rolesByUserId.get(profile.id) ?? [];
    return {
      ...profile,
      roles: roleNames,
      user_roles: roleNames.map((name) => ({ roles: { name } })),
    };
  });
}

async function getRoleRowsByUserIds(client, userIds = []) {
  if (!userIds.length) return { data: [], error: null };

  const { data: relationRows, error: relationError } = await client
    .from('user_roles')
    .select('user_id, role_id')
    .in('user_id', userIds);

  if (relationError) return { data: [], error: relationError };

  const roleIds = [...new Set((relationRows ?? []).map((row) => row.role_id).filter(Boolean))];
  if (!roleIds.length) return { data: [], error: null };

  const { data: roles, error: rolesError } = await client
    .from('roles')
    .select('id, name')
    .in('id', roleIds);

  if (rolesError) return { data: [], error: rolesError };

  const rolesById = new Map((roles ?? []).map((role) => [role.id, role.name]));
  return {
    data: (relationRows ?? []).map((row) => ({
      user_id: row.user_id,
      roles: { name: rolesById.get(row.role_id) },
    })),
    error: null,
  };
}

export async function getUsers() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  const { data: profiles, error: profilesError } = await client
    .from('users_profile')
    .select(USER_PROFILE_COLUMNS)
    .order('created_at', { ascending: false });

  if (profilesError) {
    return {
      data: [],
      error: friendlyAdminError(profilesError, { operation: 'getUsers profiles', table: 'users_profile' }),
    };
  }

  const profileRows = profiles ?? [];
  const profileIds = profileRows.map((profile) => profile.id).filter(Boolean);
  const { data: roleRows, error: rolesError } = await getRoleRowsByUserIds(client, profileIds);

  if (rolesError) {
    return {
      data: attachRolesToProfiles(profileRows, []),
      error: friendlyAdminError(rolesError, { operation: 'getUsers roles', table: 'user_roles' }),
    };
  }

  return { data: attachRolesToProfiles(profileRows, roleRows ?? []), error: null };
}

export async function suspendUser(userId) {
  if (!userId) return { data: null, error: new Error('No pudimos completar la accion.') };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };
  const { data, error } = await client.from('users_profile').update({ status: 'suspended' }).eq('id', userId).select().single();
  return { data, error: error ? friendlyAdminError(error, { operation: 'suspendUser', table: 'users_profile' }) : null };
}

export async function activateUser(userId) {
  if (!userId) return { data: null, error: new Error('No pudimos completar la accion.') };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };
  const { data, error } = await client.from('users_profile').update({ status: 'active' }).eq('id', userId).select().single();
  return { data, error: error ? friendlyAdminError(error, { operation: 'activateUser', table: 'users_profile' }) : null };
}

export async function getUserRoles(userId) {
  if (!userId) return { data: [], error: null };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };
  const { data, error } = await getRoleRowsByUserIds(client, [userId]);
  return {
    data: data ?? [],
    error: error ? friendlyAdminError(error, { operation: 'getUserRoles', table: 'user_roles' }) : null,
  };
}
