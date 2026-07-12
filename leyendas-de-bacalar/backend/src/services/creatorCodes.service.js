import { createClient } from '@supabase/supabase-js';

import { env } from '../config/env.js';
import { supabaseAdmin } from '../config/supabaseAdmin.js';

const MAX_SELF_SERVICE_CODES = 500;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class CreatorCodesError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'CreatorCodesError';
    this.statusCode = statusCode;
  }
}

function createUserScopedClient(accessToken) {
  if (!accessToken) throw new CreatorCodesError('Unauthorized.', 401);

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeGenerationInput(payload = {}) {
  const legendId = String(payload.legendId || '').trim();
  const quantity = Number(payload.quantity);
  const prefix = String(payload.prefix || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const reason = String(payload.reason || '').trim();

  if (!UUID_PATTERN.test(legendId)) throw new CreatorCodesError('Selecciona una leyenda valida.');
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_SELF_SERVICE_CODES) {
    throw new CreatorCodesError(`La cantidad debe estar entre 1 y ${MAX_SELF_SERVICE_CODES}.`);
  }
  if (prefix && (prefix.length < 2 || prefix.length > 10)) {
    throw new CreatorCodesError('El prefijo debe tener entre 2 y 10 letras o numeros.');
  }
  if (reason.length > 500) throw new CreatorCodesError('El motivo no puede superar 500 caracteres.');

  return { legendId, quantity, prefix: prefix || null, reason: reason || null };
}

function assertNoError(error, message) {
  if (!error) return;
  const nextError = new CreatorCodesError(message, 500);
  nextError.cause = error;
  throw nextError;
}

async function getOwnedLegends(userId) {
  const { data, error } = await supabaseAdmin
    .from('legends')
    .select('id, title, slug, status, access_type, created_at')
    .eq('creator_id', userId)
    .order('title', { ascending: true });
  assertNoError(error, 'No se pudieron cargar tus leyendas.');
  return data ?? [];
}

export async function getCreatorCodesOverview({ userId }) {
  const legends = await getOwnedLegends(userId);
  const legendIds = legends.map((legend) => legend.id);
  if (!legendIds.length) {
    return {
      legends: [],
      summary: { remainingQuota: 0, generatedThisMonth: 0, redeemed: 0 },
      history: [],
    };
  }

  const { data: editions, error: editionsError } = await supabaseAdmin
    .from('physical_editions')
    .select('id, legend_id, edition_name, edition_number, code_quota, created_at')
    .in('legend_id', legendIds)
    .order('created_at', { ascending: true });
  assertNoError(editionsError, 'No se pudieron cargar las ediciones fisicas.');

  const editionIds = (editions ?? []).map((edition) => edition.id);
  const { data: requests, error: requestsError } = await supabaseAdmin
    .from('code_requests')
    .select('id, legend_id, edition_id, quantity_requested, reason, status, admin_feedback, created_at')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false });
  assertNoError(requestsError, 'No se pudieron cargar las solicitudes de codigos.');

  let batches = [];
  if (editionIds.length) {
    const { data, error } = await supabaseAdmin
      .from('code_batches')
      .select('id, edition_id, code_request_id, prefix, quantity, status, notes, created_at')
      .in('edition_id', editionIds)
      .order('created_at', { ascending: false });
    assertNoError(error, 'No se pudieron cargar los lotes de codigos.');
    batches = data ?? [];
  }

  const batchIds = batches.map((batch) => batch.id);
  let codes = [];
  if (batchIds.length) {
    const { data, error } = await supabaseAdmin
      .from('access_codes')
      .select('id, batch_id, edition_id, status, created_at')
      .in('batch_id', batchIds);
    assertNoError(error, 'No se pudo calcular el uso de codigos.');
    codes = data ?? [];
  }

  const legendById = new Map(legends.map((legend) => [String(legend.id), legend]));
  const editionById = new Map((editions ?? []).map((edition) => [String(edition.id), edition]));
  const firstEditionByLegend = new Map();
  for (const edition of editions ?? []) {
    if (!firstEditionByLegend.has(String(edition.legend_id))) {
      firstEditionByLegend.set(String(edition.legend_id), edition);
    }
  }
  const codesByEdition = new Map();
  const codesByBatch = new Map();
  for (const code of codes) {
    const editionKey = String(code.edition_id);
    const batchKey = String(code.batch_id);
    codesByEdition.set(editionKey, [...(codesByEdition.get(editionKey) ?? []), code]);
    codesByBatch.set(batchKey, [...(codesByBatch.get(batchKey) ?? []), code]);
  }

  const legendOptions = legends.map((legend) => {
    const edition = firstEditionByLegend.get(String(legend.id)) ?? null;
    const editionCodes = edition ? (codesByEdition.get(String(edition.id)) ?? []) : [];
    const quota = Number(edition?.code_quota || 0);
    return {
      id: legend.id,
      title: legend.title,
      slug: legend.slug,
      status: legend.status,
      editionId: edition?.id || null,
      editionName: edition?.edition_name || 'Edicion fisica',
      quota,
      generated: editionCodes.length,
      remainingQuota: Math.max(quota - editionCodes.length, 0),
    };
  });

  const batchesByRequest = new Map();
  for (const batch of batches) {
    if (!batch.code_request_id) continue;
    batchesByRequest.set(String(batch.code_request_id), [
      ...(batchesByRequest.get(String(batch.code_request_id)) ?? []),
      batch,
    ]);
  }

  const requestHistory = (requests ?? []).map((request) => {
    const requestBatches = batchesByRequest.get(String(request.id)) ?? [];
    const requestCodes = requestBatches.flatMap((batch) => codesByBatch.get(String(batch.id)) ?? []);
    return {
      id: request.id,
      legendId: request.legend_id,
      legendTitle: legendById.get(String(request.legend_id))?.title || 'Leyenda',
      quantity: Number(request.quantity_requested || 0),
      status: request.status,
      reason: request.reason,
      adminFeedback: request.admin_feedback,
      createdAt: request.created_at,
      generatedCount: requestCodes.length,
      redeemedCount: requestCodes.filter((code) => code.status === 'redeemed').length,
      batches: requestBatches.map((batch) => ({
        id: batch.id,
        quantity: batch.quantity,
        status: batch.status,
        prefix: batch.prefix,
        createdAt: batch.created_at,
        exportable: (codesByBatch.get(String(batch.id)) ?? []).length > 0,
      })),
    };
  });

  const orphanBatchHistory = batches
    .filter((batch) => !batch.code_request_id)
    .map((batch) => {
      const edition = editionById.get(String(batch.edition_id));
      const batchCodes = codesByBatch.get(String(batch.id)) ?? [];
      return {
        id: `batch-${batch.id}`,
        legendId: edition?.legend_id || null,
        legendTitle: legendById.get(String(edition?.legend_id))?.title || 'Leyenda',
        quantity: Number(batch.quantity || 0),
        status: batch.status,
        reason: batch.notes || 'Lote generado',
        adminFeedback: null,
        createdAt: batch.created_at,
        generatedCount: batchCodes.length,
        redeemedCount: batchCodes.filter((code) => code.status === 'redeemed').length,
        batches: [{
          id: batch.id,
          quantity: batch.quantity,
          status: batch.status,
          prefix: batch.prefix,
          createdAt: batch.created_at,
          exportable: batchCodes.length > 0,
        }],
      };
    });

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  return {
    legends: legendOptions,
    summary: {
      remainingQuota: legendOptions.reduce((total, legend) => total + legend.remainingQuota, 0),
      generatedThisMonth: codes.filter((code) => new Date(code.created_at) >= monthStart).length,
      redeemed: codes.filter((code) => code.status === 'redeemed').length,
    },
    history: [...requestHistory, ...orphanBatchHistory]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  };
}

export async function generateCreatorCodes({ userId, accessToken, payload }) {
  const input = normalizeGenerationInput(payload);
  const { data: ownedLegend, error: legendError } = await supabaseAdmin
    .from('legends')
    .select('id')
    .eq('id', input.legendId)
    .eq('creator_id', userId)
    .maybeSingle();
  assertNoError(legendError, 'No se pudo validar la leyenda.');
  if (!ownedLegend) throw new CreatorCodesError('No tienes acceso a esta leyenda.', 403);

  const userClient = createUserScopedClient(accessToken);
  const { data, error } = await userClient.rpc('self_generate_codes', {
    p_legend_id: input.legendId,
    p_quantity: input.quantity,
    p_prefix: input.prefix,
    p_reason: input.reason,
  });
  if (error) throw new CreatorCodesError(error.message || 'No se pudieron generar los codigos.');
  return Array.isArray(data) ? data[0] : data;
}

function escapeCsv(value = '') {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export async function exportCreatorCodeBatchCsv({ userId, batchId }) {
  if (!UUID_PATTERN.test(String(batchId || ''))) throw new CreatorCodesError('Lote invalido.');

  const { data: batch, error: batchError } = await supabaseAdmin
    .from('code_batches')
    .select('id, edition_id, prefix, quantity, status, created_at')
    .eq('id', batchId)
    .maybeSingle();
  assertNoError(batchError, 'No se pudo cargar el lote.');
  if (!batch) throw new CreatorCodesError('El lote no existe.', 404);

  const { data: edition, error: editionError } = await supabaseAdmin
    .from('physical_editions')
    .select('id, legend_id, edition_name')
    .eq('id', batch.edition_id)
    .single();
  assertNoError(editionError, 'No se pudo validar la edicion fisica.');

  const { data: legend, error: legendError } = await supabaseAdmin
    .from('legends')
    .select('id, title, slug, creator_id')
    .eq('id', edition.legend_id)
    .single();
  assertNoError(legendError, 'No se pudo validar la leyenda del lote.');
  if (String(legend.creator_id) !== String(userId)) {
    throw new CreatorCodesError('No tienes acceso a este lote.', 403);
  }

  const { data: codes, error: codesError } = await supabaseAdmin
    .from('access_codes')
    .select('display_code, status, expires_at, created_at')
    .eq('batch_id', batch.id)
    .order('created_at', { ascending: true });
  assertNoError(codesError, 'No se pudieron exportar los codigos.');
  if (!(codes ?? []).length) throw new CreatorCodesError('Este lote no tiene codigos para exportar.', 404);

  const rows = [
    ['codigo', 'estado', 'leyenda', 'edicion', 'lote', 'expira'],
    ...(codes ?? []).map((code) => [
      code.display_code,
      code.status,
      legend.title,
      edition.edition_name,
      batch.id,
      code.expires_at || '',
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')}`;
  const safeSlug = String(legend.slug || legend.title || 'leyenda').replace(/[^a-z0-9-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return { csv, filename: `codigos-${safeSlug || 'leyenda'}-${String(batch.id).slice(0, 8)}.csv` };
}
