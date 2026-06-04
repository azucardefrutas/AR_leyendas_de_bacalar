import { STORAGE_BUCKETS } from './assetService.js';
import { getAdminClient } from './adminService.js';

function invalidIdError() {
  return new Error('No pudimos completar la accion. Faltan datos para procesarla.');
}

function logAdminReviewsError(operation, { reviewId = null, versionId = null, legendId = null, error } = {}) {
  if (!import.meta.env.DEV) return;
  console.error('[AdminReviews] Error real:', {
    operation,
    reviewId,
    versionId,
    legendId,
    error,
  });
}

function logAdminLegendsError(operation, { legendId = null, table = 'unknown', error } = {}) {
  if (!import.meta.env.DEV) return;
  console.error('[AdminLegends] Error real:', {
    operation,
    legendId,
    table,
    error,
  });
}

function friendlyActionError(message, error, context = {}) {
  logAdminReviewsError(context.operation, { ...context, error });
  const nextError = new Error(message);
  nextError.supabaseError = error;
  return nextError;
}

function friendlyLegendError(message, error, context = {}) {
  logAdminLegendsError(context.operation, { ...context, error });
  const nextError = new Error(message);
  nextError.supabaseError = error;
  return nextError;
}

function getAssetUrl(client, asset = {}) {
  const directUrl = asset.public_url || asset.file_url || asset.external_url || asset.url || '';
  if (directUrl) return directUrl;
  if (!asset.storage_path) return '';
  if (/^(https?:|data:|blob:)/i.test(asset.storage_path)) return asset.storage_path;
  const { data } = client.storage.from(STORAGE_BUCKETS.assets).getPublicUrl(asset.storage_path);
  return data?.publicUrl || '';
}

async function getAssetsById(client, assetIds = []) {
  const ids = [...new Set(assetIds.filter(Boolean).map(String))];
  if (!ids.length) return new Map();
  const { data, error } = await client.from('assets').select('*').in('id', ids);
  if (error) {
    logAdminLegendsError('load assets for legends', { table: 'assets', error });
    return new Map();
  }
  return new Map((data ?? []).map((asset) => [String(asset.id), asset]));
}

async function getMediaByLegendId(client, legendIds = []) {
  const ids = [...new Set(legendIds.filter(Boolean).map(String))];
  if (!ids.length) return new Map();

  const { data: mediaRows, error } = await client
    .from('legend_media')
    .select('*')
    .in('legend_id', ids);

  if (error) {
    logAdminLegendsError('load legend media', { table: 'legend_media', error });
    return new Map();
  }

  const assetsById = await getAssetsById(client, (mediaRows ?? []).map((media) => media.asset_id));
  const mediaByLegendId = new Map();
  for (const media of mediaRows ?? []) {
    const asset = assetsById.get(String(media.asset_id)) || null;
    const row = {
      ...media,
      assets: asset,
      url: getAssetUrl(client, asset),
    };
    mediaByLegendId.set(media.legend_id, [...(mediaByLegendId.get(media.legend_id) || []), row]);
  }
  return mediaByLegendId;
}

async function getGenresByLegendId(client, legendIds = []) {
  const ids = [...new Set(legendIds.filter(Boolean).map(String))];
  if (!ids.length) return new Map();
  const { data, error } = await client
    .from('legend_genres')
    .select('legend_id, genres(id, name)')
    .in('legend_id', ids);

  if (error) {
    logAdminLegendsError('load legend genres', { table: 'legend_genres', error });
    return new Map();
  }

  const genresByLegendId = new Map();
  for (const row of data ?? []) {
    const genre = row.genres;
    if (!genre) continue;
    genresByLegendId.set(row.legend_id, [...(genresByLegendId.get(row.legend_id) || []), genre]);
  }
  return genresByLegendId;
}

async function getVersionsByLegendId(client, legendIds = []) {
  const ids = [...new Set(legendIds.filter(Boolean).map(String))];
  if (!ids.length) return new Map();
  const { data, error } = await client
    .from('legend_versions')
    .select('*')
    .in('legend_id', ids)
    .order('version_number', { ascending: false });

  if (error) {
    logAdminLegendsError('load legend versions', { table: 'legend_versions', error });
    return new Map();
  }

  const versionsByLegendId = new Map();
  for (const version of data ?? []) {
    versionsByLegendId.set(version.legend_id, [...(versionsByLegendId.get(version.legend_id) || []), version]);
  }
  return versionsByLegendId;
}

async function getPagesCountByVersionId(client, versionsByLegendId = new Map()) {
  const versionIds = [...versionsByLegendId.values()].flat().map((version) => version.id).filter(Boolean);
  if (!versionIds.length) return new Map();
  const { data, error } = await client
    .from('legend_pages')
    .select('version_id')
    .in('version_id', versionIds);

  if (error) {
    logAdminLegendsError('load legend page counts', { table: 'legend_pages', error });
    return new Map();
  }

  const countByVersionId = new Map();
  for (const page of data ?? []) {
    countByVersionId.set(page.version_id, (countByVersionId.get(page.version_id) || 0) + 1);
  }
  return countByVersionId;
}

async function getReviewsByVersionId(client, versionIds = []) {
  const ids = [...new Set(versionIds.filter(Boolean).map(String))];
  if (!ids.length) return new Map();
  const { data, error } = await client
    .from('content_reviews')
    .select('*')
    .in('legend_version_id', ids)
    .order('created_at', { ascending: false });

  if (error) {
    logAdminReviewsError('load reviews by version', { error });
    return new Map();
  }

  const reviewsByVersionId = new Map();
  for (const review of data ?? []) {
    if (!reviewsByVersionId.has(review.legend_version_id)) reviewsByVersionId.set(review.legend_version_id, review);
  }
  return reviewsByVersionId;
}

function pickCoverMedia(media = []) {
  return media.find((item) => item.media_type === 'cover' && item.url)
    || media.find((item) => item.media_type === 'banner' && item.url)
    || media.find((item) => item.url)
    || null;
}

function normalizeAdminLegend(client, legend, context = {}) {
  const media = context.mediaByLegendId?.get(legend.id) || [];
  const versions = context.versionsByLegendId?.get(legend.id) || [];
  const currentVersion = versions[0] || null;
  const currentReview = currentVersion ? context.reviewsByVersionId?.get(currentVersion.id) || null : null;
  const coverMedia = pickCoverMedia(media);
  const pagesCount = versions.reduce((sum, version) => (
    sum + (context.pagesCountByVersionId?.get(version.id) || 0)
  ), 0);

  if (media.length && !coverMedia?.url && import.meta.env.DEV) {
    console.warn('[AdminLegends] Asset sin URL resoluble:', {
      legendId: legend.id,
      media,
    });
  }

  return {
    ...legend,
    media,
    genres: context.genresByLegendId?.get(legend.id) || [],
    versions,
    currentVersion,
    currentReview,
    pagesCount,
    coverMedia,
    cover_url: coverMedia?.url || '',
    authorName: legend.creator_profiles?.pen_name || 'Sin autor',
  };
}

async function enrichAdminLegends(client, legends = []) {
  const legendIds = legends.map((legend) => legend.id).filter(Boolean);
  const [mediaByLegendId, genresByLegendId, versionsByLegendId] = await Promise.all([
    getMediaByLegendId(client, legendIds),
    getGenresByLegendId(client, legendIds),
    getVersionsByLegendId(client, legendIds),
  ]);
  const versionIds = [...versionsByLegendId.values()].flat().map((version) => version.id);
  const [pagesCountByVersionId, reviewsByVersionId] = await Promise.all([
    getPagesCountByVersionId(client, versionsByLegendId),
    getReviewsByVersionId(client, versionIds),
  ]);

  return legends.map((legend) => normalizeAdminLegend(client, legend, {
    mediaByLegendId,
    genresByLegendId,
    versionsByLegendId,
    pagesCountByVersionId,
    reviewsByVersionId,
  }));
}

export async function getLegends() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('legends')
    .select('*, creator_profiles(pen_name, user_id)')
    .order('created_at', { ascending: false });

  if (error) {
    return {
      data: [],
      error: friendlyLegendError('No pudimos cargar leyendas.', error, {
        operation: 'load legends',
        table: 'legends',
      }),
    };
  }

  return { data: await enrichAdminLegends(client, data ?? []), error: null };
}

export async function getLegendById(id) {
  if (!id) return { data: null, error: invalidIdError() };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };

  const { data, error } = await client
    .from('legends')
    .select('*, creator_profiles(pen_name, user_id)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: friendlyLegendError('No pudimos cargar detalle de leyenda.', error, {
        operation: 'load legend detail',
        table: 'legends',
        legendId: id,
      }),
    };
  }
  if (!data) return { data: null, error: null };

  const [legend] = await enrichAdminLegends(client, [data]);
  return { data: legend, error: null };
}

export async function getContentReviews() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  const { data: reviews, error } = await client
    .from('content_reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return {
      data: [],
      error: friendlyActionError('No pudimos cargar revisiones.', error, {
        operation: 'load content reviews',
      }),
    };
  }

  const versionIds = (reviews ?? []).map((review) => review.legend_version_id).filter(Boolean);
  const { data: versions, error: versionsError } = versionIds.length
    ? await client.from('legend_versions').select('*').in('id', versionIds)
    : { data: [], error: null };

  if (versionsError) {
    return {
      data: [],
      error: friendlyActionError('No pudimos cargar versiones de revisiones.', versionsError, {
        operation: 'load review versions',
      }),
    };
  }

  const legendIds = (versions ?? []).map((version) => version.legend_id).filter(Boolean);
  const { data: legends, error: legendsError } = legendIds.length
    ? await client.from('legends').select('id, title, slug, creator_id, status, access_type').in('id', legendIds)
    : { data: [], error: null };

  if (legendsError) {
    return {
      data: [],
      error: friendlyActionError('No pudimos cargar leyendas de revisiones.', legendsError, {
        operation: 'load review legends',
      }),
    };
  }

  const creatorIds = (legends ?? []).map((legend) => legend.creator_id).filter(Boolean);
  const { data: creators, error: creatorsError } = creatorIds.length
    ? await client.from('creator_profiles').select('id, pen_name, user_id').in('id', creatorIds)
    : { data: [], error: null };

  if (creatorsError) {
    logAdminReviewsError('load review creator profiles', { error: creatorsError });
  }

  const versionsById = new Map((versions ?? []).map((version) => [String(version.id), version]));
  const legendsById = new Map((legends ?? []).map((legend) => [String(legend.id), legend]));
  const creatorsById = new Map((creators ?? []).map((creator) => [String(creator.id), creator]));

  return {
    data: (reviews ?? []).map((review) => {
      const version = versionsById.get(String(review.legend_version_id)) || null;
      const legend = version ? legendsById.get(String(version.legend_id)) || null : null;
      const creator = legend ? creatorsById.get(String(legend.creator_id)) || null : null;
      return {
        ...review,
        legend_versions: version ? {
          ...version,
          legends: legend ? {
            ...legend,
            creator_profiles: creator,
          } : null,
        } : null,
      };
    }),
    error: null,
  };
}

export async function getLegendPagesForVersion(versionId) {
  if (!versionId) return { data: [], error: invalidIdError() };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('legend_pages')
    .select('*')
    .eq('version_id', versionId)
    .order('page_number', { ascending: true });

  return {
    data: data ?? [],
    error: error ? friendlyLegendError('No pudimos cargar paginas de la leyenda.', error, {
      operation: 'load legend pages',
      table: 'legend_pages',
    }) : null,
  };
}

export async function approveReview(reviewId, feedback = '') {
  if (!reviewId) return { data: null, error: invalidIdError() };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };
  const { data, error } = await client.rpc('approve_content_review', {
    p_review_id: reviewId,
    p_feedback: feedback?.trim() || null,
  });
  return {
    data,
    error: error ? friendlyActionError('No pudimos aprobar la revision.', error, {
      operation: 'approve_content_review',
      reviewId,
    }) : null,
  };
}

export async function rejectReview(reviewId, feedback = '') {
  if (!reviewId) return { data: null, error: invalidIdError() };
  if (!feedback?.trim()) return { data: null, error: new Error('Agrega un motivo para rechazar la revision.') };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };
  const { data, error } = await client.rpc('reject_content_review', {
    p_review_id: reviewId,
    p_feedback: feedback.trim(),
  });
  return {
    data,
    error: error ? friendlyActionError('No pudimos rechazar la revision.', error, {
      operation: 'reject_content_review',
      reviewId,
    }) : null,
  };
}

export async function requestChanges(reviewId, feedback = '') {
  if (!reviewId) return { data: null, error: invalidIdError() };
  if (!feedback?.trim()) return { data: null, error: new Error('Agrega feedback para solicitar cambios.') };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };
  const { data, error } = await client.rpc('request_content_changes', {
    p_review_id: reviewId,
    p_feedback: feedback.trim(),
  });
  return {
    data,
    error: error ? friendlyActionError('No pudimos solicitar cambios.', error, {
      operation: 'request_content_changes',
      reviewId,
    }) : null,
  };
}

export async function publishVersion(versionId) {
  if (!versionId) return { data: null, error: invalidIdError() };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };
  const { data, error } = await client.rpc('publish_legend_version', { p_version_id: versionId });
  return {
    data,
    error: error ? friendlyActionError('No pudimos publicar la version.', error, {
      operation: 'publish_legend_version',
      versionId,
    }) : null,
  };
}
