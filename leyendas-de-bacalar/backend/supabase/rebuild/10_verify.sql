-- 12. VERIFICACIÓN ESTRUCTURAL
-- Returns one summary row and raises an exception for missing critical objects.

do $$
declare
  missing_tables text[];
  missing_functions text[];
  tables_without_rls text[];
begin
  select array_agg(expected.name order by expected.name)
  into missing_tables
  from unnest(array['access_codes', 'admin_audit_logs', 'ar_markers', 'ar_scenes', 'assets', 'code_batches', 'code_redemptions', 'code_requests', 'content_reviews', 'cover_templates', 'creator_applications', 'creator_onboarding_email_tokens', 'creator_profiles', 'document_extractions', 'document_render_pages', 'favorites', 'genres', 'interactive_hotspots', 'legend_genres', 'legend_media', 'legend_pages', 'legend_source_documents', 'legend_versions', 'legends', 'mobile_devices', 'order_items', 'orders', 'payments', 'physical_edition_markers', 'physical_editions', 'products', 'reading_progress', 'reviews', 'roles', 'scan_logs', 'shelf_items', 'subscription_plans', 'subscriptions', 'system_settings', 'user_legend_access', 'user_roles', 'users_profile']::text[]) as expected(name)
  left join information_schema.tables actual
    on actual.table_schema = 'public' and actual.table_name = expected.name
  where actual.table_name is null;

  select array_agg(expected.name order by expected.name)
  into missing_functions
  from unnest(array['approve_content_review', 'approve_creator_application', 'cancel_subscription', 'confirm_creator_onboarding', 'create_code_batch', 'delete_creator_legend', 'delete_legend_draft', 'process_simulated_product_purchase', 'process_simulated_subscription', 'publish_legend_version', 'redeem_access_code', 'reject_content_review', 'reject_creator_application', 'request_content_changes', 'self_generate_codes', 'submit_creator_onboarding_request', 'submit_legend_version_for_review', 'grant_legend_access', 'redeem_access_code_as', 'user_has_active_legend_access']::text[]) as expected(name)
  where not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = expected.name
  );

  select array_agg(c.relname order by c.relname)
  into tables_without_rls
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relname = any (array['access_codes', 'admin_audit_logs', 'ar_markers', 'ar_scenes', 'assets', 'code_batches', 'code_redemptions', 'code_requests', 'content_reviews', 'cover_templates', 'creator_applications', 'creator_onboarding_email_tokens', 'creator_profiles', 'document_extractions', 'document_render_pages', 'favorites', 'genres', 'interactive_hotspots', 'legend_genres', 'legend_media', 'legend_pages', 'legend_source_documents', 'legend_versions', 'legends', 'mobile_devices', 'order_items', 'orders', 'payments', 'physical_edition_markers', 'physical_editions', 'products', 'reading_progress', 'reviews', 'roles', 'scan_logs', 'shelf_items', 'subscription_plans', 'subscriptions', 'system_settings', 'user_legend_access', 'user_roles', 'users_profile']::text[])
    and not c.relrowsecurity;

  if missing_tables is not null then
    raise exception 'Missing code contract tables: %', missing_tables;
  end if;
  if missing_functions is not null then
    raise exception 'Missing code contract functions: %', missing_functions;
  end if;
  if tables_without_rls is not null then
    raise exception 'RLS is disabled on: %', tables_without_rls;
  end if;
  if not exists (select 1 from storage.buckets where id = 'legend-assets' and public) then
    raise exception 'Public bucket legend-assets is missing or not public';
  end if;
  if not exists (select 1 from storage.buckets where id = 'legend-documents' and not public) then
    raise exception 'Private bucket legend-documents is missing or public';
  end if;
end
$$;

select
  (select count(*) from information_schema.tables where table_schema = 'public' and table_name = any (array['access_codes', 'admin_audit_logs', 'ar_markers', 'ar_scenes', 'assets', 'code_batches', 'code_redemptions', 'code_requests', 'content_reviews', 'cover_templates', 'creator_applications', 'creator_onboarding_email_tokens', 'creator_profiles', 'document_extractions', 'document_render_pages', 'favorites', 'genres', 'interactive_hotspots', 'legend_genres', 'legend_media', 'legend_pages', 'legend_source_documents', 'legend_versions', 'legends', 'mobile_devices', 'order_items', 'orders', 'payments', 'physical_edition_markers', 'physical_editions', 'products', 'reading_progress', 'reviews', 'roles', 'scan_logs', 'shelf_items', 'subscription_plans', 'subscriptions', 'system_settings', 'user_legend_access', 'user_roles', 'users_profile']::text[])) as leyendas_tables,
  (select count(*) from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typname = any (array['access_code_status', 'app_role', 'ar_scene_status', 'asset_source_type', 'asset_type', 'audit_severity', 'code_batch_status', 'code_request_status', 'content_review_status', 'creator_application_status', 'creator_profile_status', 'device_platform', 'document_extraction_status', 'extraction_status', 'legend_access_type', 'legend_media_type', 'legend_status', 'legend_version_status', 'marker_status', 'marker_type', 'media_usage_context', 'order_status', 'payment_method', 'payment_provider', 'payment_status', 'physical_edition_status', 'product_status', 'product_type', 'review_status', 'scan_result_status', 'source_document_type', 'subscription_status', 'user_access_source', 'user_legend_access_status', 'user_status']::text[])) as leyendas_types,
  (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = any (array['approve_content_review', 'approve_creator_application', 'cancel_subscription', 'complete_creator_onboarding', 'confirm_creator_onboarding', 'create_code_batch', 'current_user_has_role', 'current_user_is_admin', 'current_user_is_super_admin', 'delete_creator_legend', 'delete_legend_draft', 'enforce_code_quota_admin_only', 'generate_access_code_text', 'get_legend_id_from_edition', 'get_legend_id_from_marker', 'get_legend_id_from_page', 'get_legend_id_from_scene', 'grant_legend_access', 'handle_new_user', 'has_role', 'hash_access_code', 'is_legend_creator', 'is_legend_published', 'is_marker_creator', 'is_page_creator', 'is_physical_edition_creator', 'is_scene_creator', 'is_version_creator', 'is_version_published', 'issue_creator_onboarding_email_token', 'normalize_access_code', 'process_simulated_product_purchase', 'process_simulated_subscription', 'publish_legend_hotspots', 'publish_legend_version', 'random_code_block', 'redeem_access_code', 'redeem_access_code_as', 'reject_content_review', 'reject_creator_application', 'request_content_changes', 'self_generate_codes', 'set_updated_at', 'submit_creator_onboarding_request', 'submit_legend_version_for_review', 'user_has_active_legend_access']::text[])) as leyendas_functions,
  (select count(*) from pg_policies where schemaname = 'public') as public_policies,
  (select count(*) from storage.buckets where id in ('legend-assets', 'legend-documents')) as storage_buckets,
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth' and c.relname = 'users' and t.tgname = 'on_auth_user_created'
  ) as auth_profile_trigger;
