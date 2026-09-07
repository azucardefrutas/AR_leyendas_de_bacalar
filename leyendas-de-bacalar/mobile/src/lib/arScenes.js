import { supabase } from './supabase.js';
import { mapPhysicalArScenes, normalizeAnimationConfig } from './arSceneData.js';

// URL del backend auxiliar (Render). Con ella la app usa el FEED PUBLICO, que NO exige
// sesion -> el invitado puede escanear sin iniciar sesion. Si no esta configurada, la app
// cae al cliente Supabase directo (que si requiere un usuario autenticado por RLS).
const BACKEND_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');

// El feed publico devuelve una forma anidada ({marker:{imageUrl}, model:{url,...}}). La
// aplanamos a la forma que consume ArScene/mapPhysicalArScenes (markerImageUrl, modelUrl...).
function mapFeedScene(scene) {
  return {
    id: scene.id,
    markerCode: scene.markerCode || null,
    legend: scene.legend || null,
    name: scene.legend?.title || 'Modelo 3D',
    markerImageUrl: scene.marker?.imageUrl || '',
    modelUrl: scene.model?.url || '',
    scale: scene.model?.scale || null,
    position: scene.model?.position || null,
    rotation: scene.model?.rotation || null,
    animationConfig: normalizeAnimationConfig(scene.model?.animationConfig || {}),
  };
}

// Feed PUBLICO del backend (sin sesion). Solo contenido publicado y SOLO marcadores de
// libro fisico (el backend ya aplica ese filtro). Devuelve [] si no hay contenido.
async function fetchArScenesPublic() {
  const res = await fetch(`${BACKEND_URL}/api/v1/mobile/ar/scenes`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Feed movil respondio ${res.status}`);
  const body = await res.json();
  if (!body?.ok || !Array.isArray(body.scenes)) throw new Error('Feed movil con formato inesperado');
  return body.scenes.map(mapFeedScene);
}

// Cliente Supabase directo (requiere sesion autenticada; RLS solo deja leer a un usuario).
// Se usa como respaldo cuando no hay BACKEND_URL o el feed publico falla y HAY sesion.
async function fetchArScenesDirect() {
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

// Trae los modelos 3D + marcadores escaneables de LIBRO FISICO. Prioriza el feed publico
// del backend (funciona SIN iniciar sesion, para el modo invitado). Si no hay backend
// configurado o el feed falla y hay sesion, usa el cliente Supabase directo.
export async function fetchArScenes() {
  if (BACKEND_URL) {
    try {
      return await fetchArScenesPublic();
    } catch (err) {
      // Con sesion, intentamos el cliente directo; sin sesion, propagamos el error.
      const { data } = await supabase.auth.getSession();
      if (!data?.session) throw err;
    }
  }
  return fetchArScenesDirect();
}
