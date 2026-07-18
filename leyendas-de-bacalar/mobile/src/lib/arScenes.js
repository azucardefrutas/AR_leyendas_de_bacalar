import { supabase } from './supabase.js';

// Trae los modelos 3D + marcadores escaneables de LIBRO FÍSICO. Client-side con el
// token del usuario (RLS permite a un autenticado leer estas tablas, así que la app no
// depende del backend). Solo contenido publicado y SOLO `target_type='physical_edition'`:
// la app de escaneo NO debe cruzarse con los hotspots del editor digital
// (`source_document` / `legend_page`), que pertenecen a la experiencia web.
export async function fetchArScenes() {
  const { data, error } = await supabase
    .from('interactive_hotspots')
    .select(`
      id, status, ar_scene_id,
      legend:legends!inner(id, title, slug, status),
      marker:marker_asset_id(file_url),
      scene:ar_scene_id(name, scale, position, rotation, model:model_asset_id(file_url))
    `)
    .eq('status', 'published')
    .eq('target_type', 'physical_edition');

  if (error) throw error;

  const rows = (data ?? []).filter(
    (row) => row.legend?.status === 'published' && row.scene?.model?.file_url,
  );

  // marker_code vive en ar_markers, ligado por ar_scene_id.
  const sceneIds = [...new Set(rows.map((row) => row.ar_scene_id).filter(Boolean))];
  let codeByScene = {};
  if (sceneIds.length) {
    const { data: markers } = await supabase
      .from('ar_markers')
      .select('ar_scene_id, marker_code')
      .in('ar_scene_id', sceneIds);
    codeByScene = Object.fromEntries((markers ?? []).map((m) => [m.ar_scene_id, m.marker_code]));
  }

  // Dedupe por modelo (varios hotspots pueden apuntar al mismo GLB).
  const seen = new Set();
  const scenes = [];
  for (const row of rows) {
    const modelUrl = row.scene.model.file_url;
    if (seen.has(modelUrl)) continue;
    seen.add(modelUrl);
    scenes.push({
      id: row.id,
      markerCode: codeByScene[row.ar_scene_id] || null,
      legend: { id: row.legend.id, title: row.legend.title, slug: row.legend.slug },
      name: row.scene.name || row.legend.title,
      markerImageUrl: row.marker?.file_url || null,
      modelUrl,
      scale: row.scene.scale || null,
      position: row.scene.position || null,
      rotation: row.scene.rotation || null,
    });
  }
  return scenes;
}
