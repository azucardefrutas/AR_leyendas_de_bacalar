import { getCurrentUser } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

const MEDIA_TYPES = {
  cover: ['cover', 'portada'],
  banner: ['banner', 'hero'],
  backdrop: ['backdrop', 'background', 'fondo'],
};

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

function normalizeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getAssetUrl(asset = {}) {
  return (
    asset.public_url ||
    asset.file_url ||
    asset.external_url ||
    asset.url ||
    asset.storage_path ||
    null
  );
}

function getMediaType(media = {}) {
  return String(media.media_type || media.type || media.asset_type || '').toLowerCase();
}

function findMediaUrl(media = [], allowedTypes = []) {
  const item = media.find((entry) => allowedTypes.includes(getMediaType(entry)));
  return item ? getAssetUrl(item.assets || item.asset || item) : null;
}

function normalizeGenresFromRows(rows = []) {
  return rows
    .map((row) => row.genres || row.genre || row)
    .filter((genre) => genre?.id || genre?.name)
    .map((genre) => ({
      id: genre.id || genre.name,
      name: genre.name || 'Genero',
      slug: genre.slug || null,
    }));
}

function normalizeLegend(legend, { creatorsByUserId = new Map(), genresByLegendId = new Map(), mediaByLegendId = new Map() } = {}) {
  if (!legend) return null;
  const creator = creatorsByUserId.get(String(legend.creator_id)) || legend.creator_profiles || null;
  const media = mediaByLegendId.get(legend.id) || [];
  const genres = genresByLegendId.get(legend.id) || [];
  const coverUrl = findMediaUrl(media, MEDIA_TYPES.cover) || legend.cover_url || legend.coverUrl || legend.poster_url || null;
  const bannerUrl = findMediaUrl(media, MEDIA_TYPES.banner) || legend.banner_url || null;
  const backdropUrl = findMediaUrl(media, MEDIA_TYPES.backdrop) || legend.backdrop_url || legend.background_url || bannerUrl || null;

  return {
    ...legend,
    authorName: normalizeText(creator?.pen_name || legend.author_name || legend.creator_name || legend.pen_name, 'Autor no disponible'),
    genres,
    coverUrl,
    bannerUrl,
    backdropUrl,
    synopsis: normalizeText(legend.synopsis, legend.description || legend.short_synopsis || legend.short_description || ''),
    shortSynopsis: normalizeText(legend.short_synopsis, legend.short_description || legend.synopsis || legend.description || ''),
  };
}

async function getCreatorsByUserId(client, creatorIds = []) {
  const ids = [...new Set(creatorIds.filter(Boolean).map(String))];
  if (!ids.length) return { data: new Map(), error: null };

  const { data, error } = await client
    .from('creator_profiles')
    .select('id, user_id, pen_name')
    .in('user_id', ids);

  if (error) {
    if (import.meta.env.DEV) console.error('getPublishedLegends creators error', error);
    return { data: new Map(), error: null };
  }

  return {
    data: new Map((data ?? []).map((creator) => [String(creator.user_id), creator])),
    error: null,
  };
}

async function getGenresByLegendId(client, legendIds = []) {
  if (!legendIds.length) return { data: new Map(), error: null };

  const { data, error } = await client
    .from('legend_genres')
    .select('legend_id, genres(id, name, slug)')
    .in('legend_id', legendIds);

  if (error) {
    if (import.meta.env.DEV) console.error('getPublishedLegends genres error', error);
    return { data: new Map(), error: null };
  }

  const map = new Map();
  for (const row of data ?? []) {
    const current = map.get(row.legend_id) || [];
    map.set(row.legend_id, [...current, ...normalizeGenresFromRows([row])]);
  }
  return { data: map, error: null };
}

async function getMediaByLegendId(client, legendIds = []) {
  if (!legendIds.length) return { data: new Map(), error: null };

  const { data, error } = await client
    .from('legend_media')
    .select('*, assets(*)')
    .in('legend_id', legendIds);

  if (error) {
    if (import.meta.env.DEV) console.error('getPublishedLegends media error', error);
    return { data: new Map(), error: null };
  }

  const map = new Map();
  for (const row of data ?? []) {
    const current = map.get(row.legend_id) || [];
    map.set(row.legend_id, [...current, row]);
  }
  return { data: map, error: null };
}

async function enrichPublishedLegends(client, legends = []) {
  const legendIds = legends.map((legend) => legend.id).filter(Boolean);
  const creatorIds = legends.map((legend) => legend.creator_id).filter(Boolean);
  const [creatorsResult, genresResult, mediaResult] = await Promise.all([
    getCreatorsByUserId(client, creatorIds),
    getGenresByLegendId(client, legendIds),
    getMediaByLegendId(client, legendIds),
  ]);

  return legends.map((legend) => normalizeLegend(legend, {
    creatorsByUserId: creatorsResult.data,
    genresByLegendId: genresResult.data,
    mediaByLegendId: mediaResult.data,
  }));
}

export async function getPublishedLegends() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('legends')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    if (import.meta.env.DEV) console.error('getPublishedLegends error', error);
    return { data: [], error: new Error('No pudimos cargar el catalogo.') };
  }

  return { data: await enrichPublishedLegends(client, data ?? []), error: null };
}

export async function getPublishedLegendBySlug(slug) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data, error } = await client
    .from('legends')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    if (import.meta.env.DEV) console.error('getPublishedLegendBySlug error', error);
    return { data: null, error: new Error('No pudimos cargar la leyenda.') };
  }

  const [legend] = await enrichPublishedLegends(client, data ? [data] : []);
  return { data: legend ?? null, error: null };
}

export async function getLegendBySlug(slug) {
  return getPublishedLegendBySlug(slug);
}

export async function getLegendPages(legendId) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const byLegend = await client
    .from('legend_versions')
    .select('id, status, version_number')
    .eq('legend_id', legendId)
    .in('status', ['published', 'approved'])
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  let versionId = byLegend.data?.id ?? null;

  if (byLegend.error) {
    if (import.meta.env.DEV) console.error('getLegendPages version lookup error', byLegend.error);
  }

  if (!versionId) {
    const byVersion = await client
      .from('legend_versions')
      .select('id')
      .eq('id', legendId)
      .in('status', ['published', 'approved'])
      .limit(1)
      .maybeSingle();

    if (byVersion.error) {
      if (import.meta.env.DEV) console.error('getLegendPages version fallback error', byVersion.error);
      return { data: [], error: byVersion.error };
    }

    versionId = byVersion.data?.id ?? null;
  }

  if (!versionId) return { data: [], error: null };

  const { data, error } = await client
    .from('legend_pages')
    .select('*')
    .eq('version_id', versionId)
    .order('page_number', { ascending: true });

  if (error) {
    if (import.meta.env.DEV) console.error('getLegendPages error', error);
  }

  return { data: data ?? [], error };
}

export async function getUserLegendAccess(legendId) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: userData, error: userError } = await getCurrentUser();
  if (userError) return { data: null, error: userError };
  if (!userData.user) return { data: null, error: null };

  return client
    .from('user_legend_access')
    .select('*')
    .eq('user_id', userData.user.id)
    .eq('legend_id', legendId)
    .maybeSingle();
}
