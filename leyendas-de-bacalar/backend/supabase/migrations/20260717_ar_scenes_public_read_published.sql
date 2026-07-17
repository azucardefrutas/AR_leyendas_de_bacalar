-- 20260717_ar_scenes_public_read_published.sql
-- La app móvil lee interactive_hotspots directo (RLS) y hace un join anidado a ar_scenes
-- para sacar el modelo. Pero las policies SELECT de ar_scenes se basan en is_page_creator(
-- page_id) / status='active', y las escenas de marcadores (físicos y de PDF) tienen
-- page_id = NULL y status = 'draft' -> ningún usuario no-admin podía leerlas -> el modelo
-- llegaba null y el feed salía vacío ("Aún no hay marcadores").
--
-- Fix: permitir leer una escena cuando está referenciada por un interactive_hotspot
-- PUBLICADO de una leyenda PUBLICADA y accesible (gratis o con acceso). Es exactamente el
-- mismo criterio que ya expone los hotspots, así no se filtra nada que no fuera público.
create policy "Public can read scenes of published hotspots"
  on public.ar_scenes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.interactive_hotspots h
      join public.legends l on l.id = h.legend_id
      where h.ar_scene_id = ar_scenes.id
        and h.status = 'published'
        and l.status = 'published'
        and (
          l.access_type = 'free'
          or public.user_has_active_legend_access((select auth.uid()), l.id)
        )
    )
  );
