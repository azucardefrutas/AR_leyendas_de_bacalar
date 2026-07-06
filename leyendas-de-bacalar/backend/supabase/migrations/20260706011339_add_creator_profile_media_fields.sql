-- Leyendas de Bacalar
-- Perfil de autor: imagen de portada y datos publicos editables.
--
-- Esta migracion mantiene el cambio acotado a creator_profiles.

alter table public.creator_profiles
  add column if not exists cover_asset_id uuid references public.assets(id) on delete set null,
  add column if not exists headline text,
  add column if not exists location_label text,
  add column if not exists website_url text,
  add column if not exists profile_visibility text not null default 'public'
    check (profile_visibility in ('public', 'private'));

comment on column public.creator_profiles.cover_asset_id is
  'Optional banner/cover image asset for the public creator profile.';
comment on column public.creator_profiles.headline is
  'Short public creator tagline shown below the author name.';
comment on column public.creator_profiles.location_label is
  'Human-readable creator location.';
comment on column public.creator_profiles.website_url is
  'Creator website or main public link.';
comment on column public.creator_profiles.profile_visibility is
  'Public/private creator profile visibility flag.';
