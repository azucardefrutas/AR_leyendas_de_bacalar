-- Leyendas de Bacalar
-- 07 - Explicit Data API privileges
-- Target Supabase project: ojwxchkgzywteutqxkfg

begin;

set local search_path to public, extensions;

-- 9. PRIVILEGIOS EXPLICITOS PARA DATA API
-- Supabase projects created in 2026 no longer expose new tables automatically.

revoke create on schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;

revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;

grant DELETE, INSERT, SELECT, UPDATE on table public.access_codes to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.admin_audit_logs to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.ar_markers to authenticated;
grant SELECT on table public.ar_scenes to anon;
grant DELETE, INSERT, SELECT, UPDATE on table public.ar_scenes to authenticated;
grant SELECT on table public.assets to anon;
grant DELETE, INSERT, SELECT, UPDATE on table public.assets to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.code_batches to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.code_redemptions to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.code_requests to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.content_reviews to authenticated;
grant SELECT on table public.cover_templates to anon;
grant DELETE, INSERT, SELECT, UPDATE on table public.cover_templates to authenticated;
grant INSERT, SELECT, UPDATE on table public.creator_applications to authenticated;
grant SELECT on table public.creator_profiles to anon;
grant INSERT, SELECT, UPDATE on table public.creator_profiles to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.document_extractions to authenticated;
grant SELECT on table public.document_render_pages to anon;
grant DELETE, INSERT, SELECT, UPDATE on table public.document_render_pages to authenticated;
grant DELETE, INSERT, SELECT on table public.favorites to authenticated;
grant SELECT on table public.genres to anon;
grant DELETE, INSERT, SELECT, UPDATE on table public.genres to authenticated;
grant SELECT on table public.interactive_hotspots to anon;
grant DELETE, INSERT, SELECT, UPDATE on table public.interactive_hotspots to authenticated;
grant SELECT on table public.legend_genres to anon;
grant DELETE, INSERT, SELECT, UPDATE on table public.legend_genres to authenticated;
grant SELECT on table public.legend_media to anon;
grant DELETE, INSERT, SELECT, UPDATE on table public.legend_media to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.legend_pages to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.legend_source_documents to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.legend_versions to authenticated;
grant SELECT on table public.legends to anon;
grant DELETE, INSERT, SELECT, UPDATE on table public.legends to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.mobile_devices to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.order_items to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.orders to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.payments to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.physical_edition_markers to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.physical_editions to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.products to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.reading_progress to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.reviews to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.roles to authenticated;
grant INSERT, SELECT on table public.scan_logs to authenticated;
grant DELETE, INSERT, SELECT on table public.shelf_items to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.subscription_plans to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.subscriptions to authenticated;
grant DELETE, INSERT, SELECT, UPDATE on table public.user_legend_access to authenticated;
grant DELETE, INSERT, SELECT on table public.user_roles to authenticated;
grant select on table public.users_profile to authenticated;
grant update (active_role, avatar_url, bio, cover_url, full_name, updated_at, username) on table public.users_profile to authenticated;

revoke all on table public.creator_onboarding_email_tokens from public, anon, authenticated;
grant all on table public.creator_onboarding_email_tokens to service_role;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;

-- Helpers required by RLS. Anonymous callers can execute them, but their
-- predicates still return false when auth.uid() is null.
do $$
declare
  function_record record;
begin
  for function_record in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array['has_role', 'current_user_has_role', 'current_user_is_admin', 'current_user_is_super_admin', 'get_legend_id_from_page', 'get_legend_id_from_scene', 'is_legend_creator', 'is_legend_published', 'is_marker_creator', 'is_page_creator', 'is_physical_edition_creator', 'is_scene_creator', 'is_version_creator', 'is_version_published', 'user_has_active_legend_access']::text[])
  loop
    execute format('grant execute on function %s to anon, authenticated', function_record.signature);
  end loop;
end
$$;

-- RPCs intentionally exposed to signed-in users. Authorization is enforced
-- inside each function and by its fixed search_path.
do $$
declare
  function_record record;
begin
  for function_record in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array['approve_content_review', 'approve_creator_application', 'cancel_subscription', 'confirm_creator_onboarding', 'create_code_batch', 'delete_creator_legend', 'delete_legend_draft', 'process_simulated_product_purchase', 'process_simulated_subscription', 'publish_legend_version', 'redeem_access_code', 'reject_content_review', 'reject_creator_application', 'request_content_changes', 'self_generate_codes', 'submit_creator_onboarding_request', 'submit_legend_version_for_review']::text[])
  loop
    execute format('grant execute on function %s to authenticated', function_record.signature);
  end loop;
end
$$;

-- These functions are backend-only. Keep them unavailable to browser clients.
do $$
declare
  function_record record;
begin
  for function_record in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array['grant_legend_access', 'issue_creator_onboarding_email_token', 'redeem_access_code_as']::text[])
  loop
    execute format('grant execute on function %s to service_role', function_record.signature);
  end loop;
end
$$;

commit;
