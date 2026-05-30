import { getCurrentUser } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

export async function getPublishedLegends() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('legends')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

export async function getLegendBySlug(slug) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  return client.from('legends').select('*').eq('slug', slug).maybeSingle();
}

export async function getLegendPages(legendId) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const byLegend = await client
    .from('legend_versions')
    .select('id, status, version_number')
    .eq('legend_id', legendId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  let versionId = byLegend.data?.id ?? null;

  if (byLegend.error) {
    console.error('getLegendPages version lookup error', byLegend.error);
  }

  if (!versionId) {
    const byVersion = await client
      .from('legend_versions')
      .select('id')
      .eq('id', legendId)
      .limit(1)
      .maybeSingle();

    if (byVersion.error) {
      console.error('getLegendPages version fallback error', byVersion.error);
      return { data: [], error: byVersion.error };
    }

    versionId = byVersion.data?.id ?? null;
  }

  console.log('versionId', versionId);

  if (!versionId) return { data: [], error: null };

  const { data, error } = await client
    .from('legend_pages')
    .select('*')
    .eq('version_id', versionId)
    .order('page_number', { ascending: true });

  console.log('pages loaded', data ?? []);

  if (error) {
    console.error('getLegendPages error', error);
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
