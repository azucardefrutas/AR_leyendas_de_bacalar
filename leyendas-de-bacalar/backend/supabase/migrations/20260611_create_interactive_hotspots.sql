-- Migration: create_interactive_hotspots
-- Applied on 2026-06-11 via Supabase MCP (project wkkzgyhyarqwxoqcdaul).
-- Stored here for traceability/versioning. Do NOT re-run if the table already exists.
--
-- AR-1: interactive_hotspots
-- Associates a marker/3D scene/info point to either a PDF source-document page
-- or a legend_page, with normalized 0..1 coordinates. RLS mirrors the existing
-- creator/admin/reader model used by legend_source_documents and ar_scenes.

create table if not exists public.interactive_hotspots (
  id uuid primary key default gen_random_uuid(),
  legend_id uuid not null references public.legends(id) on delete cascade,
  version_id uuid null references public.legend_versions(id) on delete set null,

  target_type text not null check (target_type in ('source_document','legend_page')),
  source_document_id uuid null references public.legend_source_documents(id) on delete cascade,
  source_page_number integer null check (source_page_number is null or source_page_number >= 1),
  page_id uuid null references public.legend_pages(id) on delete cascade,

  hotspot_type text not null default 'marker'
    check (hotspot_type in ('marker','model','info','ar_scene')),
  marker_asset_id uuid null references public.assets(id) on delete restrict,
  ar_scene_id uuid null references public.ar_scenes(id) on delete set null,

  label text null,
  description text null,

  x numeric not null default 0.85 check (x >= 0 and x <= 1),
  y numeric not null default 0.15 check (y >= 0 and y <= 1),
  width numeric null check (width is null or (width > 0 and width <= 1)),
  height numeric null check (height is null or (height > 0 and height <= 1)),

  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft','in_review','published','archived')),

  created_by uuid null references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint hotspot_target_coherent check (
    (target_type = 'source_document'
      and source_document_id is not null
      and source_page_number is not null
      and page_id is null)
    or
    (target_type = 'legend_page'
      and page_id is not null
      and source_document_id is null)
  )
);

create index if not exists idx_hotspots_legend     on public.interactive_hotspots (legend_id);
create index if not exists idx_hotspots_source_doc on public.interactive_hotspots (source_document_id, source_page_number);
create index if not exists idx_hotspots_page       on public.interactive_hotspots (page_id);
create index if not exists idx_hotspots_status     on public.interactive_hotspots (status);

create trigger trg_hotspots_updated_at
  before update on public.interactive_hotspots
  for each row execute function public.set_updated_at();

alter table public.interactive_hotspots enable row level security;

create policy "Admins can manage hotspots"
  on public.interactive_hotspots for all
  using (current_user_is_admin())
  with check (current_user_is_admin());

create policy "Creators can read own hotspots"
  on public.interactive_hotspots for select
  using (is_legend_creator(legend_id));

create policy "Creators can insert own hotspots"
  on public.interactive_hotspots for insert
  with check (
    is_legend_creator(legend_id)
    and current_user_has_role('creator'::app_role)
    and created_by = auth.uid()
    and status in ('draft','in_review')
  );

create policy "Creators can update own hotspots"
  on public.interactive_hotspots for update
  using (is_legend_creator(legend_id))
  with check (is_legend_creator(legend_id));

create policy "Creators can delete own hotspots"
  on public.interactive_hotspots for delete
  using (is_legend_creator(legend_id) and status in ('draft','in_review','archived'));

create policy "Users can read published accessible hotspots"
  on public.interactive_hotspots for select
  using (
    status = 'published'
    and (
      user_has_active_legend_access(auth.uid(), legend_id)
      or exists (
        select 1 from public.legends l
        where l.id = interactive_hotspots.legend_id
          and l.status = 'published'
          and l.access_type = 'free'
      )
    )
  );
