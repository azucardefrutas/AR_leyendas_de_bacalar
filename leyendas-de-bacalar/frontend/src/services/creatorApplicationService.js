import { getCurrentUser, getSession } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';
import { getCurrentUserRoles } from './roleService.js';

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

function friendlyCreatorApplicationError(error) {
  if (!error) return null;
  return new Error('No pudimos completar la accion. Verifica tu sesion e intenta nuevamente.');
}

function validatePayload({ reason, penName, acceptedCreatorTerms }) {
  if (!reason || reason.trim().length < 10) {
    return new Error('Escribe un motivo de al menos 10 caracteres.');
  }
  if (!penName || !penName.trim()) {
    return new Error('Escribe tu nombre de autor o seudonimo.');
  }
  if (!acceptedCreatorTerms) {
    return new Error('Debes aceptar los terminos para creadores y el aviso de privacidad para continuar.');
  }

  return null;
}

export function buildCreatorApplicationReason(payload = {}) {
  const clean = (value) => String(value ?? '').trim() || 'No especificado';
  const lines = [
    'SOLICITUD FORMAL DE CREADOR',
    `Nombre legal: ${clean(payload.legalFirstName)}`,
    `Apellidos: ${clean(payload.legalLastName)}`,
    `Nombre de autor / seudonimo: ${clean(payload.penName)}`,
    `Institucion o afiliacion: ${clean(payload.affiliation)}`,
    `Ciudad: ${clean(payload.city)}`,
    `Estado: ${clean(payload.stateRegion)}`,
    `Pais: ${clean(payload.country)}`,
    `Telefono: ${clean(payload.phone)}`,
    `Biografia breve: ${clean(payload.biography)}`,
    '',
    'Motivo para ser creador:',
    clean(payload.reason),
    '',
    'Declaraciones:',
    '- Declara que la informacion proporcionada es veraz.',
    '- Declara que cuenta o contara con los derechos necesarios sobre las obras y recursos que publique.',
    '- Acepta los Terminos para Creadores y el Aviso de Privacidad para Creadores.',
  ];

  return lines.join('\n');
}

export async function getMyCreatorApplication() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const { data: sessionData, error: sessionError } = await getSession();
    if (sessionError) return { data: null, error: friendlyCreatorApplicationError(sessionError) };

    const userId = sessionData?.session?.user?.id;
    if (!userId) return { data: null, error: null };

    const { data, error } = await client
      .from('creator_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return { data: data ?? null, error: error ? friendlyCreatorApplicationError(error) : null };
  } catch (error) {
    return { data: null, error: friendlyCreatorApplicationError(error) };
  }
}

export async function submitCreatorApplication(payload = {}) {
  const validationError = validatePayload(payload);
  if (validationError) return { data: null, error: validationError };

  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const { data: userData, error: userError } = await getCurrentUser();
    if (userError) return { data: null, error: friendlyCreatorApplicationError(userError) };

    const userId = userData?.user?.id;
    if (!userId) return { data: null, error: new Error('Debes iniciar sesion para continuar.') };

    const { data: existing, error: existingError } = await getMyCreatorApplication();
    if (existingError) return { data: null, error: existingError };
    if (existing?.status === 'pending') {
      return { data: existing, error: new Error('Ya tienes una solicitud en revision.') };
    }
    if (existing?.status === 'approved') {
      return { data: existing, error: new Error('Tu solicitud ya fue aprobada.') };
    }

    const { data, error } = await client
      .from('creator_applications')
      .insert({
        user_id: userId,
        reason: buildCreatorApplicationReason(payload),
        portfolio_url: payload.portfolioUrl?.trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    return { data, error: error ? friendlyCreatorApplicationError(error) : null };
  } catch (error) {
    return { data: null, error: friendlyCreatorApplicationError(error) };
  }
}

export async function getMyCreatorStatus() {
  try {
    const [{ data: application, error: applicationError }, { data: roles, error: rolesError }] = await Promise.all([
      getMyCreatorApplication(),
      getCurrentUserRoles(),
    ]);

    return {
      data: {
        application,
        isCreator: (roles ?? []).includes('creator'),
        roles: roles ?? [],
        status: (roles ?? []).includes('creator') ? 'creator' : application?.status ?? 'none',
      },
      error: applicationError || rolesError || null,
    };
  } catch (error) {
    return {
      data: { application: null, isCreator: false, roles: [], status: 'none' },
      error: friendlyCreatorApplicationError(error),
    };
  }
}
