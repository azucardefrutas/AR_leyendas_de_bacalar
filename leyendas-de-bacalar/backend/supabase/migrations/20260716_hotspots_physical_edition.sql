-- 20260716_hotspots_physical_edition.sql
-- Permite un tercer objetivo de hotspot: 'physical_edition' (marcador de libro fisico,
-- sin pagina). La app movil ya lee interactive_hotspots sin filtrar por target_type, asi
-- que estos marcadores aparecen en el escaner sin cambios de codigo. Migracion aditiva:
-- las filas existentes (source_document / legend_page) siguen cumpliendo ambos CHECK.
begin;

alter table public.interactive_hotspots
  drop constraint interactive_hotspots_target_type_check;
alter table public.interactive_hotspots
  add constraint interactive_hotspots_target_type_check
  check (target_type = any (array['source_document','legend_page','physical_edition']));

alter table public.interactive_hotspots
  drop constraint hotspot_target_coherent;
alter table public.interactive_hotspots
  add constraint hotspot_target_coherent check (
    (target_type = 'source_document'
       and source_document_id is not null
       and source_page_number is not null
       and page_id is null)
    or (target_type = 'legend_page'
       and page_id is not null
       and source_document_id is null)
    or (target_type = 'physical_edition'
       and page_id is null
       and source_document_id is null
       and source_page_number is null)
  );

commit;
