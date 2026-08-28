import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { normalizeModelAnimationConfig } from './modelAnimationConfig.js';

// Feed de solo lectura para la app movil AR: por cada hotspot publicado devuelve el
// marcador (imagen) + el modelo 3D (url + transformaciones) + la leyenda. NO duplica
// datos: lee las tablas AR existentes (interactive_hotspots -> ar_scenes/assets), asi
// siempre esta sincronizado. Solo expone contenido publicado (leyenda + hotspot) y SOLO
// marcadores de LIBRO FISICO (target_type='physical_edition'): la app de escaneo no debe
// cruzarse con los hotspots del editor digital (source_document / legend_page). Debe
// coincidir con el filtro del cliente directo (mobile/src/lib/arScenes.js).
export async function getMobileArScenes() {
  const { data, error } = await supabaseAdmin
    .from('interactive_hotspots')
    .select(`
      id,
      status,
      ar_scene_id,
      marker_asset_id,
      legend:legends!inner(id, title, slug, status),
      marker:marker_asset_id(file_url),
      scene:ar_scene_id(name, scale, position, rotation, interaction_config, model:model_asset_id(file_url, metadata))
    `)
    .eq('status', 'published')
    .eq('target_type', 'physical_edition')
    .order('created_at', { ascending: true });

  if (error) {
    const err = new Error('No se pudieron cargar las escenas AR.');
    err.status = 500;
    err.cause = error;
    throw err;
  }

  // Solo leyendas publicadas y hotspots con un modelo real.
  const rows = (data ?? []).filter(
    (row) => row.legend?.status === 'published' && row.scene?.model?.file_url && row.marker?.file_url,
  );

  // marker_code vive en ar_markers (ligado por ar_scene_id); lo adjuntamos por escena.
  const sceneIds = [...new Set(rows.map((row) => row.ar_scene_id).filter(Boolean))];
  let codeByPair = {};
  if (sceneIds.length) {
    const { data: markers } = await supabaseAdmin
      .from('ar_markers')
      .select('ar_scene_id, marker_asset_id, marker_code')
      .in('ar_scene_id', sceneIds);
    codeByPair = Object.fromEntries((markers ?? []).map((marker) => [`${marker.ar_scene_id}:${marker.marker_asset_id}`, marker.marker_code]));
  }

  return rows.map((row) => ({
    id: row.id,
    markerCode: codeByPair[`${row.ar_scene_id}:${row.marker_asset_id}`] || null,
    legend: {
      id: row.legend.id,
      title: row.legend.title,
      slug: row.legend.slug,
    },
    marker: {
      imageUrl: row.marker?.file_url || null,
    },
    model: {
      url: row.scene.model.file_url,
      scale: row.scene.scale || null,
      position: row.scene.position || null,
      rotation: row.scene.rotation || null,
      animationConfig: normalizeModelAnimationConfig(row.scene.interaction_config?.animation || row.scene.model.metadata?.animation),
    },
  }));
}
