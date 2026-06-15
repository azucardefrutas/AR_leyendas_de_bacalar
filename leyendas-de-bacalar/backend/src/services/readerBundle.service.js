import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { createSignedReadUrls, getPublicUrlForAsset, normalizeStoragePath } from './storage.service.js';

class ReaderBundleError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'ReaderBundleError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const DOCUMENTS_BUCKET = 'legend-documents';
const ASSETS_BUCKET = 'legend-assets';
const SIGNED_URL_TTL_SECONDS = 3600;
const RENDER_PAGE_SELECT = [
  'id',
  'source_document_id',
  'legend_id',
  'version_id',
  'page_number',
  'image_asset_id',
  'thumbnail_asset_id',
  'width',
  'height',
  'render_format',
  'render_scale',
  'status',
  'error_message',
  'metadata',
  'created_at',
  'updated_at',
].join(', ');

const hasRole = (roles, role) => Array.isArray(roles) && roles.includes(role);

const getDatabaseErrorDetails = (table, error) => ({
  table,
  code: error?.code,
  reason: error?.message,
  details: error?.details,
  hint: error?.hint,
});

const loadLegend = async (legendId) => {
  const { data, error } = await supabaseAdmin
    .from('legends')
    .select('*')
    .eq('id', legendId)
    .maybeSingle();

  if (error) throw new ReaderBundleError('Could not load legend.', 500, getDatabaseErrorDetails('legends', error));
  if (!data) throw new ReaderBundleError('Legend not found.', 404);

  return data;
};

const userHasActiveAccess = async (userId, legendId) => {
  if (!userId) return false;

  const { data, error } = await supabaseAdmin.rpc('user_has_active_legend_access', {
    p_user_id: userId,
    p_legend_id: legendId,
  });

  if (error) throw new ReaderBundleError('Could not validate legend access.', 500, { reason: error.message });
  return Boolean(data);
};

const assertCanReadLegend = async ({ legend, userId, roles }) => {
  const isAdmin = hasRole(roles, 'admin') || hasRole(roles, 'super_admin');
  const isCreator = userId && String(legend.creator_id) === String(userId);

  if (isAdmin || isCreator) {
    return { includeUnpublished: true };
  }

  if (legend.status !== 'published') {
    throw new ReaderBundleError('Legend is not available.', 403);
  }

  if (legend.access_type === 'free') {
    return { includeUnpublished: false };
  }

  const hasAccess = await userHasActiveAccess(userId, legend.id);

  if (!hasAccess) {
    throw new ReaderBundleError('You do not have access to this legend.', 403);
  }

  return { includeUnpublished: false };
};

const loadAuthor = async (legend) => {
  const { data, error } = await supabaseAdmin
    .from('creator_profiles')
    .select('id, user_id, pen_name')
    .eq('user_id', legend.creator_id)
    .maybeSingle();

  if (error) return null;
  return data;
};

const loadGenres = async (legendId) => {
  const { data, error } = await supabaseAdmin
    .from('legend_genres')
    .select('legend_id, genres(id, name, slug)')
    .eq('legend_id', legendId);

  if (error) return [];

  return (data ?? [])
    .map((row) => row.genres)
    .filter((genre) => genre?.id || genre?.name)
    .map((genre) => ({
      id: genre.id,
      name: genre.name,
      slug: genre.slug ?? null,
    }));
};

const resolveAssetUrl = (asset) => {
  if (!asset) return null;

  const bucket = asset.metadata?.bucket || (asset.storage_path ? ASSETS_BUCKET : null);
  const publicUrl = bucket === ASSETS_BUCKET && asset.storage_path
    ? getPublicUrlForAsset({ bucket, path: asset.storage_path })
    : null;

  return asset.file_url || publicUrl || asset.external_url || null;
};

const serializeAsset = (asset) => {
  if (!asset) return null;

  return {
    id: asset.id,
    assetType: asset.asset_type,
    sourceType: asset.source_type,
    mimeType: asset.mime_type,
    fileSize: asset.file_size,
    storagePath: asset.storage_path,
    metadata: asset.metadata ?? {},
    url: resolveAssetUrl(asset),
  };
};

const loadMedia = async (legendId) => {
  const { data, error } = await supabaseAdmin
    .from('legend_media')
    .select('id, legend_id, asset_id, media_type, usage_context, is_primary, assets(*)')
    .eq('legend_id', legendId);

  if (error) throw new ReaderBundleError('Could not load legend media.', 500, getDatabaseErrorDetails('legend_media', error));

  const rows = data ?? [];
  const findMedia = (mediaType, usageContext) =>
    rows.find((row) => row.media_type === mediaType && row.usage_context === usageContext)
    || rows.find((row) => row.media_type === mediaType)
    || null;

  return {
    cover: serializeAsset(findMedia('cover', 'catalog')?.assets ?? null),
    banner: serializeAsset(findMedia('banner', 'detail')?.assets ?? null),
    all: rows.map((row) => ({
      id: row.id,
      mediaType: row.media_type,
      usageContext: row.usage_context,
      isPrimary: row.is_primary,
      asset: serializeAsset(row.assets),
    })),
  };
};

const loadPrimarySourceDocument = async (legendId) => {
  const { data, error } = await supabaseAdmin
    .from('legend_source_documents')
    .select([
      'id',
      'legend_id',
      'version_id',
      'asset_id',
      'document_type',
      'extraction_status',
      'is_primary_source',
      'page_count',
      'render_status',
      'rendered_page_count',
      'rendered_at',
      'render_error',
      'created_at',
    ].join(', '))
    .eq('legend_id', legendId)
    .order('is_primary_source', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new ReaderBundleError('Could not load source document.', 500, getDatabaseErrorDetails('legend_source_documents', error));
  if (!data) return null;

  const assetsById = await loadAssetsByIds([data.asset_id]);

  return {
    id: data.id,
    legendId: data.legend_id,
    versionId: data.version_id,
    assetId: data.asset_id,
    documentType: data.document_type,
    extractionStatus: data.extraction_status,
    isPrimarySource: data.is_primary_source,
    pageCount: data.page_count ?? null,
    renderStatus: data.render_status ?? 'not_rendered',
    renderedPageCount: data.rendered_page_count ?? null,
    renderedAt: data.rendered_at ?? null,
    renderError: data.render_error ?? null,
    createdAt: data.created_at,
    asset: assetsById.get(String(data.asset_id)) ?? null,
  };
};

const loadRenderedPages = async (sourceDocumentId) => {
  if (!sourceDocumentId) return [];

  const { data, error } = await supabaseAdmin
    .from('document_render_pages')
    .select(RENDER_PAGE_SELECT)
    .eq('source_document_id', sourceDocumentId)
    .eq('status', 'ready')
    .order('page_number', { ascending: true });

  if (error) throw new ReaderBundleError('Could not load rendered document pages.', 500, getDatabaseErrorDetails('document_render_pages', error));
  return data ?? [];
};

const loadAssetsByIds = async (assetIds) => {
  const ids = [...new Set((assetIds ?? []).filter(Boolean).map(String))];
  if (!ids.length) return new Map();

  const { data, error } = await supabaseAdmin
    .from('assets')
    .select('*')
    .in('id', ids);

  if (error) throw new ReaderBundleError('Could not load assets.', 500, getDatabaseErrorDetails('assets', error));
  return new Map((data ?? []).map((asset) => [String(asset.id), asset]));
};

const serializeRenderedPages = async (pages) => {
  const assetIds = pages.flatMap((page) => [page.image_asset_id, page.thumbnail_asset_id]).filter(Boolean);
  const assetsById = await loadAssetsByIds(assetIds);
  const documentAssetPaths = [...assetsById.values()]
    .filter((asset) => (asset.metadata?.bucket || DOCUMENTS_BUCKET) === DOCUMENTS_BUCKET)
    .map((asset) => normalizeStoragePath({ bucket: DOCUMENTS_BUCKET, path: asset.storage_path }))
    .filter(Boolean);
  const signedUrlsByPath = await createSignedReadUrls({
    bucket: DOCUMENTS_BUCKET,
    paths: documentAssetPaths,
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });

  return pages.map((page) => {
    const imageAsset = page.image_asset_id ? assetsById.get(String(page.image_asset_id)) : null;
    const thumbnailAsset = page.thumbnail_asset_id ? assetsById.get(String(page.thumbnail_asset_id)) : null;
    const imagePath = imageAsset?.storage_path
      ? normalizeStoragePath({ bucket: DOCUMENTS_BUCKET, path: imageAsset.storage_path })
      : null;
    const thumbnailPath = thumbnailAsset?.storage_path
      ? normalizeStoragePath({ bucket: DOCUMENTS_BUCKET, path: thumbnailAsset.storage_path })
      : null;

    return {
      id: page.id,
      pageNumber: page.page_number,
      width: page.width,
      height: page.height,
      renderFormat: page.render_format,
      imageAssetId: page.image_asset_id,
      thumbnailAssetId: page.thumbnail_asset_id,
      imageUrl: imagePath ? signedUrlsByPath.get(imagePath) ?? null : null,
      thumbnailUrl: thumbnailPath ? signedUrlsByPath.get(thumbnailPath) ?? null : null,
      storagePath: imagePath,
    };
  });
};

const loadLegendPages = async ({ legendId, includeUnpublished }) => {
  const allowedStatuses = includeUnpublished ? ['draft', 'published', 'approved'] : ['published', 'approved'];
  const { data: versions, error: versionError } = await supabaseAdmin
    .from('legend_versions')
    .select('id, legend_id, version_number, status')
    .eq('legend_id', legendId)
    .in('status', allowedStatuses)
    .order('version_number', { ascending: false })
    .limit(1);

  if (versionError) throw new ReaderBundleError('Could not load legend version.', 500, getDatabaseErrorDetails('legend_versions', versionError));

  const version = versions?.[0] ?? null;
  if (!version) return { version: null, pages: [] };

  const { data, error } = await supabaseAdmin
    .from('legend_pages')
    .select('id, version_id, page_number, title, text_content, background_asset_id, created_at, updated_at')
    .eq('version_id', version.id)
    .order('page_number', { ascending: true });

  if (error) throw new ReaderBundleError('Could not load legend pages.', 500, getDatabaseErrorDetails('legend_pages', error));

  return {
    version,
    pages: data ?? [],
  };
};

const loadHotspots = async ({ legendId, includeUnpublished }) => {
  let query = supabaseAdmin
    .from('interactive_hotspots')
    .select([
      'id',
      'legend_id',
      'version_id',
      'target_type',
      'source_document_id',
      'source_page_number',
      'page_id',
      'marker_asset_id',
      'ar_scene_id',
      'hotspot_type',
      'label',
      'description',
      'x',
      'y',
      'width',
      'height',
      'status',
      'metadata',
      'created_at',
    ].join(', '))
    .eq('legend_id', legendId);

  if (!includeUnpublished) query = query.eq('status', 'published');

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) throw new ReaderBundleError('Could not load hotspots.', 500, getDatabaseErrorDetails('interactive_hotspots', error));
  return data ?? [];
};

const loadScenes = async (sceneIds) => {
  const ids = [...new Set((sceneIds ?? []).filter(Boolean).map(String))];
  if (!ids.length) return [];

  const { data, error } = await supabaseAdmin
    .from('ar_scenes')
    .select('id, page_id, name, description, status, model_asset_id, interaction_config, created_by, created_at')
    .in('id', ids);

  if (error) throw new ReaderBundleError('Could not load AR scenes.', 500, getDatabaseErrorDetails('ar_scenes', error));
  return data ?? [];
};

const serializeHotspot = (hotspot) => ({
  id: hotspot.id,
  legendId: hotspot.legend_id,
  versionId: hotspot.version_id,
  targetType: hotspot.target_type,
  sourceDocumentId: hotspot.source_document_id,
  sourcePageNumber: hotspot.source_page_number,
  pageId: hotspot.page_id,
  markerAssetId: hotspot.marker_asset_id,
  arSceneId: hotspot.ar_scene_id,
  hotspotType: hotspot.hotspot_type,
  label: hotspot.label,
  description: hotspot.description,
  x: Number(hotspot.x),
  y: Number(hotspot.y),
  width: hotspot.width === null ? null : Number(hotspot.width),
  height: hotspot.height === null ? null : Number(hotspot.height),
  status: hotspot.status,
  metadata: hotspot.metadata ?? {},
});

export const getReaderBundle = async ({ legendId, userId = null, roles = [] }) => {
  if (!legendId) throw new ReaderBundleError('Legend id is required.', 400);

  const legend = await loadLegend(legendId);
  const { includeUnpublished } = await assertCanReadLegend({ legend, userId, roles });
  const [author, genres, media, sourceDocument, hotspots] = await Promise.all([
    loadAuthor(legend),
    loadGenres(legend.id),
    loadMedia(legend.id),
    loadPrimarySourceDocument(legend.id),
    loadHotspots({ legendId: legend.id, includeUnpublished }),
  ]);

  const renderedRows = await loadRenderedPages(sourceDocument?.id);
  const renderedPages = await serializeRenderedPages(renderedRows);
  const manualPagesResult = renderedPages.length
    ? { version: null, pages: [] }
    : await loadLegendPages({ legendId: legend.id, includeUnpublished });
  const sceneIds = hotspots.map((hotspot) => hotspot.ar_scene_id).filter(Boolean);
  const scenes = await loadScenes(sceneIds);
  const markerAssetIds = hotspots.map((hotspot) => hotspot.marker_asset_id).filter(Boolean);
  const modelAssetIds = scenes.map((scene) => scene.model_asset_id).filter(Boolean);
  const linkedAssetsById = await loadAssetsByIds([...markerAssetIds, ...modelAssetIds]);

  return {
    legend: {
      id: legend.id,
      title: legend.title,
      slug: legend.slug,
      status: legend.status,
      accessType: legend.access_type,
      synopsis: legend.synopsis ?? legend.description ?? legend.short_synopsis ?? null,
      creatorId: legend.creator_id,
      createdAt: legend.created_at,
    },
    author: author
      ? {
          id: author.id,
          userId: author.user_id,
          penName: author.pen_name,
        }
      : null,
    genres,
    cover: media.cover,
    banner: media.banner,
    media: media.all,
    sourceDocument: sourceDocument
      ? {
          id: sourceDocument.id,
          legendId: sourceDocument.legendId,
          versionId: sourceDocument.versionId,
          documentType: sourceDocument.documentType,
          extractionStatus: sourceDocument.extractionStatus,
          pageCount: sourceDocument.pageCount,
          renderStatus: sourceDocument.renderStatus,
          renderedPageCount: sourceDocument.renderedPageCount,
          renderedAt: sourceDocument.renderedAt,
          renderError: sourceDocument.renderError,
          asset: serializeAsset(sourceDocument.asset),
        }
      : null,
    renderedPages,
    legendPages: manualPagesResult.pages.map((page) => ({
      id: page.id,
      versionId: page.version_id,
      pageNumber: page.page_number,
      title: page.title,
      textContent: page.text_content,
      backgroundAssetId: page.background_asset_id,
    })),
    legendVersion: manualPagesResult.version
      ? {
          id: manualPagesResult.version.id,
          versionNumber: manualPagesResult.version.version_number,
          status: manualPagesResult.version.status,
        }
      : null,
    hotspots: hotspots.map(serializeHotspot),
    arScenes: scenes.map((scene) => ({
      id: scene.id,
      pageId: scene.page_id,
      name: scene.name,
      description: scene.description,
      status: scene.status,
      modelAssetId: scene.model_asset_id,
      interactionConfig: scene.interaction_config || {},
    })),
    modelAssets: modelAssetIds
      .map((assetId) => serializeAsset(linkedAssetsById.get(String(assetId))))
      .filter(Boolean),
    markerAssets: markerAssetIds
      .map((assetId) => serializeAsset(linkedAssetsById.get(String(assetId))))
      .filter(Boolean),
    source: renderedPages.length ? 'rendered_pdf_pages' : 'legend_pages',
  };
};
