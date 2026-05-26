import { getCurrentUser } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

export async function getMyCreatorProfile(providedClient = null) {
  const client = providedClient ?? supabase;
  if (!client) return { data: null, error: getSupabaseConfigError() };

  const { data: userData, error: userError } = await getCurrentUser();
  if (userError) return { data: null, error: userError };
  if (!userData.user) return { data: null, error: new Error('No authenticated user found.') };

  return client
    .from('creator_profiles')
    .select('*')
    .eq('user_id', userData.user.id)
    .maybeSingle();
}

export async function createCreatorApplication(reason, portfolioUrl) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: userData, error: userError } = await getCurrentUser();
  if (userError) return { data: null, error: userError };
  if (!userData.user) return { data: null, error: new Error('No authenticated user found.') };

  return client
    .from('creator_applications')
    .insert({
      user_id: userData.user.id,
      reason,
      portfolio_url: portfolioUrl,
      status: 'pending',
    })
    .select()
    .single();
}

export async function getMyCreatorApplications() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data: userData, error: userError } = await getCurrentUser();
  if (userError) return { data: [], error: userError };
  if (!userData.user) return { data: [], error: null };

  const { data, error } = await client
    .from('creator_applications')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

export async function getMyLegends() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data: creator, error: creatorError } = await getMyCreatorProfile(client);
  if (creatorError) return { data: [], error: creatorError };
  if (!creator) return { data: [], error: null };

  const { data, error } = await client
    .from('legends')
    .select('*')
    .eq('creator_id', creator.id)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

export async function createLegend(payload) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: creator, error: creatorError } = await getMyCreatorProfile(client);
  if (creatorError) return { data: null, error: creatorError };
  if (!creator) return { data: null, error: new Error('Creator profile not found.') };

  return client
    .from('legends')
    .insert({ ...payload, creator_id: creator.id })
    .select()
    .single();
}

export async function updateLegend(legendId, payload) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: creator, error: creatorError } = await getMyCreatorProfile(client);
  if (creatorError) return { data: null, error: creatorError };
  if (!creator) return { data: null, error: new Error('Creator profile not found.') };

  return client
    .from('legends')
    .update(payload)
    .eq('id', legendId)
    .eq('creator_id', creator.id)
    .select()
    .single();
}

export async function getMyLegend(legendId) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: creator, error: creatorError } = await getMyCreatorProfile(client);
  if (creatorError) return { data: null, error: creatorError };
  if (!creator) return { data: null, error: null };

  return client
    .from('legends')
    .select('*')
    .eq('id', legendId)
    .eq('creator_id', creator.id)
    .maybeSingle();
}

export async function createLegendVersion(legendId, versionNumber = 1) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  return client
    .from('legend_versions')
    .insert({ legend_id: legendId, version_number: versionNumber, status: 'draft' })
    .select()
    .single();
}

export async function getLegendVersions(legendId) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('legend_versions')
    .select('*')
    .eq('legend_id', legendId)
    .order('version_number', { ascending: false });

  return { data: data ?? [], error };
}

export async function getLegendPagesByVersion(versionId) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('legend_pages')
    .select('*')
    .eq('version_id', versionId)
    .order('page_number', { ascending: true });

  return { data: data ?? [], error };
}

export async function createLegendPage(payload) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  return client.from('legend_pages').insert(payload).select().single();
}

export async function createCodeRequest(legendId, quantity, reason) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: creator, error: creatorError } = await getMyCreatorProfile(client);
  if (creatorError) return { data: null, error: creatorError };
  if (!creator) return { data: null, error: new Error('Creator profile not found.') };

  return client
    .from('code_requests')
    .insert({
      creator_id: creator.id,
      legend_id: legendId,
      quantity: Number(quantity),
      reason,
      status: 'pending',
    })
    .select()
    .single();
}

export async function getMyCodeRequests() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data: creator, error: creatorError } = await getMyCreatorProfile(client);
  if (creatorError) return { data: [], error: creatorError };
  if (!creator) return { data: [], error: null };

  const { data, error } = await client
    .from('code_requests')
    .select('*, legends(title, slug)')
    .eq('creator_id', creator.id)
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

export async function submitVersionForReview(versionId) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  return client.rpc('submit_legend_version_for_review', { p_version_id: versionId });
}
