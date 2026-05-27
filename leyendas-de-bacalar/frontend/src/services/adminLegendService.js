import { friendlyAdminError, getAdminClient } from './adminService.js';

function invalidIdError() {
  return new Error('No pudimos completar la accion. Faltan datos para procesarla.');
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

  const { data, error } = await client
    .from('content_reviews')
    .select('*, legend_versions(id, version_number, status, legend_id, legends(title, slug, creator_profiles(pen_name)))')
    .order('created_at', { ascending: false });

  return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
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
