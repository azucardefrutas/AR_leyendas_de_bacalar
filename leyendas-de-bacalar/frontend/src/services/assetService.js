import { getCurrentUser } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'legend-assets';

const EXTENSIONS_BY_TYPE = {
  cover: ['png', 'jpg', 'jpeg', 'webp'],
  banner: ['png', 'jpg', 'jpeg', 'webp'],
  backdrop: ['png', 'jpg', 'jpeg', 'webp'],
  pdf: ['pdf'],
  document: ['pdf'],
  model_3d: ['glb', 'gltf'],
  marker_image: ['png', 'jpg', 'jpeg', 'webp'],
};

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

function friendlyAssetError(message = 'No pudimos subir el archivo.') {
  return new Error(message);
}

function isInvalidId(value) {
  return !value || value === 'undefined' || String(value).trim() === '';
}

function getExtension(name = '') {
  return String(name).split('.').pop()?.toLowerCase() || '';
}

function validateFile(file, assetType) {
  if (!file) return friendlyAssetError('Selecciona un archivo para continuar.');
  const allowed = EXTENSIONS_BY_TYPE[assetType] || [];
  const extension = getExtension(file.name);
  if (allowed.length && !allowed.includes(extension)) {
    return friendlyAssetError('El formato del archivo no es compatible.');
  }
  return null;
}

function cleanUrl(url) {
  return url?.trim() || '';
}

async function getCurrentUserId() {
  const { data, error } = await getCurrentUser();
  if (error) return { data: null, error };
  return { data: data?.user?.id ?? null, error: null };
}

async function tryInsertAsset(client, payloads) {
  let lastError = null;
  for (const payload of payloads) {
    const { data, error } = await client.from('assets').insert(payload).select().single();
    if (!error) return { data, error: null };
    lastError = error;
  }
  console.error('asset upload/link error', lastError);
  return { data: null, error: friendlyAssetError('No pudimos registrar el recurso.') };
}

async function createAssetRecord({ client, userId, legendId, assetType, sourceType, url, file }) {
  const name = file?.name || `${assetType}-${Date.now()}`;
  const mimeType = file?.type || null;
  const size = file?.size || null;
  const base = {
    name,
    asset_type: assetType,
    source_type: sourceType,
    external_url: sourceType === 'external_url' ? url : null,
    public_url: url,
    file_url: url,
    storage_path: sourceType === 'upload' ? url : null,
    mime_type: mimeType,
    size_bytes: size,
    file_size: size,
    legend_id: legendId,
    user_id: userId,
    uploaded_by: userId,
    status: 'active',
  };

  return tryInsertAsset(client, [
    base,
    {
      name,
      asset_type: assetType,
      source_type: sourceType,
      external_url: sourceType === 'external_url' ? url : null,
      public_url: url,
      mime_type: mimeType,
      size_bytes: size,
      status: 'active',
    },
    {
      name,
      type: assetType,
      source_type: sourceType,
      url,
      mime_type: mimeType,
      status: 'active',
    },
    {
      asset_type: assetType,
      source_type: sourceType,
      url,
    },
  ]);
}

export async function uploadLegendAsset({ file, legendId, assetType }) {
  if (isInvalidId(legendId)) return { data: null, error: friendlyAssetError('Guarda la leyenda antes de subir recursos.') };
  const validationError = validateFile(file, assetType);
  if (validationError) return { data: null, error: validationError };

  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const { data: userId, error: userError } = await getCurrentUserId();
    if (userError || !userId) return { data: null, error: friendlyAssetError('Debes iniciar sesion para subir recursos.') };

    const extension = getExtension(file.name);
    const path = `${userId}/${legendId}/${assetType}-${Date.now()}.${extension}`;
    const { error: uploadError } = await client.storage.from(STORAGE_BUCKET).upload(path, file, { upsert: false });

    if (uploadError) {
      console.error('asset upload/link error', uploadError);
      return { data: null, error: friendlyAssetError('No pudimos subir el archivo. Verifica la configuracion de Storage.') };
    }

    const { data: publicData } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    const url = publicData?.publicUrl || path;

    return createAssetRecord({
      client,
      userId,
      legendId,
      assetType,
      sourceType: 'upload',
      url,
      file,
    });
  } catch (error) {
    console.error('asset upload/link error', error);
    return { data: null, error: friendlyAssetError('No pudimos subir el archivo.') };
  }
}

export async function uploadAssetFile({ file, legendId, assetType }) {
  return uploadLegendAsset({ file, legendId, assetType });
}

export async function createExternalAsset({ url, legendId, assetType }) {
  const externalUrl = cleanUrl(url);
  if (!externalUrl) return { data: null, error: friendlyAssetError('Agrega una URL valida.') };
  if (isInvalidId(legendId)) return { data: null, error: friendlyAssetError('Guarda la leyenda antes de registrar recursos.') };

  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const { data: userId, error: userError } = await getCurrentUserId();
    if (userError || !userId) return { data: null, error: friendlyAssetError('Debes iniciar sesion para registrar recursos.') };

    return createAssetRecord({
      client,
      userId,
      legendId,
      assetType,
      sourceType: 'external_url',
      url: externalUrl,
      file: null,
    });
  } catch (error) {
    console.error('asset upload/link error', error);
    return { data: null, error: friendlyAssetError('No pudimos registrar el recurso.') };
  }
}

export async function linkLegendMedia({ legendId, assetId, mediaType }) {
  if (isInvalidId(legendId) || isInvalidId(assetId)) return { data: null, error: friendlyAssetError('No pudimos vincular el recurso.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const payloads = [
    { legend_id: legendId, asset_id: assetId, media_type: mediaType, status: 'active' },
    { legend_id: legendId, asset_id: assetId, media_type: mediaType },
    { legend_id: legendId, asset_id: assetId, type: mediaType },
  ];

  let lastError = null;
  for (const payload of payloads) {
    const { data, error } = await client.from('legend_media').insert(payload).select().single();
    if (!error) return { data, error: null };
    lastError = error;
  }
  console.error('asset upload/link error', lastError);
  return { data: null, error: friendlyAssetError('No pudimos vincular el recurso.') };
}

export async function linkSourceDocument({ legendId, assetId, documentType = 'pdf' }) {
  if (isInvalidId(legendId) || isInvalidId(assetId)) return { data: null, error: friendlyAssetError('No pudimos vincular el documento.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const payloads = [
    { legend_id: legendId, asset_id: assetId, document_type: documentType, status: 'active' },
    { legend_id: legendId, asset_id: assetId, document_type: documentType },
    { legend_id: legendId, asset_id: assetId, type: documentType },
  ];

  let lastError = null;
  for (const payload of payloads) {
    const { data, error } = await client.from('legend_source_documents').insert(payload).select().single();
    if (!error) return { data, error: null };
    lastError = error;
  }
  console.error('asset upload/link error', lastError);
  return { data: null, error: friendlyAssetError('No pudimos vincular el documento.') };
}

export async function linkLegendSourceDocument({ legendId, assetId, documentType = 'pdf' }) {
  return linkSourceDocument({ legendId, assetId, documentType });
}

export async function createArScene({ legendId, pageId = null, modelAssetId, title = 'Escena AR' }) {
  if (isInvalidId(legendId) || isInvalidId(modelAssetId)) return { data: null, error: friendlyAssetError('No pudimos preparar la escena AR.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const payloads = [
    { legend_id: legendId, page_id: pageId || null, model_asset_id: modelAssetId, title, status: 'draft' },
    { legend_id: legendId, page_id: pageId || null, model_asset_id: modelAssetId, status: 'draft' },
    { legend_id: legendId, page_id: pageId || null, asset_id: modelAssetId, status: 'draft' },
    { legend_id: legendId, model_asset_id: modelAssetId },
  ];

  let lastError = null;
  for (const payload of payloads) {
    const { data, error } = await client.from('ar_scenes').insert(payload).select().single();
    if (!error) return { data, error: null };
    lastError = error;
  }
  console.error('asset upload/link error', lastError);
  return { data: null, error: friendlyAssetError('No pudimos preparar la escena AR.') };
}

export async function createArMarker({ legendId, sceneId, markerAssetId }) {
  if (isInvalidId(legendId) || isInvalidId(sceneId) || isInvalidId(markerAssetId)) {
    return { data: null, error: friendlyAssetError('No pudimos registrar el marcador AR.') };
  }
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const payloads = [
    { legend_id: legendId, ar_scene_id: sceneId, asset_id: markerAssetId, status: 'draft' },
    { legend_id: legendId, scene_id: sceneId, asset_id: markerAssetId, status: 'draft' },
    { legend_id: legendId, ar_scene_id: sceneId, marker_asset_id: markerAssetId, status: 'draft' },
    { legend_id: legendId, ar_scene_id: sceneId, asset_id: markerAssetId },
  ];

  let lastError = null;
  for (const payload of payloads) {
    const { data, error } = await client.from('ar_markers').insert(payload).select().single();
    if (!error) return { data, error: null };
    lastError = error;
  }
  console.error('asset upload/link error', lastError);
  return { data: null, error: friendlyAssetError('No pudimos registrar el marcador AR.') };
}

export async function getLegendResources(legendId) {
  if (isInvalidId(legendId)) return { data: { media: [], documents: [], arScenes: [], arMarkers: [] }, error: null };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: { media: [], documents: [], arScenes: [], arMarkers: [] }, error: clientError };

  try {
    const [mediaResult, documentsResult, scenesResult, markersResult] = await Promise.all([
      client.from('legend_media').select('*, assets(*)').eq('legend_id', legendId),
      client.from('legend_source_documents').select('*, assets(*)').eq('legend_id', legendId),
      client.from('ar_scenes').select('*').eq('legend_id', legendId),
      client.from('ar_markers').select('*, assets(*)').eq('legend_id', legendId),
    ]);

    const firstError = mediaResult.error || documentsResult.error || scenesResult.error || markersResult.error;
    if (firstError) {
      console.error('asset upload/link error', firstError);
    }

    return {
      data: {
        media: mediaResult.data ?? [],
        documents: documentsResult.data ?? [],
        arScenes: scenesResult.data ?? [],
        arMarkers: markersResult.data ?? [],
      },
      error: null,
    };
  } catch (error) {
    console.error('asset upload/link error', error);
    return { data: { media: [], documents: [], arScenes: [], arMarkers: [] }, error: null };
  }
}

export async function saveLegendResource({ legendId, pageId, resource }) {
  const hasFile = Boolean(resource.file);
  const hasUrl = Boolean(resource.url?.trim());
  if (!hasFile && !hasUrl) return { data: null, error: null };

  const assetResult = hasFile
    ? await uploadLegendAsset({ file: resource.file, legendId, assetType: resource.assetType })
    : await createExternalAsset({ url: resource.url, legendId, assetType: resource.assetType });

  if (assetResult.error || !assetResult.data?.id) return assetResult;

  if (resource.kind === 'media') {
    const linkResult = await linkLegendMedia({
      legendId,
      assetId: assetResult.data.id,
      mediaType: resource.mediaType,
    });
    if (linkResult.error) return linkResult;
  }

  if (resource.kind === 'document') {
    const linkResult = await linkSourceDocument({
      legendId,
      assetId: assetResult.data.id,
      documentType: resource.documentType || 'pdf',
    });
    if (linkResult.error) return linkResult;
  }

  if (resource.kind === 'ar_model') {
    const sceneResult = await createArScene({
      legendId,
      pageId,
      modelAssetId: assetResult.data.id,
      title: 'Escena AR de leyenda',
    });
    if (sceneResult.error) return sceneResult;
    return { data: { asset: assetResult.data, scene: sceneResult.data }, error: null };
  }

  if (resource.kind === 'ar_marker') {
    return { data: { asset: assetResult.data }, error: null };
  }

  return { data: { asset: assetResult.data }, error: null };
}

export async function getAssetsForLegend(legendId) {
  const { data, error } = await getLegendResources(legendId);
  return { data: data.media ?? [], error };
}

export async function getLegendAssets(legendId) {
  const { data, error } = await getLegendResources(legendId);
  return { data: data.media ?? [], error };
}

export async function getLegendSourceDocuments(legendId) {
  const { data, error } = await getLegendResources(legendId);
  return { data: data.documents ?? [], error };
}
