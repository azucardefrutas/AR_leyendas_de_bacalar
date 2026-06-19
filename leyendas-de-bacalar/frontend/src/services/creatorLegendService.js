import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';
import {
  ensureCreatorCanCreate,
  getCreatorIdCandidates,
} from './creatorAccessService.js';
import { getLegendResources, STORAGE_BUCKETS } from './assetService.js';
import {
  canDeleteCreatorLegend,
  getCreatorLegendCardData,
  getCreatorLegendStatusKey,
  isDraftCreatorLegend,
} from './creatorLegendState.js';

export {
  canDeleteCreatorLegend,
  canEditCreatorLegend,
  canSubmitLegend,
  canViewLegend,
  countCreatorLegendsByStatus,
  getCreatorLegendCardData,
  getCreatorLegendDeleteLabel,
  getCreatorLegendPrimaryAction,
  getCreatorLegendStatusKey,
  getLegendAccessLabel,
  getLegendCardActions,
  getLegendCoverUrl,
  getLegendDeleteConfirmation,
  getLegendDisplayStatus,
  getLegendFeedback,
  getLegendGenreNames,
  getLegendStatusBadge,
  isDraftCreatorLegend,
} from './creatorLegendState.js';

const ACCESS_TYPES = ['free', 'paid', 'subscription', 'code_required', 'mixed'];
const EDITABLE_VERSION_STATUSES = ['draft', 'rejected'];
const DELETE_DRAFT_GENERIC_MESSAGE = 'No pudimos eliminar el borrador. Revisa si ya fue enviado a revision o si tiene relaciones protegidas.';
const DELETE_CREATOR_LEGEND_GENERIC_MESSAGE = 'No pudimos eliminar la historia. Revisa si esta en revision, aprobada, publicada o tiene relaciones protegidas.';
const CREATOR_LEGENDS_DEFAULT_LIMIT = 120;
const SHORT_SYNOPSIS_LENGTH = 220;
const MEDIA_TYPES = {
  cover: ['cover', 'portada'],
  banner: ['banner', 'hero'],
  backdrop: ['backdrop', 'background', 'fondo'],
};
const IMAGE_ASSET_TYPES = ['cover', 'portada', 'banner', 'hero', 'backdrop', 'background', 'fondo', 'image', 'imagen'];

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

function friendlyLegendError(message = 'No pudimos guardar la leyenda.') {
  return new Error(message);
}

function isInvalidId(value) {
  return !value || value === 'undefined' || String(value).trim() === '';
}

function isDev() {
  return import.meta.env.DEV;
}

function debugEditor(label, value) {
  if (isDev()) console.log(label, value);
}

function logCreatorServiceError(operation, context = {}) {
  if (isDev()) {
    console.error('[CreatorService] Error real:', {
      operation,
      ...context,
    });
  }
}

function logCreateLegendDraftError(step, context = {}) {
  if (isDev()) {
    console.error('[createLegendDraft] Error real:', {
      step,
      ...context,
    });
  }
}

function logDeleteSupabaseError(operation, error, context = {}) {
  if (isDev()) {
    console.error('[CreatorLegendDelete] Error real:', {
      step: operation,
      operation,
      ...context,
      error,
    });
  }
}

function logDeleteCreatorLegendError(operation, error, context = {}) {
  if (isDev()) {
    console.error('[deleteCreatorLegend] Error real:', {
      operation,
      ...context,
      error,
    });
  }
}

function createDeleteDraftError({
  message = DELETE_DRAFT_GENERIC_MESSAGE,
  operation = 'deleteLegendDraft',
  table = null,
  error = null,
} = {}) {
  const deleteError = friendlyLegendError(message);
  deleteError.operation = operation;
  deleteError.table = table;
  deleteError.supabaseError = error;
  return deleteError;
}

function createDeleteCreatorLegendError({
  message = DELETE_CREATOR_LEGEND_GENERIC_MESSAGE,
  operation = 'deleteCreatorLegend',
  table = null,
  error = null,
} = {}) {
  const deleteError = friendlyLegendError(message);
  deleteError.operation = operation;
  deleteError.table = table;
  deleteError.supabaseError = error;
  return deleteError;
}

function isLegendOwnedByCreator(legend, creatorCandidates = []) {
  if (!legend?.creator_id) return false;
  return creatorCandidates.map(String).includes(String(legend.creator_id));
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function normalizeLegendListItem(legend) {
  return {
    ...legend,
    id: legend.id,
    version_id: legend.version_id ?? legend.legend_versions?.[0]?.id ?? null,
  };
}

function normalizeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getAssetUrl(asset = {}) {
  const directUrl = asset.public_url || asset.file_url || asset.external_url || asset.url || '';
  if (directUrl) return directUrl;

  const storagePath = asset.storage_path || '';
  if (!storagePath) return null;
  if (/^(https?:|data:|blob:)/i.test(storagePath)) return storagePath;

  const cleanPath = storagePath.replace(new RegExp(`^${STORAGE_BUCKETS.assets}/`), '');
  const { data } = supabase?.storage?.from(STORAGE_BUCKETS.assets)?.getPublicUrl(cleanPath) ?? {};
  return data?.publicUrl || storagePath;
}

function getMediaType(media = {}) {
  return String(
    media.media_type
    || media.type
    || media.usage_context
    || media.context
    || media.role
    || media.asset_type
    || media.assets?.asset_type
    || media.asset?.asset_type
    || media.assets?.type
    || media.asset?.type
    || '',
  ).toLowerCase();
}

function getMediaAsset(media = {}) {
  return media.assets || media.asset || entryAssetFallback(media);
}

function getMediaUrl(media = {}) {
  return getAssetUrl(getMediaAsset(media));
}

function isImageMedia(media = {}) {
  const type = getMediaType(media);
  const asset = getMediaAsset(media);
  const mimeType = String(asset.mime_type || asset.content_type || '').toLowerCase();
  return IMAGE_ASSET_TYPES.includes(type) || mimeType.startsWith('image/');
}

function findMediaEntry(media = [], allowedTypes = []) {
  const matches = media.filter((entry) => allowedTypes.includes(getMediaType(entry)));
  return (
    matches.find((entry) => Boolean(entry.is_primary) && Boolean(getMediaUrl(entry)))
    || matches.find((entry) => Boolean(getMediaUrl(entry)))
    || matches.find((entry) => Boolean(entry.is_primary))
    || matches[0]
    || null
  );
}

function findPrimaryImageEntry(media = []) {
  const matches = media.filter((entry) => Boolean(entry.is_primary) && isImageMedia(entry));
  return matches.find((entry) => Boolean(getMediaUrl(entry))) || matches[0] || null;
}

function entryAssetFallback(entry = {}) {
  return {
    public_url: entry.public_url,
    file_url: entry.file_url,
    external_url: entry.external_url,
    url: entry.url,
    storage_path: entry.storage_path,
  };
}

function normalizeGenresFromRows(rows = []) {
  return rows
    .map((row) => row.genres || row.genre || row)
    .filter((genre) => genre?.id || genre?.name)
    .map((genre) => ({
      id: genre.id || genre.name,
      name: genre.name || 'Genero',
    }));
}

function normalizeCreatorLegendListItem(legend, {
  genresByLegendId = new Map(),
  mediaByLegendId = new Map(),
  pagesCountByLegendId = new Map(),
  reviewByLegendId = new Map(),
  versionByLegendId = new Map(),
  creatorProfile = null,
} = {}) {
  const normalized = normalizeLegendListItem(legend);
  const media = mediaByLegendId.get(legend.id) || [];
  const genres = genresByLegendId.get(legend.id) || [];
  const latestReview = reviewByLegendId.get(legend.id) || null;
  const latestVersion = versionByLegendId.get(legend.id) || null;
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
          : normalized.status;
  const coverMedia = findMediaEntry(media, MEDIA_TYPES.cover) || findPrimaryImageEntry(media);
  const bannerMedia = findMediaEntry(media, MEDIA_TYPES.banner);
  const backdropMedia = findMediaEntry(media, MEDIA_TYPES.backdrop);
  const coverUrl = (coverMedia ? getMediaUrl(coverMedia) : null) || legend.cover_url || legend.coverUrl || legend.poster_url || null;
  const bannerUrl = (bannerMedia ? getMediaUrl(bannerMedia) : null) || legend.banner_url || null;
  const backdropUrl = (backdropMedia ? getMediaUrl(backdropMedia) : null) || legend.backdrop_url || legend.background_url || bannerUrl || null;

  const enrichedLegend = {
    ...normalized,
    status: effectiveStatus,
    legendStatus: normalized.status,
    versionStatus,
    reviewStatus,
    reviewFeedback: latestReview?.feedback || '',
    latestReview,
    currentVersion: latestVersion,
    authorName: normalizeText(creatorProfile?.pen_name || legend.author_name || legend.creator_name || legend.pen_name, 'Autor sin alias'),
    genres,
    media,
    coverMedia,
    bannerMedia,
    backdropMedia,
    coverAsset: coverMedia ? getMediaAsset(coverMedia) : null,
    bannerAsset: bannerMedia ? getMediaAsset(bannerMedia) : null,
    coverUrl,
    bannerUrl,
    backdropUrl,
    pagesCount: pagesCountByLegendId.get(legend.id) || 0,
    shortSynopsis: normalizeText(legend.short_synopsis, legend.short_description || legend.synopsis || legend.description || ''),
  };
  const cardData = getCreatorLegendCardData(enrichedLegend);

  return {
    ...enrichedLegend,
    feedback: cardData.feedback,
    canEdit: cardData.canEdit,
    canDelete: cardData.canDelete,
    canSubmit: cardData.canSubmit,
    canView: cardData.canView,
    primaryActionLabel: cardData.primaryActionLabel,
    deleteActionLabel: cardData.deleteActionLabel,
  };
}

function createShortSynopsis(synopsis = '') {
  const cleanSynopsis = synopsis.trim().replace(/\s+/g, ' ');
  if (cleanSynopsis.length <= SHORT_SYNOPSIS_LENGTH) return cleanSynopsis;
  return `${cleanSynopsis.slice(0, SHORT_SYNOPSIS_LENGTH).trim()}...`;
}

function cleanLegendPayload(payload = {}) {
  const synopsis = payload.synopsis?.trim() || payload.short_synopsis?.trim() || '';
  return {
    title: payload.title?.trim(),
    slug: payload.slug?.trim(),
    short_synopsis: payload.short_synopsis?.trim() || createShortSynopsis(synopsis),
    synopsis,
    origin_place: payload.origin_place?.trim() || 'Bacalar',
    language: payload.language?.trim() || 'es',
    age_rating: payload.age_rating || 'general',
    access_type: payload.access_type || 'free',
    is_featured: Boolean(payload.is_featured),
  };
}

function validateLegendPayload(payload = {}) {
  if (!payload.title?.trim()) return friendlyLegendError('Completa los datos obligatorios.');
  if (!payload.slug?.trim()) return friendlyLegendError('Completa los datos obligatorios.');
  if (!payload.synopsis?.trim()) return friendlyLegendError('Agrega la sinopsis de la leyenda.');
  if (payload.synopsis.trim().length < 30) return friendlyLegendError('La sinopsis debe tener al menos 30 caracteres.');
  if (!ACCESS_TYPES.includes(payload.access_type)) return friendlyLegendError('Selecciona un tipo de acceso valido.');
  return null;
}

function normalizePages(pages = []) {
  return pages
    .filter((page) => !page._delete)
    .map((page, index) => ({
      id: page.id,
      page_number: Number(page.page_number || index + 1),
      title: page.title?.trim() || null,
      text_content: page.text_content?.trim() || '',
      editor_data: page.editor_data ?? null,
      rendered_html: page.rendered_html ?? null,
      content_format: page.content_format || (page.editor_data ? 'editorjs' : 'plain'),
    }))
    .sort((a, b) => a.page_number - b.page_number);
}

export function normalizeGenreName(name = '') {
  return String(name)
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|\s|-)([a-záéíóúñü])/g, (match) => match.toUpperCase());
}

function normalizeGenres(genres = []) {
  return [...new Set(genres.map((genre) => normalizeGenreName(
    typeof genre === 'string' ? genre : genre?.name,
  )).filter(Boolean))];
}

export async function getOrCreateGenresByNames(names = [], clientOverride = null) {
  const cleanedGenres = normalizeGenres(names);
  if (!cleanedGenres.length) return { data: [], error: null, missing: [] };

  const { data: client, error: clientError } = clientOverride ? { data: clientOverride, error: null } : getClient();
  if (clientError) return { data: [], error: clientError, missing: cleanedGenres };

  try {
    const { data: existingGenres, error: existingError } = await client
      .from('genres')
      .select('id, name')
      .order('name', { ascending: true });

    if (existingError) {
      console.error('getOrCreateGenresByNames error', existingError);
      return {
        data: [],
        error: friendlyLegendError('No pudimos guardar algunos generos nuevos. Revisa permisos o usa generos existentes.'),
        missing: cleanedGenres,
      };
    }

    const existing = existingGenres ?? [];
    const found = [];
    const missing = [];

    for (const name of cleanedGenres) {
      const match = existing.find((genre) => (
        normalizeGenreName(genre.name) === name
      ));
      if (match?.id) found.push(match);
      else missing.push(name);
    }

    const created = [];
    for (const name of missing) {
      const { data, error } = await client
        .from('genres')
        .insert({ name })
        .select('id, name')
        .single();

      if (error) {
        console.error('getOrCreateGenresByNames insert error', error);
        return {
          data: [...found, ...created],
          error: friendlyLegendError('No pudimos guardar algunos generos nuevos. Revisa permisos o usa generos existentes.'),
          missing,
        };
      }

      if (data?.id) created.push(data);
    }

    return { data: [...found, ...created], error: null, missing: [] };
  } catch (error) {
    console.error('getOrCreateGenresByNames error', error);
    return {
      data: [],
      error: friendlyLegendError('No pudimos guardar algunos generos nuevos. Revisa permisos o usa generos existentes.'),
      missing: cleanedGenres,
    };
  }
}

export async function updateLegendGenres(legendId, genreNames = [], { replace = false, client: clientOverride = null } = {}) {
  const cleanedGenres = normalizeGenres(genreNames);
  const { data: client, error: clientError } = clientOverride ? { data: clientOverride, error: null } : getClient();
  if (clientError) return { data: [], error: clientError };

  try {
    if (replace) {
      const { error: deleteError } = await client.from('legend_genres').delete().eq('legend_id', legendId);
      if (deleteError) {
        console.error('updateLegendGenres error', deleteError);
        return { data: [], error: friendlyLegendError('No pudimos actualizar los generos de la leyenda.') };
      }
    }

    if (!cleanedGenres.length) return { data: [], error: null };

    const genresResult = await getOrCreateGenresByNames(cleanedGenres, client);
    const allGenres = genresResult.data.filter((genre) => genre?.id);
    if (!allGenres.length) return genresResult;

    const { data: existingLinks, error: linksError } = await client
      .from('legend_genres')
      .select('genre_id')
      .eq('legend_id', legendId);

    if (linksError) {
      console.error('updateLegendGenres error', linksError);
      return { data: allGenres, error: friendlyLegendError('No pudimos actualizar los generos de la leyenda.') };
    }

    const existingIds = new Set((existingLinks ?? []).map((link) => String(link.genre_id)));
    const linkPayloads = allGenres
      .filter((genre) => !existingIds.has(String(genre.id)))
      .map((genre) => ({
        legend_id: legendId,
        genre_id: genre.id,
      }));

    if (linkPayloads.length) {
      const { error: linkError } = await client.from('legend_genres').insert(linkPayloads);
      if (linkError) {
        console.error('updateLegendGenres error', linkError);
        return { data: allGenres, error: friendlyLegendError('No pudimos actualizar los generos de la leyenda.') };
      }
    }

    return { data: allGenres, error: genresResult.error };
  } catch (error) {
    console.error('updateLegendGenres error', error);
    return { data: [], error: friendlyLegendError('No pudimos actualizar los generos de la leyenda.') };
  }
}

async function saveLegendGenres(client, legendId, genres = [], { replace = false } = {}) {
  try {
    return updateLegendGenres(legendId, genres, { replace, client });
  } catch (error) {
    console.error(error);
    return { data: [], error: friendlyLegendError('No pudimos actualizar los generos de la leyenda.') };
  }
}

async function getLegendGenres(client, legendId) {
  if (isInvalidId(legendId)) return { data: [], error: null };

  const { data, error } = await client
    .from('legend_genres')
    .select('genres(id, name)')
    .eq('legend_id', legendId);

  if (error) {
    console.error('getLegendEditorData error', error);
    return { data: [], error: null };
  }

  return {
    data: (data ?? []).map((row) => row.genres).filter((genre) => genre?.id || genre?.name),
    error: null,
  };
}

export async function getAvailableGenres() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  try {
    const { data, error } = await client
      .from('genres')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('getAvailableGenres error', error);
      return { data: [], error: friendlyLegendError('No pudimos cargar los generos.') };
    }

    return { data: data ?? [], error: null };
  } catch (error) {
    console.error('getAvailableGenres error', error);
    return { data: [], error: friendlyLegendError('No pudimos cargar los generos.') };
  }
}

export async function getCurrentCreatorReviewData() {
  try {
    const { data: accessStatus, error } = await ensureCreatorCanCreate();
    if (error) {
      console.error('getCurrentCreatorReviewData error', error);
      return { data: null, error };
    }

    const profile = accessStatus?.creatorProfile ?? null;
    return {
      data: {
        userId: accessStatus?.userId ?? null,
        userLabel: accessStatus?.userId ?? null,
        penName: profile?.pen_name ?? null,
        status: profile?.status ?? null,
        profile,
      },
      error: null,
    };
  } catch (error) {
    console.error('getCurrentCreatorReviewData error', error);
    return { data: null, error };
  }
}

async function getLatestVersion(client, legendId) {
  const { data, error } = await client
    .from('legend_versions')
    .select('*')
    .eq('legend_id', legendId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error };
  return { data, error: null };
}

async function getLatestEditableVersion(client, legendId) {
  const { data, error } = await client
    .from('legend_versions')
    .select('*')
    .eq('legend_id', legendId)
    .in('status', EDITABLE_VERSION_STATUSES)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error };
  return { data, error: null };
}

async function getVersionByNumber(client, legendId, versionNumber) {
  const { data, error } = await client
    .from('legend_versions')
    .select('*')
    .eq('legend_id', legendId)
    .eq('version_number', versionNumber)
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error };
  return { data, error: null };
}

async function createDraftVersion(client, legendId, latestVersion = null, createdBy) {
  if (isInvalidId(legendId)) return { data: null, error: friendlyLegendError('No pudimos crear la version inicial.') };
  if (isInvalidId(createdBy)) return { data: null, error: friendlyLegendError('No pudimos crear la version inicial.') };

  const nextVersionNumber = Number(latestVersion?.version_number || 0) + 1;
  const versionNumber = nextVersionNumber || 1;
  const existingResult = await getVersionByNumber(client, legendId, versionNumber);

  if (existingResult.error) {
    console.error('create initial version error', existingResult.error);
    return { data: null, error: existingResult.error };
  }

  if (existingResult.data?.id) return { data: existingResult.data, error: null };

  const versionPayload = {
    legend_id: legendId,
    version_number: versionNumber,
    status: 'draft',
    created_by: createdBy,
  };
  debugEditor('creating initial version', versionPayload);

  const { data, error } = await client
    .from('legend_versions')
    .insert(versionPayload)
    .select()
    .single();

  if (error) {
    console.error('create initial version error', error);
    console.error('create initial legend version error', error);
    console.error('create legend version error', error);

    const retryExistingResult = await getVersionByNumber(client, legendId, versionNumber);
    if (!retryExistingResult.error && retryExistingResult.data?.id) {
      return { data: retryExistingResult.data, error: null };
    }

    return { data: null, error };
  }
  return { data, error: null };
}

async function resolveLegendForEditor(client, identifier) {
  const lookupValue = String(identifier || '').trim();
  if (isInvalidId(lookupValue)) return { data: null, error: friendlyLegendError('No pudimos cargar la leyenda.') };

  const lookupAttempts = [];

  if (isUuidLike(lookupValue)) {
    lookupAttempts.push(
      client
        .from('legends')
        .select('*')
        .eq('id', lookupValue)
        .maybeSingle()
        .then((result) => ({ ...result, source: 'legend.id' })),
    );
  }

  lookupAttempts.push(
    client
      .from('legends')
      .select('*')
      .eq('slug', lookupValue)
      .maybeSingle()
      .then((result) => ({ ...result, source: 'legend.slug' })),
  );

  if (isUuidLike(lookupValue)) {
    lookupAttempts.push(
      client
        .from('legend_versions')
        .select('legend_id')
        .eq('id', lookupValue)
        .maybeSingle()
        .then(async (versionResult) => {
          if (versionResult.error || !versionResult.data?.legend_id) {
            return { data: null, error: versionResult.error, source: 'legend_versions.id' };
          }

          const legendResult = await client
            .from('legends')
            .select('*')
            .eq('id', versionResult.data.legend_id)
            .maybeSingle();
          return { ...legendResult, source: 'legend_versions.id' };
        }),
    );
  }

  let firstError = null;
  for (const attempt of lookupAttempts) {
    const result = await attempt;
    if (result.error) {
      firstError = firstError || result.error;
      console.error('getLegendEditorData error', result.error);
      continue;
    }
    if (result.data?.id) {
      debugEditor('resolved legend source', result.source);
      return { data: result.data, error: null };
    }
  }

  return { data: null, error: firstError };
}

async function validateLegendOwnership(client, legend, accessStatus, creatorCandidates) {
  if (isLegendOwnedByCreator(legend, creatorCandidates)) return true;
  if (isInvalidId(legend?.creator_id)) return false;

  const creatorId = String(legend.creator_id);
  if (!isUuidLike(creatorId)) return false;
  const profileChecks = [
    client
      .from('creator_profiles')
      .select('*')
      .eq('user_id', creatorId)
      .limit(1)
      .maybeSingle(),
  ];

  for (const profileCheck of profileChecks) {
    const { data, error } = await profileCheck;
    if (error) {
      console.error('getLegendEditorData error', error);
      continue;
    }

    if (
      data
      && (
        String(data.user_id) === String(accessStatus?.userId)
        || creatorCandidates.map(String).includes(String(data.user_id))
      )
    ) {
      return true;
    }
  }

  return false;
}

async function getAvailableLegendSlug(client, requestedSlug) {
  const baseSlug = String(requestedSlug || '')
    .trim()
    .replace(/^-+|-+$/g, '')
    || `leyenda-${Date.now()}`;

  const { data, error } = await client
    .from('legends')
    .select('slug')
    .ilike('slug', `${baseSlug}%`);

  if (error) {
    logCreateLegendDraftError('check unique slug', {
      table: 'legends',
      payload: { slug: baseSlug },
      error,
    });
    return baseSlug;
  }

  const existingSlugs = new Set((data ?? []).map((legend) => legend.slug).filter(Boolean));
  if (!existingSlugs.has(baseSlug)) return baseSlug;

  let suffix = 2;
  let candidate = `${baseSlug}-${suffix}`;
  while (existingSlugs.has(candidate)) {
    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }

  return candidate;
}

function isDuplicateLegendSlugError(error) {
  return error?.code === '23505'
    && String(error?.message || error?.details || '').toLowerCase().includes('slug');
}

function getNextSlugCandidate(slug) {
  const match = String(slug || '').match(/^(.*?)-(\d+)$/);
  if (!match) return `${slug}-2`;
  return `${match[1]}-${Number(match[2]) + 1}`;
}

async function insertLegendWithCreatorCandidates(client, payload, creatorCandidates) {
  let lastError = null;

  for (const creatorId of creatorCandidates) {
    let nextPayload = { ...payload };

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const insertPayload = { ...nextPayload, creator_id: creatorId, status: 'draft' };
      const { data, error } = await client
        .from('legends')
        .insert(insertPayload)
        .select()
        .single();

      if (!error && data?.id) return { data, error: null };
      lastError = error;
      logCreateLegendDraftError('insert legends', {
        table: 'legends',
        creatorId,
        attempt,
        payload: insertPayload,
        error,
      });

      if (!isDuplicateLegendSlugError(error)) break;
      nextPayload = { ...nextPayload, slug: getNextSlugCandidate(nextPayload.slug) };
    }
  }

  return { data: null, error: lastError };
}

function withCreatorFilter(query, creatorCandidates) {
  if (creatorCandidates.length === 1) return query.eq('creator_id', creatorCandidates[0]);
  return query.in('creator_id', creatorCandidates);
}

async function getCreatorGenresByLegendId(client, legendIds = []) {
  if (!legendIds.length) return { data: new Map(), error: null };

  const { data, error } = await client
    .from('legend_genres')
    .select('legend_id, genres(id, name)')
    .in('legend_id', legendIds);

  if (error) {
    if (isDev()) {
      console.error('[CreatorLegendService] Error real:', {
        functionName: 'getCreatorGenresByLegendId',
        step: 'select legend_genres',
        table: 'legend_genres',
        error,
      });
    }
    return { data: new Map(), error: null };
  }

  const map = new Map();
  for (const row of data ?? []) {
    const current = map.get(row.legend_id) || [];
    map.set(row.legend_id, [...current, ...normalizeGenresFromRows([row])]);
  }
  return { data: map, error: null };
}

async function getCreatorMediaByLegendId(client, legendIds = []) {
  if (!legendIds.length) return { data: new Map(), error: null };

  const { data: mediaRows, error } = await client
    .from('legend_media')
    .select('*')
    .in('legend_id', legendIds);

  if (error) {
    if (isDev()) {
      console.error('[CreatorLegendService] Error real:', {
        functionName: 'getCreatorMediaByLegendId',
        step: 'select legend_media',
        table: 'legend_media',
        error,
      });
    }
    return { data: new Map(), error: null };
  }

  const assetIds = [...new Set((mediaRows ?? []).map((row) => row.asset_id).filter(Boolean))];
  let assetsById = new Map();

  if (assetIds.length) {
    const { data: assets, error: assetsError } = await client
      .from('assets')
      .select('*')
      .in('id', assetIds);

    if (assetsError) {
      if (isDev()) {
        console.error('[CreatorLegendService] Error real:', {
          functionName: 'getCreatorMediaByLegendId',
          step: 'select assets',
          table: 'assets',
          error: assetsError,
        });
      }
    } else {
      assetsById = new Map((assets ?? []).map((asset) => [String(asset.id), asset]));
    }
  }

  const map = new Map();
  for (const row of mediaRows ?? []) {
    const rowWithAsset = {
      ...row,
      assets: row.asset_id ? assetsById.get(String(row.asset_id)) || null : null,
    };
    const current = map.get(row.legend_id) || [];
    map.set(row.legend_id, [...current, rowWithAsset]);
  }
  return { data: map, error: null };
}

async function getCreatorPagesCountByLegendId(client, legendIds = []) {
  if (!legendIds.length) return { data: new Map(), error: null };

  const { data: versions, error: versionsError } = await client
    .from('legend_versions')
    .select('id, legend_id, version_number, created_at')
    .in('legend_id', legendIds);

  if (versionsError) {
    if (isDev()) {
      console.error('[CreatorLegendService] Error real:', {
        functionName: 'getCreatorPagesCountByLegendId',
        step: 'select legend_versions',
        table: 'legend_versions',
        error: versionsError,
      });
    }
    return { data: new Map(), error: null };
  }

  const latestVersionByLegendId = new Map();
  for (const version of versions ?? []) {
    const current = latestVersionByLegendId.get(version.legend_id);
    const currentNumber = Number(current?.version_number || 0);
    const nextNumber = Number(version.version_number || 0);
    if (!current || nextNumber > currentNumber) {
      latestVersionByLegendId.set(version.legend_id, version);
    }
  }

  const versionToLegendId = new Map(
    [...latestVersionByLegendId.values()].map((version) => [String(version.id), version.legend_id]),
  );
  const versionIds = [...versionToLegendId.keys()];
  if (!versionIds.length) return { data: new Map(), error: null };

  const { data: pages, error: pagesError } = await client
    .from('legend_pages')
    .select('version_id')
    .in('version_id', versionIds);

  if (pagesError) {
    if (isDev()) {
      console.error('[CreatorLegendService] Error real:', {
        functionName: 'getCreatorPagesCountByLegendId',
        step: 'select legend_pages',
        table: 'legend_pages',
        error: pagesError,
      });
    }
    return { data: new Map(), error: null };
  }

  const counts = new Map();
  for (const page of pages ?? []) {
    const legendId = versionToLegendId.get(String(page.version_id));
    if (!legendId) continue;
    counts.set(legendId, (counts.get(legendId) || 0) + 1);
  }
  return { data: counts, error: null };
}

async function getCreatorReviewStateByLegendId(client, legendIds = []) {
  if (!legendIds.length) return { reviews: new Map(), versions: new Map() };

  const { data: versions, error: versionsError } = await client
    .from('legend_versions')
    .select('id, legend_id, version_number, status, review_notes, submitted_at, published_at, created_at')
    .in('legend_id', legendIds)
    .order('version_number', { ascending: false });

  if (versionsError) {
    if (isDev()) {
      console.error('[CreatorLegendService] Error real:', {
        functionName: 'getCreatorReviewStateByLegendId',
        step: 'select legend_versions',
        table: 'legend_versions',
        error: versionsError,
      });
    }
    return { reviews: new Map(), versions: new Map() };
  }

  const versionByLegendId = new Map();
  for (const version of versions ?? []) {
    if (!versionByLegendId.has(version.legend_id)) versionByLegendId.set(version.legend_id, version);
  }

  const versionToLegendId = new Map((versions ?? []).map((version) => [String(version.id), version.legend_id]));
  const versionIds = [...versionToLegendId.keys()];
  if (!versionIds.length) return { reviews: new Map(), versions: versionByLegendId };

  const { data: reviews, error: reviewsError } = await client
    .from('content_reviews')
    .select('id, legend_version_id, status, feedback, created_at, reviewed_at')
    .in('legend_version_id', versionIds)
    .order('created_at', { ascending: false });

  if (reviewsError) {
    if (isDev()) {
      console.error('[CreatorLegendService] Error real:', {
        functionName: 'getCreatorReviewStateByLegendId',
        step: 'select content_reviews',
        table: 'content_reviews',
        error: reviewsError,
      });
    }
    return { reviews: new Map(), versions: versionByLegendId };
  }

  const reviewByLegendId = new Map();
  for (const review of reviews ?? []) {
    const legendId = versionToLegendId.get(String(review.legend_version_id));
    if (!legendId || reviewByLegendId.has(legendId)) continue;
    reviewByLegendId.set(legendId, review);
  }

  return { reviews: reviewByLegendId, versions: versionByLegendId };
}

function getSettledCreatorData(result, fallback, context = {}) {
  if (result.status === 'fulfilled') return result.value;
  if (isDev()) {
    console.error('[CreatorLegendService] Error real:', {
      operation: 'enrichCreatorLegends',
      ...context,
      error: result.reason,
    });
  }
  return fallback;
}

async function enrichCreatorLegends(client, legends = [], creatorProfile = null) {
  const legendIds = legends.map((legend) => legend.id).filter(Boolean);
  const [genresSettled, mediaSettled, pagesCountSettled, reviewStateSettled] = await Promise.allSettled([
    getCreatorGenresByLegendId(client, legendIds),
    getCreatorMediaByLegendId(client, legendIds),
    getCreatorPagesCountByLegendId(client, legendIds),
    getCreatorReviewStateByLegendId(client, legendIds),
  ]);
  const genresResult = getSettledCreatorData(
    genresSettled,
    { data: new Map(), error: null },
    { step: 'load genres', table: 'legend_genres' },
  );
  const mediaResult = getSettledCreatorData(
    mediaSettled,
    { data: new Map(), error: null },
    { step: 'load media', table: 'legend_media/assets' },
  );
  const pagesCountResult = getSettledCreatorData(
    pagesCountSettled,
    { data: new Map(), error: null },
    { step: 'load page counts', table: 'legend_versions/legend_pages' },
  );
  const reviewState = getSettledCreatorData(
    reviewStateSettled,
    { reviews: new Map(), versions: new Map() },
    { step: 'load review state', table: 'legend_versions/content_reviews' },
  );

  return legends.map((legend) => normalizeCreatorLegendListItem(legend, {
    genresByLegendId: genresResult.data,
    mediaByLegendId: mediaResult.data,
    pagesCountByLegendId: pagesCountResult.data,
    reviewByLegendId: reviewState.reviews,
    versionByLegendId: reviewState.versions,
    creatorProfile,
  }));
}

export async function createLegendDraft(payload, pages = []) {
  let cleanedPayload = cleanLegendPayload(payload);
  const genres = normalizeGenres(payload.genres ?? []);
  const validationError = validateLegendPayload(cleanedPayload);
  if (validationError) return { data: null, error: validationError };

  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const { data: accessStatus, error: accessError } = await ensureCreatorCanCreate();
    if (accessError) return { data: null, error: accessError };
    const userId = accessStatus?.userId;
    debugEditor('createLegendDraft userId', userId);
    if (isInvalidId(userId)) return { data: null, error: friendlyLegendError('Debes iniciar sesion para continuar.') };

    const creatorCandidates = getCreatorIdCandidates(accessStatus);
    if (!creatorCandidates.length) {
      return { data: null, error: friendlyLegendError('Tu perfil de creador no se encontro. Vuelve a iniciar sesion o contacta al administrador.') };
    }

    const availableSlug = await getAvailableLegendSlug(client, cleanedPayload.slug);
    cleanedPayload = { ...cleanedPayload, slug: availableSlug };
    const { data: legend, error: legendError } = await insertLegendWithCreatorCandidates(client, cleanedPayload, creatorCandidates);

    if (legendError || !legend?.id) {
      logCreateLegendDraftError('insert legends failed', {
        table: 'legends',
        payload: cleanedPayload,
        creatorCandidates,
        error: legendError,
      });
      return { data: null, error: friendlyLegendError('No pudimos guardar la leyenda.') };
    }

    debugEditor('created legend', legend);
    const { data: version, error: versionError } = await createDraftVersion(client, legend.id, null, userId);

    if (versionError || !version?.id) {
      logCreateLegendDraftError('insert legend_versions failed', {
        table: 'legend_versions',
        payload: {
          legend_id: legend.id,
          version_number: 1,
          status: 'draft',
          created_by: userId,
        },
        error: versionError,
      });
      return { data: { legend, version: null, pages: [] }, error: friendlyLegendError('No pudimos crear la version inicial.') };
    }

    const genreResult = await saveLegendGenres(client, legend.id, genres);
    if (genreResult.error) {
      logCreateLegendDraftError('save genres warning', {
        table: 'legend_genres/genres',
        payload: { legendId: legend.id, genres },
        error: genreResult.error,
      });
    }

    const pagesResult = await saveLegendPages({ versionId: version.id, pages });
    if (pagesResult.error) {
      logCreateLegendDraftError('save pages failed', {
        table: 'legend_pages',
        payload: { versionId: version.id, pages },
        error: pagesResult.error,
      });
      return { data: { legend, version, pages: [] }, error: pagesResult.error };
    }

    return { data: { legend, version, pages: pagesResult.data, genreError: genreResult.error }, error: null };
  } catch (error) {
    logCreateLegendDraftError('unexpected', {
      table: 'legends',
      payload: cleanedPayload,
      error,
    });
    return { data: null, error: friendlyLegendError('No pudimos guardar la leyenda.') };
  }
}

export async function updateLegendDraft(legendId, payload) {
  if (isInvalidId(legendId)) return { data: null, error: friendlyLegendError('No pudimos guardar la leyenda.') };
  const cleanedPayload = cleanLegendPayload(payload);
  const genres = normalizeGenres(payload.genres ?? []);
  const validationError = validateLegendPayload(cleanedPayload);
  if (validationError) return { data: null, error: validationError };

  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const { data: accessStatus, error: accessError } = await ensureCreatorCanCreate();
    if (accessError) return { data: null, error: accessError };
    const creatorCandidates = getCreatorIdCandidates(accessStatus);
    if (!creatorCandidates.length) {
      return { data: null, error: friendlyLegendError('Tu perfil de creador no se encontro. Vuelve a iniciar sesion o contacta al administrador.') };
    }

    const { data: existingLegend, error: existingLegendError } = await resolveLegendForEditor(client, legendId);
    if (existingLegendError || !existingLegend) {
      console.error('getLegendEditorData error', existingLegendError);
      return { data: null, error: friendlyLegendError('No pudimos guardar la leyenda.') };
    }

    const ownsLegend = await validateLegendOwnership(client, existingLegend, accessStatus, creatorCandidates);
    if (!ownsLegend) {
      console.error('getLegendEditorData error', {
        reason: 'cannot update legend that does not belong to current creator',
        legendCreatorId: existingLegend.creator_id,
        creatorCandidates,
      });
      return { data: null, error: friendlyLegendError('No pudimos guardar la leyenda.') };
    }

    const query = client
      .from('legends')
      .update(cleanedPayload)
      .eq('id', existingLegend.id);
    const { data, error } = await query.select().single();

    if (error) {
      console.error(error);
      return { data: null, error: friendlyLegendError('No pudimos guardar la leyenda.') };
    }

    const genreResult = await saveLegendGenres(client, existingLegend.id, genres, { replace: true });

    return { data, error: null, genreError: genreResult.error };
  } catch (error) {
    console.error(error);
    return { data: null, error: friendlyLegendError('No pudimos guardar la leyenda.') };
  }
}

export async function updateLegendGeneralData(legendId, payload) {
  return updateLegendDraft(legendId, payload);
}

export async function getCreatorLegends({ limit = CREATOR_LEGENDS_DEFAULT_LIMIT } = {}) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  try {
    const { data: accessStatus, error: accessError } = await ensureCreatorCanCreate();
    if (accessError) return { data: [], error: accessError };
    const creatorCandidates = getCreatorIdCandidates(accessStatus);
    if (!creatorCandidates.length) {
      return { data: [], error: friendlyLegendError('Tu perfil de creador no se encontro. Vuelve a iniciar sesion o contacta al administrador.') };
    }

    let query = client
      .from('legends')
      .select('*')
      .order('created_at', { ascending: false });
    if (Number.isFinite(Number(limit)) && Number(limit) > 0) {
      query = query.limit(Number(limit));
    }
    const { data, error } = await withCreatorFilter(query, creatorCandidates);

    if (error) {
      logCreatorServiceError('getCreatorLegends', {
        table: 'legends',
        step: 'select creator legends',
        limit,
        error,
      });
      return { data: [], error: friendlyLegendError('No pudimos cargar tus leyendas.') };
    }

    const enrichedLegends = await enrichCreatorLegends(client, data ?? [], accessStatus.creatorProfile);
    return { data: enrichedLegends, error: null };
  } catch (error) {
    logCreatorServiceError('getCreatorLegends', {
      table: 'legends',
      step: 'unexpected',
      limit,
      error,
    });
    return { data: [], error: friendlyLegendError('No pudimos cargar tus leyendas.') };
  }
}

export async function getMyLegends() {
  return getCreatorLegends();
}

export async function getDrafts() {
  const { data, error } = await getMyLegends();
  if (error) return { data: [], error };
  return {
    data: (data ?? []).filter((legend) => isDraftCreatorLegend(legend)),
    error: null,
  };
}

export async function deleteLegendDraft(legendId) {
  if (isInvalidId(legendId)) {
    return {
      data: null,
      error: createDeleteDraftError({ message: 'No pudimos eliminar el borrador porque falta el ID de la leyenda.' }),
    };
  }

  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const { data, error } = await client.rpc('delete_legend_draft', {
      p_legend_id: legendId,
    });

    if (error) {
      logDeleteSupabaseError('rpc delete_legend_draft', error, {
        table: 'rpc/delete_legend_draft',
        legendId,
      });
      return {
        data: null,
        error: createDeleteDraftError({
          message: error.message || DELETE_DRAFT_GENERIC_MESSAGE,
          operation: 'rpc',
          table: 'delete_legend_draft',
          error,
        }),
      };
    }

    if (data?.success !== true) {
      const rpcError = createDeleteDraftError({
        message: DELETE_DRAFT_GENERIC_MESSAGE,
        operation: 'rpc',
        table: 'delete_legend_draft',
      });
      logDeleteSupabaseError('rpc delete_legend_draft returned without success', rpcError, {
        table: 'rpc/delete_legend_draft',
        legendId,
        data,
      });
      return { data: null, error: rpcError };
    }

    return { data, error: null };
  } catch (error) {
    logDeleteSupabaseError('deleteLegendDraft unexpected error', error, { legendId });
    return {
      data: null,
      error: createDeleteDraftError({ operation: 'deleteLegendDraft', error }),
    };
  }
}

export async function deleteCreatorLegend(legendId, { status = null } = {}) {
  if (isInvalidId(legendId)) {
    return {
      data: null,
      error: createDeleteCreatorLegendError({ message: 'No pudimos eliminar la historia porque falta el ID de la leyenda.' }),
    };
  }

  const statusKey = getCreatorLegendStatusKey(status || 'draft');
  if (!canDeleteCreatorLegend(statusKey)) {
    return {
      data: null,
      error: createDeleteCreatorLegendError({
        message: 'Esta historia no puede eliminarse desde creador por su estado actual.',
        operation: 'validate status',
      }),
    };
  }

  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const { data, error } = await client.rpc('delete_creator_legend', {
      p_legend_id: legendId,
    });

    if (error) {
      logDeleteCreatorLegendError('rpc delete_creator_legend', error, {
        legendId,
        status: statusKey,
      });
      logDeleteSupabaseError('rpc delete_creator_legend', error, {
        table: 'rpc/delete_creator_legend',
        legendId,
        status: statusKey,
      });
      return {
        data: null,
        error: createDeleteCreatorLegendError({
          message: error.message || DELETE_CREATOR_LEGEND_GENERIC_MESSAGE,
          operation: 'rpc',
          table: 'delete_creator_legend',
          error,
        }),
      };
    }

    if (data?.success !== true) {
      const rpcError = createDeleteCreatorLegendError({
        operation: 'rpc',
        table: 'delete_creator_legend',
      });
      logDeleteCreatorLegendError('rpc delete_creator_legend returned without success', rpcError, {
        legendId,
        status: statusKey,
        data,
      });
      logDeleteSupabaseError('rpc delete_creator_legend returned without success', rpcError, {
        table: 'rpc/delete_creator_legend',
        legendId,
        status: statusKey,
        data,
      });
      return { data: null, error: rpcError };
    }

    return { data, error: null };
  } catch (error) {
    logDeleteCreatorLegendError('deleteCreatorLegend unexpected error', error, {
      legendId,
      status: statusKey,
    });
    logDeleteSupabaseError('deleteCreatorLegend unexpected error', error, {
      legendId,
      status: statusKey,
    });
    return {
      data: null,
      error: createDeleteCreatorLegendError({ operation: 'deleteCreatorLegend', error }),
    };
  }
}

export async function getCurrentEditableVersion(legendId) {
  if (isInvalidId(legendId)) return { data: null, error: friendlyLegendError('No pudimos cargar la version de trabajo.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const editableResult = await getLatestEditableVersion(client, legendId);
    if (editableResult.error) {
      console.error('getLegendEditorData error', editableResult.error);
      return { data: null, error: friendlyLegendError('No pudimos cargar la version de trabajo.') };
    }
    if (editableResult.data) return { data: editableResult.data, error: null };

    const { data: latestVersion, error } = await getLatestVersion(client, legendId);
    if (error) {
      console.error('getLegendEditorData error', error);
      return { data: null, error: friendlyLegendError('No pudimos cargar la version de trabajo.') };
    }
    return { data: latestVersion, error: null };
  } catch (error) {
    console.error('getLegendEditorData error', error);
    return { data: null, error: friendlyLegendError('No pudimos cargar la version de trabajo.') };
  }
}

export async function getCurrentDraftVersion(legendId) {
  return getCurrentEditableVersion(legendId);
}

export async function getLegendEditorData(legendId) {
  if (isInvalidId(legendId)) return { data: null, error: friendlyLegendError('No pudimos cargar la leyenda.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    debugEditor('editor legendId', legendId);
    const { data: accessStatus, error: accessError } = await ensureCreatorCanCreate();
    if (accessError) return { data: null, error: accessError };
    debugEditor('current creator profile', accessStatus?.creatorProfile);
    const userId = accessStatus?.userId;
    if (isInvalidId(userId)) return { data: null, error: friendlyLegendError('Debes iniciar sesion para continuar.') };

    const creatorCandidates = getCreatorIdCandidates(accessStatus);
    if (!creatorCandidates.length) {
      return { data: null, error: friendlyLegendError('Tu perfil de creador no se encontro. Vuelve a iniciar sesion o contacta al administrador.') };
    }

    const { data: legend, error: legendError } = await resolveLegendForEditor(client, legendId);
    debugEditor('loaded legend', legend);

    if (legendError || !legend) {
      console.error('getLegendEditorData error', legendError);
      return { data: null, error: friendlyLegendError('No pudimos cargar la leyenda.') };
    }

    const ownsLegend = await validateLegendOwnership(client, legend, accessStatus, creatorCandidates);
    if (!ownsLegend) {
      console.error('getLegendEditorData error', {
        reason: 'legend does not belong to current creator',
        legendCreatorId: legend.creator_id,
        creatorCandidates,
      });
      return { data: null, error: friendlyLegendError('No pudimos cargar la leyenda.') };
    }

    const editableVersionResult = await getLatestEditableVersion(client, legend.id);
    if (editableVersionResult.error) {
      console.error('getLegendEditorData error', editableVersionResult.error);
      return { data: null, error: friendlyLegendError('No pudimos cargar la version de trabajo.') };
    }

    let version = editableVersionResult.data;
    const latestVersionResult = await getLatestVersion(client, legend.id);
    if (latestVersionResult.error) {
      console.error('getLegendEditorData error', latestVersionResult.error);
      return { data: null, error: friendlyLegendError('No pudimos cargar la version de trabajo.') };
    }

    if (!version) {
      const latestVersion = latestVersionResult.data;

      if (!latestVersion) {
        debugEditor('missing legend version', 'Esta leyenda no tenia version inicial. Preparando version draft.');
        const { data: createdVersion, error: createVersionError } = await createDraftVersion(client, legend.id, latestVersion, userId);

        if (createVersionError) {
          console.error('createLegendDraft versionError', createVersionError);
          console.error('recover version error', createVersionError);
          console.error('getLegendEditorData error', createVersionError);
          return { data: null, error: friendlyLegendError('No pudimos crear la version inicial.') };
        }
        version = createdVersion;
      } else {
        version = latestVersion;
      }
    }

    if (!version?.id) {
      return { data: null, error: friendlyLegendError('No pudimos cargar la version de trabajo.') };
    }

    debugEditor('loaded version', version);
    debugEditor('versionId', version.id);
    const { data: pages, error: pagesError } = await client
      .from('legend_pages')
      .select('*')
      .eq('version_id', version.id)
      .order('page_number', { ascending: true });
    debugEditor('pages loaded', pages ?? []);

    if (pagesError) {
      console.error('getLegendEditorData error', pagesError);
    }

    const resourcesResult = await getLegendResources(legend.id);
    const resources = resourcesResult.data ?? { media: [], documents: [], arScenes: [], arMarkers: [] };
    const genresResult = await getLegendGenres(client, legend.id);

    return {
      data: {
        legend,
        version,
        pages: pages ?? [],
        genres: genresResult.data ?? [],
        media: resources.media ?? [],
        sourceDocuments: resources.documents ?? [],
        arScenes: resources.arScenes ?? [],
        arMarkers: resources.arMarkers ?? [],
        resources,
      },
      error: pagesError ? friendlyLegendError('No pudimos cargar las paginas.') : null,
    };
  } catch (error) {
    console.error('getLegendEditorData error', error);
    return { data: null, error: friendlyLegendError('No pudimos cargar la leyenda.') };
  }
}

export async function saveLegendPages({ versionId, pages = [] }) {
  if (isInvalidId(versionId)) return { data: [], error: friendlyLegendError('No pudimos guardar las paginas.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  try {
    debugEditor('versionId', versionId);
    const deletedIds = pages.filter((page) => page._delete && page.id).map((page) => page.id);
    if (deletedIds.length) {
      const { error: deleteError } = await client.from('legend_pages').delete().in('id', deletedIds);
      if (deleteError) {
        console.error('saveLegendPage error', deleteError);
        return { data: [], error: friendlyLegendError('No pudimos guardar las paginas.') };
      }
    }

    const normalizedPages = normalizePages(pages);
    const savedPages = [];

    for (const page of normalizedPages) {
      const payload = {
        version_id: versionId,
        page_number: page.page_number,
        title: page.title,
        text_content: page.text_content,
        editor_data: page.editor_data,
        rendered_html: page.rendered_html,
        content_format: page.content_format,
      };

      const query = page.id
        ? client.from('legend_pages').update(payload).eq('id', page.id).select().single()
        : client.from('legend_pages').insert(payload).select().single();

      const { data, error } = await query;
      if (error) {
        console.error('saveLegendPage error', error);
        return { data: savedPages, error: friendlyLegendError('No pudimos guardar las paginas.') };
      }
      savedPages.push(data);
    }

    return {
      data: savedPages.sort((a, b) => a.page_number - b.page_number),
      error: null,
    };
  } catch (error) {
    console.error('saveLegendPage error', error);
    return { data: [], error: friendlyLegendError('No pudimos guardar las paginas.') };
  }
}

export async function createLegendPage({ versionId, pageNumber, title, textContent }) {
  if (isInvalidId(versionId)) return { data: null, error: friendlyLegendError('No pudimos guardar la pagina.') };
  const page = {
    page_number: pageNumber,
    title,
    text_content: textContent ?? '',
  };
  const result = await saveLegendPages({ versionId, pages: [page] });
  return { data: result.data?.[0] ?? null, error: result.error };
}

export async function updateLegendPage({ pageId, title, textContent, pageNumber }) {
  if (isInvalidId(pageId)) return { data: null, error: friendlyLegendError('No pudimos guardar la pagina.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const payload = {
      title: title?.trim() || null,
      text_content: textContent ?? '',
      page_number: Number(pageNumber || 1),
    };
    const { data, error } = await client
      .from('legend_pages')
      .update(payload)
      .eq('id', pageId)
      .select()
      .single();

    if (error) {
      console.error('saveLegendPage error', error);
      return { data: null, error: friendlyLegendError('No pudimos guardar la pagina.') };
    }

    return { data, error: null };
  } catch (error) {
    console.error('saveLegendPage error', error);
    return { data: null, error: friendlyLegendError('No pudimos guardar la pagina.') };
  }
}

export async function saveLegendPage({ versionId, page }) {
  if (isInvalidId(versionId)) return { data: null, error: friendlyLegendError('No pudimos guardar la pagina.') };
  const result = await saveLegendPages({ versionId, pages: [page] });
  return { data: result.data?.[0] ?? null, error: result.error };
}

export async function deleteLegendPage(pageId) {
  if (isInvalidId(pageId)) return { data: null, error: friendlyLegendError('No pudimos eliminar la pagina.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const { data, error } = await client.from('legend_pages').delete().eq('id', pageId).select().maybeSingle();
    if (error) {
      console.error('saveLegendPage error', error);
      return { data: null, error: friendlyLegendError('No pudimos eliminar la pagina.') };
    }
    return { data, error: null };
  } catch (error) {
    console.error('saveLegendPage error', error);
    return { data: null, error: friendlyLegendError('No pudimos eliminar la pagina.') };
  }
}

export function canEditVersion(version) {
  return EDITABLE_VERSION_STATUSES.includes(version?.status || 'draft');
}

export function validateReadyForReview({ legend, pages, requirePages = true, hasSourceDocument = false }) {
  const validationError = validateLegendPayload(cleanLegendPayload(legend));
  if (validationError) return validationError;
  const validPages = normalizePages(pages).filter((page) => page.text_content);
  if (requirePages && !validPages.length) return friendlyLegendError('Agrega al menos una pagina antes de enviar a revision.');
  if (!requirePages && !hasSourceDocument) return friendlyLegendError('Guarda el documento fuente antes de enviar a revision.');
  return null;
}

export async function submitLegendForReview(versionId) {
  if (isInvalidId(versionId)) return { data: null, error: friendlyLegendError('No pudimos enviar la leyenda a revision.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const { data, error } = await client.rpc('submit_legend_version_for_review', { p_version_id: versionId });
    if (error) {
      console.error('submit review error', error);
      return { data: null, error: friendlyLegendError('No pudimos enviar la leyenda a revision.') };
    }
    return { data, error: null };
  } catch (error) {
    console.error('submit review error', error);
    return { data: null, error: friendlyLegendError('No pudimos enviar la leyenda a revision.') };
  }
}
