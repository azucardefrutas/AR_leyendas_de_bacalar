import { getSession } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';
import { getCurrentUserRoles } from './roleService.js';

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

function friendlyCreatorApplicationError(error) {
  if (!error) return null;
  const message = String(error.message || '');

  if (message.includes('sesion expiro') || message.includes('no hay sesion') || message.includes('no hay session')) {
    return new Error('Tu sesion expiro. Inicia sesion nuevamente para continuar.');
  }
  if (
    message.includes('No pudimos validar tu sesion') ||
    message.includes('sesion no pudo validarse') ||
    message.includes('Debes iniciar sesion para confirmar')
  ) {
    return new Error('Tu sesion no pudo validarse. Vuelve a iniciar sesion.');
  }
  if (message.includes('No pudimos enviar el correo')) {
    return new Error('No pudimos enviar el correo de confirmacion. Intentalo nuevamente en unos minutos.');
  }
  if (message.includes('Falta la solicitud') || message.includes('application_id') || message.includes('solicitud de creador')) {
    return new Error('No pudimos registrar tu solicitud de creador.');
  }
  if (message.includes('confirmar tu correo')) {
    return new Error('Debes confirmar tu correo antes de continuar como creador.');
  }
  if (message.includes('enlace') || message.includes('Token') || message.includes('token')) {
    return new Error('El enlace de confirmacion no es valido o expiro.');
  }
  if (message.includes('terminos') || message.includes('privacidad') || message.includes('autoria')) {
    return new Error('Debes aceptar los terminos, el aviso de privacidad y la declaracion de autoria.');
  }
  if (message.includes('nombre de autor')) {
    return new Error('Escribe tu nombre de autor o seudonimo.');
  }

  return new Error('No pudimos completar la accion. Verifica tu sesion e intenta nuevamente.');
}

async function getSessionAccessToken(client) {
  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error) {
    if (import.meta.env.DEV) console.error('creator onboarding session error', error);
    return { data: null, error: new Error('Tu sesion expiro. Inicia sesion nuevamente para continuar.') };
  }

  if (!session?.access_token) {
    return { data: null, error: new Error('Tu sesion expiro. Inicia sesion nuevamente para continuar.') };
  }

  return { data: session.access_token, error: null };
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

async function getFunctionErrorMessage(error) {
  if (!error) return null;

  const context = error.context || error.response;
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.json();
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    } catch {
      // Ignore body parsing failures and use the generic message below.
    }
  }

  return error.message ? String(error.message) : null;
}

function getApplicationIdFromRpcResult(result) {
  if (typeof result === 'string') return result;
  if (Array.isArray(result)) return getApplicationIdFromRpcResult(result[0]);
  if (result && typeof result === 'object') {
    return result.application_id || result.applicationId || result.id || null;
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

export async function sendCreatorOnboardingEmail(applicationId, accessToken) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const cleanApplicationId = String(applicationId ?? '').trim();
  if (!cleanApplicationId || cleanApplicationId === 'undefined') {
    return { data: null, error: new Error('No pudimos registrar tu solicitud de creador.') };
  }

  let token = accessToken;
  if (!token) {
    const { data: sessionToken, error: sessionError } = await getSessionAccessToken(client);
    if (sessionError) return { data: null, error: sessionError };
    token = sessionToken;
  }

  try {
    const { data, error } = await client.functions.invoke('send-creator-onboarding-email', {
      body: { application_id: cleanApplicationId },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      if (import.meta.env.DEV) console.error('[creator onboarding] edge function error', error);
      const functionMessage = await getFunctionErrorMessage(error);
      return { data: null, error: friendlyCreatorApplicationError(new Error(functionMessage || error.message)) };
    }

    if (!data?.ok) {
      if (import.meta.env.DEV) console.error('[creator onboarding] email not sent', data);
      return {
        data: null,
        error: friendlyCreatorApplicationError(new Error(data?.error || 'No pudimos enviar el correo de confirmacion.')),
      };
    }

    return { data, error: null };
  } catch (error) {
    if (import.meta.env.DEV) console.error('sendCreatorOnboardingEmail unexpected error', error);
    return { data: null, error: friendlyCreatorApplicationError(error) };
  }
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
    const { data: accessToken, error: sessionError } = await getSessionAccessToken(client);
    if (sessionError) return { data: null, error: sessionError };

    const { data: applicationResult, error } = await client.rpc('submit_creator_onboarding_request', {
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
      if (import.meta.env.DEV) console.error('submitCreatorOnboardingRequest error', error);
      return { data: null, error: friendlyCreatorApplicationError(error) };
    }

    const applicationId = getApplicationIdFromRpcResult(applicationResult);
    if (!applicationId) {
      if (import.meta.env.DEV) console.error('submitCreatorOnboardingRequest missing application_id', applicationResult);
      return { data: null, error: new Error('No pudimos registrar tu solicitud de creador.') };
    }

    const { data: emailResult, error: emailError } = await sendCreatorOnboardingEmail(applicationId, accessToken);

    if (emailError) {
      return {
        data: { id: applicationId, status: 'pending', email_status: 'failed' },
        error: emailError,
      };
    }

    const { data: pendingApplication } = await getMyCreatorApplication();

    return {
      data: {
        ...(pendingApplication ?? {}),
        id: pendingApplication?.id ?? applicationId,
        email_status: 'sent',
        resend_id: emailResult?.resend_id || null,
        activation_status: 'pending_email_confirmation',
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: friendlyCreatorApplicationError(error) };
  }
}

export async function confirmCreatorOnboarding(token) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  if (!token || !String(token).trim()) {
    return { data: null, error: new Error('El enlace de confirmacion no es valido.') };
  }

  try {
    const { data, error } = await client.rpc('confirm_creator_onboarding', {
      p_token: String(token).trim(),
    });

    if (error) {
      if (import.meta.env.DEV) console.error('confirmCreatorOnboarding error', error);
      return { data: null, error: friendlyCreatorApplicationError(error) };
    }

    return { data, error: null };
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
