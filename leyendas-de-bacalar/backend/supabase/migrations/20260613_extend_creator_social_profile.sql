-- Leyendas de Bacalar
-- Proposed migration: creator social profile fields.
--
-- IMPORTANT:
-- This migration is stored locally for review. Do not apply to production until
-- profile visibility rules and creator-profile edit behavior are approved.
-- RLS is enabled only for the new tables below. Existing code/access tables are
-- intentionally untouched in this phase.

begin;

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
  'Human-readable creator location, for example Bacalar, Quintana Roo.';
comment on column public.creator_profiles.website_url is
  'Creator website or main public link.';
comment on column public.creator_profiles.profile_visibility is
  'Public/private creator profile visibility flag. Existing creator_profiles SELECT policy must be reviewed before private visibility is enforced globally.';

create table if not exists public.creator_profile_links (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creator_profiles(user_id) on delete cascade,
  label text not null,
  url text not null,
  link_type text not null default 'website'
    check (link_type in ('website', 'facebook', 'instagram', 'tiktok', 'youtube', 'x', 'other')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.creator_follows (
  follower_id uuid not null references public.users_profile(id) on delete cascade,
  creator_id uuid not null references public.creator_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, creator_id),
  check (follower_id <> creator_id)
);

create index if not exists creator_profile_links_creator_idx
  on public.creator_profile_links (creator_id, sort_order);

create index if not exists creator_follows_creator_idx
  on public.creator_follows (creator_id);

alter table public.creator_profile_links enable row level security;
alter table public.creator_follows enable row level security;

create policy "Admins can manage creator profile links"
  on public.creator_profile_links for all
  using (current_user_is_admin())
  with check (current_user_is_admin());

create policy "Creators can manage own profile links"
  on public.creator_profile_links for all
  using (
    creator_id = auth.uid()
    and current_user_has_role('creator'::app_role)
  )
  with check (
    creator_id = auth.uid()
    and current_user_has_role('creator'::app_role)
  );

create policy "Authenticated users can read public creator profile links"
  on public.creator_profile_links for select
  using (
    exists (
      select 1
      from public.creator_profiles cp
      where cp.user_id = creator_profile_links.creator_id
        and cp.profile_status = 'active'::creator_profile_status
        and cp.profile_visibility = 'public'
    )
  );

create policy "Admins can manage creator follows"
  on public.creator_follows for all
  using (current_user_is_admin())
  with check (current_user_is_admin());

create policy "Users can read own creator follows"
  on public.creator_follows for select
  using (follower_id = auth.uid());

create policy "Users can follow public active creators"
  on public.creator_follows for insert
  with check (
    follower_id = auth.uid()
    and follower_id <> creator_id
    and exists (
      select 1
      from public.creator_profiles cp
      where cp.user_id = creator_follows.creator_id
        and cp.profile_status = 'active'::creator_profile_status
        and cp.profile_visibility = 'public'
    )
  );

create policy "Users can unfollow creators"
  on public.creator_follows for delete
  using (follower_id = auth.uid());

commit;
