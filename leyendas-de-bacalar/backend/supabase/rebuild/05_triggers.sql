-- Leyendas de Bacalar
-- 05 - Triggers
-- Target Supabase project: ojwxchkgzywteutqxkfg

begin;

set local search_path to public, extensions;

-- 7. TRIGGERS
-- ============================================================================

CREATE TRIGGER trg_access_codes_updated_at BEFORE UPDATE ON public.access_codes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ar_markers_updated_at BEFORE UPDATE ON public.ar_markers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_ar_scenes_updated_at BEFORE UPDATE ON public.ar_scenes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_code_batches_updated_at BEFORE UPDATE ON public.code_batches FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_code_requests_updated_at BEFORE UPDATE ON public.code_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_content_reviews_updated_at BEFORE UPDATE ON public.content_reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_creator_profiles_updated_at BEFORE UPDATE ON public.creator_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_document_render_pages_updated_at BEFORE UPDATE ON public.document_render_pages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_hotspots_updated_at BEFORE UPDATE ON public.interactive_hotspots FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_legend_pages_updated_at BEFORE UPDATE ON public.legend_pages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_legends_updated_at BEFORE UPDATE ON public.legends FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_publish_legend_hotspots AFTER UPDATE OF status ON public.legends FOR EACH ROW EXECUTE FUNCTION publish_legend_hotspots();
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_code_quota_admin_only BEFORE INSERT OR UPDATE ON public.physical_editions FOR EACH ROW EXECUTE FUNCTION enforce_code_quota_admin_only();
CREATE TRIGGER trg_physical_editions_updated_at BEFORE UPDATE ON public.physical_editions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reading_progress_updated_at BEFORE UPDATE ON public.reading_progress FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_user_legend_access_updated_at BEFORE UPDATE ON public.user_legend_access FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_profile_updated_at BEFORE UPDATE ON public.users_profile FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger de Supabase sobre auth.users: crea el perfil y asigna el rol 'reader'
-- al registrarse. Vive en el esquema auth, por eso se recrea aparte.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================

commit;
