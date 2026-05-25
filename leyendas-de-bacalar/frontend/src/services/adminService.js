import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

export async function getCreatorApplications() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('creator_applications')
    .select('*')
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

export async function approveCreatorApplication(applicationId, penName, feedback) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  return client.rpc('approve_creator_application', {
    p_application_id: applicationId,
    p_pen_name: penName,
    p_admin_feedback: feedback,
  });
}

export async function rejectCreatorApplication(applicationId, feedback) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  return client.rpc('reject_creator_application', {
    p_application_id: applicationId,
    p_admin_feedback: feedback,
  });
}

export async function getPendingContentReviews() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('content_reviews')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

export async function approveContentReview(reviewId, feedback) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  return client.rpc('approve_content_review', {
    p_review_id: reviewId,
    p_feedback: feedback,
  });
}

export async function rejectContentReview(reviewId, feedback) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  return client.rpc('reject_content_review', {
    p_review_id: reviewId,
    p_feedback: feedback,
  });
}

export async function publishLegendVersion(versionId) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  return client.rpc('publish_legend_version', { p_version_id: versionId });
}
