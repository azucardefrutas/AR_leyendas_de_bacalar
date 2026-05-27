import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';
import {
  createArMarker as createAssetArMarker,
  createArScene,
  getLegendResources,
} from './assetService.js';

function friendlyArError(message = 'No pudimos cargar la informacion AR.') {
  return new Error(message);
}

function isInvalidId(value) {
  return !value || value === 'undefined' || String(value).trim() === '';
}

export async function getArMarkersForLegend(legendId) {
  if (!supabase) return { data: [], error: getSupabaseConfigError() };

  const { data, error } = await supabase
    .from('ar_markers')
    .select('*, ar_scenes(*)')
    .eq('legend_id', legendId);

  return { data: data ?? [], error };
}

export async function createOrUpdateArScene({ legendId, pageId = null, modelAssetId, title = 'Escena AR' }) {
  if (isInvalidId(legendId) || isInvalidId(modelAssetId)) {
    return { data: null, error: friendlyArError('No pudimos preparar la escena AR.') };
  }

  return createArScene({ legendId, pageId, modelAssetId, title });
}

export async function createArMarker({ legendId, sceneId, markerAssetId }) {
  if (isInvalidId(legendId) || isInvalidId(sceneId) || isInvalidId(markerAssetId)) {
    return { data: null, error: friendlyArError('No pudimos registrar el marcador AR.') };
  }

  return createAssetArMarker({ legendId, sceneId, markerAssetId });
}

export async function getLegendArData(legendId) {
  if (isInvalidId(legendId)) return { data: { arScenes: [], arMarkers: [] }, error: null };

  const { data, error } = await getLegendResources(legendId);
  if (error) {
    console.error('getLegendArData error', error);
    return { data: { arScenes: [], arMarkers: [] }, error: friendlyArError() };
  }

  return {
    data: {
      arScenes: data?.arScenes ?? [],
      arMarkers: data?.arMarkers ?? [],
    },
    error: null,
  };
}
