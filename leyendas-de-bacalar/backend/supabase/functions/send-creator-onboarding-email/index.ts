import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.42.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function emailHtml({ confirmationUrl }: { confirmationUrl: string }) {
  return `
    <div style="margin:0;padding:32px;background:#061826;color:#eafbff;font-family:Arial,sans-serif;">
      <div style="max-width:620px;margin:0 auto;background:#082c3a;border:1px solid rgba(48,207,242,.35);border-radius:18px;padding:32px;">
        <p style="margin:0 0 12px;color:#30cff2;font-size:13px;letter-spacing:.08em;text-transform:uppercase;">Leyendas de Bacalar</p>
        <h1 style="margin:0 0 18px;color:#ffffff;font-size:28px;">Confirma tu alta como creador</h1>
        <p style="font-size:16px;line-height:1.6;color:#d8f7ff;">
          Recibimos tu formulario editorial. Para activar tu perfil de creador, confirma este enlace.
        </p>
        <p style="font-size:16px;line-height:1.6;color:#d8f7ff;">
          Despues de confirmar, podras entrar al panel de autor y crear borradores. Tus obras seguiran pasando por revision administrativa antes de publicarse.
        </p>
        <a href="${confirmationUrl}" style="display:inline-block;margin:20px 0;padding:14px 22px;border-radius:12px;background:linear-gradient(135deg,#049dd9,#30cff2);color:#ffffff;text-decoration:none;font-weight:700;">
          Confirmar alta como creador
        </a>
        <p style="font-size:13px;line-height:1.5;color:#a8ddea;">
          Si no solicitaste convertirte en creador, puedes ignorar este correo.
        </p>
      </div>
    </div>
  `;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, code: 'method_not_allowed', error: 'Metodo no permitido.' }, 405);
  }

  console.log('creator email function started');

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const siteUrl = Deno.env.get('SITE_URL');

  const missingSecrets = [
    ['SUPABASE_URL', supabaseUrl],
    ['SUPABASE_SERVICE_ROLE_KEY', supabaseServiceRoleKey],
    ['RESEND_API_KEY', resendApiKey],
    ['SITE_URL', siteUrl],
  ].filter(([, value]) => !value).map(([name]) => name);

  const invalidResendKey = Boolean(resendApiKey && !resendApiKey.startsWith('re_'));

  if (missingSecrets.length || invalidResendKey) {
    console.error('creator email missing or invalid secrets', {
      missingSecrets,
      invalidResendKey,
    });
    return jsonResponse({
      ok: false,
      code: 'missing_secret',
      error: 'La funcion no esta configurada correctamente.',
    }, 500);
  }

  console.log('creator email secrets validated');

  const authorization = request.headers.get('Authorization') || '';
  const jwt = authorization.replace(/^Bearer\s+/i, '').trim();

  if (!jwt) {
    return jsonResponse({
      ok: false,
      code: 'invalid_session',
      error: 'Tu sesion no pudo validarse.',
    }, 401);
  }

  const authClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: userData, error: userError } = await authClient.auth.getUser(jwt);

  if (userError || !userData?.user) {
    console.error('creator email auth validation failed', {
      message: userError?.message,
      code: userError?.code,
    });
    return jsonResponse({
      ok: false,
      code: 'invalid_session',
      error: 'Tu sesion no pudo validarse.',
    }, 401);
  }

  const user = userData.user;
  const email = user.email;

  if (!email) {
    console.error('creator email user without email', { userId: user.id });
    return jsonResponse({
      ok: false,
      code: 'invalid_session',
      error: 'Tu sesion no pudo validarse.',
    }, 400);
  }

  console.log('creator email user validated', { userId: user.id, email });

  const body = await request.json().catch(() => ({}));
  const applicationId =
    typeof body.application_id === 'string'
      ? body.application_id.trim()
      : typeof body.applicationId === 'string'
        ? body.applicationId.trim()
        : null;

  if (!applicationId) {
    return jsonResponse({
      ok: false,
      code: 'invalid_application',
      error: 'No pudimos validar tu solicitud de creador.',
    }, 400);
  }

  const { data: application, error: applicationError } = await serviceClient
    .from('creator_applications')
    .select('id, user_id, status')
    .eq('id', applicationId)
    .maybeSingle();

  if (applicationError) {
    console.error('creator application lookup failed', {
      applicationId,
      message: applicationError.message,
      details: applicationError.details,
      hint: applicationError.hint,
      code: applicationError.code,
    });
    return jsonResponse({
      ok: false,
      code: 'invalid_application',
      error: 'No pudimos validar tu solicitud de creador.',
    }, 500);
  }

  if (!application?.id) {
    return jsonResponse({
      ok: false,
      code: 'invalid_application',
      error: 'No pudimos validar tu solicitud de creador.',
    }, 404);
  }

  if (application.user_id !== user.id) {
    return jsonResponse({
      ok: false,
      code: 'invalid_application',
      error: 'No pudimos validar tu solicitud de creador.',
    }, 403);
  }

  if (application.status !== 'pending') {
    return jsonResponse({
      ok: false,
      code: 'invalid_application',
      error: 'No pudimos validar tu solicitud de creador.',
    }, 400);
  }

  console.log('creator email application validated', { applicationId });

  const { data: tokenRows, error: tokenError } = await serviceClient.rpc(
    'issue_creator_onboarding_email_token',
    { p_application_id: applicationId },
  );

  const tokenRow = Array.isArray(tokenRows) ? tokenRows[0] : tokenRows;

  if (tokenError || !tokenRow?.token) {
    console.error('issue_creator_onboarding_email_token failed', {
      message: tokenError?.message,
      details: tokenError?.details,
      hint: tokenError?.hint,
      code: tokenError?.code,
    });
    return jsonResponse({
      ok: false,
      code: 'token_generation_failed',
      error: 'No pudimos generar el enlace de confirmacion.',
    }, 500);
  }

  console.log('creator email token generated', { applicationId });

  const confirmationUrl = `${siteUrl.replace(/\/$/, '')}/creator/confirm?token=${encodeURIComponent(tokenRow.token)}`;
  console.log('creator email sending through Resend', {
    applicationId,
    to: email,
    from: 'no-reply@bacalarlegends-ar.com',
  });

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Bacalar Legends AR <no-reply@bacalarlegends-ar.com>',
      to: email,
      subject: 'Confirma tu alta como creador',
      html: emailHtml({ confirmationUrl }),
    }),
  });
  const resendRaw = await resendResponse.text();
  let resendBody = null;

  try {
    resendBody = resendRaw ? JSON.parse(resendRaw) : null;
  } catch {
    resendBody = { raw: resendRaw };
  }

  console.log('creator email resend response', {
    status: resendResponse.status,
    ok: resendResponse.ok,
    body: resendBody,
  });

  if (!resendResponse.ok) {
    console.error('Resend did not confirm delivery request', {
      status: resendResponse.status,
      body: resendBody,
    });
    return jsonResponse({
      ok: false,
      code: 'resend_failed',
      error: 'No pudimos enviar el correo de confirmacion.',
      resend_error: resendBody?.error?.message || resendBody?.message || null,
    }, 500);
  }

  if (!resendBody?.id) {
    console.error('Resend response missing id', {
      status: resendResponse.status,
      body: resendBody,
    });
    return jsonResponse({
      ok: false,
      code: 'resend_no_id',
      error: 'Resend no confirmo el envio del correo.',
    }, 500);
  }

  console.log('creator confirmation email sent', {
    applicationId,
    to: email,
    resendId: resendBody.id,
  });

  return jsonResponse({
    ok: true,
    message: 'Correo de confirmacion enviado.',
    resend_id: resendBody.id,
  });
});
