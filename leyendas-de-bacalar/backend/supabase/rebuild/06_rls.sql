-- Leyendas de Bacalar
-- 06 - Row Level Security
-- Target Supabase project: ojwxchkgzywteutqxkfg

begin;

set local search_path to public, extensions;

-- 8. ROW LEVEL SECURITY — activación por tabla
-- Las 42 tablas tienen RLS activo. El acceso real lo deciden las políticas.
-- ============================================================================

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cover_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_onboarding_email_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_render_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactive_hotspots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legend_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legend_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legend_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legend_source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legend_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_edition_markers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_legend_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 8b. POLÍTICAS RLS (155)
-- Roles: anon = visitante sin sesión, authenticated = usuario con sesión,
--        public = cualquiera de los dos. service_role (backend) omite RLS.
-- ============================================================================

CREATE POLICY accodes_admin_manage ON public.access_codes AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY accodes_select_creator_or_admin ON public.access_codes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_physical_edition_creator(edition_id) OR current_user_is_admin()));
CREATE POLICY "Admins can insert audit logs" ON public.admin_audit_logs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admins can read audit logs" ON public.admin_audit_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING (current_user_is_admin());
CREATE POLICY "Super admins can manage audit logs" ON public.admin_audit_logs AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_super_admin())
  WITH CHECK (current_user_is_super_admin());
CREATE POLICY "Admins can manage AR markers" ON public.ar_markers AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Authenticated users can read active markers" ON public.ar_markers AS PERMISSIVE FOR SELECT TO authenticated
  USING (((status = 'active'::marker_status) AND is_legend_published(get_legend_id_from_scene(ar_scene_id))));
CREATE POLICY "Creators can delete own draft markers" ON public.ar_markers AS PERMISSIVE FOR DELETE TO authenticated
  USING ((is_scene_creator(ar_scene_id) AND (status = ANY (ARRAY['draft'::marker_status, 'rejected'::marker_status]))));
CREATE POLICY "Creators can insert own markers" ON public.ar_markers AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((current_user_has_role('creator'::app_role) AND is_scene_creator(ar_scene_id) AND (created_by = ( SELECT (select auth.uid()) AS uid)) AND (status = ANY (ARRAY['draft'::marker_status, 'in_review'::marker_status]))));
CREATE POLICY "Creators can read own markers" ON public.ar_markers AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_scene_creator(ar_scene_id));
CREATE POLICY "Creators can update own draft markers" ON public.ar_markers AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_scene_creator(ar_scene_id) AND (status = ANY (ARRAY['draft'::marker_status, 'in_review'::marker_status, 'rejected'::marker_status]))))
  WITH CHECK ((is_scene_creator(ar_scene_id) AND (status = ANY (ARRAY['draft'::marker_status, 'in_review'::marker_status, 'rejected'::marker_status]))));
CREATE POLICY "Admins can manage AR scenes" ON public.ar_scenes AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Creators can delete own draft AR scenes" ON public.ar_scenes AS PERMISSIVE FOR DELETE TO authenticated
  USING ((is_page_creator(page_id) AND (status = ANY (ARRAY['draft'::ar_scene_status, 'rejected'::ar_scene_status]))));
CREATE POLICY "Creators can insert own AR scenes" ON public.ar_scenes AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((current_user_has_role('creator'::app_role) AND is_page_creator(page_id) AND (created_by = ( SELECT (select auth.uid()) AS uid)) AND (status = ANY (ARRAY['draft'::ar_scene_status, 'in_review'::ar_scene_status]))));
CREATE POLICY "Creators can read own AR scenes" ON public.ar_scenes AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_page_creator(page_id));
CREATE POLICY "Creators can update own draft AR scenes" ON public.ar_scenes AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_page_creator(page_id) AND (status = ANY (ARRAY['draft'::ar_scene_status, 'in_review'::ar_scene_status, 'rejected'::ar_scene_status]))))
  WITH CHECK ((is_page_creator(page_id) AND (status = ANY (ARRAY['draft'::ar_scene_status, 'in_review'::ar_scene_status, 'rejected'::ar_scene_status]))));
CREATE POLICY "Public can read scenes of published hotspots" ON public.ar_scenes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (interactive_hotspots h
     JOIN legends l ON ((l.id = h.legend_id)))
  WHERE ((h.ar_scene_id = ar_scenes.id) AND (h.status = 'published'::text) AND (l.status = 'published'::legend_status) AND ((l.access_type = 'free'::legend_access_type) OR user_has_active_legend_access(( SELECT (select auth.uid()) AS uid), l.id))))));
CREATE POLICY "Read AR scenes of published hotspots" ON public.ar_scenes AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM (interactive_hotspots ih
     JOIN legends l ON ((l.id = ih.legend_id)))
  WHERE ((ih.ar_scene_id = ar_scenes.id) AND (ih.status = 'published'::text) AND (l.status = 'published'::legend_status) AND (user_has_active_legend_access(( SELECT (select auth.uid()) AS uid), ih.legend_id) OR (l.access_type = 'free'::legend_access_type))))));
CREATE POLICY "Users can read accessible active AR scenes" ON public.ar_scenes AS PERMISSIVE FOR SELECT TO authenticated
  USING (((status = 'active'::ar_scene_status) AND user_has_active_legend_access(( SELECT (select auth.uid()) AS uid), get_legend_id_from_page(page_id))));
CREATE POLICY "Admins can manage assets" ON public.assets AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Authenticated users can read assets" ON public.assets AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Users can insert own assets" ON public.assets AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((uploaded_by = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Users can update own assets" ON public.assets AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((uploaded_by = ( SELECT (select auth.uid()) AS uid)))
  WITH CHECK ((uploaded_by = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Visitors can read published legend assets" ON public.assets AS PERMISSIVE FOR SELECT TO anon
  USING ((EXISTS ( SELECT 1
   FROM legend_media lm
  WHERE ((lm.asset_id = assets.id) AND is_legend_published(lm.legend_id)))));
CREATE POLICY cbatches_admin_manage ON public.code_batches AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY cbatches_select_creator_or_admin ON public.code_batches AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_physical_edition_creator(edition_id) OR current_user_is_admin()));
CREATE POLICY credemp_admin_manage ON public.code_redemptions AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY credemp_select_own_or_admin ON public.code_redemptions AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT (select auth.uid()) AS uid)) OR current_user_is_admin()));
CREATE POLICY creqs_admin_manage ON public.code_requests AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY creqs_insert_creator ON public.code_requests AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (is_legend_creator(legend_id));
CREATE POLICY creqs_select_creator_or_admin ON public.code_requests AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_legend_creator(legend_id) OR current_user_is_admin()));
CREATE POLICY "Admins can manage content reviews" ON public.content_reviews AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Creators can read own content reviews" ON public.content_reviews AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_version_creator(legend_version_id) OR (submitted_by = ( SELECT (select auth.uid()) AS uid))));
CREATE POLICY "Admins manage cover templates" ON public.cover_templates AS PERMISSIVE FOR ALL TO public
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Creators delete own cover templates" ON public.cover_templates AS PERMISSIVE FOR DELETE TO public
  USING ((owner_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Creators insert own cover templates" ON public.cover_templates AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((owner_id = ( SELECT (select auth.uid()) AS uid)) AND (scope = 'creator'::text) AND current_user_has_role('creator'::app_role)));
CREATE POLICY "Creators update own cover templates" ON public.cover_templates AS PERMISSIVE FOR UPDATE TO public
  USING ((owner_id = ( SELECT (select auth.uid()) AS uid)))
  WITH CHECK ((owner_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Read system and own cover templates" ON public.cover_templates AS PERMISSIVE FOR SELECT TO public
  USING (((scope = 'system'::text) OR (owner_id = ( SELECT (select auth.uid()) AS uid))));
CREATE POLICY "Admins can read all creator applications" ON public.creator_applications AS PERMISSIVE FOR SELECT TO authenticated
  USING (current_user_is_admin());
CREATE POLICY "Admins can update creator applications" ON public.creator_applications AS PERMISSIVE FOR UPDATE TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Users can create own creator application" ON public.creator_applications AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((user_id = ( SELECT (select auth.uid()) AS uid)) AND (status = 'pending'::creator_application_status)));
CREATE POLICY "Users can read own creator applications" ON public.creator_applications AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Admins can insert creator profiles" ON public.creator_profiles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admins can update creator profiles" ON public.creator_profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Authenticated users can read creator profiles" ON public.creator_profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (((profile_status = 'active'::creator_profile_status) OR (user_id = ( SELECT (select auth.uid()) AS uid)) OR current_user_is_admin()));
CREATE POLICY "Creators can update own creator profile" ON public.creator_profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((user_id = ( SELECT (select auth.uid()) AS uid)) AND current_user_has_role('creator'::app_role)))
  WITH CHECK (((user_id = ( SELECT (select auth.uid()) AS uid)) AND current_user_has_role('creator'::app_role)));
CREATE POLICY "Visitors can read active creator profiles" ON public.creator_profiles AS PERMISSIVE FOR SELECT TO anon
  USING ((profile_status = 'active'::creator_profile_status));
CREATE POLICY "Admins can manage document extractions" ON public.document_extractions AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Creators can insert own document extractions" ON public.document_extractions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM legend_source_documents lsd
  WHERE ((lsd.id = document_extractions.source_document_id) AND is_legend_creator(lsd.legend_id)))));
CREATE POLICY "Creators can read own document extractions" ON public.document_extractions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM legend_source_documents lsd
  WHERE ((lsd.id = document_extractions.source_document_id) AND is_legend_creator(lsd.legend_id)))));
CREATE POLICY "Admins can manage rendered document pages" ON public.document_render_pages AS PERMISSIVE FOR ALL TO public
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Creators can delete own rendered document pages" ON public.document_render_pages AS PERMISSIVE FOR DELETE TO public
  USING ((is_legend_creator(legend_id) AND (status = ANY (ARRAY['pending'::text, 'failed'::text, 'archived'::text]))));
CREATE POLICY "Creators can insert own rendered document pages" ON public.document_render_pages AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_legend_creator(legend_id) AND current_user_has_role('creator'::app_role)));
CREATE POLICY "Creators can read own rendered document pages" ON public.document_render_pages AS PERMISSIVE FOR SELECT TO public
  USING (is_legend_creator(legend_id));
CREATE POLICY "Creators can update own rendered document pages" ON public.document_render_pages AS PERMISSIVE FOR UPDATE TO public
  USING (is_legend_creator(legend_id))
  WITH CHECK (is_legend_creator(legend_id));
CREATE POLICY "Users can read accessible rendered document pages" ON public.document_render_pages AS PERMISSIVE FOR SELECT TO public
  USING (((status = 'ready'::text) AND (user_has_active_legend_access(( SELECT (select auth.uid()) AS uid), legend_id) OR (EXISTS ( SELECT 1
   FROM legends l
  WHERE ((l.id = document_render_pages.legend_id) AND (l.status = 'published'::legend_status) AND (l.access_type = 'free'::legend_access_type)))))));
CREATE POLICY "Admins can read all favorites" ON public.favorites AS PERMISSIVE FOR SELECT TO authenticated
  USING (current_user_is_admin());
CREATE POLICY "Users can delete own favorites" ON public.favorites AS PERMISSIVE FOR DELETE TO authenticated
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Users can insert own favorites" ON public.favorites AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((user_id = ( SELECT (select auth.uid()) AS uid)) AND is_legend_published(legend_id)));
CREATE POLICY "Users can read own favorites" ON public.favorites AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Admins can manage genres" ON public.genres AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Anyone authenticated can read genres" ON public.genres AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Visitors can read genres" ON public.genres AS PERMISSIVE FOR SELECT TO anon
  USING (true);
CREATE POLICY "Admins can manage hotspots" ON public.interactive_hotspots AS PERMISSIVE FOR ALL TO public
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Creators can delete own hotspots" ON public.interactive_hotspots AS PERMISSIVE FOR DELETE TO public
  USING ((is_legend_creator(legend_id) AND (status = ANY (ARRAY['draft'::text, 'in_review'::text, 'archived'::text]))));
CREATE POLICY "Creators can insert own hotspots" ON public.interactive_hotspots AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((is_legend_creator(legend_id) AND current_user_has_role('creator'::app_role) AND (created_by = ( SELECT (select auth.uid()) AS uid)) AND (status = ANY (ARRAY['draft'::text, 'in_review'::text]))));
CREATE POLICY "Creators can read own hotspots" ON public.interactive_hotspots AS PERMISSIVE FOR SELECT TO public
  USING (is_legend_creator(legend_id));
CREATE POLICY "Creators can update own hotspots" ON public.interactive_hotspots AS PERMISSIVE FOR UPDATE TO public
  USING (is_legend_creator(legend_id))
  WITH CHECK (is_legend_creator(legend_id));
CREATE POLICY "Users can read published accessible hotspots" ON public.interactive_hotspots AS PERMISSIVE FOR SELECT TO public
  USING (((status = 'published'::text) AND (user_has_active_legend_access(( SELECT (select auth.uid()) AS uid), legend_id) OR (EXISTS ( SELECT 1
   FROM legends l
  WHERE ((l.id = interactive_hotspots.legend_id) AND (l.status = 'published'::legend_status) AND (l.access_type = 'free'::legend_access_type)))))));
CREATE POLICY "Admins can manage legend genres" ON public.legend_genres AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Authenticated users can read published legend genres" ON public.legend_genres AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_legend_published(legend_id));
CREATE POLICY "Creators can manage own legend genres" ON public.legend_genres AS PERMISSIVE FOR ALL TO authenticated
  USING (is_legend_creator(legend_id))
  WITH CHECK (is_legend_creator(legend_id));
CREATE POLICY "Visitors can read published legend genres" ON public.legend_genres AS PERMISSIVE FOR SELECT TO anon
  USING (is_legend_published(legend_id));
CREATE POLICY "Admins can manage legend media" ON public.legend_media AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Authenticated users can read published legend media" ON public.legend_media AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_legend_published(legend_id));
CREATE POLICY "Creators can manage own legend media" ON public.legend_media AS PERMISSIVE FOR ALL TO authenticated
  USING (is_legend_creator(legend_id))
  WITH CHECK (is_legend_creator(legend_id));
CREATE POLICY "Visitors can read published legend media" ON public.legend_media AS PERMISSIVE FOR SELECT TO anon
  USING (is_legend_published(legend_id));
CREATE POLICY "Admins can manage legend pages" ON public.legend_pages AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Creators can delete own draft pages" ON public.legend_pages AS PERMISSIVE FOR DELETE TO authenticated
  USING ((is_version_creator(version_id) AND (EXISTS ( SELECT 1
   FROM legend_versions lv
  WHERE ((lv.id = legend_pages.version_id) AND (lv.status = ANY (ARRAY['draft'::legend_version_status, 'rejected'::legend_version_status])))))));
CREATE POLICY "Creators can insert own pages" ON public.legend_pages AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_version_creator(version_id) AND (EXISTS ( SELECT 1
   FROM legend_versions lv
  WHERE ((lv.id = legend_pages.version_id) AND (lv.status = ANY (ARRAY['draft'::legend_version_status, 'rejected'::legend_version_status])))))));
CREATE POLICY "Creators can read own pages" ON public.legend_pages AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_version_creator(version_id));
CREATE POLICY "Creators can update own draft pages" ON public.legend_pages AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_version_creator(version_id) AND (EXISTS ( SELECT 1
   FROM legend_versions lv
  WHERE ((lv.id = legend_pages.version_id) AND (lv.status = ANY (ARRAY['draft'::legend_version_status, 'rejected'::legend_version_status])))))))
  WITH CHECK (is_version_creator(version_id));
CREATE POLICY "Read published pages only with access" ON public.legend_pages AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_version_published(version_id) AND (EXISTS ( SELECT 1
   FROM (legend_versions lv
     JOIN legends l ON ((l.id = lv.legend_id)))
  WHERE ((lv.id = legend_pages.version_id) AND ((l.access_type = 'free'::legend_access_type) OR user_has_active_legend_access(( SELECT (select auth.uid()) AS uid), l.id)))))));
CREATE POLICY "Admins can manage source documents" ON public.legend_source_documents AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Creators can insert own source documents" ON public.legend_source_documents AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_legend_creator(legend_id) AND (uploaded_by = ( SELECT (select auth.uid()) AS uid))));
CREATE POLICY "Creators can read own source documents" ON public.legend_source_documents AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_legend_creator(legend_id));
CREATE POLICY "Creators can update own source documents" ON public.legend_source_documents AS PERMISSIVE FOR UPDATE TO authenticated
  USING (is_legend_creator(legend_id))
  WITH CHECK (is_legend_creator(legend_id));
CREATE POLICY "Admins can manage legend versions" ON public.legend_versions AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Authenticated users can read published versions" ON public.legend_versions AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_version_published(id));
CREATE POLICY "Creators can insert own versions" ON public.legend_versions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_legend_creator(legend_id) AND (created_by = ( SELECT (select auth.uid()) AS uid)) AND (status = 'draft'::legend_version_status)));
CREATE POLICY "Creators can read own versions" ON public.legend_versions AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_legend_creator(legend_id));
CREATE POLICY "Creators can update own draft versions" ON public.legend_versions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_legend_creator(legend_id) AND (status = ANY (ARRAY['draft'::legend_version_status, 'rejected'::legend_version_status]))))
  WITH CHECK ((is_legend_creator(legend_id) AND (status = ANY (ARRAY['draft'::legend_version_status, 'rejected'::legend_version_status]))));
CREATE POLICY "Admins can manage legends" ON public.legends AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Authenticated users can read published legends" ON public.legends AS PERMISSIVE FOR SELECT TO authenticated
  USING ((status = 'published'::legend_status));
CREATE POLICY "Creators can insert own legends" ON public.legends AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((creator_id = ( SELECT (select auth.uid()) AS uid)) AND current_user_has_role('creator'::app_role) AND (status = 'draft'::legend_status)));
CREATE POLICY "Creators can read own legends" ON public.legends AS PERMISSIVE FOR SELECT TO authenticated
  USING ((creator_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Creators can update own draft legends" ON public.legends AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((creator_id = ( SELECT (select auth.uid()) AS uid)) AND (status = ANY (ARRAY['draft'::legend_status, 'rejected'::legend_status]))))
  WITH CHECK (((creator_id = ( SELECT (select auth.uid()) AS uid)) AND (status = ANY (ARRAY['draft'::legend_status, 'rejected'::legend_status]))));
CREATE POLICY "Visitors can read published legends" ON public.legends AS PERMISSIVE FOR SELECT TO anon
  USING ((status = 'published'::legend_status));
CREATE POLICY "Admins can read all mobile devices" ON public.mobile_devices AS PERMISSIVE FOR SELECT TO authenticated
  USING (current_user_is_admin());
CREATE POLICY "Users can delete own mobile devices" ON public.mobile_devices AS PERMISSIVE FOR DELETE TO authenticated
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Users can insert own mobile devices" ON public.mobile_devices AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Users can read own mobile devices" ON public.mobile_devices AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Users can update own mobile devices" ON public.mobile_devices AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)))
  WITH CHECK ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Admins can manage order items" ON public.order_items AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Users can read own order items" ON public.order_items AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = ( SELECT (select auth.uid()) AS uid))))));
CREATE POLICY "Admins can manage orders" ON public.orders AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Users can read own orders" ON public.orders AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Admins can manage payments" ON public.payments AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Users can read own payments" ON public.payments AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = payments.order_id) AND (o.user_id = ( SELECT (select auth.uid()) AS uid))))));
CREATE POLICY "Admins can manage physical edition markers" ON public.physical_edition_markers AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Authenticated users can read active physical edition markers" ON public.physical_edition_markers AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM physical_editions pe
  WHERE ((pe.id = physical_edition_markers.edition_id) AND (pe.status = 'active'::physical_edition_status) AND is_legend_published(pe.legend_id)))));
CREATE POLICY "Creators can manage own physical edition markers" ON public.physical_edition_markers AS PERMISSIVE FOR ALL TO authenticated
  USING (is_physical_edition_creator(edition_id))
  WITH CHECK (is_physical_edition_creator(edition_id));
CREATE POLICY "Admins can manage physical editions" ON public.physical_editions AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Authenticated users can read active physical editions" ON public.physical_editions AS PERMISSIVE FOR SELECT TO authenticated
  USING (((status = 'active'::physical_edition_status) AND is_legend_published(legend_id)));
CREATE POLICY "Creators can insert own draft physical editions" ON public.physical_editions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((current_user_has_role('creator'::app_role) AND is_legend_creator(legend_id) AND (created_by = ( SELECT (select auth.uid()) AS uid)) AND (status = 'draft'::physical_edition_status)));
CREATE POLICY "Creators can read own physical editions" ON public.physical_editions AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_legend_creator(legend_id));
CREATE POLICY "Creators can update own draft physical editions" ON public.physical_editions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((is_legend_creator(legend_id) AND (status = 'draft'::physical_edition_status)))
  WITH CHECK ((is_legend_creator(legend_id) AND (status = 'draft'::physical_edition_status)));
CREATE POLICY "Admins can manage products" ON public.products AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Authenticated users can read active products" ON public.products AS PERMISSIVE FOR SELECT TO authenticated
  USING ((status = 'active'::product_status));
CREATE POLICY "Admins can read all reading progress" ON public.reading_progress AS PERMISSIVE FOR SELECT TO authenticated
  USING (current_user_is_admin());
CREATE POLICY "Users can delete own reading progress" ON public.reading_progress AS PERMISSIVE FOR DELETE TO authenticated
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Users can insert own reading progress" ON public.reading_progress AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((user_id = ( SELECT (select auth.uid()) AS uid)) AND user_has_active_legend_access(( SELECT (select auth.uid()) AS uid), legend_id)));
CREATE POLICY "Users can read own reading progress" ON public.reading_progress AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Users can update own reading progress" ON public.reading_progress AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((user_id = ( SELECT (select auth.uid()) AS uid)) AND user_has_active_legend_access(( SELECT (select auth.uid()) AS uid), legend_id)))
  WITH CHECK (((user_id = ( SELECT (select auth.uid()) AS uid)) AND user_has_active_legend_access(( SELECT (select auth.uid()) AS uid), legend_id)));
CREATE POLICY "Admins can manage reviews" ON public.reviews AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Authenticated users can read visible reviews" ON public.reviews AS PERMISSIVE FOR SELECT TO authenticated
  USING (((status = 'visible'::review_status) AND is_legend_published(legend_id)));
CREATE POLICY "Users can delete own reviews" ON public.reviews AS PERMISSIVE FOR DELETE TO authenticated
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Users can insert own reviews" ON public.reviews AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((user_id = ( SELECT (select auth.uid()) AS uid)) AND (status = 'visible'::review_status) AND user_has_active_legend_access(( SELECT (select auth.uid()) AS uid), legend_id)));
CREATE POLICY "Users can read own reviews" ON public.reviews AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Users can update own reviews" ON public.reviews AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((user_id = ( SELECT (select auth.uid()) AS uid)) AND (status <> 'deleted'::review_status)))
  WITH CHECK (((user_id = ( SELECT (select auth.uid()) AS uid)) AND (status = ANY (ARRAY['visible'::review_status, 'reported'::review_status]))));
CREATE POLICY "Authenticated users can read roles" ON public.roles AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Only admins can manage roles" ON public.roles AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Admins can read all scan logs" ON public.scan_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING (current_user_is_admin());
CREATE POLICY "Creators can read logs for own markers" ON public.scan_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING (((marker_id IS NOT NULL) AND is_marker_creator(marker_id)));
CREATE POLICY "Users can insert own scan logs" ON public.scan_logs AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((user_id = ( SELECT (select auth.uid()) AS uid)) OR (user_id IS NULL)));
CREATE POLICY "Users can read own scan logs" ON public.scan_logs AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Admins can read all shelves" ON public.shelf_items AS PERMISSIVE FOR SELECT TO authenticated
  USING (current_user_is_admin());
CREATE POLICY "Users can add to own shelf" ON public.shelf_items AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((user_id = ( SELECT (select auth.uid()) AS uid)) AND is_legend_published(legend_id)));
CREATE POLICY "Users can read own shelf" ON public.shelf_items AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Users can remove from own shelf" ON public.shelf_items AS PERMISSIVE FOR DELETE TO authenticated
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Admins can manage subscription plans" ON public.subscription_plans AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Authenticated users can read active subscription plans" ON public.subscription_plans AS PERMISSIVE FOR SELECT TO authenticated
  USING ((status = 'active'::product_status));
CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Users can read own subscriptions" ON public.subscriptions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY ula_admin_manage ON public.user_legend_access AS PERMISSIVE FOR ALL TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY ula_select_own_or_admin ON public.user_legend_access AS PERMISSIVE FOR SELECT TO authenticated
  USING (((user_id = ( SELECT (select auth.uid()) AS uid)) OR current_user_is_admin()));
CREATE POLICY "Admins can read all user roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated
  USING (current_user_is_admin());
CREATE POLICY "Only admins can insert user roles" ON public.user_roles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Only super admins can delete user roles" ON public.user_roles AS PERMISSIVE FOR DELETE TO authenticated
  USING (current_user_is_super_admin());
CREATE POLICY "Users can read own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Admins can read all profiles" ON public.users_profile AS PERMISSIVE FOR SELECT TO authenticated
  USING (current_user_is_admin());
CREATE POLICY "Admins can update all profiles" ON public.users_profile AS PERMISSIVE FOR UPDATE TO authenticated
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());
CREATE POLICY "Authenticated users can read public profiles" ON public.users_profile AS PERMISSIVE FOR SELECT TO authenticated
  USING ((status = 'active'::user_status));
CREATE POLICY "Users can read own profile" ON public.users_profile AS PERMISSIVE FOR SELECT TO authenticated
  USING ((id = ( SELECT (select auth.uid()) AS uid)));
CREATE POLICY "Users can update own profile" ON public.users_profile AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((id = ( SELECT (select auth.uid()) AS uid)))
  WITH CHECK ((id = ( SELECT (select auth.uid()) AS uid)));

-- Nota: system_settings y creator_onboarding_email_tokens tienen RLS activo y
-- CERO políticas a propósito: solo el backend (service_role, que omite RLS)
-- puede leerlas o escribirlas. No es un olvido.

-- ============================================================================

commit;
