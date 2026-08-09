-- Leyendas de Bacalar
-- 02 - Tables
-- Target Supabase project: ojwxchkgzywteutqxkfg

begin;

set local search_path to public, extensions;

-- 2. TABLAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.access_codes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  batch_id uuid NOT NULL,
  edition_id uuid NOT NULL,
  code_hash text NOT NULL,
  display_code text,
  prefix character varying(20) NOT NULL,
  status access_code_status DEFAULT 'unused'::access_code_status NOT NULL,
  generated_by uuid,
  assigned_to_user_id uuid,
  assigned_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  admin_id uuid,
  action character varying(120) NOT NULL,
  entity_type character varying(120) NOT NULL,
  entity_id uuid,
  severity audit_severity DEFAULT 'info'::audit_severity NOT NULL,
  details jsonb DEFAULT '{}'::jsonb NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ar_markers (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  marker_code character varying(120) NOT NULL,
  marker_asset_id uuid NOT NULL,
  ar_scene_id uuid NOT NULL,
  marker_type marker_type DEFAULT 'image_marker'::marker_type NOT NULL,
  status marker_status DEFAULT 'draft'::marker_status NOT NULL,
  created_by uuid,
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ar_scenes (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  page_id uuid,
  name character varying(160) NOT NULL,
  description text,
  model_asset_id uuid NOT NULL,
  scale jsonb DEFAULT '{"x": 1, "y": 1, "z": 1}'::jsonb NOT NULL,
  "position" jsonb DEFAULT '{"x": 0, "y": 0, "z": 0}'::jsonb NOT NULL,
  rotation jsonb DEFAULT '{"x": 0, "y": 0, "z": 0}'::jsonb NOT NULL,
  interaction_config jsonb DEFAULT '{}'::jsonb NOT NULL,
  status ar_scene_status DEFAULT 'draft'::ar_scene_status NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.assets (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  uploaded_by uuid,
  asset_type asset_type NOT NULL,
  source_type asset_source_type NOT NULL,
  file_url text,
  storage_path text,
  external_url text,
  mime_type character varying(120),
  file_size integer,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.code_batches (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  edition_id uuid NOT NULL,
  code_request_id uuid,
  prefix character varying(20) NOT NULL,
  quantity integer NOT NULL,
  status code_batch_status DEFAULT 'generated'::code_batch_status NOT NULL,
  generated_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.code_redemptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code_id uuid NOT NULL,
  user_id uuid NOT NULL,
  redeemed_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.code_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  creator_id uuid NOT NULL,
  legend_id uuid NOT NULL,
  edition_id uuid,
  quantity_requested integer NOT NULL,
  reason text,
  status code_request_status DEFAULT 'pending'::code_request_status NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  admin_feedback text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.content_reviews (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  legend_version_id uuid NOT NULL,
  submitted_by uuid NOT NULL,
  reviewed_by uuid,
  status content_review_status DEFAULT 'pending'::content_review_status NOT NULL,
  feedback text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  reviewed_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.cover_templates (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  scope text DEFAULT 'creator'::text NOT NULL,
  owner_id uuid,
  config jsonb DEFAULT '{}'::jsonb NOT NULL,
  background_asset_id uuid,
  preview_asset_id uuid,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.creator_applications (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  status creator_application_status DEFAULT 'pending'::creator_application_status NOT NULL,
  reason text NOT NULL,
  portfolio_url text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  admin_feedback text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  pen_name text,
  legal_first_name text,
  legal_last_name text,
  affiliation text,
  city text,
  state_region text,
  country text,
  phone text,
  biography text,
  creator_terms_accepted_at timestamp with time zone,
  creator_privacy_accepted_at timestamp with time zone,
  authorship_declaration_accepted_at timestamp with time zone,
  terms_version text,
  privacy_version text,
  email_confirmed_at_snapshot timestamp with time zone,
  onboarding_completed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.creator_onboarding_email_tokens (
  id uuid DEFAULT extensions.gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  application_id uuid NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  consumed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.creator_profiles (
  user_id uuid NOT NULL,
  pen_name character varying(120) NOT NULL,
  biography text,
  profile_status creator_profile_status DEFAULT 'active'::creator_profile_status NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  cover_asset_id uuid,
  headline text,
  location_label text,
  website_url text,
  profile_visibility text DEFAULT 'public'::text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.document_extractions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  source_document_id uuid NOT NULL,
  extracted_text text,
  status document_extraction_status DEFAULT 'pending'::document_extraction_status NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.document_render_pages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  source_document_id uuid NOT NULL,
  legend_id uuid NOT NULL,
  version_id uuid,
  page_number integer NOT NULL,
  image_asset_id uuid,
  thumbnail_asset_id uuid,
  width integer,
  height integer,
  render_format text DEFAULT 'webp'::text NOT NULL,
  render_scale numeric DEFAULT 1.5 NOT NULL,
  status text DEFAULT 'pending'::text NOT NULL,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.favorites (
  user_id uuid NOT NULL,
  legend_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.genres (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name character varying(80) NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.interactive_hotspots (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  legend_id uuid NOT NULL,
  version_id uuid,
  target_type text NOT NULL,
  source_document_id uuid,
  source_page_number integer,
  page_id uuid,
  hotspot_type text DEFAULT 'marker'::text NOT NULL,
  marker_asset_id uuid,
  ar_scene_id uuid,
  label text,
  description text,
  x numeric DEFAULT 0.85 NOT NULL,
  y numeric DEFAULT 0.15 NOT NULL,
  width numeric,
  height numeric,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  status text DEFAULT 'draft'::text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.legend_genres (
  legend_id uuid NOT NULL,
  genre_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.legend_media (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  legend_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  media_type legend_media_type NOT NULL,
  usage_context media_usage_context DEFAULT 'catalog'::media_usage_context NOT NULL,
  is_primary boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.legend_pages (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  version_id uuid NOT NULL,
  page_number integer NOT NULL,
  title character varying(180),
  text_content text DEFAULT ''::text NOT NULL,
  background_asset_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  editor_data jsonb,
  rendered_html text,
  content_format text DEFAULT 'plain'::text NOT NULL,
  editor_version text,
  editor_stats jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.legend_source_documents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  legend_id uuid NOT NULL,
  version_id uuid,
  asset_id uuid NOT NULL,
  uploaded_by uuid,
  document_type source_document_type NOT NULL,
  is_primary_source boolean DEFAULT false NOT NULL,
  extraction_status extraction_status DEFAULT 'not_required'::extraction_status NOT NULL,
  page_count integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  render_status text DEFAULT 'not_rendered'::text NOT NULL,
  rendered_page_count integer,
  rendered_at timestamp with time zone,
  render_error text
);

CREATE TABLE IF NOT EXISTS public.legend_versions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  legend_id uuid NOT NULL,
  version_number integer NOT NULL,
  status legend_version_status DEFAULT 'draft'::legend_version_status NOT NULL,
  created_by uuid NOT NULL,
  reviewed_by uuid,
  review_notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  submitted_at timestamp with time zone,
  published_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.legends (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  creator_id uuid NOT NULL,
  title character varying(180) NOT NULL,
  slug character varying(200) NOT NULL,
  synopsis text NOT NULL,
  short_synopsis text NOT NULL,
  origin_place character varying(120),
  language character varying(10) DEFAULT 'es'::character varying NOT NULL,
  age_rating character varying(30),
  status legend_status DEFAULT 'draft'::legend_status NOT NULL,
  access_type legend_access_type DEFAULT 'free'::legend_access_type NOT NULL,
  is_featured boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  published_at timestamp with time zone,
  creation_mode text DEFAULT 'manual'::text NOT NULL,
  cover_template_id text,
  cover_data jsonb DEFAULT '{}'::jsonb NOT NULL,
  back_cover_data jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mobile_devices (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  platform device_platform NOT NULL,
  device_hash character varying(255) NOT NULL,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer DEFAULT 1 NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  subtotal numeric(10,2) NOT NULL,
  assigned_code_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  status order_status DEFAULT 'pending'::order_status NOT NULL,
  total_amount numeric(10,2) DEFAULT 0 NOT NULL,
  currency character varying(10) DEFAULT 'MXN'::character varying NOT NULL,
  checkout_snapshot jsonb DEFAULT '{}'::jsonb NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid NOT NULL,
  provider payment_provider DEFAULT 'simulated'::payment_provider NOT NULL,
  status payment_status DEFAULT 'pending'::payment_status NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency character varying(10) DEFAULT 'MXN'::character varying NOT NULL,
  payment_method payment_method DEFAULT 'simulated_card'::payment_method NOT NULL,
  card_last_four character varying(4),
  transaction_reference character varying(180),
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.physical_edition_markers (
  edition_id uuid NOT NULL,
  marker_id uuid NOT NULL,
  page_reference character varying(80) NOT NULL,
  print_notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.physical_editions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  legend_id uuid NOT NULL,
  edition_name character varying(180) NOT NULL,
  edition_number character varying(80),
  isbn character varying(40),
  release_year integer,
  status physical_edition_status DEFAULT 'draft'::physical_edition_status NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  code_quota integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_type product_type NOT NULL,
  legend_id uuid,
  edition_id uuid,
  name character varying(180) NOT NULL,
  description text,
  price numeric(10,2) DEFAULT 0 NOT NULL,
  currency character varying(10) DEFAULT 'MXN'::character varying NOT NULL,
  status product_status DEFAULT 'active'::product_status NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reading_progress (
  user_id uuid NOT NULL,
  legend_id uuid NOT NULL,
  last_page_id uuid,
  last_page_number integer DEFAULT 1 NOT NULL,
  progress_percent numeric(5,2) DEFAULT 0 NOT NULL,
  completed boolean DEFAULT false NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  legend_id uuid NOT NULL,
  rating integer NOT NULL,
  comment text,
  status review_status DEFAULT 'visible'::review_status NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name app_role NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.scan_logs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  marker_id uuid,
  device_id uuid,
  scanned_value text NOT NULL,
  result_status scan_result_status NOT NULL,
  error_message text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.shelf_items (
  user_id uuid NOT NULL,
  legend_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id uuid,
  name character varying(140) NOT NULL,
  description text,
  price numeric(10,2) DEFAULT 0 NOT NULL,
  currency character varying(10) DEFAULT 'MXN'::character varying NOT NULL,
  duration_days integer NOT NULL,
  status product_status DEFAULT 'active'::product_status NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  order_id uuid,
  status subscription_status DEFAULT 'active'::subscription_status NOT NULL,
  starts_at timestamp with time zone DEFAULT now() NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  key text NOT NULL,
  value jsonb DEFAULT '{}'::jsonb NOT NULL,
  is_public boolean DEFAULT false NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_by uuid
);

CREATE TABLE IF NOT EXISTS public.user_legend_access (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  legend_id uuid NOT NULL,
  access_source user_access_source NOT NULL,
  source_id uuid,
  status user_legend_access_status DEFAULT 'active'::user_legend_access_status NOT NULL,
  starts_at timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  assigned_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.users_profile (
  id uuid NOT NULL,
  full_name character varying(150),
  username character varying(80),
  avatar_url text,
  bio text,
  status user_status DEFAULT 'active'::user_status NOT NULL,
  active_role app_role DEFAULT 'reader'::app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  cover_url text
);

-- ============================================================================

commit;
