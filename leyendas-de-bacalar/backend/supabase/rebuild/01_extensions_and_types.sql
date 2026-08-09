-- Leyendas de Bacalar
-- 01 - Extensions and enum types
-- Target Supabase project: ojwxchkgzywteutqxkfg

begin;

set local search_path to public, extensions;

create extension if not exists pgcrypto with schema extensions;

-- 1. TIPOS ENUMERADOS
-- ============================================================================

CREATE TYPE public.access_code_status AS ENUM ('unused', 'assigned', 'redeemed', 'disabled', 'expired');
CREATE TYPE public.app_role AS ENUM ('reader', 'creator', 'admin', 'super_admin');
CREATE TYPE public.ar_scene_status AS ENUM ('draft', 'in_review', 'active', 'inactive', 'rejected');
CREATE TYPE public.asset_source_type AS ENUM ('upload', 'external_url');
CREATE TYPE public.asset_type AS ENUM ('cover', 'banner', 'backdrop', 'logo', 'thumbnail', 'pdf', 'docx', 'model_3d', 'marker_image', 'audio', 'texture', 'illustration', 'other');
CREATE TYPE public.audit_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE public.code_batch_status AS ENUM ('generated', 'exported', 'partially_used', 'completed', 'cancelled');
CREATE TYPE public.code_request_status AS ENUM ('pending', 'approved', 'rejected', 'generated', 'cancelled');
CREATE TYPE public.content_review_status AS ENUM ('pending', 'approved', 'rejected', 'changes_requested', 'cancelled');
CREATE TYPE public.creator_application_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
CREATE TYPE public.creator_profile_status AS ENUM ('active', 'paused', 'banned');
CREATE TYPE public.device_platform AS ENUM ('android', 'ios', 'web');
CREATE TYPE public.document_extraction_status AS ENUM ('pending', 'completed', 'failed');
CREATE TYPE public.extraction_status AS ENUM ('not_required', 'pending', 'extracted', 'failed', 'manual_required');
CREATE TYPE public.legend_access_type AS ENUM ('free', 'paid', 'subscription', 'code_required', 'mixed');
CREATE TYPE public.legend_media_type AS ENUM ('cover', 'banner', 'backdrop', 'logo', 'thumbnail');
CREATE TYPE public.legend_status AS ENUM ('draft', 'in_review', 'published', 'rejected', 'archived');
CREATE TYPE public.legend_version_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'published', 'archived');
CREATE TYPE public.marker_status AS ENUM ('draft', 'in_review', 'active', 'inactive', 'rejected', 'deprecated');
CREATE TYPE public.marker_type AS ENUM ('image_marker', 'qr_marker', 'nft_marker');
CREATE TYPE public.media_usage_context AS ENUM ('catalog', 'detail', 'home', 'mobile', 'admin');
CREATE TYPE public.order_status AS ENUM ('pending', 'approved', 'cancelled', 'failed', 'refunded');
CREATE TYPE public.payment_method AS ENUM ('simulated_card', 'simulated_transfer', 'manual', 'real_gateway');
CREATE TYPE public.payment_provider AS ENUM ('simulated', 'stripe', 'mercadopago', 'paypal', 'manual');
CREATE TYPE public.payment_status AS ENUM ('pending', 'approved', 'failed', 'refunded', 'cancelled');
CREATE TYPE public.physical_edition_status AS ENUM ('draft', 'active', 'discontinued', 'archived');
CREATE TYPE public.product_status AS ENUM ('active', 'inactive', 'archived');
CREATE TYPE public.product_type AS ENUM ('digital_legend', 'physical_book', 'subscription_plan');
CREATE TYPE public.review_status AS ENUM ('visible', 'hidden', 'reported', 'deleted');
CREATE TYPE public.scan_result_status AS ENUM ('success', 'no_access', 'invalid_marker', 'inactive_marker', 'error');
CREATE TYPE public.source_document_type AS ENUM ('pdf', 'docx', 'txt', 'other');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'expired');
CREATE TYPE public.user_access_source AS ENUM ('free', 'code', 'digital_purchase', 'physical_purchase', 'subscription', 'admin_grant');
CREATE TYPE public.user_legend_access_status AS ENUM ('active', 'expired', 'revoked');
CREATE TYPE public.user_status AS ENUM ('active', 'suspended', 'deleted');

-- ============================================================================

commit;
