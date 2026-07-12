import { getCurrentUser } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';
import { BackendApiError, redeemCodeBackend } from './backendApiService.js';

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

// El canje se procesa en el BACKEND (normaliza, rate-limit, valida y canjea). El frontend
// solo envia el codigo. Si el backend esta caido/no configurado, cae al RPC directo para
// no romper el flujo (la DB tambien normaliza y valida).
export async function redeemCode(code) {
  try {
    const data = await redeemCodeBackend(code);
    return { data, error: null };
  } catch (err) {
    const backendUnreachable = err instanceof BackendApiError && err.status === 0;
    if (backendUnreachable) {
      const { data: client, error: clientError } = getClient();
      if (clientError) return { data: null, error: clientError };
      return client.rpc('redeem_access_code', { p_code: code });
    }
    return { data: null, error: err };
  }
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
