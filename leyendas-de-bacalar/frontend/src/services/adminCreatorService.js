import { friendlyAdminError, getAdminClient } from './adminService.js';

function invalidIdError() {
  return new Error('No pudimos completar la accion. Faltan datos para procesarla.');
}

export async function getCreatorApplications() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('creator_applications')
    .select('*, users_profile(full_name, username, email)')
    .order('created_at', { ascending: false });

  return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
}

export async function approveCreatorApplication(applicationId, penName, feedback = '') {
  if (!applicationId || !penName) return { data: null, error: invalidIdError() };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };

  const { data, error } = await client.rpc('approve_creator_application', {
    p_application_id: applicationId,
    p_pen_name: penName,
    p_admin_feedback: feedback,
  });

  return { data, error: error ? friendlyAdminError(error) : null };
}

export async function rejectCreatorApplication(applicationId, feedback = '') {
  if (!applicationId) return { data: null, error: invalidIdError() };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };

  const { data, error } = await client.rpc('reject_creator_application', {
    p_application_id: applicationId,
    p_admin_feedback: feedback,
  });

  return { data, error: error ? friendlyAdminError(error) : null };
}

export async function getAuthors() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('creator_profiles')
    .select('*, users_profile(full_name, username, email), legends(id)')
    .order('created_at', { ascending: false });

  return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
}
