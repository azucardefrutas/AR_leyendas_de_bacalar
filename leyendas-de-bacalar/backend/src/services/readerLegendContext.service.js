import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { createSignedReadUrl, getPublicUrlForAsset, normalizeStoragePath } from './storage.service.js';

class ReaderContextError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'ReaderContextError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const SIGNED_URL_TTL_SECONDS = 3600;
const DOCUMENTS_BUCKET = 'legend-documents';

const hasRole = (roles, role) => Array.isArray(roles) && roles.includes(role);

const loadLegend = async (legendId) => {
  const { data, error } = await supabaseAdmin
    .from('legends')
    .select('id, title, slug, status, access_type, creator_id')
    .eq('id', legendId)
    .maybeSingle();

  if (error) throw new ReaderContextError('Could not load legend.', 500, { reason: error.message });
  if (!data) throw new ReaderContextError('Legend not found.', 404);
  return data;
};

const userHasActiveAccess = async (userId, legendId) => {
  const { data, error } = await supabaseAdmin.rpc('user_has_active_legend_access', {
    p_user_id: userId,
    p_legend_id: legendId,
  });
  if (error) throw new ReaderContextError('Could not validate legend access.', 500, { reason: error.message });
  return Boolean(data);
};

const loadPrimarySourceDocument = async (legendId) => {
  const { data, error } = await supabaseAdmin
    .from('legend_source_documents')
    .select('id, legend_id, asset_id, document_type, extraction_status, is_primary_source, page_count')
    .eq('legend_id', legendId)
    .order('is_primary_source', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new ReaderContextError('Could not load source document.', 500, { reason: error.message });
  if (!data) return null;

  const { data: asset, error: assetError } = await supabaseAdmin
    .from('assets')
    .select('id, asset_type, mime_type, file_size, storage_path, metadata')
    .eq('id', data.asset_id)
    .maybeSingle();

  if (assetError || !asset) return null;
  return { ...data, asset };
};

const buildDocumentView = async (sourceDocument) => {
  if (!sourceDocument) return null;

  const asset = sourceDocument.asset;
  const bucket = asset.metadata?.bucket || DOCUMENTS_BUCKET;
  if (bucket !== DOCUMENTS_BUCKET) return null;

  const path = normalizeStoragePath({ bucket, path: asset.storage_path });
  if (!path) return null;

  try {
    const { signedUrl } = await createSignedReadUrl({ bucket, path, expiresIn: SIGNED_URL_TTL_SECONDS });
    return {
      sourceDocumentId: sourceDocument.id,
      documentType: sourceDocument.document_type,
      extractionStatus: sourceDocument.extraction_status,
      pageCount: sourceDocument.page_count ?? null,
      mimeType: asset.mime_type,
      fileSize: asset.file_size,
      signedUrl,
      expiresIn: SIGNED_URL_TTL_SECONDS,
    };
  } catch {
    // Best-effort: a missing/broken file must not break the reading context.
    return null;
  }
};

const loadVisibleHotspots = async ({ legendId, sourceDocumentId, includeUnpublished }) => {
  if (!sourceDocumentId) return [];

  let request = supabaseAdmin
    .from('interactive_hotspots')
    .select('id, source_page_number, hotspot_type, label, description, x, y, width, height, status, ar_scene_id')
    .eq('legend_id', legendId)
    .eq('target_type', 'source_document')
    .eq('source_document_id', sourceDocumentId);

  if (!includeUnpublished) request = request.eq('status', 'published');

  const { data, error } = await request.order('created_at', { ascending: true });
  if (error) throw new ReaderContextError('Could not load hotspots.', 500, { reason: error.message });
  return data ?? [];
};

const loadScenesForHotspots = async (hotspots) => {
  const sceneIds = [...new Set(hotspots.map((hotspot) => hotspot.ar_scene_id).filter(Boolean))];
  if (!sceneIds.length) return new Map();

  const { data: scenes, error } = await supabaseAdmin
    .from('ar_scenes')
    .select('id, name, description, status, model_asset_id')
    .in('id', sceneIds);
  if (error || !scenes?.length) return new Map();

  const modelAssetIds = [...new Set(scenes.map((scene) => scene.model_asset_id).filter(Boolean))];
  const { data: assets } = modelAssetIds.length
    ? await supabaseAdmin
        .from('assets')
        .select('id, asset_type, mime_type, file_size, file_url, external_url, storage_path, metadata')
        .in('id', modelAssetIds)
    : { data: [] };

  const assetsById = new Map((assets ?? []).map((asset) => [String(asset.id), asset]));

  return new Map(scenes.map((scene) => {
    const asset = assetsById.get(String(scene.model_asset_id)) || null;
    const bucket = asset?.metadata?.bucket || 'legend-assets';
    const publicUrl = asset?.storage_path ? getPublicUrlForAsset({ bucket, path: asset.storage_path }) : null;
    const modelUrl = asset?.file_url || publicUrl || asset?.external_url || null;

    return [String(scene.id), {
      id: scene.id,
      name: scene.name,
      description: scene.description,
      status: scene.status,
      model: asset
        ? {
            name: asset.metadata?.original_name || null,
            assetType: asset.asset_type,
            mimeType: asset.mime_type,
            fileSize: asset.file_size,
            url: modelUrl,
          }
        : null,
    }];
  }));
};

export const getReaderLegendReadingContext = async ({ legendId, userId, roles }) => {
  if (!legendId) throw new ReaderContextError('Legend id is required.', 400);
  if (!userId) throw new ReaderContextError('Unauthorized.', 401);

  const legend = await loadLegend(legendId);
  const isAdmin = hasRole(roles, 'admin') || hasRole(roles, 'super_admin');
  const isCreator = String(legend.creator_id) === String(userId);

  if (!isAdmin && !isCreator) {
    if (legend.status !== 'published') {
      throw new ReaderContextError('Legend is not available.', 403);
    }
    if (legend.access_type !== 'free') {
      const hasAccess = await userHasActiveAccess(userId, legendId);
      if (!hasAccess) {
        throw new ReaderContextError('You do not have access to this legend.', 403);
      }
    }
  }

  const sourceDocument = await loadPrimarySourceDocument(legendId);
  const document = await buildDocumentView(sourceDocument);
  const hotspots = await loadVisibleHotspots({
    legendId,
    sourceDocumentId: sourceDocument?.id ?? null,
    includeUnpublished: isAdmin || isCreator,
  });
  const scenesById = await loadScenesForHotspots(hotspots);

  return {
    legend: {
      id: legend.id,
      title: legend.title,
      slug: legend.slug,
      status: legend.status,
      accessType: legend.access_type,
    },
    document,
    hotspots: hotspots.map((hotspot) => ({
      id: hotspot.id,
      sourcePageNumber: hotspot.source_page_number,
      hotspotType: hotspot.hotspot_type,
      label: hotspot.label,
      description: hotspot.description,
      x: Number(hotspot.x),
      y: Number(hotspot.y),
      width: hotspot.width === null ? null : Number(hotspot.width),
      height: hotspot.height === null ? null : Number(hotspot.height),
      status: hotspot.status,
      scene: hotspot.ar_scene_id ? scenesById.get(String(hotspot.ar_scene_id)) ?? null : null,
    })),
  };
};
