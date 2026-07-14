import { getCurrentUser } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';
import {
  createLegendScene,
  prepareLegendUpload,
  registerLegendUpload,
  uploadFileToSignedUrl,
} from './backendApiService.js';
import { shouldFallbackEditorImageUpload } from './editorAssetUploadPolicy.js';

export const STORAGE_BUCKETS = {
  assets: import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'legend-assets',
  documents: import.meta.env.VITE_SUPABASE_DOCUMENT_BUCKET || 'legend-documents',
};

const MB = 1024 * 1024;

const FILE_RULES_BY_TYPE = {
  cover: {
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    maxBytes: 10 * MB,
    bucket: STORAGE_BUCKETS.assets,
    folder: 'cover',
    dbAssetType: 'cover',
  },
  banner: {
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    maxBytes: 10 * MB,
    bucket: STORAGE_BUCKETS.assets,
    folder: 'banner',
    dbAssetType: 'banner',
  },
  backdrop: {
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    bucket: STORAGE_BUCKETS.assets,
    folder: 'backdrop',
    dbAssetType: 'backdrop',
  },
  editor_image: {
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    maxBytes: 10 * MB,
    bucket: STORAGE_BUCKETS.assets,
    folder: 'editor',
    dbAssetType: 'illustration',
  },
  pdf: {
    extensions: ['pdf'],
    mimeTypes: ['application/pdf'],
    bucket: STORAGE_BUCKETS.documents,
    folder: 'documents',
    dbAssetType: 'pdf',
  },
  document: {
    extensions: ['pdf', 'doc', 'docx'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
      '',
    ],
    maxBytes: 50 * MB,
    bucket: STORAGE_BUCKETS.documents,
    folder: 'documents',
    dbAssetType: null,
  },
  source_document: {
    extensions: ['pdf', 'doc', 'docx'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
      '',
    ],
    maxBytes: 50 * MB,
    bucket: STORAGE_BUCKETS.documents,
    folder: 'documents',
    dbAssetType: null,
  },
  model_3d: {
    extensions: ['glb', 'gltf'],
    mimeTypes: ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream', ''],
    maxBytes: 50 * MB,
    bucket: STORAGE_BUCKETS.assets,
    folder: 'models',
    dbAssetType: 'model_3d',
  },
  marker_image: {
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    maxBytes: 10 * MB,
    bucket: STORAGE_BUCKETS.assets,
    folder: 'markers',
    dbAssetType: 'marker_image',
  },
};

const MIME_TYPE_BY_EXTENSION = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
};

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

function friendlyAssetError(message = 'No pudimos subir el archivo.', details = {}) {
  const error = new Error(message);
  Object.assign(error, details);
  return error;
}

function isInvalidId(value) {
  return !value || value === 'undefined' || String(value).trim() === '';
}

function getExtension(name = '') {
  return String(name).split('.').pop()?.toLowerCase() || '';
}

function validateFile(file, assetType) {
  if (!file) return friendlyAssetError('Selecciona un archivo para continuar.');
  const rules = FILE_RULES_BY_TYPE[assetType] || { extensions: [], mimeTypes: [] };
  const allowed = rules.extensions || [];
  const extension = getExtension(file.name);
  if (allowed.length && !allowed.includes(extension)) {
    return friendlyAssetError('El formato del archivo no es compatible.');
  }

  const mimeType = file.type || MIME_TYPE_BY_EXTENSION[extension] || '';
  const octetStreamGlb = assetType === 'model_3d' && extension === 'glb' && mimeType === 'application/octet-stream';
  if (rules.mimeTypes?.length && !rules.mimeTypes.includes(mimeType) && !octetStreamGlb) {
    return friendlyAssetError('El tipo MIME del archivo no es compatible.');
  }
  if (rules.maxBytes && file.size > rules.maxBytes) {
    const limitMb = Math.round(rules.maxBytes / MB);
    return friendlyAssetError(`El archivo supera el tamano maximo permitido (${limitMb} MB).`);
  }
  return null;
}

function getFileContentType(file, assetType) {
  const extension = getExtension(file?.name);
  const byExtension = MIME_TYPE_BY_EXTENSION[extension];
  const reported = file?.type || '';
  // Browsers/OSes sometimes report '' or 'application/octet-stream' for valid PDFs/DOCX.
  // When we recognize the extension, trust the canonical MIME so the backend validator
  // (strict allowlist) does not reject the upload with "Invalid file metadata".
  if (byExtension && (!reported || reported === 'application/octet-stream')) {
    return byExtension;
  }
  return reported || byExtension || MIME_TYPE_BY_EXTENSION[assetType] || 'application/octet-stream';
}

function getStorageBucket(assetType) {
  return FILE_RULES_BY_TYPE[assetType]?.bucket || STORAGE_BUCKETS.assets;
}

function getStorageFolder(assetType) {
  return FILE_RULES_BY_TYPE[assetType]?.folder || assetType || 'asset';
}

function shouldUseBackendUpload(assetType, forceBackend = false) {
  if (['cover', 'banner', 'source_document'].includes(assetType)) return true;
  return forceBackend && ['editor_image', 'model_3d', 'marker_image'].includes(assetType);
}

function isBackendRegisteredMedia(assetResult) {
  return assetResult.data?.relation?.type === 'legend_media';
}

function isBackendRegisteredSourceDocument(assetResult) {
  return assetResult.data?.relation?.type === 'legend_source_documents';
}

function safeFileName(name = 'asset') {
  const extension = getExtension(name);
  const baseName = String(name)
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'asset';
  return extension ? `${baseName}.${extension}` : baseName;
}

function createStoragePath({ userId, legendId, assetType, file }) {
  const timestamp = Date.now();
  return `${userId}/legends/${legendId}/${getStorageFolder(assetType)}/${timestamp}-${safeFileName(file?.name)}`;
}

function getDatabaseAssetType(assetType, file) {
  const extension = getExtension(file?.name);
  if (assetType === 'document' || assetType === 'source_document') {
    if (extension === 'pdf') return 'pdf';
    if (extension === 'doc' || extension === 'docx') return 'docx';
    return 'other';
  }
  return FILE_RULES_BY_TYPE[assetType]?.dbAssetType || assetType || 'other';
}

function getDocumentType(file, fallback = 'pdf') {
  const extension = getExtension(file?.name || fallback);
  if (extension === 'pdf') return 'pdf';
  if (extension === 'doc' || extension === 'docx') return 'docx';
  if (extension === 'txt') return 'txt';
  return 'other';
}

function logStorageError(operation, { bucket, path, file, error, payload, table } = {}) {
  if (!import.meta.env.DEV) return;
  console.error('[StorageUpload] Error real:', {
    operation,
    bucket,
    path,
    table,
    fileName: file?.name,
    fileType: file?.type,
    fileSize: file?.size,
    payload,
    error,
  });
}

function logBackendUploadPhase(phase, error) {
  if (!import.meta.env.DEV) return;
  console.error('[BackendUpload] Error real:', {
    phase,
    status: error?.status,
    message: error?.message,
    data: error?.data,
  });
}

function getBackendUploadMessage(phase, error) {
  if (error?.message?.includes('Backend URL no configurada')) {
    return error.message;
  }

  if (phase === 'prepare') {
    return error?.status === 0
      ? 'No se pudo conectar con el backend. Verifica que este activo.'
      : `Error al preparar subida. ${error?.message || ''}`.trim();
  }

  if (phase === 'upload') {
    return error?.message || 'Error al subir archivo a Storage.';
  }

  if (phase === 'register') {
    return error?.status === 0
      ? 'No se pudo conectar con el backend para registrar el recurso.'
      : 'No se pudo guardar el recurso. Revisa el archivo o intenta de nuevo.';
  }

  return error?.message || 'No pudimos subir el archivo.';
}

async function runBackendUploadPhase(phase, action) {
  try {
    return await action();
  } catch (error) {
    logBackendUploadPhase(phase, error);
    throw friendlyAssetError(getBackendUploadMessage(phase, error), {
      supabaseError: error,
      phase,
    });
  }
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
    logStorageError('insert asset metadata', { table: 'assets', payload, error });
  }
  return {
    data: null,
    error: friendlyAssetError('El archivo subio, pero no pudimos registrar el recurso en assets.', {
      supabaseError: lastError,
      table: 'assets',
    }),
  };
}

async function uploadAssetWithBackend({ file, legendId, assetType }) {
  const mimeType = getFileContentType(file, assetType);
  const prepareResult = await runBackendUploadPhase('prepare', () => prepareLegendUpload({
    legendId,
    filename: file.name,
    mimeType,
    sizeBytes: file.size,
    purpose: assetType,
  }));

  await runBackendUploadPhase('upload', () => uploadFileToSignedUrl({
    signedUrl: prepareResult.upload?.signedUrl,
    file,
    contentType: mimeType,
  }));

  const registerResult = await runBackendUploadPhase('register', () => registerLegendUpload({
    legendId,
    bucket: prepareResult.upload?.bucket,
    path: prepareResult.upload?.path,
    filename: file.name,
    mimeType,
    sizeBytes: file.size,
    purpose: assetType,
  }));

  return {
    data: {
      asset: registerResult.asset,
      relation: registerResult.relation,
    },
    error: null,
  };
}

function decorateAssetForClient(asset, { bucket, publicUrl = '', signedUrl = '' } = {}) {
  if (!asset) return asset;
  const url = signedUrl || asset.file_url || publicUrl || asset.external_url || '';
  return {
    ...asset,
    bucket,
    public_url: publicUrl || asset.file_url || '',
    signed_url: signedUrl || '',
    url,
  };
}

async function getSignedUrlForAsset(client, asset, bucket) {
  if (!asset?.storage_path || bucket !== STORAGE_BUCKETS.documents) return '';
  const { data, error } = await client.storage.from(bucket).createSignedUrl(asset.storage_path, 60 * 60);
  if (error) {
    logStorageError('create signed url', {
      bucket,
      path: asset.storage_path,
      table: 'storage.objects',
      error,
    });
    return '';
  }
  return data?.signedUrl || '';
}

function getBucketForAsset(asset = {}) {
  const metadataBucket = asset.metadata?.bucket;
  if (metadataBucket) return metadataBucket;
  return ['pdf', 'docx'].includes(asset.asset_type) ? STORAGE_BUCKETS.documents : STORAGE_BUCKETS.assets;
}

async function resolveAssetForClient(client, asset) {
  if (!asset) return null;
  const bucket = getBucketForAsset(asset);
  let publicUrl = asset.file_url || '';

  if (!publicUrl && asset.storage_path && bucket === STORAGE_BUCKETS.assets) {
    const { data } = client.storage.from(bucket).getPublicUrl(asset.storage_path);
    publicUrl = data?.publicUrl || '';
  }

  const signedUrl = await getSignedUrlForAsset(client, asset, bucket);
  return decorateAssetForClient(asset, { bucket, publicUrl, signedUrl });
}

async function createAssetRecord({
  client,
  userId,
  legendId,
  assetType,
  dbAssetType,
  sourceType,
  bucket,
  publicUrl,
  storagePath,
  file,
}) {
  const originalName = file?.name || `${assetType}-${Date.now()}`;
  const mimeType = file ? getFileContentType(file, assetType) : null;
  const size = file?.size || null;
  const publicUrlValue = publicUrl || '';
  const payload = {
    uploaded_by: userId,
    asset_type: dbAssetType || getDatabaseAssetType(assetType, file),
    source_type: sourceType,
    file_url: sourceType === 'upload' && publicUrlValue ? publicUrlValue : null,
    storage_path: storagePath || null,
    external_url: sourceType === 'external_url' ? publicUrlValue : null,
    mime_type: mimeType,
    file_size: size,
    metadata: {
      bucket,
      legend_id: legendId,
      kind: assetType,
      ...(assetType === 'editor_image' ? { context: 'manual_editor' } : {}),
      original_name: originalName,
      safe_file_name: safeFileName(originalName),
      extension: getExtension(originalName),
      public: bucket === STORAGE_BUCKETS.assets,
    },
  };

  const result = await tryInsertAsset(client, [payload]);
  if (result.error || !result.data) return result;

  const signedUrl = await getSignedUrlForAsset(client, result.data, bucket);
  return {
    data: decorateAssetForClient(result.data, { bucket, publicUrl: publicUrlValue, signedUrl }),
    error: null,
  };
}

async function hydrateRowsWithAssets(client, rows = []) {
  const assetIds = [...new Set(rows.map((row) => row.asset_id || row.model_asset_id || row.marker_asset_id).filter(Boolean))];
  if (!assetIds.length) return rows;

  const { data: assets, error } = await client
    .from('assets')
    .select('*')
    .in('id', assetIds);

  if (error) {
    logStorageError('select linked assets', { table: 'assets', error });
    return rows;
  }

  const assetsById = new Map((assets ?? []).map((asset) => [String(asset.id), asset]));
  const hydratedRows = [];
  for (const row of rows) {
    const asset = assetsById.get(String(row.asset_id || row.model_asset_id || row.marker_asset_id)) || null;
    hydratedRows.push({
      ...row,
      assets: await resolveAssetForClient(client, asset),
    });
  }
  return hydratedRows;
}

async function getLegendPageIds(client, legendId) {
  const { data: versions, error: versionsError } = await client
    .from('legend_versions')
    .select('id')
    .eq('legend_id', legendId);

  if (versionsError) {
    logStorageError('select legend versions for resources', { table: 'legend_versions', error: versionsError });
    return [];
  }

  const versionIds = (versions ?? []).map((version) => version.id).filter(Boolean);
  if (!versionIds.length) return [];

  const { data: pages, error: pagesError } = await client
    .from('legend_pages')
    .select('id')
    .in('version_id', versionIds);

  if (pagesError) {
    logStorageError('select legend pages for resources', { table: 'legend_pages', error: pagesError });
    return [];
  }

  return (pages ?? []).map((page) => page.id).filter(Boolean);
}

export async function uploadProjectAsset({ file, legendId, kind, userId: providedUserId = null, forceBackend = false }) {
  if (isInvalidId(legendId)) return { data: null, error: friendlyAssetError('Guarda la leyenda antes de subir recursos.') };
  const assetType = kind || 'other';
  const validationError = validateFile(file, assetType);
  if (validationError) return { data: null, error: validationError };

  if (shouldUseBackendUpload(assetType, forceBackend)) {
    try {
      return await uploadAssetWithBackend({ file, legendId, assetType });
    } catch (error) {
      if (!shouldFallbackEditorImageUpload(error)) {
        return {
          data: null,
          error: friendlyAssetError(error.message || 'No pudimos subir el archivo.', { supabaseError: error }),
        };
      }
      if (import.meta.env.DEV) {
        console.warn('[EditorAssetUpload] Backend desactualizado para editor_image; usando Supabase con RLS.');
      }
    }
  }

  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const userResult = providedUserId
      ? { data: providedUserId, error: null }
      : await getCurrentUserId();
    const { data: userId, error: userError } = userResult;
    if (userError || !userId) return { data: null, error: friendlyAssetError('Debes iniciar sesion para subir recursos.') };

    const bucket = getStorageBucket(assetType);
    const path = createStoragePath({ userId, legendId, assetType, file });
    const contentType = getFileContentType(file, assetType);
    const { error: uploadError } = await client.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType,
    });

    if (uploadError) {
      logStorageError('storage upload', { bucket, path, file, error: uploadError });
      return {
        data: null,
        error: friendlyAssetError('Storage no esta configurado para subir este tipo de recurso. Revisa bucket/policies.', {
          supabaseError: uploadError,
          bucket,
          path,
        }),
      };
    }

    const { data: publicData } = client.storage.from(bucket).getPublicUrl(path);
    const publicUrl = bucket === STORAGE_BUCKETS.assets ? (publicData?.publicUrl || '') : '';
    const dbAssetType = getDatabaseAssetType(assetType, file);

    return createAssetRecord({
      client,
      userId,
      legendId,
      assetType,
      dbAssetType,
      sourceType: 'upload',
      bucket,
      publicUrl,
      storagePath: path,
      file,
    });
  } catch (error) {
    logStorageError('unexpected upload error', { file, error });
    return { data: null, error: friendlyAssetError('No pudimos subir el archivo.', { supabaseError: error }) };
  }
}

export async function uploadLegendAsset({ file, legendId, assetType, forceBackend = false }) {
  return uploadProjectAsset({ file, legendId, kind: assetType, forceBackend });
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
      dbAssetType: getDatabaseAssetType(assetType, null),
      sourceType: 'external_url',
      bucket: null,
      publicUrl: externalUrl,
      storagePath: null,
      file: null,
    });
  } catch (error) {
    logStorageError('external asset error', { error });
    return { data: null, error: friendlyAssetError('No pudimos registrar el recurso.', { supabaseError: error }) };
  }
}

export async function linkLegendMedia({ legendId, assetId, mediaType }) {
  if (isInvalidId(legendId) || isInvalidId(assetId)) return { data: null, error: friendlyAssetError('No pudimos vincular el recurso.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const usageContext = mediaType === 'cover' ? 'catalog' : 'detail';
  const payload = {
    legend_id: legendId,
    asset_id: assetId,
    media_type: mediaType,
    usage_context: usageContext,
    is_primary: true,
  };

  const { data: existing, error: existingError } = await client
    .from('legend_media')
    .select('id')
    .eq('legend_id', legendId)
    .eq('media_type', mediaType)
    .eq('usage_context', usageContext)
    .maybeSingle();

  if (existingError) {
    logStorageError('select legend media relation', {
      table: 'legend_media',
      payload,
      error: existingError,
    });
    return { data: null, error: friendlyAssetError('No pudimos vincular el recurso.', { supabaseError: existingError, table: 'legend_media' }) };
  }

  const query = existing?.id
    ? client.from('legend_media').update({ asset_id: assetId, is_primary: true }).eq('id', existing.id)
    : client.from('legend_media').insert(payload);
  const { data, error } = await query.select().single();

  if (error) {
    logStorageError(existing?.id ? 'update legend media relation' : 'insert legend media relation', {
      table: 'legend_media',
      payload,
      error,
    });
    return { data: null, error: friendlyAssetError('No pudimos vincular el recurso.', { supabaseError: error, table: 'legend_media' }) };
  }

  const { error: deleteError } = await client
    .from('legend_media')
    .delete()
    .eq('legend_id', legendId)
    .eq('media_type', mediaType)
    .neq('id', data.id);

  if (deleteError) {
    logStorageError('replace legend media relation', {
      table: 'legend_media',
      payload: { legend_id: legendId, media_type: mediaType, keep_id: data.id },
      error: deleteError,
    });
  }

  return { data, error: null };
}

export async function linkSourceDocument({ legendId, assetId, documentType = 'pdf' }) {
  if (isInvalidId(legendId) || isInvalidId(assetId)) return { data: null, error: friendlyAssetError('No pudimos vincular el documento.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: userId, error: userError } = await getCurrentUserId();
  if (userError || !userId) return { data: null, error: friendlyAssetError('Debes iniciar sesion para vincular documentos.') };

  const normalizedDocumentType = ['pdf', 'docx', 'txt', 'other'].includes(documentType) ? documentType : 'docx';
  const payload = {
    legend_id: legendId,
    asset_id: assetId,
    uploaded_by: userId,
    document_type: normalizedDocumentType,
    is_primary_source: true,
    extraction_status: 'pending',
  };

  const { data, error } = await client.from('legend_source_documents').insert(payload).select().single();
  if (error) {
    logStorageError('insert source document relation', {
      table: 'legend_source_documents',
      payload,
      error,
    });
    return { data: null, error: friendlyAssetError('No pudimos vincular el documento.', { supabaseError: error, table: 'legend_source_documents' }) };
  }
  return { data, error: null };
}

export async function linkLegendSourceDocument({ legendId, assetId, documentType = 'pdf' }) {
  return linkSourceDocument({ legendId, assetId, documentType });
}

// Create (or reuse) the AR scene for a model. Goes through the backend (service role)
// because the ar_scenes RLS INSERT policy requires is_page_creator(page_id) and rejects
// scenes for rendered-PDF models (page_id null). The backend enforces ownership via the
// model asset's legend, so this stays secure without touching RLS.
export async function createArScene({ legendId, pageId = null, modelAssetId, title = 'Escena 3D' }) {
  if (isInvalidId(modelAssetId)) return { data: null, error: friendlyAssetError('No pudimos preparar la escena AR.') };
  if (isInvalidId(legendId)) return { data: null, error: friendlyAssetError('No pudimos preparar la escena AR.') };

  try {
    const response = await createLegendScene(legendId, {
      model_asset_id: modelAssetId,
      page_id: isInvalidId(pageId) ? null : pageId,
      name: title || 'Escena 3D',
    });
    return { data: response?.scene ?? null, error: null };
  } catch (error) {
    return {
      data: null,
      // Surface the backend's real message so failures are clear (per requirement),
      // falling back to the friendly default only when there's no message.
      error: friendlyAssetError(error?.message || 'No pudimos preparar la escena AR.', { backendError: error }),
    };
  }
}

export async function createArMarker({ legendId, sceneId, markerAssetId }) {
  if (isInvalidId(sceneId) || isInvalidId(markerAssetId)) {
    return { data: null, error: friendlyAssetError('No pudimos registrar el marcador AR.') };
  }
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: userId } = await getCurrentUserId();
  const payload = {
    marker_code: `marker-${legendId || 'legend'}-${Date.now()}`,
    marker_asset_id: markerAssetId,
    ar_scene_id: sceneId,
    marker_type: 'image_marker',
    status: 'draft',
    created_by: userId || null,
  };
  const { data, error } = await client.from('ar_markers').insert(payload).select().single();
  if (error) {
    logStorageError('insert ar marker relation', {
      table: 'ar_markers',
      payload,
      error,
    });
    return { data: null, error: friendlyAssetError('No pudimos registrar el marcador AR.', { supabaseError: error, table: 'ar_markers' }) };
  }
  return { data, error: null };
}

export async function getLegendResources(legendId) {
  if (isInvalidId(legendId)) return { data: { media: [], documents: [], modelAssets: [], arScenes: [], arMarkers: [] }, error: null };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: { media: [], documents: [], modelAssets: [], arScenes: [], arMarkers: [] }, error: clientError };

  try {
    const [mediaResult, documentsResult] = await Promise.all([
      client.from('legend_media').select('*').eq('legend_id', legendId),
      client.from('legend_source_documents').select('*').eq('legend_id', legendId),
    ]);

    const firstError = mediaResult.error || documentsResult.error;
    if (firstError) {
      logStorageError('select legend resources', { error: firstError });
    }

    const pageIds = await getLegendPageIds(client, legendId);
    const modelAssetsResult = await client
      .from('assets')
      .select('*')
      .eq('asset_type', 'model_3d')
      .eq('metadata->>legend_id', legendId);
    if (modelAssetsResult.error) logStorageError('select model assets', { table: 'assets', error: modelAssetsResult.error });

    const markerAssetsResult = await client
      .from('assets')
      .select('*')
      .eq('asset_type', 'marker_image')
      .eq('metadata->>legend_id', legendId);
    if (markerAssetsResult.error) logStorageError('select marker assets', { table: 'assets', error: markerAssetsResult.error });

    const modelAssetIds = (modelAssetsResult.data ?? []).map((asset) => asset.id).filter(Boolean);
    const pageScenesResult = pageIds.length
      ? await client.from('ar_scenes').select('*').in('page_id', pageIds)
      : { data: [], error: null };
    const assetScenesResult = modelAssetIds.length
      ? await client.from('ar_scenes').select('*').in('model_asset_id', modelAssetIds)
      : { data: [], error: null };
    if (pageScenesResult.error) logStorageError('select ar scenes by page', { table: 'ar_scenes', error: pageScenesResult.error });
    if (assetScenesResult.error) logStorageError('select ar scenes by model', { table: 'ar_scenes', error: assetScenesResult.error });

    const sceneMap = new Map();
    for (const scene of [...(pageScenesResult.data ?? []), ...(assetScenesResult.data ?? [])]) {
      if (scene?.id) sceneMap.set(String(scene.id), scene);
    }
    const sceneRows = [...sceneMap.values()];

    const sceneIds = sceneRows.map((scene) => scene.id).filter(Boolean);
    const markersResult = sceneIds.length
      ? await client.from('ar_markers').select('*').in('ar_scene_id', sceneIds)
      : { data: [], error: null };
    if (markersResult.error) logStorageError('select ar markers', { table: 'ar_markers', error: markersResult.error });

    const [media, documents, modelAssets, arScenes, linkedArMarkers, markerAssets] = await Promise.all([
      hydrateRowsWithAssets(client, mediaResult.data ?? []),
      hydrateRowsWithAssets(client, documentsResult.data ?? []),
      Promise.all((modelAssetsResult.data ?? []).map((asset) => resolveAssetForClient(client, asset))),
      hydrateRowsWithAssets(client, sceneRows),
      hydrateRowsWithAssets(client, markersResult.data ?? []),
      Promise.all((markerAssetsResult.data ?? []).map((asset) => resolveAssetForClient(client, asset))),
    ]);

    const markerMap = new Map();
    for (const marker of linkedArMarkers) {
      const markerAssetId = marker.marker_asset_id || marker.assets?.id || marker.asset?.id || marker.id;
      if (markerAssetId) markerMap.set(String(markerAssetId), marker);
    }
    for (const asset of markerAssets.filter(Boolean)) {
      if (!asset?.id || markerMap.has(String(asset.id))) continue;
      markerMap.set(String(asset.id), {
        id: `asset-${asset.id}`,
        marker_asset_id: asset.id,
        marker_code: asset.metadata?.original_name || 'Marcador visual',
        marker_type: 'image_marker',
        status: 'draft',
        ar_scene_id: null,
        assets: asset,
      });
    }

    return {
      data: {
        media,
        documents,
        modelAssets: modelAssets.filter(Boolean),
        arScenes,
        arMarkers: [...markerMap.values()],
      },
      error: null,
    };
  } catch (error) {
    logStorageError('get legend resources error', { error });
    return { data: { media: [], documents: [], modelAssets: [], arScenes: [], arMarkers: [] }, error: null };
  }
}

export async function saveLegendResource({ legendId, pageId, resource }) {
  const hasFile = Boolean(resource.file);
  const hasUrl = Boolean(resource.url?.trim());
  if (!hasFile && !hasUrl) return { data: null, error: null };

  const assetResult = hasFile
    // Route every resource file upload (cover, banner, source document, 3D model, AR
    // marker) through the backend service-role path, so the browser never writes to
    // `assets` directly (CLAUDE.md §14). cover/banner/source_document already force the
    // backend; this extends it to model_3d/marker_image without touching RLS.
    ? await uploadLegendAsset({ file: resource.file, legendId, assetType: resource.assetType, forceBackend: true })
    : await createExternalAsset({ url: resource.url, legendId, assetType: resource.assetType });

  const uploadedAsset = assetResult.data?.asset || assetResult.data;
  if (assetResult.error || !uploadedAsset?.id) return assetResult;

  if (resource.kind === 'media' && isBackendRegisteredMedia(assetResult)) {
    return assetResult;
  }

  if (resource.kind === 'media') {
    const linkResult = await linkLegendMedia({
      legendId,
      assetId: uploadedAsset.id,
      mediaType: resource.mediaType,
    });
    if (linkResult.error) return linkResult;
  }

  if (resource.kind === 'document') {
    if (isBackendRegisteredSourceDocument(assetResult)) {
      return assetResult;
    }

    const linkResult = await linkSourceDocument({
      legendId,
      assetId: uploadedAsset.id,
      documentType: getDocumentType(resource.file, resource.documentType || 'pdf'),
    });
    if (linkResult.error) return linkResult;
  }

  if (resource.kind === 'ar_model') {
    const sceneResult = await createArScene({
      legendId,
      pageId,
      modelAssetId: uploadedAsset.id,
      title: uploadedAsset.metadata?.original_name || resource.file?.name || 'Modelo 3D',
    });
    if (sceneResult.error) return sceneResult;
    return { data: { asset: uploadedAsset, scene: sceneResult.data }, error: null };
  }

  if (resource.kind === 'ar_marker') {
    return { data: { asset: uploadedAsset }, error: null };
  }

  return { data: { asset: uploadedAsset }, error: null };
}

export async function uploadSourceDocument({ legendId, file, url = '' }) {
  const extension = getExtension(file?.name || url);
  const documentType = getDocumentType(file, extension || 'docx');
  return saveLegendResource({
    legendId,
    pageId: null,
    resource: {
      key: 'sourceDocument',
      kind: 'document',
      assetType: 'source_document',
      documentType,
      accept: '.pdf,.doc,.docx',
      file,
      url,
    },
  });
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

// Lightweight source-document read: a single query on legend_source_documents plus one
// batched assets lookup, instead of the full legend resource graph (media + model/marker
// assets + AR scenes + markers). Used to verify/hydrate a freshly uploaded source
// document without the latency spike (tiron) of getLegendResources.
export async function getLegendSourceDocumentsLight(legendId) {
  if (isInvalidId(legendId)) return { data: [], error: null };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  try {
    const { data: rows, error } = await client
      .from('legend_source_documents')
      .select('*')
      .eq('legend_id', legendId)
      .order('created_at', { ascending: false });

    if (error) {
      logStorageError('select source documents (light)', { table: 'legend_source_documents', error });
      return { data: [], error };
    }

    const documents = rows ?? [];
    const assetIds = [...new Set(documents.map((row) => row.asset_id).filter(Boolean))];
    let assetsById = new Map();

    if (assetIds.length) {
      const { data: assets, error: assetsError } = await client.from('assets').select('*').in('id', assetIds);
      if (assetsError) {
        logStorageError('select source document assets (light)', { table: 'assets', error: assetsError });
      } else {
        assetsById = new Map((assets ?? []).map((asset) => [String(asset.id), asset]));
      }
    }

    const hydrated = await Promise.all(documents.map(async (row) => ({
      ...row,
      assets: row.asset_id ? await resolveAssetForClient(client, assetsById.get(String(row.asset_id)) || null) : null,
    })));

    return { data: hydrated, error: null };
  } catch (error) {
    logStorageError('get source documents light error', { error });
    return { data: [], error: null };
  }
}
