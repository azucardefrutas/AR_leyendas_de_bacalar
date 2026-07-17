import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { getLegendAccessContext } from './legendAccess.service.js';
import { getPublicUrlForAsset } from './storage.service.js';

// Creator write path moved server-side (optimization): create draft, update
// metadata + genres, and duplicate — each orchestrated in one backend call
// (slug uniqueness, version, genre upsert/link) instead of many browser round-trips.
// Ownership is enforced at the app layer (service-role bypasses RLS), mirroring the
// existing pattern used by editorContent/legendAccess services.

class CreatorLegendError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'CreatorLegendError';
    this.statusCode = statusCode;
  }
}

const ACCESS_TYPES = ['free', 'paid', 'subscription', 'code_required', 'mixed'];
const EDITABLE_STATUSES = ['draft', 'rejected'];
const hasRole = (roles, role) => Array.isArray(roles) && roles.includes(role);

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeGenreName(name = '') {
  const clean = String(name).trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  return clean
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function buildShortSynopsis(synopsis = '') {
  const clean = String(synopsis).trim().replace(/\s+/g, ' ');
  if (clean.length <= 220) return clean;
  return `${clean.slice(0, 220).trim()}...`;
}

function validateGeneral(payload, { requireCore = true } = {}) {
  if (requireCore && !payload.title?.trim()) {
    throw new CreatorLegendError('El título es obligatorio.');
  }
  if (payload.synopsis !== undefined) {
    if (!payload.synopsis?.trim() || payload.synopsis.trim().length < 30) {
      throw new CreatorLegendError('La sinopsis debe tener al menos 30 caracteres.');
    }
  } else if (requireCore) {
    throw new CreatorLegendError('La sinopsis es obligatoria.');
  }
  if (payload.access_type && !ACCESS_TYPES.includes(payload.access_type)) {
    throw new CreatorLegendError('Tipo de acceso inválido.');
  }
}

// Best-effort unique slug: fetch siblings sharing the base and pick a free suffix.
async function getAvailableSlug(base) {
  const baseSlug = slugify(base) || 'leyenda';
  const { data, error } = await supabaseAdmin
    .from('legends')
    .select('slug')
    .ilike('slug', `${baseSlug}%`);
  if (error) return baseSlug;
  const existing = new Set((data ?? []).map((row) => row.slug));
  if (!existing.has(baseSlug)) return baseSlug;
  let suffix = 2;
  let candidate = `${baseSlug}-${suffix}`;
  while (existing.has(candidate)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
  return candidate;
}

// Upsert genres by name (genres.name is unique) and return [{ id, name }].
async function upsertGenres(names = []) {
  const normalized = [...new Set((names ?? []).map(normalizeGenreName).filter(Boolean))];
  if (!normalized.length) return [];
  const { data: existing } = await supabaseAdmin.from('genres').select('id, name').in('name', normalized);
  const idByName = new Map((existing ?? []).map((genre) => [genre.name, genre.id]));
  const missing = normalized.filter((name) => !idByName.has(name));
  if (missing.length) {
    const { data: inserted, error } = await supabaseAdmin
      .from('genres')
      .insert(missing.map((name) => ({ name })))
      .select('id, name');
    if (!error) for (const genre of inserted ?? []) idByName.set(genre.name, genre.id);
  }
  return normalized.map((name) => ({ id: idByName.get(name), name })).filter((genre) => genre.id);
}

async function setLegendGenres(legendId, names = []) {
  const genres = await upsertGenres(names);
  await supabaseAdmin.from('legend_genres').delete().eq('legend_id', legendId);
  if (genres.length) {
    await supabaseAdmin
      .from('legend_genres')
      .insert(genres.map((genre) => ({ legend_id: legendId, genre_id: genre.id })));
  }
  return genres;
}

export async function createLegendDraft({ userId, roles, payload = {} }) {
  if (!userId) throw new CreatorLegendError('Unauthorized.', 401);
  if (!hasRole(roles, 'creator') && !hasRole(roles, 'admin')) {
    throw new CreatorLegendError('Forbidden.', 403);
  }
  validateGeneral(payload, { requireCore: true });

  const slug = await getAvailableSlug(payload.slug || payload.title);
  const synopsis = payload.synopsis.trim();
  const insertPayload = {
    creator_id: userId,
    title: payload.title.trim(),
    slug,
    synopsis,
    short_synopsis: payload.short_synopsis?.trim() || buildShortSynopsis(synopsis),
    origin_place: payload.origin_place?.trim() || 'Bacalar, Quintana Roo',
    language: payload.language || 'es',
    age_rating: payload.age_rating || 'general',
    access_type: payload.access_type || 'free',
    is_featured: false,
    creation_mode: payload.creation_mode === 'source_document' ? 'source_document' : 'manual',
  };

  const { data: legend, error: legendError } = await supabaseAdmin
    .from('legends')
    .insert(insertPayload)
    .select('*')
    .single();
  if (legendError || !legend?.id) {
    throw new CreatorLegendError('No pudimos guardar la leyenda.', 500);
  }

  const { data: version, error: versionError } = await supabaseAdmin
    .from('legend_versions')
    .insert({ legend_id: legend.id, version_number: 1, status: 'draft', created_by: userId })
    .select('*')
    .single();
  if (versionError || !version?.id) {
    throw new CreatorLegendError('No pudimos crear la versión inicial.', 500);
  }

  const genres = await setLegendGenres(legend.id, payload.genres);
  return { legend, version, genres, pages: [] };
}

// ---- B2: enriched creator legend list (heavy multi-table enrichment server-side) ----

function resolveAssetUrl(asset) {
  if (!asset) return null;
  if (asset.file_url) return asset.file_url;
  if (asset.external_url) return asset.external_url;
  if (asset.public_url) return asset.public_url;
  if (asset.storage_path) return getPublicUrlForAsset({ bucket: 'legend-assets', path: asset.storage_path });
  return null;
}

async function genresByLegend(legendIds) {
  const map = new Map();
  if (!legendIds.length) return map;
  const { data } = await supabaseAdmin
    .from('legend_genres')
    .select('legend_id, genres(id, name)')
    .in('legend_id', legendIds);
  for (const row of data ?? []) {
    const genre = row.genres;
    if (!genre?.name) continue;
    const current = map.get(row.legend_id) || [];
    current.push({ id: genre.id || genre.name, name: genre.name });
    map.set(row.legend_id, current);
  }
  return map;
}

async function mediaByLegend(legendIds) {
  const map = new Map();
  if (!legendIds.length) return map;
  const { data: mediaRows } = await supabaseAdmin.from('legend_media').select('*').in('legend_id', legendIds);
  const assetIds = [...new Set((mediaRows ?? []).map((row) => row.asset_id).filter(Boolean))];
  let assetsById = new Map();
  if (assetIds.length) {
    const { data: assets } = await supabaseAdmin.from('assets').select('*').in('id', assetIds);
    assetsById = new Map((assets ?? []).map((asset) => [String(asset.id), asset]));
  }
  for (const row of mediaRows ?? []) {
    const asset = row.asset_id ? assetsById.get(String(row.asset_id)) || null : null;
    const current = map.get(row.legend_id) || [];
    current.push({ ...row, assets: asset, url: resolveAssetUrl(asset) });
    map.set(row.legend_id, current);
  }
  return map;
}

function pickMediaUrl(media, type) {
  const entry = (media || []).find((item) => item.media_type === type && item.url)
    || (media || []).find((item) => item.media_type === type);
  return entry?.url || null;
}

async function pagesCountByLegend(legendIds) {
  const counts = new Map();
  if (!legendIds.length) return counts;
  const { data: versions } = await supabaseAdmin
    .from('legend_versions')
    .select('id, legend_id, version_number')
    .in('legend_id', legendIds);
  const latestByLegend = new Map();
  for (const version of versions ?? []) {
    const current = latestByLegend.get(version.legend_id);
    if (!current || Number(version.version_number) > Number(current.version_number)) {
      latestByLegend.set(version.legend_id, version);
    }
  }
  const versionToLegend = new Map([...latestByLegend.values()].map((v) => [String(v.id), v.legend_id]));
  const versionIds = [...versionToLegend.keys()];
  if (!versionIds.length) return counts;
  const { data: pages } = await supabaseAdmin.from('legend_pages').select('version_id').in('version_id', versionIds);
  for (const page of pages ?? []) {
    const legendId = versionToLegend.get(String(page.version_id));
    if (legendId) counts.set(legendId, (counts.get(legendId) || 0) + 1);
  }
  return counts;
}

async function reviewStateByLegend(legendIds) {
  const versionByLegend = new Map();
  const reviewByLegend = new Map();
  if (!legendIds.length) return { versionByLegend, reviewByLegend };
  const { data: versions } = await supabaseAdmin
    .from('legend_versions')
    .select('id, legend_id, version_number, status, review_notes, submitted_at, published_at, created_at')
    .in('legend_id', legendIds)
    .order('version_number', { ascending: false });
  for (const version of versions ?? []) {
    if (!versionByLegend.has(version.legend_id)) versionByLegend.set(version.legend_id, version);
  }
  const versionToLegend = new Map((versions ?? []).map((v) => [String(v.id), v.legend_id]));
  const versionIds = [...versionToLegend.keys()];
  if (versionIds.length) {
    const { data: reviews } = await supabaseAdmin
      .from('content_reviews')
      .select('id, legend_version_id, status, feedback, created_at, reviewed_at')
      .in('legend_version_id', versionIds)
      .order('created_at', { ascending: false });
    for (const review of reviews ?? []) {
      const legendId = versionToLegend.get(String(review.legend_version_id));
      if (legendId && !reviewByLegend.has(legendId)) reviewByLegend.set(legendId, review);
    }
  }
  return { versionByLegend, reviewByLegend };
}

// Returns the enriched base for each legend. The frontend applies the light
// label/permission shaping (getCreatorLegendCardData) locally.
export async function listCreatorLegends({ userId, roles, limit = 50 }) {
  if (!userId) throw new CreatorLegendError('Unauthorized.', 401);
  const isAdmin = hasRole(roles, 'admin');

  let query = supabaseAdmin.from('legends').select('*').order('created_at', { ascending: false });
  if (!isAdmin) query = query.eq('creator_id', userId);
  if (Number.isFinite(Number(limit)) && Number(limit) > 0) query = query.limit(Number(limit));
  const { data: legends, error } = await query;
  if (error) throw new CreatorLegendError('No pudimos cargar tus leyendas.', 500);

  const legendIds = (legends ?? []).map((legend) => legend.id).filter(Boolean);
  const [genres, media, pageCounts, reviewState, profile] = await Promise.all([
    genresByLegend(legendIds),
    mediaByLegend(legendIds),
    pagesCountByLegend(legendIds),
    reviewStateByLegend(legendIds),
    supabaseAdmin.from('creator_profiles').select('pen_name').eq('user_id', userId).maybeSingle(),
  ]);
  const penName = profile?.data?.pen_name || 'Autor';

  return (legends ?? []).map((legend) => {
    const legendMedia = media.get(legend.id) || [];
    const latestVersion = reviewState.versionByLegend.get(legend.id) || null;
    const latestReview = reviewState.reviewByLegend.get(legend.id) || null;
    const reviewStatus = latestReview?.status || null;
    const versionStatus = latestVersion?.status || null;
    const effectiveStatus = reviewStatus === 'changes_requested'
      ? 'changes_requested'
      : reviewStatus === 'rejected'
        ? 'rejected'
        : versionStatus === 'submitted'
          ? 'in_review'
          : versionStatus === 'published'
            ? 'published'
            : legend.status;
    const coverUrl = pickMediaUrl(legendMedia, 'cover') || legend.cover_url || null;
    const bannerUrl = pickMediaUrl(legendMedia, 'banner') || null;

    return {
      ...legend,
      status: effectiveStatus,
      legendStatus: legend.status,
      versionStatus,
      reviewStatus,
      reviewFeedback: latestReview?.feedback || '',
      latestReview,
      currentVersion: latestVersion,
      genres: genres.get(legend.id) || [],
      media: legendMedia,
      coverUrl,
      bannerUrl,
      backdropUrl: bannerUrl,
      pagesCount: pageCounts.get(legend.id) || 0,
      authorName: penName,
    };
  });
}

export async function updateLegendGeneral({ legendId, userId, roles, payload = {} }) {
  const { legend } = await getLegendAccessContext({ legendId, userId, roles });
  const editable = EDITABLE_STATUSES.includes(String(legend.status));
  if (!editable && !hasRole(roles, 'admin')) {
    throw new CreatorLegendError('Esta leyenda no puede editarse en su estado actual.', 409);
  }
  validateGeneral(payload, { requireCore: false });

  const updates = {};
  const fields = ['title', 'origin_place', 'language', 'age_rating', 'access_type', 'is_featured'];
  for (const field of fields) {
    if (payload[field] !== undefined) updates[field] = payload[field];
  }
  if (payload.synopsis !== undefined) {
    const synopsis = payload.synopsis.trim();
    updates.synopsis = synopsis;
    updates.short_synopsis = payload.short_synopsis?.trim() || buildShortSynopsis(synopsis);
  }
  updates.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabaseAdmin
    .from('legends')
    .update(updates)
    .eq('id', legendId)
    .select('*')
    .single();
  if (error) throw new CreatorLegendError('No pudimos actualizar la leyenda.', 500);

  let genres;
  if (Array.isArray(payload.genres)) genres = await setLegendGenres(legendId, payload.genres);
  return { legend: updated, genres };
}

// Access types that can carry a one-time purchase price (the creator sets the price).
const PURCHASABLE_ACCESS = ['paid', 'mixed'];

// The legend's digital purchase product. Fetched for the editor (to prefill the price).
async function getLegendDigitalProduct(legendId) {
  const { data } = await supabaseAdmin
    .from('products')
    .select('id, name, price, currency, status, product_type, legend_id')
    .eq('legend_id', legendId)
    .eq('product_type', 'digital_legend')
    .maybeSingle();
  return data ?? null;
}

// Upsert the legend's "buy to unlock" product so a reader can purchase access. Buying it
// runs process_simulated_product_purchase -> grant_legend_access (unlocks directly). A
// non-purchasable access_type or a price <= 0 deactivates the product. Ownership is
// validated the same way as the rest of the creator flow (getLegendAccessContext).
export async function upsertLegendProduct({ legendId, userId, roles, price }) {
  const { legend } = await getLegendAccessContext({ legendId, userId, roles });
  const numericPrice = Math.round(Number(price) * 100) / 100;
  const purchasable = PURCHASABLE_ACCESS.includes(String(legend.access_type))
    && Number.isFinite(numericPrice) && numericPrice > 0;
  const existing = await getLegendDigitalProduct(legendId);

  if (!purchasable) {
    if (existing && existing.status === 'active') {
      await supabaseAdmin
        .from('products')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }
    return { product: null };
  }

  const row = {
    name: `${legend.title} — Acceso digital`,
    description: `Compra digital simulada de la leyenda ${legend.title}.`,
    price: numericPrice,
    currency: 'MXN',
    legend_id: legendId,
    product_type: 'digital_legend',
    status: 'active',
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await supabaseAdmin.from('products').update(row).eq('id', existing.id).select('*').single();
    if (error) throw new CreatorLegendError('No pudimos actualizar el precio.', 500);
    return { product: data };
  }
  const { data, error } = await supabaseAdmin.from('products').insert(row).select('*').single();
  if (error) throw new CreatorLegendError('No pudimos crear el producto.', 500);
  return { product: data };
}

// ---- B1: full editor load (legend + version + pages + genres + resources) ----

async function hydrateWithAssets(rows) {
  const assetIds = [...new Set((rows ?? []).map((row) => row.asset_id).filter(Boolean))];
  let byId = new Map();
  if (assetIds.length) {
    const { data } = await supabaseAdmin.from('assets').select('*').in('id', assetIds);
    byId = new Map((data ?? []).map((asset) => [String(asset.id), asset]));
  }
  return (rows ?? []).map((row) => {
    const asset = row.asset_id ? byId.get(String(row.asset_id)) || null : null;
    return { ...row, assets: asset, url: resolveAssetUrl(asset) };
  });
}

async function loadLegendResources(legendId) {
  const [mediaResult, docsResult] = await Promise.all([
    supabaseAdmin.from('legend_media').select('*').eq('legend_id', legendId),
    supabaseAdmin.from('legend_source_documents').select('*').eq('legend_id', legendId),
  ]);

  const { data: verRows } = await supabaseAdmin.from('legend_versions').select('id').eq('legend_id', legendId);
  const versionIds = (verRows ?? []).map((row) => row.id);
  let pageIds = [];
  if (versionIds.length) {
    const { data: pageRows } = await supabaseAdmin.from('legend_pages').select('id').in('version_id', versionIds);
    pageIds = (pageRows ?? []).map((row) => row.id);
  }

  const [modelAssetsResult, markerAssetsResult] = await Promise.all([
    supabaseAdmin.from('assets').select('*').eq('asset_type', 'model_3d').eq('metadata->>legend_id', legendId),
    supabaseAdmin.from('assets').select('*').eq('asset_type', 'marker_image').eq('metadata->>legend_id', legendId),
  ]);
  const modelAssetIds = (modelAssetsResult.data ?? []).map((asset) => asset.id).filter(Boolean);

  const [pageScenes, assetScenes] = await Promise.all([
    pageIds.length ? supabaseAdmin.from('ar_scenes').select('*').in('page_id', pageIds) : Promise.resolve({ data: [] }),
    modelAssetIds.length ? supabaseAdmin.from('ar_scenes').select('*').in('model_asset_id', modelAssetIds) : Promise.resolve({ data: [] }),
  ]);
  const sceneMap = new Map();
  for (const scene of [...(pageScenes.data ?? []), ...(assetScenes.data ?? [])]) {
    if (scene?.id) sceneMap.set(String(scene.id), scene);
  }
  const sceneRows = [...sceneMap.values()];
  const sceneIds = sceneRows.map((scene) => scene.id).filter(Boolean);

  const markersResult = sceneIds.length
    ? await supabaseAdmin.from('ar_markers').select('*').in('ar_scene_id', sceneIds)
    : { data: [] };

  const [media, documents, arScenes, linkedMarkers] = await Promise.all([
    hydrateWithAssets(mediaResult.data ?? []),
    hydrateWithAssets(docsResult.data ?? []),
    hydrateWithAssets(sceneRows),
    hydrateWithAssets(markersResult.data ?? []),
  ]);
  const modelAssets = (modelAssetsResult.data ?? []).map((asset) => ({ ...asset, url: resolveAssetUrl(asset) }));
  const markerAssets = (markerAssetsResult.data ?? []).map((asset) => ({ ...asset, url: resolveAssetUrl(asset) }));

  const markerMap = new Map();
  for (const marker of linkedMarkers) {
    const markerAssetId = marker.marker_asset_id || marker.assets?.id || marker.id;
    if (markerAssetId) markerMap.set(String(markerAssetId), marker);
  }
  for (const asset of markerAssets) {
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

  return { media, documents, modelAssets, arScenes, arMarkers: [...markerMap.values()] };
}

export async function getEditorData({ legendId, userId, roles }) {
  await getLegendAccessContext({ legendId, userId, roles });

  const { data: legend } = await supabaseAdmin.from('legends').select('*').eq('id', legendId).maybeSingle();
  if (!legend) throw new CreatorLegendError('Legend not found.', 404);

  const { data: versions } = await supabaseAdmin
    .from('legend_versions')
    .select('*')
    .eq('legend_id', legendId)
    .order('version_number', { ascending: false });
  const version = (versions ?? []).find((v) => EDITABLE_STATUSES.includes(String(v.status))) || (versions ?? [])[0] || null;

  let pages = [];
  if (version?.id) {
    const { data } = await supabaseAdmin
      .from('legend_pages')
      .select('*')
      .eq('version_id', version.id)
      .order('page_number', { ascending: true });
    pages = data ?? [];
  }

  const genresMap = await genresByLegend([legendId]);
  const genres = genresMap.get(legendId) || [];
  const resources = await loadLegendResources(legendId);
  const product = await getLegendDigitalProduct(legendId);

  return {
    legend,
    version,
    pages,
    genres,
    product,
    media: resources.media,
    sourceDocuments: resources.documents,
    modelAssets: resources.modelAssets,
    arScenes: resources.arScenes,
    arMarkers: resources.arMarkers,
    resources,
  };
}

export async function duplicateLegend({ legendId, userId, roles }) {
  await getLegendAccessContext({ legendId, userId, roles });

  const { data: source, error } = await supabaseAdmin
    .from('legends')
    .select('*')
    .eq('id', legendId)
    .maybeSingle();
  if (error || !source) {
    throw new CreatorLegendError('No pudimos cargar la leyenda a duplicar.', 500);
  }

  const { data: genreLinks } = await supabaseAdmin
    .from('legend_genres')
    .select('genres(name)')
    .eq('legend_id', legendId);
  const genreNames = (genreLinks ?? []).map((link) => link.genres?.name).filter(Boolean);

  const created = await createLegendDraft({
    userId,
    roles,
    payload: {
      title: `${source.title} (copia)`,
      slug: `${source.slug}-copia`,
      synopsis: source.synopsis,
      short_synopsis: source.short_synopsis,
      origin_place: source.origin_place,
      language: source.language,
      age_rating: source.age_rating,
      access_type: source.access_type,
      genres: genreNames,
      creation_mode: source.creation_mode,
    },
  });

  // Copy pages from the source's latest version into the new draft version.
  const { data: srcVersions } = await supabaseAdmin
    .from('legend_versions')
    .select('id, version_number')
    .eq('legend_id', legendId)
    .order('version_number', { ascending: false })
    .limit(1);
  const srcVersionId = srcVersions?.[0]?.id;
  if (srcVersionId) {
    const { data: pages } = await supabaseAdmin
      .from('legend_pages')
      .select('page_number, title, text_content, editor_data, rendered_html, content_format')
      .eq('version_id', srcVersionId)
      .order('page_number', { ascending: true });
    if (pages?.length) {
      const cloned = pages.map((page, index) => ({
        version_id: created.version.id,
        page_number: index + 1,
        title: page.title ?? '',
        text_content: page.text_content ?? '',
        editor_data: page.editor_data ?? { blocks: [] },
        rendered_html: page.rendered_html ?? '',
        content_format: page.content_format ?? 'editorjs',
      }));
      await supabaseAdmin.from('legend_pages').insert(cloned);
    }
  }

  return created;
}
