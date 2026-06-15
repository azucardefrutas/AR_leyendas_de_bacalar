import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';
import { getReaderBundle } from './backendApiService.js';
import { getPublishedLegendBySlug } from './legendService.js';

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

function getAssetUrl(client, asset = {}) {
  if (!asset) return '';
  if (asset.file_url || asset.external_url || asset.url || asset.public_url) {
    return asset.file_url || asset.external_url || asset.url || asset.public_url || '';
  }
  if (!asset.storage_path) return '';
  const bucket = asset.metadata?.bucket || 'legend-assets';
  const { data } = client.storage.from(bucket).getPublicUrl(asset.storage_path);
  return data?.publicUrl || '';
}

function getCameraArConfig(scene = {}) {
  return scene.interaction_config?.camera_ar
    || scene.interactionConfig?.cameraAr
    || scene.interactionConfig?.camera_ar
    || scene.metadata?.camera_ar
    || scene.metadata?.ar_camera
    || null;
}

function isCameraArReady(config = {}) {
  return Boolean(
    config?.enabled
    && (config.trackingUrl || config.tracking_url || config.trackingAssetUrl || config.mindUrl || config.pattUrl),
  );
}

function normalizeTrackingKind(config = {}) {
  const rawType = String(config.type || config.trackingType || config.engine || '').toLowerCase();
  const trackingUrl = config.trackingUrl || config.tracking_url || config.trackingAssetUrl || config.mindUrl || config.pattUrl || '';
  if (rawType.includes('mind') || trackingUrl.toLowerCase().endsWith('.mind')) return 'mindar';
  if (rawType.includes('pattern') || rawType.includes('marker') || trackingUrl.toLowerCase().endsWith('.patt')) return 'arjs-pattern';
  return rawType || 'unconfigured';
}

async function getAssetById(client, assetId) {
  if (!assetId) return null;
  const { data, error } = await client
    .from('assets')
    .select('id, asset_type, mime_type, file_size, file_url, external_url, storage_path, metadata')
    .eq('id', assetId)
    .maybeSingle();
  if (error) throw new Error('No pudimos cargar el recurso AR.');
  return data || null;
}

async function getMarkerForScene(client, sceneId) {
  if (!sceneId) return null;
  const { data, error } = await client
    .from('ar_markers')
    .select('id, marker_code, marker_asset_id, marker_type, status, ar_scene_id')
    .eq('ar_scene_id', sceneId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return data || null;
}

async function buildExperience(client, scene = {}) {
  const modelAsset = await getAssetById(client, scene.model_asset_id || scene.modelAssetId);
  const marker = await getMarkerForScene(client, scene.id);
  const markerAsset = marker?.marker_asset_id ? await getAssetById(client, marker.marker_asset_id) : null;
  const config = getCameraArConfig(scene);

  return {
    scene: {
      id: scene.id,
      name: scene.name || 'Escena AR',
      description: scene.description || '',
      status: scene.status || 'draft',
      interactionConfig: scene.interaction_config || scene.interactionConfig || {},
    },
    modelAsset: modelAsset
      ? { ...modelAsset, url: getAssetUrl(client, modelAsset) }
      : null,
    marker,
    markerAsset: markerAsset
      ? { ...markerAsset, url: getAssetUrl(client, markerAsset) }
      : null,
    cameraAr: {
      ready: isCameraArReady(config),
      config: config || null,
      trackingKind: normalizeTrackingKind(config || {}),
      trackingUrl: config?.trackingUrl || config?.tracking_url || config?.trackingAssetUrl || config?.mindUrl || config?.pattUrl || '',
    },
  };
}

export async function getArExperienceBySceneId(sceneId) {
  const { data: client, error } = getClient();
  if (error) throw error;
  if (!sceneId) throw new Error('Escena AR no disponible.');

  const { data: scene, error: sceneError } = await client
    .from('ar_scenes')
    .select('id, page_id, name, description, status, model_asset_id, interaction_config')
    .eq('id', sceneId)
    .maybeSingle();

  if (sceneError || !scene) throw new Error('No pudimos cargar la escena AR.');
  return buildExperience(client, scene);
}

export async function getArExperienceByLegendSlug(legendSlug) {
  if (!legendSlug) throw new Error('Leyenda no disponible.');

  const { data: legend, error } = await getPublishedLegendBySlug(legendSlug);
  if (error || !legend?.id) throw new Error('No pudimos cargar la leyenda.');

  const bundle = await getReaderBundle(legend.id);
  const scene = (bundle?.arScenes || []).find((candidate) => isCameraArReady(getCameraArConfig(candidate)));
  if (!scene) throw new Error('Esta leyenda todavia no tiene camara AR configurada.');

  return getArExperienceBySceneId(scene.id);
}
