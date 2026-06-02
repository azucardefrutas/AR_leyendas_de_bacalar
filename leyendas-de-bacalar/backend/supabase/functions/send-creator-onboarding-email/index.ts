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
    return jsonResponse({ error: 'Metodo no permitido.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const siteUrl = Deno.env.get('SITE_URL');

  if (!supabaseUrl || !supabaseServiceRoleKey || !resendApiKey || !siteUrl) {
    return jsonResponse({ error: 'La funcion no esta configurada correctamente.' }, 500);
  }

  const authorization = request.headers.get('Authorization') || '';
  const jwt = authorization.replace(/^Bearer\s+/i, '').trim();

  if (!jwt) {
    return jsonResponse({ error: 'Debes iniciar sesion para continuar.' }, 401);
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: userData, error: userError } = await serviceClient.auth.getUser(jwt);

  if (userError || !userData?.user) {
    return jsonResponse({ error: 'No pudimos validar tu sesion.' }, 401);
  }

  if (!userData.user.email) {
    return jsonResponse({ error: 'Tu cuenta no tiene correo disponible.' }, 400);
  }

  const body = await request.json().catch(() => ({}));
  const applicationId =
    typeof body.application_id === 'string'
      ? body.application_id
      : typeof body.applicationId === 'string'
        ? body.applicationId
        : null;

  if (!applicationId) {
    return jsonResponse({ error: 'Falta la solicitud de creador.' }, 400);
  }

  const { data: application, error: applicationError } = await serviceClient
    .from('creator_applications')
    .select('id')
    .eq('id', applicationId)
    .eq('user_id', userData.user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (applicationError || !application?.id) {
    return jsonResponse({ error: 'No encontramos una solicitud de creador pendiente.' }, 404);
  }

  const { data: tokenRows, error: tokenError } = await serviceClient.rpc(
    'issue_creator_onboarding_email_token',
    { p_application_id: applicationId },
  );

  const tokenRow = Array.isArray(tokenRows) ? tokenRows[0] : tokenRows;

  if (tokenError || !tokenRow?.token) {
    console.error('issue_creator_onboarding_email_token failed');
    return jsonResponse({ error: 'No pudimos preparar el correo de confirmacion.' }, 500);
  }

  const confirmationUrl = `${siteUrl.replace(/\/$/, '')}/creator/confirm?token=${encodeURIComponent(tokenRow.token)}`;
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Bacalar Legends AR <no-reply@bacalarlegends-ar.com>',
      to: [userData.user.email],
      subject: 'Confirma tu alta como creador',
      html: emailHtml({ confirmationUrl }),
      text: `Confirma tu alta como creador: ${confirmationUrl}`,
    }),
  });

  if (!resendResponse.ok) {
    console.error('Resend email failed', resendResponse.status);
    return jsonResponse({ error: 'No pudimos enviar el correo de confirmacion.' }, 502);
  }

  return jsonResponse({
    ok: true,
    applicationId,
    expiresAt: tokenRow.expires_at,
  });
});
