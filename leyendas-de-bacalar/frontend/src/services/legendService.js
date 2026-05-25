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

  const { data, error } = await client
    .from('legend_pages')
    .select('*')
    .eq('legend_id', legendId)
    .order('page_number', { ascending: true });

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
