import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { getPublicUrlForAsset } from './storage.service.js';

function resolveAssetUrl(asset) {
  if (!asset) return null;
  return asset.file_url
    || asset.external_url
    || asset.public_url
    || (asset.storage_path ? getPublicUrlForAsset({ bucket: 'legend-assets', path: asset.storage_path }) : null);
}

const USER_STATUSES = new Set(['active', 'suspended']);

export async function setUserStatus(userId, status) {
  if (!userId) { const error = new Error('userId requerido.'); error.status = 400; throw error; }
  if (!USER_STATUSES.has(status)) { const error = new Error('Estado de usuario invalido.'); error.status = 400; throw error; }
  const { data, error } = await supabaseAdmin
    .from('users_profile')
    .update({ status })
    .eq('id', userId)
    .select('id, status')
    .single();
  if (error) { const err = new Error('No se pudo actualizar el estado del usuario.'); err.status = 500; throw err; }
  return data;
}

// ---- Promociones: el admin regala acceso a una leyenda (source 'admin_grant') ----
// Reutiliza la misma via de acceso que compras/codigos: una fila en user_legend_access.
// user_has_active_legend_access ya la respeta, asi que el acceso es inmediato.

export async function listLegendGrants() {
  const { data: grants, error } = await supabaseAdmin
    .from('user_legend_access')
    .select('id, user_id, legend_id, status, starts_at, expires_at, created_at')
    .eq('access_source', 'admin_grant')
    .order('created_at', { ascending: false });
  if (error) { const err = new Error('No se pudieron cargar las promociones.'); err.status = 500; throw err; }

  const userIds = [...new Set((grants ?? []).map((row) => row.user_id).filter(Boolean))];
  const legendIds = [...new Set((grants ?? []).map((row) => row.legend_id).filter(Boolean))];
  const [usersResult, legendsResult] = await Promise.all([
    userIds.length
      ? supabaseAdmin.from('users_profile').select('id, full_name, username').in('id', userIds)
      : Promise.resolve({ data: [] }),
    legendIds.length
      ? supabaseAdmin.from('legends').select('id, title, slug, access_type').in('id', legendIds)
      : Promise.resolve({ data: [] }),
  ]);
  const userById = new Map((usersResult.data ?? []).map((row) => [String(row.id), row]));
  const legendById = new Map((legendsResult.data ?? []).map((row) => [String(row.id), row]));

  return (grants ?? []).map((grant) => ({
    ...grant,
    user: userById.get(String(grant.user_id)) ?? null,
    legend: legendById.get(String(grant.legend_id)) ?? null,
  }));
}

export async function grantLegendAccessToUser({ userId, legendId, expiresAt = null }) {
  if (!userId || !legendId) { const err = new Error('Selecciona el usuario y la leyenda.'); err.status = 400; throw err; }
  const { data, error } = await supabaseAdmin.rpc('grant_legend_access', {
    p_user_id: userId,
    p_legend_id: legendId,
    p_access_source: 'admin_grant',
    p_source_id: null,
    p_expires_at: expiresAt || null,
  });
  if (error) {
    const err = new Error(error.message || 'No se pudo otorgar el acceso.');
    err.status = 400;
    throw err;
  }
  return { accessId: data };
}

export async function revokeLegendGrant(accessId) {
  if (!accessId) { const err = new Error('accessId requerido.'); err.status = 400; throw err; }
  // Solo se revocan promociones del admin: nunca una compra ni un codigo canjeado.
  const { data, error } = await supabaseAdmin
    .from('user_legend_access')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', accessId)
    .eq('access_source', 'admin_grant')
    .select('id, status')
    .maybeSingle();
  if (error) { const err = new Error('No se pudo revocar la promocion.'); err.status = 500; throw err; }
  if (!data) { const err = new Error('Promocion no encontrada.'); err.status = 404; throw err; }
  return data;
}


async function countRows(table, applyFilter) {
  try {
    let query = supabaseAdmin.from(table).select('id', { count: 'exact', head: true });
    if (applyFilter) query = applyFilter(query);
    const { count, error } = await query;
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

const METRICS = [
  { key: 'users', table: 'users_profile' },
  { key: 'authors', table: 'creator_profiles' },
  { key: 'pendingApplications', table: 'creator_applications', filter: (q) => q.eq('status', 'pending') },
  { key: 'publishedLegends', table: 'legends', filter: (q) => q.eq('status', 'published') },
  { key: 'reviewLegends', table: 'content_reviews', filter: (q) => q.in('status', ['pending', 'in_review']) },
  { key: 'codeBatches', table: 'code_batches' },
  { key: 'redeemedCodes', table: 'access_codes', filter: (q) => q.eq('status', 'redeemed') },
  { key: 'generatedCodes', table: 'access_codes' },
  { key: 'simulatedOrders', table: 'orders' },
  { key: 'activeSubscriptions', table: 'subscriptions', filter: (q) => q.eq('status', 'active') },
];

export async function getAdminDashboardStats() {
  const counts = await Promise.all(METRICS.map((metric) => countRows(metric.table, metric.filter)));
  const stats = {};
  METRICS.forEach((metric, index) => { stats[metric.key] = counts[index]; });
  return stats;
}

// Admin legends list with media + genres + versions + page counts + latest review
// enriched server-side (one call instead of many parallel queries + client loops).
export async function listAdminLegends() {
  const { data: legends } = await supabaseAdmin
    .from('legends')
    .select('*, creator_profiles(pen_name, user_id)')
    .order('created_at', { ascending: false });

  const legendIds = (legends ?? []).map((legend) => legend.id).filter(Boolean);
  if (!legendIds.length) return [];

  const { data: mediaRows } = await supabaseAdmin.from('legend_media').select('*').in('legend_id', legendIds);
  const assetIds = [...new Set((mediaRows ?? []).map((row) => row.asset_id).filter(Boolean))];
  let assetsById = new Map();
  if (assetIds.length) {
    const { data } = await supabaseAdmin.from('assets').select('*').in('id', assetIds);
    assetsById = new Map((data ?? []).map((asset) => [String(asset.id), asset]));
  }
  const mediaByLegend = new Map();
  for (const row of mediaRows ?? []) {
    const asset = row.asset_id ? assetsById.get(String(row.asset_id)) || null : null;
    const current = mediaByLegend.get(row.legend_id) || [];
    current.push({ ...row, assets: asset, url: resolveAssetUrl(asset) });
    mediaByLegend.set(row.legend_id, current);
  }

  const { data: genreRows } = await supabaseAdmin.from('legend_genres').select('legend_id, genres(id, name)').in('legend_id', legendIds);
  const genresByLegend = new Map();
  for (const row of genreRows ?? []) {
    const genre = row.genres;
    if (!genre?.name) continue;
    const current = genresByLegend.get(row.legend_id) || [];
    current.push({ id: genre.id || genre.name, name: genre.name });
    genresByLegend.set(row.legend_id, current);
  }

  const { data: versionRows } = await supabaseAdmin
    .from('legend_versions')
    .select('*')
    .in('legend_id', legendIds)
    .order('version_number', { ascending: false });
  const versionsByLegend = new Map();
  for (const version of versionRows ?? []) {
    const current = versionsByLegend.get(version.legend_id) || [];
    current.push(version);
    versionsByLegend.set(version.legend_id, current);
  }
  const versionIds = (versionRows ?? []).map((version) => version.id);

  const pagesCountByVersion = new Map();
  if (versionIds.length) {
    const { data: pages } = await supabaseAdmin.from('legend_pages').select('version_id').in('version_id', versionIds);
    for (const page of pages ?? []) {
      pagesCountByVersion.set(page.version_id, (pagesCountByVersion.get(page.version_id) || 0) + 1);
    }
  }

  const reviewByVersion = new Map();
  if (versionIds.length) {
    const { data: reviews } = await supabaseAdmin
      .from('content_reviews')
      .select('*')
      .in('legend_version_id', versionIds)
      .order('created_at', { ascending: false });
    for (const review of reviews ?? []) {
      if (!reviewByVersion.has(review.legend_version_id)) reviewByVersion.set(review.legend_version_id, review);
    }
  }

  const pickCover = (media) => media.find((m) => m.media_type === 'cover' && m.url)
    || media.find((m) => m.media_type === 'banner' && m.url)
    || media.find((m) => m.url)
    || null;

  return (legends ?? []).map((legend) => {
    const media = mediaByLegend.get(legend.id) || [];
    const versions = versionsByLegend.get(legend.id) || [];
    const currentVersion = versions[0] || null;
    const currentReview = currentVersion ? reviewByVersion.get(currentVersion.id) || null : null;
    const coverMedia = pickCover(media);
    const pagesCount = versions.reduce((sum, version) => sum + (pagesCountByVersion.get(version.id) || 0), 0);
    return {
      ...legend,
      media,
      genres: genresByLegend.get(legend.id) || [],
      versions,
      currentVersion,
      currentReview,
      pagesCount,
      coverMedia,
      cover_url: coverMedia?.url || '',
      authorName: legend.creator_profiles?.pen_name || 'Sin autor',
    };
  });
}

// Content reviews list with version + legend + creator joined server-side (one call
// instead of 4 sequential round-trips from the browser). Same nested shape the
// admin reviews page already consumes.
export async function listContentReviews() {
  const { data: reviews } = await supabaseAdmin
    .from('content_reviews')
    .select('*')
    .order('created_at', { ascending: false });

  const versionIds = (reviews ?? []).map((review) => review.legend_version_id).filter(Boolean);
  const { data: versions } = versionIds.length
    ? await supabaseAdmin.from('legend_versions').select('*').in('id', versionIds)
    : { data: [] };

  const legendIds = (versions ?? []).map((version) => version.legend_id).filter(Boolean);
  const { data: legends } = legendIds.length
    ? await supabaseAdmin.from('legends').select('id, title, slug, creator_id, status, access_type').in('id', legendIds)
    : { data: [] };

  const creatorIds = (legends ?? []).map((legend) => legend.creator_id).filter(Boolean);
  const { data: creators } = creatorIds.length
    ? await supabaseAdmin.from('creator_profiles').select('id, pen_name, user_id').in('id', creatorIds)
    : { data: [] };

  const versionsById = new Map((versions ?? []).map((version) => [String(version.id), version]));
  const legendsById = new Map((legends ?? []).map((legend) => [String(legend.id), legend]));
  const creatorsById = new Map((creators ?? []).map((creator) => [String(creator.id), creator]));

  return (reviews ?? []).map((review) => {
    const version = versionsById.get(String(review.legend_version_id)) || null;
    const legend = version ? legendsById.get(String(version.legend_id)) || null : null;
    const creator = legend ? creatorsById.get(String(legend.creator_id)) || null : null;
    return {
      ...review,
      legend_versions: version
        ? { ...version, legends: legend ? { ...legend, creator_profiles: creator } : null }
        : null,
    };
  });
}
