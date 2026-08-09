-- Leyendas de Bacalar
-- 04 - Dependency-ordered functions
-- Target Supabase project: ojwxchkgzywteutqxkfg

begin;

set local search_path to public, extensions;

-- 6. FUNCIONES ORDENADAS POR DEPENDENCIAS
-- Generated from the recovered catalog dump. Do not reorder manually.

-- 01. cancel_subscription(p_subscription_id uuid)
CREATE OR REPLACE FUNCTION public.cancel_subscription(p_subscription_id uuid)
 RETURNS subscriptions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_row public.subscriptions;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesión para cancelar una suscripción.';
  end if;

  -- Solo la suscripción activa del propio usuario puede cancelarse.
  -- Se marca 'cancelled' pero se conserva ends_at para no cortar el acceso.
  update public.subscriptions
     set status = 'cancelled',
         updated_at = now()
   where id = p_subscription_id
     and user_id = v_user_id
     and status = 'active'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'No se encontró una suscripción activa para cancelar.';
  end if;

  return v_row;
end;
$function$
;

-- 02. complete_creator_onboarding(p_pen_name text, p_legal_first_name text, p_legal_last_name text, p_affiliation text, p_city text, p_state_region text, p_country text, p_phone text, p_biography text, p_reason text, p_portfolio_url text, p_accept_creator_terms boolean, p_accept_creator_privacy boolean, p_accept_authorship_declaration boolean, p_terms_version text, p_privacy_version text)
CREATE OR REPLACE FUNCTION public.complete_creator_onboarding(p_pen_name text, p_legal_first_name text, p_legal_last_name text, p_affiliation text, p_city text, p_state_region text, p_country text, p_phone text, p_biography text, p_reason text, p_portfolio_url text, p_accept_creator_terms boolean, p_accept_creator_privacy boolean, p_accept_authorship_declaration boolean, p_terms_version text, p_privacy_version text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- 03. confirm_creator_onboarding(p_token text)
CREATE OR REPLACE FUNCTION public.confirm_creator_onboarding(p_token text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_token_hash text;
  v_token_row public.creator_onboarding_email_tokens%rowtype;
  v_application public.creator_applications%rowtype;
  v_creator_role_id uuid;
begin
  if nullif(trim(coalesce(p_token, '')), '') is null then
    raise exception 'Token invalido.';
  end if;

  v_token_hash := encode(extensions.digest(trim(p_token), 'sha256'), 'hex');

  select * into v_token_row
  from public.creator_onboarding_email_tokens
  where token_hash = v_token_hash
  for update;

  if not found then
    raise exception 'El enlace de confirmacion no es valido.';
  end if;

  -- The single-use, expiring token was emailed only to the applicant, so it is proof
  -- enough on its own. We do NOT require an active session (email links routinely open
  -- logged out / after the session expired). Activate the token's owner.
  v_user_id := v_token_row.user_id;

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
    select 1 from public.creator_profiles cp
    where cp.user_id = v_user_id and cp.profile_status in ('paused', 'banned')
  ) then
    raise exception 'Tu perfil de creador no puede ser reactivado desde este flujo.';
  end if;

  select id into v_creator_role_id from public.roles where name = 'creator';
  if v_creator_role_id is null then
    raise exception 'El rol creator no existe.';
  end if;

  update public.creator_onboarding_email_tokens
  set consumed_at = now()
  where id = v_token_row.id;

  update public.creator_applications
  set status = 'approved',
      admin_feedback = 'Alta de creador confirmada por enlace de correo.',
      reviewed_by = null,
      reviewed_at = null,
      onboarding_completed_at = now()
  where id = v_application.id;

  insert into public.creator_profiles (user_id, pen_name, biography, profile_status)
  values (v_user_id, trim(v_application.pen_name),
          nullif(trim(coalesce(v_application.biography, '')), ''), 'active')
  on conflict (user_id) do update
  set pen_name = excluded.pen_name,
      biography = coalesce(excluded.biography, public.creator_profiles.biography),
      profile_status = 'active',
      updated_at = now();

  insert into public.user_roles (user_id, role_id, assigned_by)
  values (v_user_id, v_creator_role_id, null)
  on conflict (user_id, role_id) do nothing;

  update public.users_profile
  set active_role = 'creator', updated_at = now()
  where id = v_user_id;

  insert into public.admin_audit_logs (admin_id, action, entity_type, entity_id, severity, details)
  values (null, 'confirm_creator_onboarding', 'creator_application', v_application.id, 'info',
    jsonb_build_object('user_id', v_user_id, 'token_id', v_token_row.id, 'pen_name', v_application.pen_name,
      'terms_version', v_application.terms_version, 'privacy_version', v_application.privacy_version));

  return v_application.id;
end;
$function$
;

-- 04. delete_creator_legend(p_legend_id uuid)
CREATE OR REPLACE FUNCTION public.delete_creator_legend(p_legend_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_legend public.legends%rowtype;
  v_legend_status text;
  v_effective_status text;
  v_version_ids uuid[] := array[]::uuid[];
  v_page_ids uuid[] := array[]::uuid[];
  v_scene_ids uuid[] := array[]::uuid[];
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesion para eliminar una historia.';
  end if;

  select *
  into v_legend
  from public.legends
  where id = p_legend_id
  for update;

  if not found then
    raise exception 'La historia no existe o no esta disponible.';
  end if;

  if v_legend.creator_id <> v_user_id then
    raise exception 'No puedes eliminar una historia que no te pertenece.';
  end if;

  v_legend_status := v_legend.status::text;

  if v_legend_status in ('published', 'archived') then
    raise exception 'Esta historia esta protegida y no puede eliminarse.';
  end if;

  select coalesce(array_agg(id), array[]::uuid[])
  into v_version_ids
  from public.legend_versions
  where legend_id = p_legend_id;

  if exists (
    select 1
    from public.legend_versions lv
    where lv.legend_id = p_legend_id
      and lv.status::text in ('approved', 'published')
  ) then
    raise exception 'No se puede eliminar una historia con versiones aprobadas o publicadas.';
  end if;

  if exists (
    select 1
    from public.content_reviews cr
    where cr.legend_version_id = any(v_version_ids)
      and cr.status::text in ('pending', 'approved')
  ) then
    raise exception 'No se puede eliminar una historia con revisiones activas o aprobadas.';
  end if;

  v_effective_status := v_legend_status;

  if exists (
    select 1
    from public.content_reviews cr
    where cr.legend_version_id = any(v_version_ids)
      and cr.status::text = 'changes_requested'
  ) then
    v_effective_status := 'changes_requested';
  elsif exists (
    select 1
    from public.content_reviews cr
    where cr.legend_version_id = any(v_version_ids)
      and cr.status::text = 'rejected'
  ) then
    v_effective_status := 'rejected';
  end if;

  if v_effective_status not in ('draft', 'changes_requested', 'rejected') then
    raise exception 'Esta historia no puede eliminarse porque su estado actual es %. Solo pueden eliminarse borradores, historias devueltas con cambios o rechazadas.', v_effective_status;
  end if;

  if exists (
    select 1
    from public.user_legend_access ula
    where ula.legend_id = p_legend_id
  ) then
    raise exception 'No se puede eliminar una historia con accesos de usuarios.';
  end if;

  if exists (
    select 1
    from public.physical_editions pe
    where pe.legend_id = p_legend_id
  ) then
    raise exception 'No se puede eliminar una historia asociada a ediciones fisicas.';
  end if;

  if exists (
    select 1
    from public.code_requests cr
    where cr.legend_id = p_legend_id
  ) then
    raise exception 'No se puede eliminar una historia asociada a solicitudes de codigos.';
  end if;

  if exists (
    select 1
    from public.products p
    where p.legend_id = p_legend_id
  ) then
    raise exception 'No se puede eliminar una historia asociada a productos.';
  end if;

  select coalesce(array_agg(id), array[]::uuid[])
  into v_page_ids
  from public.legend_pages
  where version_id = any(v_version_ids);

  select coalesce(array_agg(id), array[]::uuid[])
  into v_scene_ids
  from public.ar_scenes
  where page_id = any(v_page_ids);

  delete from public.ar_markers
  where ar_scene_id = any(v_scene_ids);

  delete from public.ar_scenes
  where id = any(v_scene_ids);

  delete from public.content_reviews
  where legend_version_id = any(v_version_ids);

  delete from public.legend_pages
  where version_id = any(v_version_ids);

  delete from public.legend_genres
  where legend_id = p_legend_id;

  delete from public.legend_media
  where legend_id = p_legend_id;

  delete from public.legend_source_documents
  where legend_id = p_legend_id;

  delete from public.legend_versions
  where legend_id = p_legend_id;

  delete from public.legends
  where id = p_legend_id
    and creator_id = v_user_id;

  if not found then
    raise exception 'No se pudo eliminar la historia. Revisa permisos, estado o relaciones protegidas.';
  end if;

  return jsonb_build_object(
    'success', true,
    'legend_id', p_legend_id,
    'deleted_status', v_effective_status
  );
end;
$function$
;

-- 05. delete_legend_draft(p_legend_id uuid)
CREATE OR REPLACE FUNCTION public.delete_legend_draft(p_legend_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_user_id uuid := auth.uid();
  v_legend public.legends%rowtype;
  v_version_ids uuid[] := array[]::uuid[];
  v_page_ids uuid[] := array[]::uuid[];
  v_scene_ids uuid[] := array[]::uuid[];
  v_deleted_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Debes iniciar sesion para eliminar un borrador.';
  end if;

  select *
  into v_legend
  from public.legends
  where id = p_legend_id
  for update;

  if not found then
    raise exception 'La leyenda no existe o no esta disponible.';
  end if;

  if v_legend.creator_id <> v_user_id then
    raise exception 'No puedes eliminar una leyenda que no te pertenece.';
  end if;

  if v_legend.status::text <> 'draft' then
    raise exception 'Solo se pueden eliminar leyendas en borrador.';
  end if;

  select coalesce(array_agg(id), array[]::uuid[])
  into v_version_ids
  from public.legend_versions
  where legend_id = p_legend_id;

  if exists (
    select 1
    from public.legend_versions
    where legend_id = p_legend_id
      and status::text <> 'draft'
  ) then
    raise exception 'No se puede eliminar una leyenda con versiones enviadas o protegidas.';
  end if;

  if exists (
    select 1
    from public.content_reviews
    where legend_version_id = any(v_version_ids)
  ) then
    raise exception 'No se puede eliminar una leyenda con revisiones de contenido relacionadas.';
  end if;

  if exists (select 1 from public.products where legend_id = p_legend_id)
     or exists (select 1 from public.physical_editions where legend_id = p_legend_id)
     or exists (select 1 from public.code_requests where legend_id = p_legend_id)
     or exists (select 1 from public.user_legend_access where legend_id = p_legend_id) then
    raise exception 'No se puede eliminar una leyenda con productos, ediciones, codigos o accesos relacionados.';
  end if;

  select coalesce(array_agg(id), array[]::uuid[])
  into v_page_ids
  from public.legend_pages
  where version_id = any(v_version_ids);

  select coalesce(array_agg(id), array[]::uuid[])
  into v_scene_ids
  from public.ar_scenes
  where page_id = any(v_page_ids);

  delete from public.ar_markers
  where ar_scene_id = any(v_scene_ids);

  delete from public.ar_scenes
  where id = any(v_scene_ids);

  delete from public.legend_pages
  where version_id = any(v_version_ids);

  delete from public.legend_genres
  where legend_id = p_legend_id;

  delete from public.legend_media
  where legend_id = p_legend_id;

  delete from public.legend_source_documents
  where legend_id = p_legend_id;

  delete from public.legend_versions
  where legend_id = p_legend_id;

  delete from public.legends
  where id = p_legend_id
    and creator_id = v_user_id
    and status::text = 'draft';

  get diagnostics v_deleted_count = row_count;

  if v_deleted_count <> 1 then
    raise exception 'No se pudo eliminar la leyenda. Revisa permisos o estado del borrador.';
  end if;

  return jsonb_build_object(
    'success', true,
    'legend_id', p_legend_id
  );
end;
$function$
;

-- 06. get_legend_id_from_edition(p_edition_id uuid)
CREATE OR REPLACE FUNCTION public.get_legend_id_from_edition(p_edition_id uuid)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select pe.legend_id
  from public.physical_editions pe
  where pe.id = p_edition_id
  limit 1;
$function$
;

-- 07. get_legend_id_from_page(p_page_id uuid)
CREATE OR REPLACE FUNCTION public.get_legend_id_from_page(p_page_id uuid)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select lv.legend_id
  from public.legend_pages lp
  join public.legend_versions lv on lv.id = lp.version_id
  where lp.id = p_page_id
  limit 1;
$function$
;

-- 08. get_legend_id_from_scene(p_scene_id uuid)
CREATE OR REPLACE FUNCTION public.get_legend_id_from_scene(p_scene_id uuid)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select lv.legend_id
  from public.ar_scenes ars
  join public.legend_pages lp on lp.id = ars.page_id
  join public.legend_versions lv on lv.id = lp.version_id
  where ars.id = p_scene_id
  limit 1;
$function$
;

-- 09. grant_legend_access(p_user_id uuid, p_legend_id uuid, p_access_source user_access_source, p_source_id uuid DEFAULT NULL::uuid, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
CREATE OR REPLACE FUNCTION public.grant_legend_access(p_user_id uuid, p_legend_id uuid, p_access_source user_access_source, p_source_id uuid DEFAULT NULL::uuid, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_access_id uuid;
begin
  if not exists (
    select 1 from public.users_profile where id = p_user_id
  ) then
    raise exception 'El usuario no existe.';
  end if;

  if not exists (
    select 1 from public.legends where id = p_legend_id
  ) then
    raise exception 'La leyenda no existe.';
  end if;

  insert into public.user_legend_access (
    user_id,
    legend_id,
    access_source,
    source_id,
    status,
    starts_at,
    expires_at
  )
  values (
    p_user_id,
    p_legend_id,
    p_access_source,
    p_source_id,
    'active',
    now(),
    p_expires_at
  )
  on conflict do nothing
  returning id into v_access_id;

  -- Si ya existía un acceso igual, buscarlo.
  if v_access_id is null then
    select id
    into v_access_id
    from public.user_legend_access
    where user_id = p_user_id
      and legend_id = p_legend_id
      and access_source = p_access_source
      and (
        (p_source_id is null and source_id is null)
        or source_id = p_source_id
      )
    limit 1;
  end if;

  return v_access_id;
end;
$function$
;

-- 10. handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_reader_role_id uuid;
  v_default_username text;
begin
  -- Buscar rol reader.
  select id
  into v_reader_role_id
  from public.roles
  where name = 'reader';

  -- Username seguro para evitar duplicados.
  v_default_username := 'user_' || replace(substring(new.id::text from 1 for 8), '-', '');

  -- Crear perfil.
  insert into public.users_profile (
    id,
    full_name,
    username,
    avatar_url,
    status,
    active_role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), v_default_username),
    new.raw_user_meta_data->>'avatar_url',
    'active',
    'reader'
  )
  on conflict (id) do nothing;

  -- Asignar rol reader.
  if v_reader_role_id is not null then
    insert into public.user_roles (
      user_id,
      role_id,
      assigned_by
    )
    values (
      new.id,
      v_reader_role_id,
      null
    )
    on conflict (user_id, role_id) do nothing;
  end if;

  return new;
end;
$function$
;

-- 11. has_role(p_user_id uuid, p_role app_role)
CREATE OR REPLACE FUNCTION public.has_role(p_user_id uuid, p_role app_role)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = p_user_id
      and r.name = p_role
  );
$function$
;

-- 12. is_legend_creator(p_legend_id uuid)
CREATE OR REPLACE FUNCTION public.is_legend_creator(p_legend_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.legends l
    where l.id = p_legend_id
      and l.creator_id = auth.uid()
  );
$function$
;

-- 13. is_legend_published(p_legend_id uuid)
CREATE OR REPLACE FUNCTION public.is_legend_published(p_legend_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.legends l
    where l.id = p_legend_id
      and l.status = 'published'
  );
$function$
;

-- 14. is_marker_creator(p_marker_id uuid)
CREATE OR REPLACE FUNCTION public.is_marker_creator(p_marker_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.ar_markers am
    join public.ar_scenes ars on ars.id = am.ar_scene_id
    join public.legend_pages lp on lp.id = ars.page_id
    join public.legend_versions lv on lv.id = lp.version_id
    join public.legends l on l.id = lv.legend_id
    where am.id = p_marker_id
      and l.creator_id = auth.uid()
  );
$function$
;

-- 15. is_page_creator(p_page_id uuid)
CREATE OR REPLACE FUNCTION public.is_page_creator(p_page_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.legend_pages lp
    join public.legend_versions lv on lv.id = lp.version_id
    join public.legends l on l.id = lv.legend_id
    where lp.id = p_page_id
      and l.creator_id = auth.uid()
  );
$function$
;

-- 16. is_physical_edition_creator(p_edition_id uuid)
CREATE OR REPLACE FUNCTION public.is_physical_edition_creator(p_edition_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.physical_editions pe
    join public.legends l on l.id = pe.legend_id
    where pe.id = p_edition_id
      and l.creator_id = auth.uid()
  );
$function$
;

-- 17. is_scene_creator(p_scene_id uuid)
CREATE OR REPLACE FUNCTION public.is_scene_creator(p_scene_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.ar_scenes ars
    join public.legend_pages lp on lp.id = ars.page_id
    join public.legend_versions lv on lv.id = lp.version_id
    join public.legends l on l.id = lv.legend_id
    where ars.id = p_scene_id
      and l.creator_id = auth.uid()
  );
$function$
;

-- 18. is_version_creator(p_version_id uuid)
CREATE OR REPLACE FUNCTION public.is_version_creator(p_version_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.legend_versions lv
    join public.legends l on l.id = lv.legend_id
    where lv.id = p_version_id
      and l.creator_id = auth.uid()
  );
$function$
;

-- 19. is_version_published(p_version_id uuid)
CREATE OR REPLACE FUNCTION public.is_version_published(p_version_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.legend_versions lv
    join public.legends l on l.id = lv.legend_id
    where lv.id = p_version_id
      and lv.status = 'published'
      and l.status = 'published'
  );
$function$
;

-- 20. issue_creator_onboarding_email_token(p_application_id uuid, p_expires_in interval DEFAULT '24:00:00'::interval)
CREATE OR REPLACE FUNCTION public.issue_creator_onboarding_email_token(p_application_id uuid, p_expires_in interval DEFAULT '24:00:00'::interval)
 RETURNS TABLE(application_id uuid, token text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Qualify the column with the table name: the function declares an OUT column also
  -- named application_id (RETURNS TABLE), which made this reference ambiguous and made
  -- the whole function error out before the confirmation email could be sent.
  update public.creator_onboarding_email_tokens
  set consumed_at = now()
  where creator_onboarding_email_tokens.application_id = p_application_id
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
$function$
;

-- 21. normalize_access_code(p_code text)
CREATE OR REPLACE FUNCTION public.normalize_access_code(p_code text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select upper(regexp_replace(coalesce(trim(p_code), ''), '[^A-Za-z0-9]', '', 'g'));
$function$
;

-- 22. publish_legend_hotspots()
CREATE OR REPLACE FUNCTION public.publish_legend_hotspots()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    update public.interactive_hotspots
      set status = 'published'
      where legend_id = new.id
        and status in ('draft', 'in_review');
  end if;
  return new;
end;
$function$
;

-- 23. random_code_block(p_length integer)
CREATE OR REPLACE FUNCTION public.random_code_block(p_length integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 32 chars
  v_result text := '';
  v_bytes bytea;
  i integer;
begin
  if p_length <= 0 then
    raise exception 'La longitud del bloque debe ser mayor a 0.';
  end if;

  v_bytes := extensions.gen_random_bytes(p_length);

  for i in 1..p_length loop
    v_result := v_result || substr(v_chars, (get_byte(v_bytes, i - 1) & 31) + 1, 1);
  end loop;

  return v_result;
end;
$function$
;

-- 24. set_updated_at()
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

-- 25. user_has_active_legend_access(p_user_id uuid, p_legend_id uuid)
CREATE OR REPLACE FUNCTION public.user_has_active_legend_access(p_user_id uuid, p_legend_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    -- 1) Leyenda gratis publicada: abierta a todos.
    exists (
      select 1
      from public.legends l
      where l.id = p_legend_id
        and l.status = 'published'
        and l.access_type = 'free'
    )
    -- 2) Boleto explicito: codigo, compra digital/fisica, admin_grant o suscripcion.
    or exists (
      select 1
      from public.user_legend_access ula
      where ula.user_id = p_user_id
        and ula.legend_id = p_legend_id
        and ula.status = 'active'
        and ula.starts_at <= now()
        and (
          ula.expires_at is null
          or ula.expires_at > now()
        )
    )
    -- 3) Suscripcion vigente => todo el catalogo de suscripcion/mixto.
    or exists (
      select 1
      from public.subscriptions s
      join public.legends l on l.id = p_legend_id
      where s.user_id = p_user_id
        and s.status = 'active'
        and s.starts_at <= now()
        and (
          s.ends_at is null
          or s.ends_at > now()
        )
        and l.status = 'published'
        and l.access_type in ('subscription', 'mixed')
    );
$function$
;

-- 26. current_user_has_role(p_role app_role)
CREATE OR REPLACE FUNCTION public.current_user_has_role(p_role app_role)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.has_role(auth.uid(), p_role);
$function$
;

-- 27. generate_access_code_text(p_prefix text)
CREATE OR REPLACE FUNCTION public.generate_access_code_text(p_prefix text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
  v_prefix text;
begin
  v_prefix := upper(regexp_replace(trim(p_prefix), '[^A-Z0-9]', '', 'g'));

  if char_length(v_prefix) < 2 then
    raise exception 'El prefijo debe tener mínimo 2 caracteres.';
  end if;

  if char_length(v_prefix) > 10 then
    raise exception 'El prefijo no debe tener más de 10 caracteres.';
  end if;

  return v_prefix || '-' || public.random_code_block(4) || '-' || public.random_code_block(5);
end;
$function$
;

-- 28. get_legend_id_from_marker(p_marker_id uuid)
CREATE OR REPLACE FUNCTION public.get_legend_id_from_marker(p_marker_id uuid)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.get_legend_id_from_scene(am.ar_scene_id)
  from public.ar_markers am
  where am.id = p_marker_id
  limit 1;
$function$
;

-- 29. hash_access_code(p_code text)
CREATE OR REPLACE FUNCTION public.hash_access_code(p_code text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select encode(
    extensions.digest(public.normalize_access_code(p_code), 'sha256'),
    'hex'
  );
$function$
;

-- 30. process_simulated_product_purchase(p_product_id uuid, p_checkout_snapshot jsonb DEFAULT '{}'::jsonb, p_card_last_four text DEFAULT '4242'::text)
CREATE OR REPLACE FUNCTION public.process_simulated_product_purchase(p_product_id uuid, p_checkout_snapshot jsonb DEFAULT '{}'::jsonb, p_card_last_four text DEFAULT '4242'::text)
 RETURNS TABLE(order_id uuid, payment_id uuid, order_item_id uuid, assigned_code text, unlocked_legend_id uuid, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_product public.products%rowtype;
  v_order_id uuid;
  v_order_item_id uuid;
  v_payment_id uuid;
  v_access_id uuid;
  v_code_id uuid;
  v_display_code text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Debes iniciar sesión para comprar.';
  end if;

  if p_card_last_four is not null and p_card_last_four !~ '^[0-9]{4}$' then
    raise exception 'card_last_four debe tener 4 dígitos.';
  end if;

  select *
  into v_product
  from public.products
  where id = p_product_id
    and status = 'active';

  if not found then
    raise exception 'El producto no existe o no está activo.';
  end if;

  if v_product.product_type = 'subscription_plan' then
    raise exception 'Para suscripciones usa process_simulated_subscription.';
  end if;

  -- Crear orden.
  insert into public.orders (
    user_id,
    status,
    total_amount,
    currency,
    checkout_snapshot,
    notes
  )
  values (
    v_user_id,
    'approved',
    v_product.price,
    v_product.currency,
    coalesce(p_checkout_snapshot, '{}'::jsonb),
    'Compra simulada procesada correctamente.'
  )
  returning id into v_order_id;

  -- Crear item.
  insert into public.order_items (
    order_id,
    product_id,
    quantity,
    unit_price,
    subtotal
  )
  values (
    v_order_id,
    v_product.id,
    1,
    v_product.price,
    v_product.price
  )
  returning id into v_order_item_id;

  -- Crear pago simulado aprobado.
  insert into public.payments (
    order_id,
    provider,
    status,
    amount,
    currency,
    payment_method,
    card_last_four,
    transaction_reference,
    metadata
  )
  values (
    v_order_id,
    'simulated',
    'approved',
    v_product.price,
    v_product.currency,
    'simulated_card',
    p_card_last_four,
    'SIM-' || replace(v_order_id::text, '-', ''),
    jsonb_build_object(
      'simulated', true,
      'message', 'Pago simulado aprobado. No se procesó dinero real.'
    )
  )
  returning id into v_payment_id;

  -- Compra digital: desbloquea directo.
  if v_product.product_type = 'digital_legend' then
    if v_product.legend_id is null then
      raise exception 'El producto digital no tiene leyenda asociada.';
    end if;

    v_access_id := public.grant_legend_access(
      v_user_id,
      v_product.legend_id,
      'digital_purchase',
      v_order_id,
      null
    );

    order_id := v_order_id;
    payment_id := v_payment_id;
    order_item_id := v_order_item_id;
    assigned_code := null;
    unlocked_legend_id := v_product.legend_id;
    message := 'Compra digital simulada aprobada. La leyenda fue desbloqueada.';
    return next;
    return;
  end if;

  -- Compra física: asigna código disponible.
  if v_product.product_type = 'physical_book' then
    if v_product.edition_id is null then
      raise exception 'El producto físico no tiene edición física asociada.';
    end if;

    select ac.id, ac.display_code
    into v_code_id, v_display_code
    from public.access_codes ac
    where ac.edition_id = v_product.edition_id
      and ac.status = 'unused'
      and (ac.expires_at is null or ac.expires_at > now())
    order by ac.created_at asc
    limit 1
    for update skip locked;

    if v_code_id is null then
      raise exception 'No hay códigos disponibles para esta edición física.';
    end if;

    update public.access_codes
    set
      status = 'assigned',
      assigned_to_user_id = v_user_id,
      assigned_at = now(),
      updated_at = now()
    where id = v_code_id;

    update public.order_items
    set assigned_code_id = v_code_id
    where id = v_order_item_id;

    order_id := v_order_id;
    payment_id := v_payment_id;
    order_item_id := v_order_item_id;
    assigned_code := v_display_code;
    unlocked_legend_id := null;
    message := 'Compra física simulada aprobada. Se asignó un código para canjear.';
    return next;
    return;
  end if;

  raise exception 'Tipo de producto no soportado.';
end;
$function$
;

-- 31. process_simulated_subscription(p_plan_id uuid, p_checkout_snapshot jsonb DEFAULT '{}'::jsonb, p_card_last_four text DEFAULT '4242'::text, p_grant_existing_subscription_legends boolean DEFAULT true)
CREATE OR REPLACE FUNCTION public.process_simulated_subscription(p_plan_id uuid, p_checkout_snapshot jsonb DEFAULT '{}'::jsonb, p_card_last_four text DEFAULT '4242'::text, p_grant_existing_subscription_legends boolean DEFAULT true)
 RETURNS TABLE(order_id uuid, payment_id uuid, subscription_id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone, granted_legends integer, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_plan public.subscription_plans%rowtype;
  v_order_id uuid;
  v_order_item_id uuid;
  v_payment_id uuid;
  v_subscription_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_granted_count integer := 0;
  v_legend record;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Debes iniciar sesión para activar una suscripción.';
  end if;

  if p_card_last_four is not null and p_card_last_four !~ '^[0-9]{4}$' then
    raise exception 'card_last_four debe tener 4 dígitos.';
  end if;

  select *
  into v_plan
  from public.subscription_plans
  where id = p_plan_id
    and status = 'active';

  if not found then
    raise exception 'El plan no existe o no está activo.';
  end if;

  if v_plan.product_id is null then
    raise exception 'El plan no tiene producto asociado.';
  end if;

  v_starts_at := now();
  v_ends_at := now() + make_interval(days => v_plan.duration_days);

  insert into public.orders (
    user_id,
    status,
    total_amount,
    currency,
    checkout_snapshot,
    notes
  )
  values (
    v_user_id,
    'approved',
    v_plan.price,
    v_plan.currency,
    coalesce(p_checkout_snapshot, '{}'::jsonb),
    'Suscripción simulada procesada correctamente.'
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id,
    product_id,
    quantity,
    unit_price,
    subtotal
  )
  values (
    v_order_id,
    v_plan.product_id,
    1,
    v_plan.price,
    v_plan.price
  )
  returning id into v_order_item_id;

  insert into public.payments (
    order_id,
    provider,
    status,
    amount,
    currency,
    payment_method,
    card_last_four,
    transaction_reference,
    metadata
  )
  values (
    v_order_id,
    'simulated',
    'approved',
    v_plan.price,
    v_plan.currency,
    'simulated_card',
    p_card_last_four,
    'SIM-SUB-' || replace(v_order_id::text, '-', ''),
    jsonb_build_object(
      'simulated', true,
      'subscription_plan_id', v_plan.id,
      'message', 'Suscripción simulada aprobada. No se procesó dinero real.'
    )
  )
  returning id into v_payment_id;

  insert into public.subscriptions (
    user_id,
    plan_id,
    order_id,
    status,
    starts_at,
    ends_at
  )
  values (
    v_user_id,
    v_plan.id,
    v_order_id,
    'active',
    v_starts_at,
    v_ends_at
  )
  returning id into v_subscription_id;

  if p_grant_existing_subscription_legends then
    for v_legend in
      select id
      from public.legends
      where status = 'published'
        and access_type in ('subscription', 'mixed')
    loop
      perform public.grant_legend_access(
        v_user_id,
        v_legend.id,
        'subscription',
        v_subscription_id,
        v_ends_at
      );

      v_granted_count := v_granted_count + 1;
    end loop;
  end if;

  order_id := v_order_id;
  payment_id := v_payment_id;
  subscription_id := v_subscription_id;
  starts_at := v_starts_at;
  ends_at := v_ends_at;
  granted_legends := v_granted_count;
  message := 'Suscripción simulada activada correctamente.';
  return next;
end;
$function$
;

-- 32. current_user_is_admin()
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    public.current_user_has_role('admin')
    or public.current_user_has_role('super_admin');
$function$
;

-- 33. current_user_is_super_admin()
CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.current_user_has_role('super_admin');
$function$
;

-- 34. redeem_access_code(p_code text)
CREATE OR REPLACE FUNCTION public.redeem_access_code(p_code text)
 RETURNS TABLE(redemption_id uuid, access_id uuid, legend_id uuid, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_hash text;
  v_code_record public.access_codes%rowtype;
  v_legend_id uuid;
  v_redemption_id uuid;
  v_access_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Debes iniciar sesión para canjear un código.';
  end if;

  if p_code is null or trim(p_code) = '' then
    raise exception 'Debes ingresar un código.';
  end if;

  v_hash := public.hash_access_code(p_code);

  select *
  into v_code_record
  from public.access_codes
  where code_hash = v_hash
  for update;

  if not found then
    raise exception 'Código inválido.';
  end if;

  if v_code_record.status = 'redeemed' then
    raise exception 'Este código ya fue canjeado.';
  end if;

  if v_code_record.status = 'disabled' then
    raise exception 'Este código está desactivado.';
  end if;

  if v_code_record.status = 'expired'
     or (v_code_record.expires_at is not null and v_code_record.expires_at <= now()) then
    update public.access_codes
    set status = 'expired'
    where id = v_code_record.id;

    raise exception 'Este código expiró.';
  end if;

  if v_code_record.status = 'assigned'
     and v_code_record.assigned_to_user_id is not null
     and v_code_record.assigned_to_user_id <> v_user_id then
    raise exception 'Este código está asignado a otro usuario.';
  end if;

  -- Obtener la leyenda desde la edición física.
  select pe.legend_id
  into v_legend_id
  from public.physical_editions pe
  where pe.id = v_code_record.edition_id;

  if v_legend_id is null then
    raise exception 'No se encontró la leyenda relacionada al código.';
  end if;

  -- Registrar canje.
  insert into public.code_redemptions (
    code_id,
    user_id
  )
  values (
    v_code_record.id,
    v_user_id
  )
  returning id into v_redemption_id;

  -- Marcar código como canjeado.
  update public.access_codes
  set
    status = 'redeemed',
    assigned_to_user_id = coalesce(assigned_to_user_id, v_user_id),
    assigned_at = coalesce(assigned_at, now()),
    updated_at = now()
  where id = v_code_record.id;

  -- Crear acceso real a la leyenda.
  v_access_id := public.grant_legend_access(
    v_user_id,
    v_legend_id,
    'code',
    v_redemption_id,
    null
  );

  redemption_id := v_redemption_id;
  access_id := v_access_id;
  legend_id := v_legend_id;
  message := 'Código canjeado correctamente. La leyenda fue desbloqueada.';
  return next;
end;
$function$
;

-- 35. redeem_access_code_as(p_user_id uuid, p_code text)
CREATE OR REPLACE FUNCTION public.redeem_access_code_as(p_user_id uuid, p_code text)
 RETURNS TABLE(redemption_id uuid, access_id uuid, legend_id uuid, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_hash text;
  v_code_record public.access_codes%rowtype;
  v_legend_id uuid;
  v_redemption_id uuid;
  v_access_id uuid;
begin
  if p_user_id is null then
    raise exception 'Usuario no valido.';
  end if;

  if p_code is null or trim(p_code) = '' then
    raise exception 'Debes ingresar un codigo.';
  end if;

  v_hash := public.hash_access_code(p_code);

  select * into v_code_record
  from public.access_codes
  where code_hash = v_hash
  for update;

  if not found then
    raise exception 'Codigo invalido.';
  end if;

  if v_code_record.status = 'redeemed' then
    raise exception 'Este codigo ya fue canjeado.';
  end if;

  if v_code_record.status = 'disabled' then
    raise exception 'Este codigo esta desactivado.';
  end if;

  if v_code_record.status = 'expired'
     or (v_code_record.expires_at is not null and v_code_record.expires_at <= now()) then
    update public.access_codes set status = 'expired' where id = v_code_record.id;
    raise exception 'Este codigo expiro.';
  end if;

  if v_code_record.status = 'assigned'
     and v_code_record.assigned_to_user_id is not null
     and v_code_record.assigned_to_user_id <> p_user_id then
    raise exception 'Este codigo esta asignado a otro usuario.';
  end if;

  select pe.legend_id into v_legend_id
  from public.physical_editions pe
  where pe.id = v_code_record.edition_id;

  if v_legend_id is null then
    raise exception 'No se encontro la leyenda relacionada al codigo.';
  end if;

  insert into public.code_redemptions (code_id, user_id)
  values (v_code_record.id, p_user_id)
  returning id into v_redemption_id;

  update public.access_codes
  set status = 'redeemed',
      assigned_to_user_id = coalesce(assigned_to_user_id, p_user_id),
      assigned_at = coalesce(assigned_at, now()),
      updated_at = now()
  where id = v_code_record.id;

  v_access_id := public.grant_legend_access(p_user_id, v_legend_id, 'code', v_redemption_id, null);

  redemption_id := v_redemption_id;
  access_id := v_access_id;
  legend_id := v_legend_id;
  message := 'Codigo canjeado correctamente. La leyenda fue desbloqueada.';
  return next;
end;
$function$
;

-- 36. self_generate_codes(p_legend_id uuid, p_quantity integer, p_prefix text DEFAULT NULL::text, p_reason text DEFAULT NULL::text)
CREATE OR REPLACE FUNCTION public.self_generate_codes(p_legend_id uuid, p_quantity integer, p_prefix text DEFAULT NULL::text, p_reason text DEFAULT NULL::text)
 RETURNS TABLE(outcome text, code_request_id uuid, batch_id uuid, generated integer, remaining_quota integer, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_edition_id uuid;
  v_prefix text;
  v_request_id uuid;
  v_batch_id uuid;
  v_code text;
  v_hash text;
  v_inserted integer := 0;
  v_attempts integer := 0;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión.';
  end if;
  if not public.is_legend_creator(p_legend_id) then
    raise exception 'No eres el autor de esta leyenda.';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor a 0.';
  end if;
  if p_quantity > 500 then
    raise exception 'Máximo 500 códigos por operación.';
  end if;

  -- Resolver/crear la edición física de la leyenda.
  select id into v_edition_id
  from public.physical_editions
  where legend_id = p_legend_id
  order by created_at asc
  limit 1;

  if v_edition_id is null then
    insert into public.physical_editions (legend_id, edition_name, status, created_by)
    values (p_legend_id, 'Edicion fisica', 'draft', v_user)
    returning id into v_edition_id;
  end if;

  -- Prefijo saneado (2..10 alfanumérico).
  v_prefix := upper(regexp_replace(coalesce(nullif(trim(p_prefix), ''), 'BAC'), '[^A-Z0-9]', '', 'g'));
  if char_length(v_prefix) < 2 then v_prefix := 'BAC'; end if;
  if char_length(v_prefix) > 10 then v_prefix := left(v_prefix, 10); end if;

  -- Entrega + lote + códigos (generación directa).
  insert into public.code_requests (creator_id, legend_id, edition_id, quantity_requested, reason, status, reviewed_at)
  values (v_user, p_legend_id, v_edition_id, p_quantity, coalesce(p_reason, 'Generado por el autor'), 'generated', now())
  returning id into v_request_id;

  insert into public.code_batches (edition_id, code_request_id, prefix, quantity, status, generated_by, notes)
  values (v_edition_id, v_request_id, v_prefix, p_quantity, 'generated', v_user, 'Generado por el autor')
  returning id into v_batch_id;

  while v_inserted < p_quantity loop
    v_attempts := v_attempts + 1;
    if v_attempts > p_quantity * 20 then
      raise exception 'No se pudieron generar códigos únicos suficientes. Intenta de nuevo.';
    end if;

    v_code := public.generate_access_code_text(v_prefix);
    v_hash := public.hash_access_code(v_code);

    begin
      insert into public.access_codes (batch_id, edition_id, code_hash, display_code, prefix, status, generated_by)
      values (v_batch_id, v_edition_id, v_hash, v_code, v_prefix, 'unused', v_user);
      v_inserted := v_inserted + 1;
    exception
      when unique_violation then null;
    end;
  end loop;

  outcome := 'generated';
  code_request_id := v_request_id;
  batch_id := v_batch_id;
  generated := v_inserted;
  remaining_quota := null;
  message := 'Codigos generados correctamente.';
  return next;
end;
$function$
;

-- 37. submit_creator_onboarding_request(p_pen_name text, p_legal_first_name text, p_legal_last_name text, p_affiliation text, p_city text, p_state_region text, p_country text, p_phone text, p_biography text, p_reason text, p_portfolio_url text, p_accept_creator_terms boolean, p_accept_creator_privacy boolean, p_accept_authorship_declaration boolean, p_terms_version text, p_privacy_version text)
CREATE OR REPLACE FUNCTION public.submit_creator_onboarding_request(p_pen_name text, p_legal_first_name text, p_legal_last_name text, p_affiliation text, p_city text, p_state_region text, p_country text, p_phone text, p_biography text, p_reason text, p_portfolio_url text, p_accept_creator_terms boolean, p_accept_creator_privacy boolean, p_accept_authorship_declaration boolean, p_terms_version text, p_privacy_version text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

-- 38. approve_content_review(p_review_id uuid, p_feedback text DEFAULT NULL::text)
CREATE OR REPLACE FUNCTION public.approve_content_review(p_review_id uuid, p_feedback text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin_id uuid;
  v_review public.content_reviews%rowtype;
begin
  v_admin_id := auth.uid();

  if v_admin_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not public.current_user_is_admin() then
    raise exception 'No tienes permiso para aprobar contenido.';
  end if;

  select *
  into v_review
  from public.content_reviews
  where id = p_review_id
  for update;

  if not found then
    raise exception 'La revisión no existe.';
  end if;

  if v_review.status <> 'pending' then
    raise exception 'Esta revisión ya fue procesada.';
  end if;

  update public.content_reviews
  set
    status = 'approved',
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    feedback = p_feedback,
    updated_at = now()
  where id = p_review_id;

  update public.legend_versions
  set
    status = 'approved',
    reviewed_by = v_admin_id,
    review_notes = p_feedback
  where id = v_review.legend_version_id;

  insert into public.admin_audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    severity,
    details
  )
  values (
    v_admin_id,
    'approve_legend',
    'content_review',
    p_review_id,
    'info',
    jsonb_build_object(
      'legend_version_id', v_review.legend_version_id,
      'feedback', p_feedback
    )
  );

  return v_review.legend_version_id;
end;
$function$
;

-- 39. approve_creator_application(p_application_id uuid, p_pen_name text DEFAULT NULL::text, p_admin_feedback text DEFAULT NULL::text)
CREATE OR REPLACE FUNCTION public.approve_creator_application(p_application_id uuid, p_pen_name text DEFAULT NULL::text, p_admin_feedback text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin_id uuid;
  v_application public.creator_applications%rowtype;
  v_creator_role_id uuid;
  v_profile public.users_profile%rowtype;
begin
  v_admin_id := auth.uid();

  if v_admin_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not public.current_user_is_admin() then
    raise exception 'No tienes permiso para aprobar solicitudes de creador.';
  end if;

  select *
  into v_application
  from public.creator_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'La solicitud no existe.';
  end if;

  if v_application.status <> 'pending' then
    raise exception 'La solicitud ya fue procesada.';
  end if;

  select *
  into v_profile
  from public.users_profile
  where id = v_application.user_id;

  if not found then
    raise exception 'El usuario de la solicitud no existe.';
  end if;

  select id
  into v_creator_role_id
  from public.roles
  where name = 'creator';

  if v_creator_role_id is null then
    raise exception 'El rol creator no existe.';
  end if;

  -- Actualizar solicitud.
  update public.creator_applications
  set
    status = 'approved',
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    admin_feedback = p_admin_feedback
  where id = p_application_id;

  -- Asignar rol creator.
  insert into public.user_roles (
    user_id,
    role_id,
    assigned_by
  )
  values (
    v_application.user_id,
    v_creator_role_id,
    v_admin_id
  )
  on conflict (user_id, role_id) do nothing;

  -- Crear perfil de creador.
  insert into public.creator_profiles (
    user_id,
    pen_name,
    biography,
    profile_status
  )
  values (
    v_application.user_id,
    coalesce(nullif(p_pen_name, ''), v_profile.full_name, v_profile.username, 'Creador'),
    null,
    'active'
  )
  on conflict (user_id) do update
  set
    profile_status = 'active',
    updated_at = now();

  -- Cambiar rol visual activo.
  update public.users_profile
  set active_role = 'creator'
  where id = v_application.user_id;

  -- Auditoría.
  insert into public.admin_audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    severity,
    details
  )
  values (
    v_admin_id,
    'approve_creator',
    'creator_application',
    p_application_id,
    'info',
    jsonb_build_object(
      'approved_user_id', v_application.user_id,
      'pen_name', coalesce(nullif(p_pen_name, ''), v_profile.full_name, v_profile.username, 'Creador')
    )
  );

  return v_application.user_id;
end;
$function$
;

-- 40. create_code_batch(p_edition_id uuid, p_quantity integer, p_prefix text, p_notes text DEFAULT NULL::text, p_code_request_id uuid DEFAULT NULL::uuid)
CREATE OR REPLACE FUNCTION public.create_code_batch(p_edition_id uuid, p_quantity integer, p_prefix text, p_notes text DEFAULT NULL::text, p_code_request_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(batch_id uuid, access_code_id uuid, generated_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin_id uuid;
  v_batch_id uuid;
  v_code text;
  v_hash text;
  v_code_id uuid;
  v_inserted integer := 0;
  v_attempts integer := 0;
  v_max_attempts integer;
  v_prefix text;
begin
  v_admin_id := auth.uid();

  if v_admin_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not public.current_user_is_admin() then
    raise exception 'No tienes permiso para generar códigos.';
  end if;

  if p_quantity <= 0 then
    raise exception 'La cantidad debe ser mayor a 0.';
  end if;

  if p_quantity > 5000 then
    raise exception 'Por seguridad, no puedes generar más de 5000 códigos por lote.';
  end if;

  if not exists (
    select 1
    from public.physical_editions
    where id = p_edition_id
  ) then
    raise exception 'La edición física no existe.';
  end if;

  v_prefix := upper(regexp_replace(trim(p_prefix), '[^A-Z0-9]', '', 'g'));

  if char_length(v_prefix) < 2 then
    raise exception 'El prefijo debe tener mínimo 2 caracteres.';
  end if;

  if char_length(v_prefix) > 10 then
    raise exception 'El prefijo no debe tener más de 10 caracteres.';
  end if;

  insert into public.code_batches (
    edition_id,
    code_request_id,
    prefix,
    quantity,
    status,
    generated_by,
    notes
  )
  values (
    p_edition_id,
    p_code_request_id,
    v_prefix,
    p_quantity,
    'generated',
    v_admin_id,
    p_notes
  )
  returning id into v_batch_id;

  v_max_attempts := p_quantity * 20;

  while v_inserted < p_quantity loop
    v_attempts := v_attempts + 1;

    if v_attempts > v_max_attempts then
      raise exception 'No se pudieron generar códigos únicos suficientes. Intenta de nuevo.';
    end if;

    v_code := public.generate_access_code_text(v_prefix);
    v_hash := public.hash_access_code(v_code);

    begin
      insert into public.access_codes (
        batch_id,
        edition_id,
        code_hash,
        display_code,
        prefix,
        status,
        generated_by
      )
      values (
        v_batch_id,
        p_edition_id,
        v_hash,
        v_code,
        v_prefix,
        'unused',
        v_admin_id
      )
      returning id into v_code_id;

      v_inserted := v_inserted + 1;

      batch_id := v_batch_id;
      access_code_id := v_code_id;
      generated_code := v_code;
      return next;

    exception
      when unique_violation then
        -- Si por casualidad se repite, intenta de nuevo.
        null;
    end;
  end loop;

  if p_code_request_id is not null then
    update public.code_requests
    set
      status = 'generated',
      reviewed_by = coalesce(reviewed_by, v_admin_id),
      reviewed_at = coalesce(reviewed_at, now()),
      updated_at = now()
    where id = p_code_request_id;
  end if;

  insert into public.admin_audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    severity,
    details
  )
  values (
    v_admin_id,
    'generate_codes',
    'code_batch',
    v_batch_id,
    'info',
    jsonb_build_object(
      'edition_id', p_edition_id,
      'quantity', p_quantity,
      'prefix', v_prefix,
      'code_request_id', p_code_request_id
    )
  );

  return;
end;
$function$
;

-- 41. enforce_code_quota_admin_only()
CREATE OR REPLACE FUNCTION public.enforce_code_quota_admin_only()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'UPDATE'
     and new.code_quota is distinct from old.code_quota
     and not public.current_user_is_admin() then
    raise exception 'Solo un administrador puede cambiar el cupo de codigos.';
  end if;

  if tg_op = 'INSERT'
     and coalesce(new.code_quota, 0) <> 0
     and not public.current_user_is_admin() then
    -- Un creador no puede crear una edicion con cupo > 0.
    new.code_quota := 0;
  end if;

  return new;
end;
$function$
;

-- 42. publish_legend_version(p_version_id uuid)
CREATE OR REPLACE FUNCTION public.publish_legend_version(p_version_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin_id uuid;
  v_version public.legend_versions%rowtype;
begin
  v_admin_id := auth.uid();

  if v_admin_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not public.current_user_is_admin() then
    raise exception 'No tienes permiso para publicar leyendas.';
  end if;

  select *
  into v_version
  from public.legend_versions
  where id = p_version_id
  for update;

  if not found then
    raise exception 'La versión no existe.';
  end if;

  if v_version.status <> 'approved' then
    raise exception 'Solo se pueden publicar versiones aprobadas.';
  end if;

  -- Archivar cualquier versión publicada anterior de esa leyenda.
  update public.legend_versions
  set status = 'archived'
  where legend_id = v_version.legend_id
    and status = 'published'
    and id <> p_version_id;

  -- Publicar esta versión.
  update public.legend_versions
  set
    status = 'published',
    published_at = now(),
    reviewed_by = coalesce(reviewed_by, v_admin_id)
  where id = p_version_id;

  -- Publicar leyenda.
  update public.legends
  set
    status = 'published',
    published_at = coalesce(published_at, now()),
    updated_at = now()
  where id = v_version.legend_id;

  insert into public.admin_audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    severity,
    details
  )
  values (
    v_admin_id,
    'publish_legend',
    'legend_version',
    p_version_id,
    'info',
    jsonb_build_object(
      'legend_id', v_version.legend_id
    )
  );

  return v_version.legend_id;
end;
$function$
;

-- 43. reject_content_review(p_review_id uuid, p_feedback text DEFAULT NULL::text)
CREATE OR REPLACE FUNCTION public.reject_content_review(p_review_id uuid, p_feedback text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin_id uuid;
  v_review public.content_reviews%rowtype;
  v_legend_id uuid;
begin
  v_admin_id := auth.uid();

  if v_admin_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not public.current_user_is_admin() then
    raise exception 'No tienes permiso para rechazar contenido.';
  end if;

  select *
  into v_review
  from public.content_reviews
  where id = p_review_id
  for update;

  if not found then
    raise exception 'La revisión no existe.';
  end if;

  if v_review.status <> 'pending' then
    raise exception 'Esta revisión ya fue procesada.';
  end if;

  select legend_id
  into v_legend_id
  from public.legend_versions
  where id = v_review.legend_version_id;

  update public.content_reviews
  set
    status = 'rejected',
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    feedback = p_feedback,
    updated_at = now()
  where id = p_review_id;

  update public.legend_versions
  set
    status = 'rejected',
    reviewed_by = v_admin_id,
    review_notes = p_feedback
  where id = v_review.legend_version_id;

  update public.legends
  set
    status = 'rejected',
    updated_at = now()
  where id = v_legend_id;

  insert into public.admin_audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    severity,
    details
  )
  values (
    v_admin_id,
    'reject_legend',
    'content_review',
    p_review_id,
    'warning',
    jsonb_build_object(
      'legend_version_id', v_review.legend_version_id,
      'feedback', p_feedback
    )
  );

  return v_review.legend_version_id;
end;
$function$
;

-- 44. reject_creator_application(p_application_id uuid, p_admin_feedback text DEFAULT NULL::text)
CREATE OR REPLACE FUNCTION public.reject_creator_application(p_application_id uuid, p_admin_feedback text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin_id uuid;
  v_application public.creator_applications%rowtype;
begin
  v_admin_id := auth.uid();

  if v_admin_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not public.current_user_is_admin() then
    raise exception 'No tienes permiso para rechazar solicitudes de creador.';
  end if;

  select *
  into v_application
  from public.creator_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'La solicitud no existe.';
  end if;

  if v_application.status <> 'pending' then
    raise exception 'La solicitud ya fue procesada.';
  end if;

  update public.creator_applications
  set
    status = 'rejected',
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    admin_feedback = p_admin_feedback
  where id = p_application_id;

  insert into public.admin_audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    severity,
    details
  )
  values (
    v_admin_id,
    'reject_creator',
    'creator_application',
    p_application_id,
    'info',
    jsonb_build_object(
      'rejected_user_id', v_application.user_id,
      'feedback', p_admin_feedback
    )
  );

  return v_application.user_id;
end;
$function$
;

-- 45. request_content_changes(p_review_id uuid, p_feedback text)
CREATE OR REPLACE FUNCTION public.request_content_changes(p_review_id uuid, p_feedback text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_admin_id uuid;
  v_review public.content_reviews%rowtype;
  v_legend_id uuid;
begin
  v_admin_id := auth.uid();

  if v_admin_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if not public.current_user_is_admin() then
    raise exception 'No tienes permiso para pedir cambios.';
  end if;

  if p_feedback is null or trim(p_feedback) = '' then
    raise exception 'Debes indicar los cambios solicitados.';
  end if;

  select *
  into v_review
  from public.content_reviews
  where id = p_review_id
  for update;

  if not found then
    raise exception 'La revisión no existe.';
  end if;

  if v_review.status <> 'pending' then
    raise exception 'Esta revisión ya fue procesada.';
  end if;

  select legend_id
  into v_legend_id
  from public.legend_versions
  where id = v_review.legend_version_id;

  update public.content_reviews
  set
    status = 'changes_requested',
    reviewed_by = v_admin_id,
    reviewed_at = now(),
    feedback = p_feedback,
    updated_at = now()
  where id = p_review_id;

  update public.legend_versions
  set
    status = 'rejected',
    reviewed_by = v_admin_id,
    review_notes = p_feedback
  where id = v_review.legend_version_id;

  update public.legends
  set
    status = 'draft',
    updated_at = now()
  where id = v_legend_id;

  insert into public.admin_audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    severity,
    details
  )
  values (
    v_admin_id,
    'request_legend_changes',
    'content_review',
    p_review_id,
    'info',
    jsonb_build_object(
      'legend_version_id', v_review.legend_version_id,
      'feedback', p_feedback
    )
  );

  return v_review.legend_version_id;
end;
$function$
;

-- 46. submit_legend_version_for_review(p_version_id uuid)
CREATE OR REPLACE FUNCTION public.submit_legend_version_for_review(p_version_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_id uuid;
  v_version public.legend_versions%rowtype;
  v_legend public.legends%rowtype;
  v_review_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select *
  into v_version
  from public.legend_versions
  where id = p_version_id
  for update;

  if not found then
    raise exception 'La versión no existe.';
  end if;

  select *
  into v_legend
  from public.legends
  where id = v_version.legend_id
  for update;

  if not found then
    raise exception 'La leyenda no existe.';
  end if;

  if v_legend.creator_id <> v_user_id and not public.current_user_is_admin() then
    raise exception 'No tienes permiso para enviar esta versión a revisión.';
  end if;

  if v_version.status not in ('draft', 'rejected') then
    raise exception 'Solo se pueden enviar versiones en borrador o rechazadas.';
  end if;

  update public.legend_versions
  set
    status = 'submitted',
    submitted_at = now()
  where id = p_version_id;

  update public.legends
  set
    status = 'in_review',
    updated_at = now()
  where id = v_legend.id;

  insert into public.content_reviews (
    legend_version_id,
    submitted_by,
    status
  )
  values (
    p_version_id,
    v_user_id,
    'pending'
  )
  returning id into v_review_id;

  return v_review_id;
end;
$function$
;

commit;
