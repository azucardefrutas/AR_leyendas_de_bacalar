import { getCurrentUser, getSession } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';
import { getCurrentUserRoles } from './roleService.js';

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

function friendlyCreatorApplicationError(error) {
  if (!error) return null;
  const message = String(error.message || '');

  if (message.includes('confirmar tu correo')) {
    return new Error('Debes confirmar tu correo antes de continuar como creador.');
  }
  if (message.includes('terminos') || message.includes('privacidad') || message.includes('autoria')) {
    return new Error('Debes aceptar los terminos, el aviso de privacidad y la declaracion de autoria.');
  }
  if (message.includes('nombre de autor')) {
    return new Error('Escribe tu nombre de autor o seudonimo.');
  }

  return new Error('No pudimos completar la accion. Verifica tu sesion e intenta nuevamente.');
}

function validatePayload({
  legalFirstName,
  legalLastName,
  country,
  biography,
  reason,
  penName,
  acceptedCreatorTerms,
  acceptedCreatorPrivacy,
  acceptedAuthorshipDeclaration,
}) {
  if (!legalFirstName || !legalFirstName.trim() || !legalLastName || !legalLastName.trim()) {
    return new Error('Escribe tu nombre legal y apellidos.');
  }
  if (!country || !country.trim()) {
    return new Error('Escribe tu pais.');
  }
  if (!biography || biography.trim().length < 20) {
    return new Error('Escribe una biografia breve de al menos 20 caracteres.');
  }
  if (!reason || reason.trim().length < 10) {
    return new Error('Escribe un motivo de al menos 10 caracteres.');
  }
  if (!penName || !penName.trim()) {
    return new Error('Escribe tu nombre de autor o seudonimo.');
  }
  if (!acceptedCreatorTerms || !acceptedCreatorPrivacy || !acceptedAuthorshipDeclaration) {
    return new Error('Debes aceptar los terminos, el aviso de privacidad y la declaracion de autoria.');
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

    const { data, error } = await client.rpc('complete_creator_onboarding', {
      p_pen_name: payload.penName.trim(),
      p_legal_first_name: payload.legalFirstName.trim(),
      p_legal_last_name: payload.legalLastName.trim(),
      p_affiliation: payload.affiliation?.trim() || null,
      p_city: payload.city?.trim() || null,
      p_state_region: payload.stateRegion?.trim() || null,
      p_country: payload.country.trim(),
      p_phone: payload.phone?.trim() || null,
      p_biography: payload.biography.trim(),
      p_reason: payload.reason.trim(),
      p_portfolio_url: payload.portfolioUrl?.trim() || null,
      p_accept_creator_terms: Boolean(payload.acceptedCreatorTerms),
      p_accept_creator_privacy: Boolean(payload.acceptedCreatorPrivacy),
      p_accept_authorship_declaration: Boolean(payload.acceptedAuthorshipDeclaration),
      p_terms_version: payload.termsVersion || 'creator-terms-2026-05',
      p_privacy_version: payload.privacyVersion || 'creator-privacy-2026-05',
    });

    if (error) {
      if (import.meta.env.DEV) console.error('completeCreatorOnboarding error', error);
      return { data: null, error: friendlyCreatorApplicationError(error) };
    }

    const { data: activatedApplication } = await getMyCreatorApplication();

    return {
      data: {
        ...(activatedApplication ?? {}),
        activated_user_id: data ?? userId,
        activation_status: 'activated',
      },
      error: null,
    };
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
