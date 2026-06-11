import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { getLegendAccessContext } from './legendAccess.service.js';

class HotspotError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'HotspotError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const HOTSPOT_COLUMNS =
  'id, legend_id, version_id, target_type, source_document_id, source_page_number, page_id, ' +
  'hotspot_type, marker_asset_id, ar_scene_id, label, description, x, y, width, height, ' +
  'metadata, status, created_by, created_at, updated_at';

const TARGET_TYPES = new Set(['source_document', 'legend_page']);
const HOTSPOT_TYPES = new Set(['marker', 'model', 'info', 'ar_scene']);
const ALL_STATUSES = new Set(['draft', 'in_review', 'published', 'archived']);
const CREATOR_STATUSES = new Set(['draft', 'in_review', 'archived']);

const isAdmin = (roles) => Array.isArray(roles) && roles.includes('admin');

const clamp01 = (value, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(1, Math.max(0, number));
};

const clampDimension = (value) => {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(1, Math.max(0.0001, number));
};

const normalizeStatus = (status, roles) => {
  const value = String(status);
  if (!ALL_STATUSES.has(value)) {
    throw new HotspotError('Invalid status.', 400);
  }
  if (!isAdmin(roles) && !CREATOR_STATUSES.has(value)) {
    throw new HotspotError('Creators cannot set this status.', 403);
  }
  return value;
};

const assertSourceDocumentInLegend = async (legendId, sourceDocumentId) => {
  const { data, error } = await supabaseAdmin
    .from('legend_source_documents')
    .select('id')
    .eq('id', sourceDocumentId)
    .eq('legend_id', legendId)
    .maybeSingle();
  if (error) throw new HotspotError('Could not validate source document.', 500, { reason: error.message });
  if (!data) throw new HotspotError('Source document does not belong to this legend.', 400);
};

const assertPageInLegend = async (legendId, pageId) => {
  const { data: page, error } = await supabaseAdmin
    .from('legend_pages')
    .select('id, version_id')
    .eq('id', pageId)
    .maybeSingle();
  if (error) throw new HotspotError('Could not validate page.', 500, { reason: error.message });
  if (!page) throw new HotspotError('Page not found.', 400);

  const { data: version, error: versionError } = await supabaseAdmin
    .from('legend_versions')
    .select('id, legend_id')
    .eq('id', page.version_id)
    .maybeSingle();
  if (versionError) throw new HotspotError('Could not validate page version.', 500, { reason: versionError.message });
  if (!version || String(version.legend_id) !== String(legendId)) {
    throw new HotspotError('Page does not belong to this legend.', 400);
  }
};

const assertSceneInLegend = async (legendId, sceneId) => {
  const { data: scene, error } = await supabaseAdmin
    .from('ar_scenes')
    .select('id, page_id')
    .eq('id', sceneId)
    .maybeSingle();
  if (error) throw new HotspotError('Could not validate AR scene.', 500, { reason: error.message });
  if (!scene || !scene.page_id) throw new HotspotError('AR scene does not belong to this legend.', 400);
  await assertPageInLegend(legendId, scene.page_id);
};

const assertAssetInLegend = async (legendId, assetId) => {
  const { data: asset, error } = await supabaseAdmin
    .from('assets')
    .select('id, metadata')
    .eq('id', assetId)
    .maybeSingle();
  if (error) throw new HotspotError('Could not validate asset.', 500, { reason: error.message });
  if (!asset) throw new HotspotError('Asset not found.', 400);
  const assetLegendId = asset.metadata?.legend_id;
  if (assetLegendId && String(assetLegendId) !== String(legendId)) {
    throw new HotspotError('Asset does not belong to this legend.', 400);
  }
};

const buildHotspotInput = async ({ legendId, payload = {}, roles, requireTarget }) => {
  const input = {};

  if (requireTarget || payload.target_type !== undefined) {
    const targetType = payload.target_type;
    if (!TARGET_TYPES.has(targetType)) {
      throw new HotspotError('Invalid target_type.', 400);
    }
    input.target_type = targetType;

    if (targetType === 'source_document') {
      const pageNumber = Number(payload.source_page_number);
      if (!payload.source_document_id || !Number.isInteger(pageNumber) || pageNumber < 1) {
        throw new HotspotError('source_document_id and source_page_number are required.', 400);
      }
      await assertSourceDocumentInLegend(legendId, payload.source_document_id);
      input.source_document_id = payload.source_document_id;
      input.source_page_number = pageNumber;
      input.page_id = null;
    } else {
      if (!payload.page_id) {
        throw new HotspotError('page_id is required.', 400);
      }
      await assertPageInLegend(legendId, payload.page_id);
      input.page_id = payload.page_id;
      input.source_document_id = null;
      input.source_page_number = null;
    }
  }

  if (payload.hotspot_type !== undefined) {
    if (!HOTSPOT_TYPES.has(payload.hotspot_type)) {
      throw new HotspotError('Invalid hotspot_type.', 400);
    }
    input.hotspot_type = payload.hotspot_type;
  }

  if (payload.marker_asset_id !== undefined) {
    if (payload.marker_asset_id === null) {
      input.marker_asset_id = null;
    } else {
      await assertAssetInLegend(legendId, payload.marker_asset_id);
      input.marker_asset_id = payload.marker_asset_id;
    }
  }

  if (payload.ar_scene_id !== undefined) {
    if (payload.ar_scene_id === null) {
      input.ar_scene_id = null;
    } else {
      await assertSceneInLegend(legendId, payload.ar_scene_id);
      input.ar_scene_id = payload.ar_scene_id;
    }
  }

  if (payload.version_id !== undefined) input.version_id = payload.version_id || null;
  if (payload.label !== undefined) input.label = payload.label === null ? null : String(payload.label).slice(0, 200);
  if (payload.description !== undefined) input.description = payload.description === null ? null : String(payload.description);
  if (payload.metadata !== undefined && payload.metadata && typeof payload.metadata === 'object') {
    input.metadata = payload.metadata;
  }

  if (payload.x !== undefined) input.x = clamp01(payload.x, 0.85);
  if (payload.y !== undefined) input.y = clamp01(payload.y, 0.15);
  if (payload.width !== undefined) input.width = clampDimension(payload.width);
  if (payload.height !== undefined) input.height = clampDimension(payload.height);

  if (payload.status !== undefined) {
    input.status = normalizeStatus(payload.status, roles);
  }

  return input;
};

const loadHotspot = async (hotspotId) => {
  if (!hotspotId) throw new HotspotError('Hotspot id is required.', 400);
  const { data, error } = await supabaseAdmin
    .from('interactive_hotspots')
    .select(HOTSPOT_COLUMNS)
    .eq('id', hotspotId)
    .maybeSingle();
  if (error) throw new HotspotError('Could not load hotspot.', 500, { reason: error.message });
  if (!data) throw new HotspotError('Hotspot not found.', 404);
  return data;
};

export const listHotspots = async ({ legendId, userId, roles, query = {} }) => {
  await getLegendAccessContext({ legendId, userId, roles });

  let request = supabaseAdmin
    .from('interactive_hotspots')
    .select(HOTSPOT_COLUMNS)
    .eq('legend_id', legendId);

  if (query.targetType) request = request.eq('target_type', query.targetType);
  if (query.sourceDocumentId) request = request.eq('source_document_id', query.sourceDocumentId);
  if (query.sourcePageNumber) request = request.eq('source_page_number', Number(query.sourcePageNumber));
  if (query.pageId) request = request.eq('page_id', query.pageId);

  const { data, error } = await request.order('created_at', { ascending: true });
  if (error) throw new HotspotError('Could not list hotspots.', 500, { reason: error.message });
  return data ?? [];
};

export const createHotspot = async ({ legendId, userId, roles, payload }) => {
  await getLegendAccessContext({ legendId, userId, roles });

  const input = await buildHotspotInput({ legendId, payload, roles, requireTarget: true });
  const record = {
    hotspot_type: 'marker',
    x: 0.85,
    y: 0.15,
    ...input,
    legend_id: legendId,
    created_by: userId,
    status: input.status ?? 'draft',
  };

  const { data, error } = await supabaseAdmin
    .from('interactive_hotspots')
    .insert(record)
    .select(HOTSPOT_COLUMNS)
    .single();
  if (error || !data) throw new HotspotError('Could not create hotspot.', 500, { reason: error?.message });
  return data;
};

export const updateHotspot = async ({ legendId, hotspotId, userId, roles, payload }) => {
  const existing = await loadHotspot(hotspotId);
  if (legendId && String(existing.legend_id) !== String(legendId)) {
    throw new HotspotError('Hotspot does not belong to this legend.', 404);
  }
  await getLegendAccessContext({ legendId: existing.legend_id, userId, roles });

  const patch = await buildHotspotInput({ legendId: existing.legend_id, payload, roles, requireTarget: false });
  if (Object.keys(patch).length === 0) return existing;

  const { data, error } = await supabaseAdmin
    .from('interactive_hotspots')
    .update(patch)
    .eq('id', hotspotId)
    .select(HOTSPOT_COLUMNS)
    .single();
  if (error || !data) throw new HotspotError('Could not update hotspot.', 500, { reason: error?.message });
  return data;
};

export const deleteHotspot = async ({ legendId, hotspotId, userId, roles }) => {
  const existing = await loadHotspot(hotspotId);
  if (legendId && String(existing.legend_id) !== String(legendId)) {
    throw new HotspotError('Hotspot does not belong to this legend.', 404);
  }
  await getLegendAccessContext({ legendId: existing.legend_id, userId, roles });

  const { error } = await supabaseAdmin
    .from('interactive_hotspots')
    .delete()
    .eq('id', hotspotId);
  if (error) throw new HotspotError('Could not delete hotspot.', 500, { reason: error.message });
  return { id: hotspotId };
};
