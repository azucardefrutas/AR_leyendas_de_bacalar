import { getCurrentUser } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

export async function redeemCode(code) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  return client.rpc('redeem_access_code', { p_code: code });
}

export async function getMyCodeRedemptions() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data: userData, error: userError } = await getCurrentUser();
  if (userError) return { data: [], error: userError };
  if (!userData.user) return { data: [], error: null };

  const { data, error } = await client
    .from('code_redemptions')
    .select('*')
    .eq('user_id', userData.user.id)
    .order('redeemed_at', { ascending: false });

  return { data: data ?? [], error };
}

export async function adminGenerateCodeBatch(editionId, quantity, prefix, notes, codeRequestId = null) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  return client.rpc('create_code_batch', {
    p_edition_id: editionId,
    p_quantity: quantity,
    p_prefix: prefix,
    p_notes: notes,
    p_code_request_id: codeRequestId,
  });
}

export async function adminGetCodeBatches() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('code_batches')
    .select('*')
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

export async function adminGetAccessCodes() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('access_codes')
    .select('*')
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}
