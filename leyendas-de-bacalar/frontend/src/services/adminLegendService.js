import { friendlyAdminError, getAdminClient } from './adminService.js';

function invalidIdError() {
  return new Error('No pudimos completar la accion. Faltan datos para procesarla.');
}

function isSchemaRelationError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || error?.details || '').toLowerCase();
  return ['42703', '42P01', 'PGRST200', 'PGRST204'].includes(code)
    || message.includes('does not exist')
    || message.includes('could not find')
    || message.includes('relationship');
}

function isRecoverableReviewsError(error) {
  const message = String(error?.message || error?.details || '').toLowerCase();
  return isSchemaRelationError(error)
    || message.includes('creator_profiles')
    || message.includes('legend_versions')
    || message.includes('legends');
}

function logAdminReviewsError(step, error) {
  if (import.meta.env.DEV) {
    console.error('[AdminReviews] Error cargando revisiones:', {
      step,
      error,
    });
  }
}

export async function getLegends() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('legends')
    .select('*, creator_profiles(pen_name, user_id)')
    .order('created_at', { ascending: false });

  return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
}

export async function getLegendById(id) {
  if (!id) return { data: null, error: invalidIdError() };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };

  const { data, error } = await client
    .from('legends')
    .select('*, creator_profiles(pen_name)')
    .eq('id', id)
    .maybeSingle();

  return { data, error: error ? friendlyAdminError(error) : null };
}

export async function getContentReviews() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  const attempts = [
    {
      step: 'rich content_reviews with legend and creator profile',
      select: '*, legend_versions(id, version_number, status, legend_id, legends(title, slug, creator_profiles(pen_name)))',
    },
    {
      step: 'content_reviews with legend only',
      select: '*, legend_versions(id, version_number, status, legend_id, legends(title, slug, creator_id))',
    },
    {
      step: 'content_reviews with version only',
      select: '*, legend_versions(id, version_number, status, legend_id)',
    },
    {
      step: 'content_reviews only',
      select: '*',
    },
  ];

  let firstBlockingError = null;
  let lastError = null;
  for (const attempt of attempts) {
    const { data, error } = await client
      .from('content_reviews')
      .select(attempt.select)
      .order('created_at', { ascending: false });

    if (!error) return { data: data ?? [], error: null };

    logAdminReviewsError(attempt.step, error);
    lastError = error;

    if (!isRecoverableReviewsError(error) || attempt.step === 'content_reviews only') {
      firstBlockingError = error;
      break;
    }
  }

  return { data: [], error: friendlyAdminError(firstBlockingError || lastError) };
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

  return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
}

export async function approveReview(reviewId, feedback = '') {
  if (!reviewId) return { data: null, error: invalidIdError() };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };
  const { data, error } = await client.rpc('approve_content_review', { p_review_id: reviewId, p_feedback: feedback });
  return { data, error: error ? friendlyAdminError(error) : null };
}

export async function rejectReview(reviewId, feedback = '') {
  if (!reviewId) return { data: null, error: invalidIdError() };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };
  const { data, error } = await client.rpc('reject_content_review', { p_review_id: reviewId, p_feedback: feedback });
  return { data, error: error ? friendlyAdminError(error) : null };
}

export async function requestChanges(reviewId, feedback = '') {
  if (!reviewId) return { data: null, error: invalidIdError() };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };
  const { data, error } = await client.rpc('request_content_changes', { p_review_id: reviewId, p_feedback: feedback });
  return { data, error: error ? friendlyAdminError(error) : null };
}

export async function publishVersion(versionId) {
  if (!versionId) return { data: null, error: invalidIdError() };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };
  const { data, error } = await client.rpc('publish_legend_version', { p_version_id: versionId });
  return { data, error: error ? friendlyAdminError(error) : null };
}
