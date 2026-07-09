import { getCurrentUser } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

// Reader data layer: everything the "Mi biblioteca" experience needs.
// All reads are owner-scoped and rely on the RLS policies already in place
// (favorites / reading_progress / reviews / subscriptions / orders are all
// filtered by user_id = auth.uid()).

const COVER_TYPES = ['cover', 'portada'];

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

async function requireUser() {
  const { data: userData, error: userError } = await getCurrentUser();
  if (userError) return { user: null, error: userError };
  return { user: userData.user ?? null, error: null };
}

function assetUrl(asset = {}) {
  return asset.public_url || asset.file_url || asset.external_url || asset.url || asset.storage_path || null;
}

function mediaType(media = {}) {
  return String(media.media_type || media.type || media.asset_type || '').toLowerCase();
}

// Fetches lightweight legend info (title, slug, cover) for a set of ids so the
// reader cards can render without pulling the full catalog-enrichment pipeline.
async function getLegendsBriefByIds(client, ids = []) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map();

  const [{ data: legends }, { data: media }] = await Promise.all([
    client.from('legends').select('id, title, slug, short_synopsis, synopsis, access_type, status').in('id', unique),
    client.from('legend_media').select('legend_id, media_type, assets(*)').in('legend_id', unique),
  ]);

  const coverByLegend = new Map();
  for (const row of media ?? []) {
    if (coverByLegend.has(row.legend_id)) continue;
    if (COVER_TYPES.includes(mediaType(row))) {
      coverByLegend.set(row.legend_id, assetUrl(row.assets || {}));
    }
  }

  const map = new Map();
  for (const legend of legends ?? []) {
    map.set(legend.id, {
      id: legend.id,
      title: legend.title,
      slug: legend.slug,
      summary: legend.short_synopsis || legend.synopsis || '',
      access_type: legend.access_type || 'free',
      status: legend.status,
      coverUrl: coverByLegend.get(legend.id) || null,
    });
  }
  return map;
}

export async function getMyLibrary() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };
  const { user, error } = await requireUser();
  if (error) return { data: [], error };
  if (!user) return { data: [], error: null };

  const { data, error: accessError } = await client
    .from('user_legend_access')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (accessError) return { data: [], error: accessError };

  const rows = data ?? [];
  const briefs = await getLegendsBriefByIds(client, rows.map((r) => r.legend_id));
  const items = rows
    .map((row) => ({ ...row, legend: briefs.get(row.legend_id) || null }))
    .filter((row) => row.legend);

  return { data: items, error: null };
}

export async function getContinueReading() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };
  const { user, error } = await requireUser();
  if (error) return { data: [], error };
  if (!user) return { data: [], error: null };

  const { data, error: progressError } = await client
    .from('reading_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('completed', false)
    .order('updated_at', { ascending: false })
    .limit(6);

  if (progressError) return { data: [], error: progressError };

  const rows = data ?? [];
  const briefs = await getLegendsBriefByIds(client, rows.map((r) => r.legend_id));
  const items = rows
    .map((row) => ({ ...row, legend: briefs.get(row.legend_id) || null }))
    .filter((row) => row.legend);

  return { data: items, error: null };
}

export async function getMyFavorites() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };
  const { user, error } = await requireUser();
  if (error) return { data: [], error };
  if (!user) return { data: [], error: null };

  const { data, error: favError } = await client
    .from('favorites')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (favError) return { data: [], error: favError };

  const rows = data ?? [];
  const briefs = await getLegendsBriefByIds(client, rows.map((r) => r.legend_id));
  const items = rows
    .map((row) => ({ ...row, legend: briefs.get(row.legend_id) || null }))
    .filter((row) => row.legend);

  return { data: items, error: null };
}

// "Mi estanteria": stories the reader saved (shelf_items), with legend briefs
// for the carousel.
export async function getMyShelf() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };
  const { user, error } = await requireUser();
  if (error) return { data: [], error };
  if (!user) return { data: [], error: null };

  const { data, error: shelfError } = await client
    .from('shelf_items')
    .select('legend_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (shelfError) return { data: [], error: shelfError };

  const rows = data ?? [];
  const briefs = await getLegendsBriefByIds(client, rows.map((r) => r.legend_id));
  const items = rows
    .map((row) => ({ ...row, legend: briefs.get(row.legend_id) || null }))
    .filter((row) => row.legend);

  return { data: items, error: null };
}

// Just the ids the reader saved / favorited — used to light up the icons.
export async function getMyShelfIds() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };
  const { user, error } = await requireUser();
  if (error || !user) return { data: [], error: error || null };
  const { data, error: e } = await client.from('shelf_items').select('legend_id').eq('user_id', user.id);
  return { data: (data ?? []).map((r) => r.legend_id), error: e };
}

export async function getMyFavoriteIds() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };
  const { user, error } = await requireUser();
  if (error || !user) return { data: [], error: error || null };
  const { data, error: e } = await client.from('favorites').select('legend_id').eq('user_id', user.id);
  return { data: (data ?? []).map((r) => r.legend_id), error: e };
}

export async function setShelf(legendId, on) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { error: clientError };
  const { user, error } = await requireUser();
  if (error) return { error };
  if (!user) return { error: new Error('Inicia sesion para usar tu estanteria.') };
  if (on) {
    const { error: e } = await client.from('shelf_items').insert({ user_id: user.id, legend_id: legendId });
    return { error: e };
  }
  const { error: e } = await client.from('shelf_items').delete().eq('user_id', user.id).eq('legend_id', legendId);
  return { error: e };
}

export async function setFavorite(legendId, on) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { error: clientError };
  const { user, error } = await requireUser();
  if (error) return { error };
  if (!user) return { error: new Error('Inicia sesion para guardar favoritos.') };
  if (on) {
    const { error: e } = await client.from('favorites').insert({ user_id: user.id, legend_id: legendId });
    return { error: e };
  }
  const { error: e } = await client.from('favorites').delete().eq('user_id', user.id).eq('legend_id', legendId);
  return { error: e };
}

export async function getMyReviews() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };
  const { user, error } = await requireUser();
  if (error) return { data: [], error };
  if (!user) return { data: [], error: null };

  const { data, error: reviewError } = await client
    .from('reviews')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (reviewError) return { data: [], error: reviewError };

  const rows = data ?? [];
  const briefs = await getLegendsBriefByIds(client, rows.map((r) => r.legend_id));
  const items = rows.map((row) => ({ ...row, legend: briefs.get(row.legend_id) || null }));

  return { data: items, error: null };
}

// Aggregate counts for the profile / library stat tiles. Uses head:true count
// queries so we never transfer the rows themselves.
export async function getReaderStats() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };
  const { user, error } = await requireUser();
  if (error) return { data: null, error };
  if (!user) {
    return { data: { library: 0, favorites: 0, reviews: 0, reading: 0, completed: 0 }, error: null };
  }

  const countOf = (table, filter) => {
    let query = client.from(table).select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    if (filter) query = filter(query);
    return query;
  };

  const [library, favorites, reviews, reading, completed] = await Promise.all([
    countOf('user_legend_access', (q) => q.eq('status', 'active')),
    countOf('favorites'),
    countOf('reviews'),
    countOf('reading_progress', (q) => q.eq('completed', false)),
    countOf('reading_progress', (q) => q.eq('completed', true)),
  ]);

  return {
    data: {
      library: library.count ?? 0,
      favorites: favorites.count ?? 0,
      reviews: reviews.count ?? 0,
      reading: reading.count ?? 0,
      completed: completed.count ?? 0,
    },
    error: null,
  };
}
