import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { purgeOrphanAssets } from './assetCleanup.service.js';
import { getLegendAccessContext } from './legendAccess.service.js';
import { getPublicUrlForAsset } from './storage.service.js';

// Resolve a directly-loadable URL for a 3D model asset so the creator editor can render
// the real model (tray thumbnail + placed marker). Models live in the public
// `legend-assets` bucket, so a public URL is enough; we still prefer an explicit
// file_url/external_url when present. Best-effort: returns the asset decorated with `url`
// (empty string if it cannot be resolved, in which case the UI shows a graceful fallback).
const decorateModelAsset = (asset) => {
  if (!asset) return null;
  const bucket = asset.metadata?.bucket || 'legend-assets';
  let url = asset.file_url || asset.external_url || '';
  if (!url && asset.storage_path) {
    url = getPublicUrlForAsset({ bucket, path: asset.storage_path }) || '';
  }
  return { ...asset, bucket, url, public_url: url };
};

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
    .select('id, page_id, model_asset_id')
    .eq('id', sceneId)
    .maybeSingle();
  if (error) throw new HotspotError('Could not validate AR scene.', 500, { reason: error.message });
  if (!scene) throw new HotspotError('AR scene does not belong to this legend.', 400);

  if (scene.page_id) {
    await assertPageInLegend(legendId, scene.page_id);
    return;
  }

  if (scene.model_asset_id) {
    const { data: asset, error: assetError } = await supabaseAdmin
      .from('assets')
      .select('id, metadata')
      .eq('id', scene.model_asset_id)
      .maybeSingle();
    if (assetError) throw new HotspotError('Could not validate AR scene asset.', 500, { reason: assetError.message });
    if (asset?.metadata?.legend_id && String(asset.metadata.legend_id) === String(legendId)) return;
  }

  throw new HotspotError('AR scene does not belong to this legend.', 400);
};

const assertAssetInLegend = async (legendId, assetId, expectedType = null) => {
  const { data: asset, error } = await supabaseAdmin
    .from('assets')
    .select('id, asset_type, metadata')
    .eq('id', assetId)
    .maybeSingle();
  if (error) throw new HotspotError('Could not validate asset.', 500, { reason: error.message });
  if (!asset) throw new HotspotError('Asset not found.', 400);
  const assetLegendId = asset.metadata?.legend_id;
  if (assetLegendId && String(assetLegendId) !== String(legendId)) {
    throw new HotspotError('Asset does not belong to this legend.', 400);
  }
  if (expectedType && asset.asset_type !== expectedType) {
    throw new HotspotError(`Asset must be of type ${expectedType}.`, 400);
  }
  return asset;
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
  const { legend } = await getLegendAccessContext({ legendId, userId, roles });

  const input = await buildHotspotInput({ legendId, payload, roles, requireTarget: true });
  // Si la leyenda YA está publicada, el hotspot debe nacer publicado para verse de
  // inmediato en el lector web y la app. Si naciera 'draft' quedaría invisible (el lector
  // solo trae published) y no habría transición de la leyenda que lo publique después
  // (ese caso lo cubre el trigger trg_publish_legend_hotspots). Juntos: ningún hotspot de
  // una leyenda publicada queda atorado en borrador.
  const defaultStatus = legend?.status === 'published' ? 'published' : 'draft';
  const record = {
    hotspot_type: 'marker',
    x: 0.85,
    y: 0.15,
    ...input,
    legend_id: legendId,
    created_by: userId,
    status: input.status ?? defaultStatus,
  };

  const { data, error } = await supabaseAdmin
    .from('interactive_hotspots')
    .insert(record)
    .select(HOTSPOT_COLUMNS)
    .single();
  if (error || !data) throw new HotspotError('Could not create hotspot.', 500, { reason: error?.message });
  return data;
};

const SCENE_COLUMNS = 'id, page_id, name, description, status, model_asset_id, interaction_config, created_by, created_at';

// Create (or reuse) the AR scene that links a 3D model to a legend. Runs with the
// service role so it bypasses the ar_scenes RLS INSERT policy, which requires
// is_page_creator(page_id) and therefore rejects scenes tied to a rendered PDF page
// (page_id is null). Ownership is enforced here via the legend access context and the
// model asset's legend.
export const createScene = async ({ legendId, userId, roles, payload = {} }) => {
  await getLegendAccessContext({ legendId, userId, roles });

  const modelAssetId = payload.model_asset_id;
  if (!modelAssetId) throw new HotspotError('model_asset_id is required.', 400);
  await assertAssetInLegend(legendId, modelAssetId);

  // Idempotent: reuse the scene already linked to this model instead of duplicating.
  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from('ar_scenes')
    .select(SCENE_COLUMNS)
    .eq('model_asset_id', modelAssetId)
    .limit(1);
  if (existingError) throw new HotspotError('Could not load AR scene.', 500, { reason: existingError.message });
  if (existingRows && existingRows.length > 0) return existingRows[0];

  const record = {
    page_id: payload.page_id || null,
    name: payload.name || 'Escena 3D',
    description: payload.description ?? null,
    model_asset_id: modelAssetId,
    status: 'draft',
    created_by: userId,
  };

  const { data, error } = await supabaseAdmin
    .from('ar_scenes')
    .insert(record)
    .select(SCENE_COLUMNS)
    .single();
  if (error || !data) throw new HotspotError('Could not create AR scene.', 500, { reason: error?.message });
  return data;
};

const MARKER_COLUMNS = 'id, marker_code, marker_asset_id, ar_scene_id, marker_type, status, created_by, created_at, updated_at';

// Register an AR marker (image → scene link) with the service role. ar_markers has no
// legend_id, so ownership is enforced via the legend access context plus asserting that
// both the marker asset and the AR scene belong to this legend. Idempotent per
// (marker_asset_id, ar_scene_id) so the browser can no longer write ar_markers directly.
export const createMarker = async ({ legendId, userId, roles, payload = {} }) => {
  await getLegendAccessContext({ legendId, userId, roles });

  const markerAssetId = payload.marker_asset_id;
  const sceneId = payload.ar_scene_id ?? null;
  if (!markerAssetId) throw new HotspotError('marker_asset_id is required.', 400);
  await assertAssetInLegend(legendId, markerAssetId);
  if (sceneId) await assertSceneInLegend(legendId, sceneId);

  // Idempotent: reuse an existing marker for the same asset (+ scene) instead of duplicating.
  let existingQuery = supabaseAdmin
    .from('ar_markers')
    .select(MARKER_COLUMNS)
    .eq('marker_asset_id', markerAssetId)
    .limit(1);
  if (sceneId) existingQuery = existingQuery.eq('ar_scene_id', sceneId);
  const { data: existingRows, error: existingError } = await existingQuery;
  if (existingError) throw new HotspotError('Could not load AR marker.', 500, { reason: existingError.message });
  if (existingRows && existingRows.length > 0) return existingRows[0];

  const record = {
    marker_code: payload.marker_code || `marker-${legendId}-${Date.now()}`,
    marker_asset_id: markerAssetId,
    ar_scene_id: sceneId,
    marker_type: payload.marker_type || 'image_marker',
    status: 'draft',
    created_by: userId,
  };

  const { data, error } = await supabaseAdmin
    .from('ar_markers')
    .insert(record)
    .select(MARKER_COLUMNS)
    .single();
  if (error || !data) throw new HotspotError('Could not create AR marker.', 500, { reason: error?.message });
  return data;
};

// Ensure the legend has a physical edition (reuse the first one, or create a draft).
// Mirrors the frontend ensurePhysicalEditionForLegend so the physical<->marker registry
// can be populated from the AR placement flow without the browser writing editions.
const ensurePhysicalEdition = async ({ legendId, userId }) => {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from('physical_editions')
    .select('id')
    .eq('legend_id', legendId)
    .order('created_at', { ascending: true })
    .limit(1);
  if (selectError) throw new HotspotError('Could not load physical edition.', 500, { reason: selectError.message });
  if (existing && existing.length > 0) return existing[0];

  const { data, error } = await supabaseAdmin
    .from('physical_editions')
    .insert({ legend_id: legendId, edition_name: 'Edicion fisica', status: 'draft', created_by: userId })
    .select('id')
    .single();
  if (error || !data) throw new HotspotError('Could not create physical edition.', 500, { reason: error?.message });
  return data;
};

// Records the formal "this printed edition carries marker X (on page Y)" link so the
// physical book and the digital legend share the same marker -> model mapping. Ensures
// the ar_marker exists (idempotent), ensures a physical edition, then upserts the
// physical_edition_markers row (idempotent per edition+marker). Ownership is enforced by
// the legend access context plus asserting the marker asset / scene belong to the legend.
export const linkPhysicalEditionMarker = async ({ legendId, userId, roles, payload = {} }) => {
  await getLegendAccessContext({ legendId, userId, roles });

  const markerAssetId = payload.marker_asset_id;
  const sceneId = payload.ar_scene_id ?? null;
  const pageReference = payload.page_reference ? String(payload.page_reference).slice(0, 100) : null;
  if (!markerAssetId) throw new HotspotError('marker_asset_id is required.', 400);
  await assertAssetInLegend(legendId, markerAssetId);
  if (sceneId) await assertSceneInLegend(legendId, sceneId);

  // 1) The ar_marker row gives us a stable marker_id (+ marker_code) to reference.
  const marker = await createMarker({
    legendId,
    userId,
    roles,
    payload: { marker_asset_id: markerAssetId, ar_scene_id: sceneId },
  });

  // 2) The legend's physical edition.
  const edition = await ensurePhysicalEdition({ legendId, userId });

  // 3) The edition<->marker registry row (idempotent per edition+marker).
  const { data: existingLink, error: linkSelectError } = await supabaseAdmin
    .from('physical_edition_markers')
    .select('edition_id, marker_id')
    .eq('edition_id', edition.id)
    .eq('marker_id', marker.id)
    .maybeSingle();
  if (linkSelectError) {
    throw new HotspotError('Could not load physical edition marker.', 500, { reason: linkSelectError.message });
  }

  if (existingLink) {
    if (pageReference) {
      await supabaseAdmin
        .from('physical_edition_markers')
        .update({ page_reference: pageReference })
        .eq('edition_id', edition.id)
        .eq('marker_id', marker.id);
    }
  } else {
    const { error: insertError } = await supabaseAdmin
      .from('physical_edition_markers')
      .insert({ edition_id: edition.id, marker_id: marker.id, page_reference: pageReference });
    if (insertError) {
      throw new HotspotError('Could not link physical edition marker.', 500, { reason: insertError.message });
    }
  }

  return {
    editionId: edition.id,
    markerId: marker.id,
    markerCode: marker.marker_code,
    pageReference,
  };
};

// List the legend's 3D scenes for the creator selector. Runs with the service role so
// it can read scenes with a null page_id (rendered-PDF models), which the ar_scenes
// RLS SELECT policy (keyed on is_page_creator(page_id)) would hide from the frontend.
// Each scene's name is set to the model file name so the selector is human-readable.
export const listScenes = async ({ legendId, userId, roles }) => {
  await getLegendAccessContext({ legendId, userId, roles });

  const { data: assets, error: assetsError } = await supabaseAdmin
    .from('assets')
    .select('id, storage_path, file_url, external_url, mime_type, file_size, asset_type, metadata')
    .eq('asset_type', 'model_3d')
    .eq('metadata->>legend_id', legendId);
  if (assetsError) throw new HotspotError('Could not load models.', 500, { reason: assetsError.message });

  const modelAssetIds = (assets ?? []).map((asset) => asset.id);
  if (!modelAssetIds.length) return [];

  const { data: scenes, error } = await supabaseAdmin
    .from('ar_scenes')
    .select(SCENE_COLUMNS)
    .in('model_asset_id', modelAssetIds)
    .order('created_at', { ascending: false });
  if (error) throw new HotspotError('Could not load scenes.', 500, { reason: error.message });

  // Decorate each model asset with a loadable URL so the editor can render the real
  // model instead of a "3D" placeholder. Keyed by asset id to attach to its scene.
  const assetById = new Map(
    (assets ?? []).map((asset) => [String(asset.id), decorateModelAsset(asset)]),
  );

  return (scenes ?? [])
    .filter((scene) => String(scene.status || '').toLowerCase() !== 'archived')
    .map((scene) => {
      const asset = assetById.get(String(scene.model_asset_id)) || null;
      return {
        ...scene,
        name: asset?.metadata?.original_name || asset?.metadata?.filename || scene.name || 'Modelo 3D',
        assets: asset,
      };
    });
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

  // La imagen del marcador quedaba huerfana en assets y en Storage. Se conserva sola si
  // otro hotspot la sigue usando (la FK RESTRICT lo decide).
  const cleanup = await purgeOrphanAssets([existing.marker_asset_id]);
  return { id: hotspotId, cleanup };
};

// ---------------------------------------------------------------------------
// Physical-edition markers (marcador de libro fisico, independiente de pagina).
// Se guardan como interactive_hotspots con target_type='physical_edition'
// (page_id y source_document_id nulos). La app movil ya lee esa tabla, asi que
// aparecen en el escaner sin cambios en el APK. Se publican al instante; el feed
// movil igual exige que la leyenda este publicada.
// ---------------------------------------------------------------------------
const PHYSICAL_TARGET = 'physical_edition';

const PHYSICAL_MARKER_SELECT =
  'id, legend_id, marker_asset_id, ar_scene_id, label, status, created_at, ' +
  'marker:marker_asset_id(id, file_url, metadata), ' +
  'scene:ar_scene_id(id, name, model:model_asset_id(id, file_url, metadata))';

const modelName = (asset, sceneName) =>
  asset?.metadata?.original_name || asset?.metadata?.filename || sceneName || 'Modelo 3D';

const serializePhysicalMarker = (row) => {
  const modelAsset = row.scene?.model || null;
  return {
    id: row.id,
    legendId: row.legend_id,
    status: row.status,
    label: row.label,
    createdAt: row.created_at,
    marker: {
      assetId: row.marker_asset_id,
      imageUrl: row.marker?.file_url || null,
      name: row.marker?.metadata?.original_name || row.marker?.metadata?.filename || 'Marcador',
    },
    model: {
      sceneId: row.ar_scene_id,
      assetId: modelAsset?.id || null,
      url: modelAsset?.file_url || null,
      name: modelName(modelAsset, row.scene?.name),
    },
  };
};

export const listPhysicalMarkers = async ({ legendId, userId, roles }) => {
  await getLegendAccessContext({ legendId, userId, roles });
  const { data, error } = await supabaseAdmin
    .from('interactive_hotspots')
    .select(PHYSICAL_MARKER_SELECT)
    .eq('legend_id', legendId)
    .eq('target_type', PHYSICAL_TARGET)
    .order('created_at', { ascending: true });
  if (error) throw new HotspotError('Could not list physical markers.', 500, { reason: error.message });

  // El feed movil filtra por legends.status. Devolvemos ESA columna (no el status
  // derivado del panel de creador, que puede ser in_review/changes_requested) para
  // que la UI no prometa ni niegue visibilidad en la app de forma incorrecta.
  const { data: legend, error: legendError } = await supabaseAdmin
    .from('legends')
    .select('status')
    .eq('id', legendId)
    .maybeSingle();
  if (legendError) throw new HotspotError('Could not load legend status.', 500, { reason: legendError.message });

  return {
    markers: (data ?? []).map(serializePhysicalMarker),
    legendPublished: legend?.status === 'published',
  };
};

export const createPhysicalMarker = async ({ legendId, userId, roles, payload = {} }) => {
  await getLegendAccessContext({ legendId, userId, roles });

  const markerAssetId = payload.marker_asset_id;
  const modelAssetId = payload.model_asset_id;
  if (!markerAssetId) throw new HotspotError('marker_asset_id is required.', 400);
  if (!modelAssetId) throw new HotspotError('model_asset_id is required.', 400);
  // Validamos tipo: un archivo intercambiado (modelo<->marcador) crearia una escena rota.
  await assertAssetInLegend(legendId, markerAssetId, 'marker_image');
  await assertAssetInLegend(legendId, modelAssetId, 'model_3d');

  // Unicidad: un marcador se vincula a un solo modelo por leyenda.
  const { data: clash, error: clashError } = await supabaseAdmin
    .from('interactive_hotspots')
    .select('id')
    .eq('legend_id', legendId)
    .eq('target_type', PHYSICAL_TARGET)
    .eq('marker_asset_id', markerAssetId)
    .maybeSingle();
  if (clashError) throw new HotspotError('Could not validate marker uniqueness.', 500, { reason: clashError.message });
  if (clash) throw new HotspotError('Ese marcador ya esta vinculado a un modelo en esta leyenda.', 409);

  // La escena enlaza el modelo (idempotente por model_asset_id).
  const scene = await createScene({
    legendId,
    userId,
    roles,
    payload: { model_asset_id: modelAssetId, name: payload.label || 'Modelo (libro fisico)' },
  });

  const label = payload.label ? String(payload.label).slice(0, 200) : null;
  const record = {
    legend_id: legendId,
    target_type: PHYSICAL_TARGET,
    hotspot_type: 'model',
    marker_asset_id: markerAssetId,
    ar_scene_id: scene.id,
    label,
    x: 0.5,
    y: 0.5,
    status: 'published',
    created_by: userId,
  };
  const { data, error } = await supabaseAdmin
    .from('interactive_hotspots')
    .insert(record)
    .select(PHYSICAL_MARKER_SELECT)
    .single();
  if (error || !data) throw new HotspotError('Could not create physical marker.', 500, { reason: error?.message });

  // Registro edicion fisica <-> marcador (best-effort; no debe romper la creacion).
  // page_reference es NOT NULL en physical_edition_markers -> siempre pasamos un valor.
  try {
    await linkPhysicalEditionMarker({
      legendId,
      userId,
      roles,
      payload: {
        marker_asset_id: markerAssetId,
        ar_scene_id: scene.id,
        page_reference: payload.page_reference ? String(payload.page_reference) : 'libro-fisico',
      },
    });
  } catch {
    // El mapeo escaneable (hotspot) ya existe; el registro fisico es secundario.
  }

  return serializePhysicalMarker(data);
};

// Reemplaza el modelo (y/o el marcador) de un par ya guardado, sin borrarlo. Crea/
// reutiliza la escena del nuevo modelo y reengancha el registro de edición física.
export const updatePhysicalMarker = async ({ legendId, hotspotId, userId, roles, payload = {} }) => {
  const existing = await loadHotspot(hotspotId);
  if (String(existing.legend_id) !== String(legendId) || existing.target_type !== PHYSICAL_TARGET) {
    throw new HotspotError('Physical marker not found for this legend.', 404);
  }
  await getLegendAccessContext({ legendId, userId, roles });

  const patch = {};

  if (payload.model_asset_id) {
    await assertAssetInLegend(legendId, payload.model_asset_id, 'model_3d');
    const scene = await createScene({
      legendId,
      userId,
      roles,
      payload: { model_asset_id: payload.model_asset_id, name: payload.label || 'Modelo (libro fisico)' },
    });
    patch.ar_scene_id = scene.id;
  }

  if (payload.marker_asset_id) {
    await assertAssetInLegend(legendId, payload.marker_asset_id, 'marker_image');
    // El nuevo marcador no puede estar ya vinculado a OTRO par de esta leyenda.
    const { data: clash, error: clashError } = await supabaseAdmin
      .from('interactive_hotspots')
      .select('id')
      .eq('legend_id', legendId)
      .eq('target_type', PHYSICAL_TARGET)
      .eq('marker_asset_id', payload.marker_asset_id)
      .neq('id', hotspotId)
      .maybeSingle();
    if (clashError) throw new HotspotError('Could not validate marker uniqueness.', 500, { reason: clashError.message });
    if (clash) throw new HotspotError('Ese marcador ya esta vinculado a un modelo en esta leyenda.', 409);
    patch.marker_asset_id = payload.marker_asset_id;
  }

  if (payload.label !== undefined) {
    patch.label = payload.label ? String(payload.label).slice(0, 200) : null;
  }

  if (Object.keys(patch).length === 0) {
    const { data: current, error: currentError } = await supabaseAdmin
      .from('interactive_hotspots')
      .select(PHYSICAL_MARKER_SELECT)
      .eq('id', hotspotId)
      .single();
    if (currentError || !current) throw new HotspotError('Could not load physical marker.', 500, { reason: currentError?.message });
    return serializePhysicalMarker(current);
  }

  const { data, error } = await supabaseAdmin
    .from('interactive_hotspots')
    .update(patch)
    .eq('id', hotspotId)
    .select(PHYSICAL_MARKER_SELECT)
    .single();
  if (error || !data) throw new HotspotError('Could not update physical marker.', 500, { reason: error?.message });

  // Reengancha el registro de edición física con el marcador/escena finales (best-effort).
  const finalMarkerId = patch.marker_asset_id || existing.marker_asset_id;
  const finalSceneId = patch.ar_scene_id || existing.ar_scene_id;
  if (finalMarkerId) {
    try {
      await linkPhysicalEditionMarker({
        legendId,
        userId,
        roles,
        payload: { marker_asset_id: finalMarkerId, ar_scene_id: finalSceneId, page_reference: 'libro-fisico' },
      });
    } catch {
      // El mapeo escaneable (hotspot) ya quedó actualizado; el registro físico es secundario.
    }
  }

  return serializePhysicalMarker(data);
};

export const deletePhysicalMarker = async ({ legendId, hotspotId, userId, roles }) => {
  const existing = await loadHotspot(hotspotId);
  if (String(existing.legend_id) !== String(legendId) || existing.target_type !== PHYSICAL_TARGET) {
    throw new HotspotError('Physical marker not found for this legend.', 404);
  }
  await getLegendAccessContext({ legendId, userId, roles });
  const { error } = await supabaseAdmin
    .from('interactive_hotspots')
    .delete()
    .eq('id', hotspotId);
  if (error) throw new HotspotError('Could not delete physical marker.', 500, { reason: error.message });

  const cleanup = await purgeOrphanAssets([existing.marker_asset_id]);
  return { id: hotspotId, cleanup };
};
