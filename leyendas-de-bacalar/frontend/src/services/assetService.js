import { getCurrentUser } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

export const STORAGE_BUCKETS = {
  assets: import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'legend-assets',
  documents: import.meta.env.VITE_SUPABASE_DOCUMENT_BUCKET || 'legend-documents',
};

const FILE_RULES_BY_TYPE = {
  cover: {
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    bucket: STORAGE_BUCKETS.assets,
    folder: 'cover',
    dbAssetType: 'cover',
  },
  banner: {
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
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
      '',
    ],
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
      '',
    ],
    bucket: STORAGE_BUCKETS.documents,
    folder: 'documents',
    dbAssetType: null,
  },
  model_3d: {
    extensions: ['glb', 'gltf'],
    mimeTypes: ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream', ''],
    bucket: STORAGE_BUCKETS.assets,
    folder: 'models',
    dbAssetType: 'model_3d',
  },
  marker_image: {
    extensions: ['png', 'jpg', 'jpeg', 'webp'],
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
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
  return null;
}

function getFileContentType(file, assetType) {
  const extension = getExtension(file?.name);
  return file?.type || MIME_TYPE_BY_EXTENSION[extension] || MIME_TYPE_BY_EXTENSION[assetType] || 'application/octet-stream';
}

function getStorageBucket(assetType) {
  return FILE_RULES_BY_TYPE[assetType]?.bucket || STORAGE_BUCKETS.assets;
}

function getStorageFolder(assetType) {
  return FILE_RULES_BY_TYPE[assetType]?.folder || assetType || 'asset';
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

export async function uploadProjectAsset({ file, legendId, kind, userId: providedUserId = null }) {
  if (isInvalidId(legendId)) return { data: null, error: friendlyAssetError('Guarda la leyenda antes de subir recursos.') };
  const assetType = kind || 'other';
  const validationError = validateFile(file, assetType);
  if (validationError) return { data: null, error: validationError };

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

export async function uploadLegendAsset({ file, legendId, assetType }) {
  return uploadProjectAsset({ file, legendId, kind: assetType });
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

  const payload = {
    legend_id: legendId,
    asset_id: assetId,
    media_type: mediaType,
    usage_context: mediaType === 'cover' ? 'catalog' : 'detail',
    is_primary: mediaType === 'cover',
  };
  const { data, error } = await client.from('legend_media').insert(payload).select().single();
  if (error) {
    logStorageError('insert legend media relation', {
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
    extraction_status: 'not_required',
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

export async function createArScene({ legendId, pageId = null, modelAssetId, title = 'Escena AR' }) {
  if (isInvalidId(modelAssetId)) return { data: null, error: friendlyAssetError('No pudimos preparar la escena AR.') };
  if (isInvalidId(pageId)) return { data: null, error: friendlyAssetError('Guarda una pagina antes de vincular el modelo 3D a una escena AR.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: userId } = await getCurrentUserId();
  const payload = {
    page_id: pageId,
    name: title || 'Escena AR',
    description: legendId ? `Escena AR vinculada a leyenda ${legendId}` : null,
    model_asset_id: modelAssetId,
    status: 'draft',
    created_by: userId || null,
  };
  const { data, error } = await client.from('ar_scenes').insert(payload).select().single();
  if (error) {
    logStorageError('insert ar scene relation', {
      table: 'ar_scenes',
      payload,
      error,
    });
    return { data: null, error: friendlyAssetError('No pudimos preparar la escena AR.', { supabaseError: error, table: 'ar_scenes' }) };
  }
  return { data, error: null };
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
  if (isInvalidId(legendId)) return { data: { media: [], documents: [], arScenes: [], arMarkers: [] }, error: null };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: { media: [], documents: [], arScenes: [], arMarkers: [] }, error: clientError };

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
    const scenesResult = pageIds.length
      ? await client.from('ar_scenes').select('*').in('page_id', pageIds)
      : { data: [], error: null };
    if (scenesResult.error) logStorageError('select ar scenes', { table: 'ar_scenes', error: scenesResult.error });

    const sceneIds = (scenesResult.data ?? []).map((scene) => scene.id).filter(Boolean);
    const markersResult = sceneIds.length
      ? await client.from('ar_markers').select('*').in('ar_scene_id', sceneIds)
      : { data: [], error: null };
    if (markersResult.error) logStorageError('select ar markers', { table: 'ar_markers', error: markersResult.error });

    const [media, documents, arScenes, arMarkers] = await Promise.all([
      hydrateRowsWithAssets(client, mediaResult.data ?? []),
      hydrateRowsWithAssets(client, documentsResult.data ?? []),
      hydrateRowsWithAssets(client, scenesResult.data ?? []),
      hydrateRowsWithAssets(client, markersResult.data ?? []),
    ]);

    return {
      data: {
        media,
        documents,
        arScenes,
        arMarkers,
      },
      error: null,
    };
  } catch (error) {
    logStorageError('get legend resources error', { error });
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
      documentType: getDocumentType(resource.file, resource.documentType || 'pdf'),
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
