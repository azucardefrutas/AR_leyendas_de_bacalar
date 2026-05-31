-- Leyendas de Bacalar
-- Proposed migration: creator onboarding without manual admin approval.
--
-- IMPORTANT:
-- This file is a proposal only. Do not apply it until it has been reviewed.
-- It supports this flow:
-- confirmed email -> editorial form -> legal acceptance -> creator role/profile.

begin;

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

comment on column public.creator_applications.pen_name is
  'Creator pen name submitted during creator onboarding.';
comment on column public.creator_applications.creator_terms_accepted_at is
  'Timestamp when the user accepted creator terms during onboarding.';
comment on column public.creator_applications.creator_privacy_accepted_at is
  'Timestamp when the user accepted creator privacy notice during onboarding.';
comment on column public.creator_applications.authorship_declaration_accepted_at is
  'Timestamp when the user declared authorship/rights over future works and resources.';
comment on column public.creator_applications.email_confirmed_at_snapshot is
  'Snapshot of auth.users.email_confirmed_at at creator onboarding completion time.';
comment on column public.creator_applications.onboarding_completed_at is
  'Timestamp when the system completed creator activation without manual admin approval.';

create or replace function public.complete_creator_onboarding(
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
  v_creator_role_id uuid;
  v_application_id uuid;
  v_existing_profile public.creator_profiles%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Debes iniciar sesion.';
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

  select *
  into v_existing_profile
  from public.creator_profiles
  where user_id = v_user_id
  for update;

  if found and v_existing_profile.profile_status in ('paused', 'banned') then
    raise exception 'Tu perfil de creador no puede ser reactivado desde este flujo.';
  end if;

  select id
  into v_creator_role_id
  from public.roles
  where name = 'creator';

  if v_creator_role_id is null then
    raise exception 'El rol creator no existe.';
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
      'approved',
      coalesce(nullif(trim(coalesce(p_reason, '')), ''), nullif(trim(coalesce(p_biography, '')), '')),
      nullif(trim(coalesce(p_portfolio_url, '')), ''),
      null,
      null,
      'Alta de creador completada por onboarding con correo confirmado.',
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
      now()
    )
    returning id into v_application_id;
  else
    update public.creator_applications
    set
      status = 'approved',
      reason = coalesce(nullif(trim(coalesce(p_reason, '')), ''), nullif(trim(coalesce(p_biography, '')), '')),
      portfolio_url = nullif(trim(coalesce(p_portfolio_url, '')), ''),
      reviewed_by = null,
      reviewed_at = null,
      admin_feedback = 'Alta de creador completada por onboarding con correo confirmado.',
      pen_name = trim(p_pen_name),
      legal_first_name = trim(p_legal_first_name),
      legal_last_name = trim(p_legal_last_name),
      affiliation = nullif(trim(coalesce(p_affiliation, '')), ''),
      city = nullif(trim(coalesce(p_city, '')), ''),
      state_region = nullif(trim(coalesce(p_state_region, '')), ''),
      country = trim(p_country),
      phone = nullif(trim(coalesce(p_phone, '')), ''),
      biography = nullif(trim(coalesce(p_biography, '')), ''),
      creator_terms_accepted_at = coalesce(creator_terms_accepted_at, now()),
      creator_privacy_accepted_at = coalesce(creator_privacy_accepted_at, now()),
      authorship_declaration_accepted_at = coalesce(authorship_declaration_accepted_at, now()),
      terms_version = nullif(trim(coalesce(p_terms_version, '')), ''),
      privacy_version = nullif(trim(coalesce(p_privacy_version, '')), ''),
      email_confirmed_at_snapshot = v_email_confirmed_at,
      onboarding_completed_at = coalesce(onboarding_completed_at, now())
    where id = v_application_id;
  end if;

  insert into public.creator_profiles (
    user_id,
    pen_name,
    biography,
    profile_status
  )
  values (
    v_user_id,
    trim(p_pen_name),
    nullif(trim(coalesce(p_biography, '')), ''),
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
    'creator_onboarding_complete',
    'creator_application',
    v_application_id,
    'info',
    jsonb_build_object(
      'user_id', v_user_id,
      'pen_name', trim(p_pen_name),
      'email_confirmed_at', v_email_confirmed_at,
      'terms_version', nullif(trim(coalesce(p_terms_version, '')), ''),
      'privacy_version', nullif(trim(coalesce(p_privacy_version, '')), '')
    )
  );

  return v_user_id;
end;
$$;

comment on function public.complete_creator_onboarding(
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
  'Completes creator onboarding for the authenticated user after email confirmation and legal acceptance.';

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
) from public;

grant execute on function public.complete_creator_onboarding(
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

commit;
