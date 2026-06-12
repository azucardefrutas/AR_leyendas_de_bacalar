-- Migration: create_document_render_pages
-- Stored for Fase 8 backend render/cache.
-- Do not re-run if these objects already exist in the target database.
--
-- Purpose:
-- - Keep PDF visual rendering separate from text extraction.
-- - Store each rendered PDF page as an asset-backed cached image.
-- - Do not use legend_pages to represent pages from the original PDF.

alter table public.legend_source_documents
  add column if not exists render_status text not null default 'not_rendered',
  add column if not exists rendered_page_count integer null,
  add column if not exists rendered_at timestamptz null,
  add column if not exists render_error text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'legend_source_documents_render_status_check'
      and conrelid = 'public.legend_source_documents'::regclass
  ) then
    alter table public.legend_source_documents
      add constraint legend_source_documents_render_status_check
      check (render_status in ('not_rendered','rendering','ready','failed'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'legend_source_documents_rendered_page_count_check'
      and conrelid = 'public.legend_source_documents'::regclass
  ) then
    alter table public.legend_source_documents
      add constraint legend_source_documents_rendered_page_count_check
      check (rendered_page_count is null or rendered_page_count >= 0);
  end if;
end $$;

create table if not exists public.document_render_pages (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.legend_source_documents(id) on delete cascade,
  legend_id uuid not null references public.legends(id) on delete cascade,
  version_id uuid null references public.legend_versions(id) on delete set null,
  page_number integer not null check (page_number > 0),

  image_asset_id uuid null references public.assets(id) on delete restrict,
  thumbnail_asset_id uuid null references public.assets(id) on delete set null,

  width integer null check (width is null or width > 0),
  height integer null check (height is null or height > 0),
  render_format text not null default 'webp'
    check (render_format in ('jpg','jpeg','webp','png')),
  render_scale numeric not null default 1.5
    check (render_scale > 0 and render_scale <= 4),

  status text not null default 'pending'
    check (status in ('pending','ready','failed','archived')),
  error_message text null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint document_render_pages_unique_source_page unique (source_document_id, page_number),
  constraint document_render_pages_ready_has_image check (
    status <> 'ready' or image_asset_id is not null
  )
);

create index if not exists idx_document_render_pages_legend
  on public.document_render_pages (legend_id);

create index if not exists idx_document_render_pages_source_page
  on public.document_render_pages (source_document_id, page_number);

create index if not exists idx_document_render_pages_page_status
  on public.document_render_pages (source_document_id, status);

create index if not exists idx_document_render_pages_image_asset
  on public.document_render_pages (image_asset_id);

create index if not exists idx_document_render_pages_thumbnail_asset
  on public.document_render_pages (thumbnail_asset_id);

create trigger trg_document_render_pages_updated_at
  before update on public.document_render_pages
  for each row execute function public.set_updated_at();

alter table public.document_render_pages enable row level security;

create policy "Admins can manage rendered document pages"
  on public.document_render_pages for all
  using (current_user_is_admin())
  with check (current_user_is_admin());

create policy "Creators can read own rendered document pages"
  on public.document_render_pages for select
  using (is_legend_creator(legend_id));

create policy "Creators can insert own rendered document pages"
  on public.document_render_pages for insert
  with check (
    is_legend_creator(legend_id)
    and current_user_has_role('creator'::app_role)
  );

create policy "Creators can update own rendered document pages"
  on public.document_render_pages for update
  using (is_legend_creator(legend_id))
  with check (is_legend_creator(legend_id));

create policy "Creators can delete own rendered document pages"
  on public.document_render_pages for delete
  using (is_legend_creator(legend_id) and status in ('pending','failed','archived'));

create policy "Users can read accessible rendered document pages"
  on public.document_render_pages for select
  using (
    status = 'ready'
    and (
      user_has_active_legend_access(auth.uid(), legend_id)
      or exists (
        select 1
        from public.legends l
        where l.id = document_render_pages.legend_id
          and l.status = 'published'
          and l.access_type = 'free'
      )
    )
  );

grant select on public.document_render_pages to anon;
grant select, insert, update, delete on public.document_render_pages to authenticated;
