import { supabase } from './supabase.js';
import { mapPhysicalArScenes } from './arSceneData.js';

// Trae los modelos 3D + marcadores escaneables de LIBRO FÍSICO. Client-side con el
// token del usuario (RLS permite a un autenticado leer estas tablas, así que la app no
// depende del backend). Solo contenido publicado y SOLO `target_type='physical_edition'`:
// la app de escaneo NO debe cruzarse con los hotspots del editor digital
// (`source_document` / `legend_page`), que pertenecen a la experiencia web.
export async function fetchArScenes() {
  const { data, error } = await supabase
    .from('interactive_hotspots')
    .select(`
      id, status, label, target_type, ar_scene_id, marker_asset_id,
      legend:legends!inner(id, title, slug, status),
      marker:marker_asset_id(file_url),
      scene:ar_scene_id(name, scale, position, rotation, interaction_config, model:model_asset_id(file_url, metadata))
    `)
    .eq('status', 'published')
    .eq('target_type', 'physical_edition');

  if (error) throw error;

  const rows = (data ?? []).filter(
    (row) => row.legend?.status === 'published' && row.scene?.model?.file_url,
  );

  // marker_code vive en ar_markers, ligado por ar_scene_id.
  const sceneIds = [...new Set(rows.map((row) => row.ar_scene_id).filter(Boolean))];
  let markerRows = [];
  if (sceneIds.length) {
    const { data: markers } = await supabase
      .from('ar_markers')
      .select('ar_scene_id, marker_asset_id, marker_code')
      .in('ar_scene_id', sceneIds);
    markerRows = markers || [];
  }
  return mapPhysicalArScenes(rows, markerRows);
}
