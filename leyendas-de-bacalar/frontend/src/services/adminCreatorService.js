import { friendlyAdminError, getAdminClient } from './adminService.js';

function actionError(message = 'No pudimos completar la accion.') {
  return new Error(message);
}

function loadApplicationsError() {
  return new Error('No pudimos cargar las solicitudes.');
}

function approveError() {
  return new Error('No pudimos aprobar la solicitud. Verifica tus permisos e intenta nuevamente.');
}

function rejectError() {
  return new Error('No pudimos rechazar la solicitud. Verifica tus permisos e intenta nuevamente.');
}

function normalizeText(value) {
  return String(value ?? '').toLowerCase().trim();
}

function isInvalidId(value) {
  return !value || value === 'undefined' || String(value).trim() === '';
}

function attachProfiles(applications = [], profiles = []) {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return applications.map((application) => ({
    ...application,
    users_profile: profilesById.get(application.user_id) || null,
  }));
}

function applyApplicationFilters(rows = [], { status = 'all', search = '' } = {}) {
  const query = normalizeText(search);

  return rows.filter((row) => {
    const matchesStatus = !status || status === 'all' || row.status === status;
    if (!matchesStatus) return false;
    if (!query) return true;

    const profile = row.users_profile || {};
    return [
      profile.full_name,
      profile.username,
      profile.email,
      row.reason,
      row.portfolio_url,
      row.user_id,
    ].some((value) => normalizeText(value).includes(query));
  });
}

export async function getCreatorApplications(filters = {}) {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: new Error('No tienes permisos de administrador.') };

  try {
    const { data: applications, error: applicationsError } = await client
      .from('creator_applications')
      .select('id, user_id, reason, portfolio_url, status, admin_feedback, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (applicationsError) {
      console.error(applicationsError);
      return { data: [], error: loadApplicationsError() };
    }

    const userIds = [...new Set((applications ?? []).map((item) => item.user_id).filter(Boolean))];
    let profiles = [];

    if (userIds.length) {
      const { data: profileData, error: profileError } = await client
        .from('users_profile')
        .select('id, full_name, username, status, active_role, created_at')
        .in('id', userIds);

      if (profileError) {
        console.error(profileError);
      } else {
        profiles = profileData ?? [];
      }
    }

    const mergedRows = attachProfiles(applications ?? [], profiles);

    return { data: applyApplicationFilters(mergedRows, filters), error: null };
  } catch (error) {
    console.error(error);
    return { data: [], error: loadApplicationsError() };
  }
}

export async function approveCreatorApplication({ applicationId, penName, feedback = '' }) {
  if (isInvalidId(applicationId)) {
    return { data: null, error: actionError('No pudimos completar la accion. Falta la solicitud.') };
  }
  if (!penName || !penName.trim()) {
    return { data: null, error: actionError('Escribe el nombre de autor para continuar.') };
  }

  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: new Error('No tienes permisos de administrador.') };

  try {
    const { data, error } = await client.rpc('approve_creator_application', {
      p_application_id: applicationId,
      p_pen_name: penName.trim(),
      p_admin_feedback: feedback?.trim() || null,
    });

    if (error) {
      console.error(error);
      return { data: null, error: approveError() };
    }

    return { data, error: null };
  } catch (error) {
    console.error(error);
    return { data: null, error: approveError() };
  }
}

export async function rejectCreatorApplication({ applicationId, feedback = '' }) {
  if (isInvalidId(applicationId)) {
    return { data: null, error: actionError('No pudimos completar la accion. Falta la solicitud.') };
  }

  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: new Error('No tienes permisos de administrador.') };

  try {
    const { data, error } = await client.rpc('reject_creator_application', {
      p_application_id: applicationId,
      p_admin_feedback: feedback?.trim() || null,
    });

    if (error) {
      console.error(error);
      return { data: null, error: rejectError() };
    }

    return { data, error: null };
  } catch (error) {
    console.error(error);
    return { data: null, error: rejectError() };
  }
}

export async function getAuthors() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  try {
    const { data, error } = await client
      .from('creator_profiles')
      .select('*, users_profile(full_name, username, email), legends(id)')
      .order('created_at', { ascending: false });

    return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
  } catch (error) {
    return { data: [], error: friendlyAdminError(error) };
  }
}
