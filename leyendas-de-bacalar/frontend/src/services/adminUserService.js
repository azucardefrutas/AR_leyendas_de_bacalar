import { friendlyAdminError, getAdminClient } from './adminService.js';

export async function getUsers() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('users_profile')
    .select('*, user_roles(roles(name))')
    .order('created_at', { ascending: false });

  return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
}

export async function suspendUser(userId) {
  if (!userId) return { data: null, error: new Error('No pudimos completar la accion.') };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };
  const { data, error } = await client.from('users_profile').update({ status: 'suspended' }).eq('id', userId).select().single();
  return { data, error: error ? friendlyAdminError(error) : null };
}

export async function activateUser(userId) {
  if (!userId) return { data: null, error: new Error('No pudimos completar la accion.') };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };
  const { data, error } = await client.from('users_profile').update({ status: 'active' }).eq('id', userId).select().single();
  return { data, error: error ? friendlyAdminError(error) : null };
}

export async function getUserRoles(userId) {
  if (!userId) return { data: [], error: null };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };
  const { data, error } = await client.from('user_roles').select('roles(name)').eq('user_id', userId);
  return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
}
