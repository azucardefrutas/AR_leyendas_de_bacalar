-- Leyendas de Bacalar
-- 08 - Storage buckets and owner policies
-- Target Supabase project: ojwxchkgzywteutqxkfg

begin;

set local search_path to public, extensions;

-- 10. STORAGE
-- legend-assets is public for covers, illustrations, markers and 3D models.
-- legend-documents is private for PDF/DOCX sources and rendered page images.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'legend-assets',
    'legend-assets',
    true,
    52428800,
    array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'model/gltf-binary',
      'model/gltf+json',
      'application/octet-stream'
    ]
  ),
  (
    'legend-documents',
    'legend-documents',
    false,
    52428800,
    array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp'
    ]
  )
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "legend_assets_owner_select" on storage.objects;
drop policy if exists "legend_assets_owner_insert" on storage.objects;
drop policy if exists "legend_assets_owner_update" on storage.objects;
drop policy if exists "legend_assets_owner_delete" on storage.objects;
drop policy if exists "legend_documents_owner_select" on storage.objects;

create policy "legend_assets_owner_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'legend-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "legend_assets_owner_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'legend-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "legend_assets_owner_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'legend-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'legend-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "legend_assets_owner_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'legend-assets'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "legend_documents_owner_select"
on storage.objects for select to authenticated
using (
  bucket_id = 'legend-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;
