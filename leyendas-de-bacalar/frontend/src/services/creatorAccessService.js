import { getCurrentUser, getSession } from './authService.js';
import { getActiveRole, getCurrentUserRoles } from './roleService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

function accessError(message) {
  return new Error(message);
}

function isInvalidId(value) {
  return !value || value === 'undefined' || String(value).trim() === '';
}

async function getCurrentUserId() {
  const { data: sessionData, error: sessionError } = await getSession();
  if (sessionError) return { data: null, error: sessionError };
  if (sessionData?.session?.user?.id) return { data: sessionData.session.user.id, error: null };

  const { data: userData, error: userError } = await getCurrentUser();
  if (userError) return { data: null, error: userError };
  return { data: userData?.user?.id ?? null, error: null };
}

async function findCreatorProfile(client, userId) {
  if (isInvalidId(userId)) return { data: null, error: null };

  const byUserId = await client
    .from('creator_profiles')
    .select('*')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (!byUserId.error && byUserId.data) return { data: byUserId.data, error: null };

  if (byUserId.error) {
    console.error(byUserId.error);
  }

  const byId = await client
    .from('creator_profiles')
    .select('*')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();

  if (byId.error) {
    console.error(byId.error);
    return { data: null, error: byId.error };
  }

  return { data: byId.data ?? null, error: null };
}

export async function getCurrentCreatorProfile(providedClient = null) {
  const client = providedClient ?? supabase;
  if (!client) return { data: null, error: getSupabaseConfigError() };

  const { data: userId, error: userError } = await getCurrentUserId();
  if (userError) return { data: null, error: userError };
  if (!userId) return { data: null, error: accessError('Debes iniciar sesion para continuar.') };

  return findCreatorProfile(client, userId);
}

export async function getCreatorAccessStatus() {
  const { data: client, error: clientError } = getClient();
  const baseStatus = {
    isAuthenticated: false,
    userId: null,
    hasCreatorRole: false,
    hasCreatorProfile: false,
    creatorProfile: null,
    activeRole: null,
    canAccessCreatorPanel: false,
    canCreateLegend: false,
  };

  if (clientError) return { data: baseStatus, error: clientError };

  try {
    const { data: userId, error: userError } = await getCurrentUserId();
    if (userError) return { data: baseStatus, error: userError };
    if (!userId) return { data: baseStatus, error: null };

    const [{ data: roles, error: rolesError }, { data: activeRole }] = await Promise.all([
      getCurrentUserRoles(),
      getActiveRole(),
    ]);

    const hasCreatorRole = (roles ?? []).includes('creator');
    const { data: creatorProfile, error: profileError } = hasCreatorRole
      ? await findCreatorProfile(client, userId)
      : { data: null, error: null };
    const hasCreatorProfile = Boolean(creatorProfile?.id || creatorProfile?.user_id);

    return {
      data: {
        isAuthenticated: true,
        userId,
        hasCreatorRole,
        hasCreatorProfile,
        creatorProfile,
        activeRole,
        canAccessCreatorPanel: hasCreatorRole,
        canCreateLegend: hasCreatorRole && hasCreatorProfile,
      },
      error: rolesError || profileError || null,
    };
  } catch (error) {
    console.error(error);
    return { data: baseStatus, error };
  }
}

export async function ensureCreatorCanCreate() {
  const { data: status, error } = await getCreatorAccessStatus();
  if (error) {
    console.error(error);
  }

  if (!status.isAuthenticated) {
    return { data: status, error: accessError('Debes iniciar sesion para continuar.') };
  }

  if (!status.hasCreatorRole) {
    return { data: status, error: accessError('Necesitas ser creador aprobado para acceder.') };
  }

  if (!status.hasCreatorProfile) {
    return {
      data: status,
      error: accessError('Tu perfil de creador no se encontro. Vuelve a iniciar sesion o contacta al administrador.'),
    };
  }

  return { data: status, error: null };
}

export async function refreshCreatorAccess() {
  return getCreatorAccessStatus();
}

export function getCreatorIdCandidates(status) {
  return [
    status?.creatorProfile?.id,
    status?.creatorProfile?.user_id,
    status?.userId,
  ].filter((value, index, arr) => !isInvalidId(value) && arr.indexOf(value) === index);
}
