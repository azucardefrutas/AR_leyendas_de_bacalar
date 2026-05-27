import { friendlyAdminError, getAdminClient } from './adminService.js';

export async function getCodeRequests() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('code_requests')
    .select('*, legends(title), creator_profiles(pen_name)')
    .order('created_at', { ascending: false });

  return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
}

export async function getPhysicalEditions() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };
  const { data, error } = await client.from('physical_editions').select('*, legends(title)').order('created_at', { ascending: false });
  return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
}

export async function getCodeBatches() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };
  const { data, error } = await client.from('code_batches').select('*, physical_editions(*)').order('created_at', { ascending: false });
  return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
}

export async function getAccessCodesByBatch(batchId) {
  if (!batchId) return { data: [], error: null };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };
  const { data, error } = await client
    .from('access_codes')
    .select('id, code_batch_id, display_code, status, redeemed_at, assigned_to_user_id, created_at')
    .eq('code_batch_id', batchId)
    .order('created_at', { ascending: false });
  return { data: data ?? [], error: error ? friendlyAdminError(error) : null };
}

export async function createCodeBatch(payload) {
  const { editionId, quantity, prefix, notes, codeRequestId } = payload;
  if (!editionId || !quantity) return { data: null, error: new Error('Selecciona una edicion fisica y cantidad valida.') };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: null, error: clientError };
  const { data, error } = await client.rpc('create_code_batch', {
    p_edition_id: editionId,
    p_quantity: Number(quantity),
    p_prefix: prefix || null,
    p_notes: notes || null,
    p_code_request_id: codeRequestId || null,
  });
  return { data, error: error ? friendlyAdminError(error) : null };
}
