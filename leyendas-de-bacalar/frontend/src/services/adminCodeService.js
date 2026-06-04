import { getAdminClient } from './adminService.js';

function logAdminCodesError(operation, { batchId = null, table = 'unknown', error } = {}) {
  if (!import.meta.env.DEV) return;
  console.error('[AdminCodes] Error real:', {
    operation,
    batchId,
    table,
    error,
  });
}

function codeError(error, context) {
  logAdminCodesError(context.operation, { ...context, error });
  const nextError = new Error(context.message || 'No pudimos cargar codigos.');
  nextError.supabaseError = error;
  return nextError;
}

export async function getCodeRequests() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  const { data, error } = await client
    .from('code_requests')
    .select('*, legends(title), creator_profiles(pen_name), physical_editions(edition_name, edition_number)')
    .order('created_at', { ascending: false });

  return {
    data: data ?? [],
    error: error ? codeError(error, {
      operation: 'load code requests',
      table: 'code_requests',
      message: 'No pudimos cargar solicitudes de codigos.',
    }) : null,
  };
}

export async function getPhysicalEditions() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };
  const { data, error } = await client.from('physical_editions').select('*, legends(title)').order('created_at', { ascending: false });
  return {
    data: data ?? [],
    error: error ? codeError(error, {
      operation: 'load physical editions',
      table: 'physical_editions',
      message: 'No pudimos cargar ediciones fisicas.',
    }) : null,
  };
}

export async function getCodeBatches() {
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };
  const { data, error } = await client.from('code_batches').select('*, physical_editions(*)').order('created_at', { ascending: false });
  return {
    data: data ?? [],
    error: error ? codeError(error, {
      operation: 'load code batches',
      table: 'code_batches',
      message: 'No pudimos cargar lotes de codigos.',
    }) : null,
  };
}

export async function getAccessCodesByBatch(batchId) {
  if (!batchId) return { data: [], error: null };
  const { data: client, error: clientError } = getAdminClient();
  if (clientError) return { data: [], error: clientError };

  const { data: codes, error } = await client
    .from('access_codes')
    .select('id, batch_id, display_code, status, assigned_to_user_id, assigned_at, expires_at, created_at')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: false });

  if (error) {
    return {
      data: [],
      error: codeError(error, {
        operation: 'load access codes by batch',
        batchId,
        table: 'access_codes',
        message: 'No pudimos cargar codigos del lote.',
      }),
    };
  }

  const codeIds = (codes ?? []).map((code) => code.id).filter(Boolean);
  if (!codeIds.length) return { data: [], error: null };

  const { data: redemptions, error: redemptionsError } = await client
    .from('code_redemptions')
    .select('code_id, user_id, redeemed_at')
    .in('code_id', codeIds);

  if (redemptionsError) {
    return {
      data: codes ?? [],
      error: codeError(redemptionsError, {
        operation: 'load code redemptions by batch',
        batchId,
        table: 'code_redemptions',
        message: 'Codigos cargados, pero no pudimos cargar canjes del lote.',
      }),
    };
  }

  const redemptionsByCodeId = new Map((redemptions ?? []).map((redemption) => [String(redemption.code_id), redemption]));
  return {
    data: (codes ?? []).map((code) => {
      const redemption = redemptionsByCodeId.get(String(code.id));
      return {
        ...code,
        redeemed_at: redemption?.redeemed_at || null,
        redeemed_by_user_id: redemption?.user_id || null,
      };
    }),
    error: null,
  };
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
  return {
    data,
    error: error ? codeError(error, {
      operation: 'create code batch',
      table: 'rpc/create_code_batch',
      message: 'No pudimos generar el lote de codigos.',
    }) : null,
  };
}
