-- Leyendas de Bacalar
-- Proposed migration: creator onboarding with a second email confirmation.
--
-- IMPORTANT:
-- This file is a proposal only. Do not apply it until it has been reviewed.
-- It intentionally does not modify RLS policies.
--
-- Intended flow:
-- 1. User confirms normal Supabase Auth email.
-- 2. User submits creator editorial onboarding form.
-- 3. The application remains pending.
-- 4. An Edge Function issues a creator-onboarding token and emails it.
-- 5. User opens /creator/confirm?token=TOKEN while authenticated.
-- 6. confirm_creator_onboarding(TOKEN) activates the creator role/profile.

begin;

create extension if not exists pgcrypto with schema extensions;

-- The previous direct activation RPC must not be callable by normal clients.
revoke all on function public.complete_creator_onboarding(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  text,
  text
) from public, anon, authenticated;

-- Keep these columns idempotent in case the earlier proposal has already been applied.
alter table public.creator_applications
  add column if not exists pen_name text,
  add column if not exists legal_first_name text,
  add column if not exists legal_last_name text,
  add column if not exists affiliation text,
  add column if not exists city text,
  add column if not exists state_region text,
  add column if not exists country text,
  add column if not exists phone text,
  add column if not exists biography text,
  add column if not exists creator_terms_accepted_at timestamptz,
  add column if not exists creator_privacy_accepted_at timestamptz,
  add column if not exists authorship_declaration_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_version text,
  add column if not exists email_confirmed_at_snapshot timestamptz,
  add column if not exists onboarding_completed_at timestamptz;

create table if not exists public.creator_onboarding_email_tokens (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references public.users_profile(id) on delete cascade,
  application_id uuid not null references public.creator_applications(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint creator_onboarding_token_expiry_check check (expires_at > created_at)
);

alter table public.creator_onboarding_email_tokens enable row level security;

comment on table public.creator_onboarding_email_tokens is
  'Stores hashed one-time tokens for the second creator-onboarding email confirmation. This table must not be queried from frontend, must not be exposed to anon/authenticated, and must operate only through SECURITY DEFINER RPCs plus a controlled Edge Function.';
comment on column public.creator_onboarding_email_tokens.token_hash is
  'SHA-256 hash of the confirmation token. Never store the plain token.';

-- Security note:
-- This table must not be queried from frontend.
-- Do not expose it to anon or authenticated.
-- It must operate only through SECURITY DEFINER RPCs and a controlled Edge Function.
revoke all on table public.creator_onboarding_email_tokens from public, anon, authenticated;

create index if not exists creator_onboarding_email_tokens_user_id_idx
  on public.creator_onboarding_email_tokens (user_id);

create index if not exists creator_onboarding_email_tokens_application_id_idx
  on public.creator_onboarding_email_tokens (application_id);

create index if not exists creator_onboarding_email_tokens_valid_idx
  on public.creator_onboarding_email_tokens (token_hash, expires_at)
  where consumed_at is null;

create or replace function public.submit_creator_onboarding_request(
  p_pen_name text,
  p_legal_first_name text,
  p_legal_last_name text,
  p_affiliation text,
  p_city text,
  p_state_region text,
  p_country text,
  p_phone text,
  p_biography text,
  p_reason text,
  p_portfolio_url text,
  p_accept_creator_terms boolean,
  p_accept_creator_privacy boolean,
  p_accept_authorship_declaration boolean,
  p_terms_version text,
  p_privacy_version text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid;
  v_email_confirmed_at timestamptz;
  v_application_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Debes iniciar sesion.';
  end if;

  if public.current_user_has_role('creator') then
    raise exception 'Tu perfil de creador ya esta activo.';
  end if;

  select u.email_confirmed_at
  into v_email_confirmed_at
  from auth.users u
  where u.id = v_user_id;

  if v_email_confirmed_at is null then
    raise exception 'Debes confirmar tu correo antes de continuar como creador.';
  end if;

  if not exists (
    select 1
    from public.users_profile up
    where up.id = v_user_id
      and up.status = 'active'
  ) then
    raise exception 'Tu cuenta no esta activa.';
  end if;

  if nullif(trim(coalesce(p_pen_name, '')), '') is null then
    raise exception 'El nombre de autor es obligatorio.';
  end if;

  if nullif(trim(coalesce(p_legal_first_name, '')), '') is null then
    raise exception 'El nombre legal es obligatorio.';
  end if;

  if nullif(trim(coalesce(p_legal_last_name, '')), '') is null then
    raise exception 'Los apellidos son obligatorios.';
  end if;

  if nullif(trim(coalesce(p_country, '')), '') is null then
    raise exception 'El pais es obligatorio.';
  end if;

  if nullif(trim(coalesce(p_biography, '')), '') is null
     and nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'La biografia o el motivo son obligatorios.';
  end if;

  if coalesce(p_accept_creator_terms, false) is not true
     or coalesce(p_accept_creator_privacy, false) is not true
     or coalesce(p_accept_authorship_declaration, false) is not true then
    raise exception 'Debes aceptar los terminos, el aviso de privacidad y la declaracion de autoria.';
  end if;

  if exists (
    select 1
    from public.creator_profiles cp
    where cp.user_id = v_user_id
      and cp.profile_status in ('paused', 'banned')
  ) then
    raise exception 'Tu perfil de creador no puede ser reactivado desde este flujo.';
  end if;

  select ca.id
  into v_application_id
  from public.creator_applications ca
  where ca.user_id = v_user_id
  order by ca.created_at desc
  limit 1
  for update;

  if v_application_id is null then
    insert into public.creator_applications (
      user_id,
      status,
      reason,
      portfolio_url,
      reviewed_by,
      reviewed_at,
      admin_feedback,
      pen_name,
      legal_first_name,
      legal_last_name,
      affiliation,
      city,
      state_region,
      country,
      phone,
      biography,
      creator_terms_accepted_at,
      creator_privacy_accepted_at,
      authorship_declaration_accepted_at,
      terms_version,
      privacy_version,
      email_confirmed_at_snapshot,
      onboarding_completed_at
    )
    values (
      v_user_id,
      'pending',
      coalesce(nullif(trim(coalesce(p_reason, '')), ''), nullif(trim(coalesce(p_biography, '')), '')),
      nullif(trim(coalesce(p_portfolio_url, '')), ''),
      null,
      null,
      'Pendiente de confirmacion de alta como creador por correo.',
      trim(p_pen_name),
      trim(p_legal_first_name),
      trim(p_legal_last_name),
      nullif(trim(coalesce(p_affiliation, '')), ''),
      nullif(trim(coalesce(p_city, '')), ''),
      nullif(trim(coalesce(p_state_region, '')), ''),
      trim(p_country),
      nullif(trim(coalesce(p_phone, '')), ''),
      nullif(trim(coalesce(p_biography, '')), ''),
      now(),
      now(),
      now(),
      nullif(trim(coalesce(p_terms_version, '')), ''),
      nullif(trim(coalesce(p_privacy_version, '')), ''),
      v_email_confirmed_at,
      null
    )
    returning id into v_application_id;
  else
    update public.creator_applications
    set
      status = 'pending',
      reason = coalesce(nullif(trim(coalesce(p_reason, '')), ''), nullif(trim(coalesce(p_biography, '')), '')),
      portfolio_url = nullif(trim(coalesce(p_portfolio_url, '')), ''),
      reviewed_by = null,
      reviewed_at = null,
      admin_feedback = 'Pendiente de confirmacion de alta como creador por correo.',
      pen_name = trim(p_pen_name),
      legal_first_name = trim(p_legal_first_name),
      legal_last_name = trim(p_legal_last_name),
      affiliation = nullif(trim(coalesce(p_affiliation, '')), ''),
      city = nullif(trim(coalesce(p_city, '')), ''),
      state_region = nullif(trim(coalesce(p_state_region, '')), ''),
      country = trim(p_country),
      phone = nullif(trim(coalesce(p_phone, '')), ''),
      biography = nullif(trim(coalesce(p_biography, '')), ''),
      creator_terms_accepted_at = now(),
      creator_privacy_accepted_at = now(),
      authorship_declaration_accepted_at = now(),
      terms_version = nullif(trim(coalesce(p_terms_version, '')), ''),
      privacy_version = nullif(trim(coalesce(p_privacy_version, '')), ''),
      email_confirmed_at_snapshot = v_email_confirmed_at,
      onboarding_completed_at = null
    where id = v_application_id;
  end if;

  return v_application_id;
end;
$$;

comment on function public.submit_creator_onboarding_request(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  text,
  text
) is
  'Stores creator onboarding form and legal acceptance as pending. It does not activate the creator role.';

revoke all on function public.submit_creator_onboarding_request(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  text,
  text
) from public, anon;

grant execute on function public.submit_creator_onboarding_request(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  boolean,
  boolean,
  text,
  text
) to authenticated;

-- Private helper intended for the Edge Function that sends email with Resend.
-- It returns the plain token exactly once so the Edge Function can compose:
--   {SITE_URL}/creator/confirm?token=TOKEN
-- Do not grant this function to anon/authenticated clients.
create or replace function public.issue_creator_onboarding_email_token(
  p_application_id uuid,
  p_expires_in interval default interval '24 hours'
)
returns table(application_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_application public.creator_applications%rowtype;
  v_email_confirmed_at timestamptz;
  v_token text;
  v_expires_at timestamptz;
begin
  select *
  into v_application
  from public.creator_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'La solicitud no existe.';
  end if;

  if v_application.status <> 'pending' then
    raise exception 'La solicitud no esta pendiente de confirmacion.';
  end if;

  select u.email_confirmed_at
  into v_email_confirmed_at
  from auth.users u
  where u.id = v_application.user_id;

  if v_email_confirmed_at is null then
    raise exception 'El usuario no ha confirmado su correo.';
  end if;

  update public.creator_onboarding_email_tokens
  set consumed_at = now()
  where application_id = p_application_id
    and consumed_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at := now() + coalesce(p_expires_in, interval '24 hours');

  insert into public.creator_onboarding_email_tokens (
    user_id,
    application_id,
    token_hash,
    expires_at
  )
  values (
    v_application.user_id,
    v_application.id,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_expires_at
  );

  application_id := v_application.id;
  token := v_token;
  expires_at := v_expires_at;
  return next;
end;
$$;

revoke all on function public.issue_creator_onboarding_email_token(uuid, interval)
  from public, anon, authenticated;

grant execute on function public.issue_creator_onboarding_email_token(uuid, interval)
  to service_role;

create or replace function public.confirm_creator_onboarding(p_token text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid;
  v_token_hash text;
  v_token_row public.creator_onboarding_email_tokens%rowtype;
  v_application public.creator_applications%rowtype;
  v_creator_role_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Debes iniciar sesion.';
  end if;

  if nullif(trim(coalesce(p_token, '')), '') is null then
    raise exception 'Token invalido.';
  end if;

  v_token_hash := encode(extensions.digest(trim(p_token), 'sha256'), 'hex');

  select *
  into v_token_row
  from public.creator_onboarding_email_tokens
  where token_hash = v_token_hash
  for update;

  if not found then
    raise exception 'El enlace de confirmacion no es valido.';
  end if;

  if v_token_row.user_id <> v_user_id then
    raise exception 'Este enlace no corresponde a tu cuenta.';
  end if;

  if v_token_row.consumed_at is not null then
    raise exception 'Este enlace ya fue utilizado.';
  end if;

  if v_token_row.expires_at <= now() then
    raise exception 'El enlace de confirmacion ha expirado.';
  end if;

  select *
  into v_application
  from public.creator_applications
  where id = v_token_row.application_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'La solicitud de creador no existe.';
  end if;

  if exists (
    select 1
    from public.creator_profiles cp
    where cp.user_id = v_user_id
      and cp.profile_status in ('paused', 'banned')
  ) then
    raise exception 'Tu perfil de creador no puede ser reactivado desde este flujo.';
  end if;

  select id
  into v_creator_role_id
  from public.roles
  where name = 'creator';

  if v_creator_role_id is null then
    raise exception 'El rol creator no existe.';
  end if;

  update public.creator_onboarding_email_tokens
  set consumed_at = now()
  where id = v_token_row.id;

  update public.creator_applications
  set
    status = 'approved',
    admin_feedback = 'Alta de creador confirmada por enlace de correo.',
    reviewed_by = null,
    reviewed_at = null,
    onboarding_completed_at = now()
  where id = v_application.id;

  insert into public.creator_profiles (
    user_id,
    pen_name,
    biography,
    profile_status
  )
  values (
    v_user_id,
    trim(v_application.pen_name),
    nullif(trim(coalesce(v_application.biography, '')), ''),
    'active'
  )
  on conflict (user_id) do update
  set
    pen_name = excluded.pen_name,
    biography = coalesce(excluded.biography, public.creator_profiles.biography),
    profile_status = 'active',
    updated_at = now();

  insert into public.user_roles (
    user_id,
    role_id,
    assigned_by
  )
  values (
    v_user_id,
    v_creator_role_id,
    null
  )
  on conflict (user_id, role_id) do nothing;

  update public.users_profile
  set
    active_role = 'creator',
    updated_at = now()
  where id = v_user_id;

  insert into public.admin_audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    severity,
    details
  )
  values (
    null,
    'confirm_creator_onboarding',
    'creator_application',
    v_application.id,
    'info',
    jsonb_build_object(
      'user_id', v_user_id,
      'token_id', v_token_row.id,
      'pen_name', v_application.pen_name,
      'terms_version', v_application.terms_version,
      'privacy_version', v_application.privacy_version
    )
  );

  return v_application.id;
end;
$$;

comment on function public.confirm_creator_onboarding(text) is
  'Consumes a creator-onboarding email confirmation token and activates the creator role/profile.';

revoke all on function public.confirm_creator_onboarding(text) from public, anon;
grant execute on function public.confirm_creator_onboarding(text) to authenticated;

commit;
