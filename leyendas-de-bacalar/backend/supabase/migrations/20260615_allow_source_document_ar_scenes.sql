-- Allow 3D scenes to be associated with rendered PDF pages through
-- interactive_hotspots.source_document_id/source_page_number.
-- Manual-page stories can still use ar_scenes.page_id normally.
alter table public.ar_scenes
  alter column page_id drop not null;
