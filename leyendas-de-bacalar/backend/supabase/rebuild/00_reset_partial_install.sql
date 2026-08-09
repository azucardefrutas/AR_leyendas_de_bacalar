-- OPTIONAL AND DESTRUCTIVE: reset a partial Leyendas installation.
-- Use only on the new empty project ojwxchkgzywteutqxkfg before production data exists.
-- This targets only known Leyendas objects; it does not drop auth or storage schemas.

begin;

drop trigger if exists on_auth_user_created on auth.users;

do $$
declare
  function_record record;
begin
  for function_record in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array['approve_content_review', 'approve_creator_application', 'cancel_subscription', 'complete_creator_onboarding', 'confirm_creator_onboarding', 'create_code_batch', 'current_user_has_role', 'current_user_is_admin', 'current_user_is_super_admin', 'delete_creator_legend', 'delete_legend_draft', 'enforce_code_quota_admin_only', 'generate_access_code_text', 'get_legend_id_from_edition', 'get_legend_id_from_marker', 'get_legend_id_from_page', 'get_legend_id_from_scene', 'grant_legend_access', 'handle_new_user', 'has_role', 'hash_access_code', 'is_legend_creator', 'is_legend_published', 'is_marker_creator', 'is_page_creator', 'is_physical_edition_creator', 'is_scene_creator', 'is_version_creator', 'is_version_published', 'issue_creator_onboarding_email_token', 'normalize_access_code', 'process_simulated_product_purchase', 'process_simulated_subscription', 'publish_legend_hotspots', 'publish_legend_version', 'random_code_block', 'redeem_access_code', 'redeem_access_code_as', 'reject_content_review', 'reject_creator_application', 'request_content_changes', 'self_generate_codes', 'set_updated_at', 'submit_creator_onboarding_request', 'submit_legend_version_for_review', 'user_has_active_legend_access']::text[])
  loop
    execute format('drop function if exists %s cascade', function_record.signature);
  end loop;
end
$$;

drop table if exists public.users_profile cascade;
drop table if exists public.user_roles cascade;
drop table if exists public.user_legend_access cascade;
drop table if exists public.system_settings cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.subscription_plans cascade;
drop table if exists public.shelf_items cascade;
drop table if exists public.scan_logs cascade;
drop table if exists public.roles cascade;
drop table if exists public.reviews cascade;
drop table if exists public.reading_progress cascade;
drop table if exists public.products cascade;
drop table if exists public.physical_editions cascade;
drop table if exists public.physical_edition_markers cascade;
drop table if exists public.payments cascade;
drop table if exists public.orders cascade;
drop table if exists public.order_items cascade;
drop table if exists public.mobile_devices cascade;
drop table if exists public.legends cascade;
drop table if exists public.legend_versions cascade;
drop table if exists public.legend_source_documents cascade;
drop table if exists public.legend_pages cascade;
drop table if exists public.legend_media cascade;
drop table if exists public.legend_genres cascade;
drop table if exists public.interactive_hotspots cascade;
drop table if exists public.genres cascade;
drop table if exists public.favorites cascade;
drop table if exists public.document_render_pages cascade;
drop table if exists public.document_extractions cascade;
drop table if exists public.creator_profiles cascade;
drop table if exists public.creator_onboarding_email_tokens cascade;
drop table if exists public.creator_applications cascade;
drop table if exists public.cover_templates cascade;
drop table if exists public.content_reviews cascade;
drop table if exists public.code_requests cascade;
drop table if exists public.code_redemptions cascade;
drop table if exists public.code_batches cascade;
drop table if exists public.assets cascade;
drop table if exists public.ar_scenes cascade;
drop table if exists public.ar_markers cascade;
drop table if exists public.admin_audit_logs cascade;
drop table if exists public.access_codes cascade;

drop type if exists public.user_status cascade;
drop type if exists public.user_legend_access_status cascade;
drop type if exists public.user_access_source cascade;
drop type if exists public.subscription_status cascade;
drop type if exists public.source_document_type cascade;
drop type if exists public.scan_result_status cascade;
drop type if exists public.review_status cascade;
drop type if exists public.product_type cascade;
drop type if exists public.product_status cascade;
drop type if exists public.physical_edition_status cascade;
drop type if exists public.payment_status cascade;
drop type if exists public.payment_provider cascade;
drop type if exists public.payment_method cascade;
drop type if exists public.order_status cascade;
drop type if exists public.media_usage_context cascade;
drop type if exists public.marker_type cascade;
drop type if exists public.marker_status cascade;
drop type if exists public.legend_version_status cascade;
drop type if exists public.legend_status cascade;
drop type if exists public.legend_media_type cascade;
drop type if exists public.legend_access_type cascade;
drop type if exists public.extraction_status cascade;
drop type if exists public.document_extraction_status cascade;
drop type if exists public.device_platform cascade;
drop type if exists public.creator_profile_status cascade;
drop type if exists public.creator_application_status cascade;
drop type if exists public.content_review_status cascade;
drop type if exists public.code_request_status cascade;
drop type if exists public.code_batch_status cascade;
drop type if exists public.audit_severity cascade;
drop type if exists public.asset_type cascade;
drop type if exists public.asset_source_type cascade;
drop type if exists public.ar_scene_status cascade;
drop type if exists public.app_role cascade;
drop type if exists public.access_code_status cascade;

commit;
