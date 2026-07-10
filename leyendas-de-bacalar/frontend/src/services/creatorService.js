import { getCurrentUser } from './authService.js';
import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';
import {
  ensureCreatorCanCreate,
  getCreatorIdCandidates,
  getCurrentCreatorProfile,
} from './creatorAccessService.js';
import {
  canDeleteCreatorLegend as canDeleteEditorCreatorLegend,
  canEditCreatorLegend as canEditEditorCreatorLegend,
  canSubmitLegend as canSubmitEditorLegend,
  canViewLegend as canViewEditorLegend,
  countCreatorLegendsByStatus as countEditorCreatorLegendsByStatus,
  createLegendDraft,
  deleteCreatorLegend as deleteEditorCreatorLegend,
  deleteLegendDraft as deleteEditorLegendDraft,
  duplicateLegend as duplicateEditorLegend,
  getCreatorLegendCardData as getEditorCreatorLegendCardData,
  getCreatorLegendDeleteLabel as getEditorCreatorLegendDeleteLabel,
  getCreatorLegendPrimaryAction as getEditorCreatorLegendPrimaryAction,
  getCreatorLegendStatusKey as getEditorCreatorLegendStatusKey,
  getCreatorLegends as getEditorCreatorLegends,
  getLegendCardActions as getEditorLegendCardActions,
  getLegendDeleteConfirmation as getEditorLegendDeleteConfirmation,
  getLegendDisplayStatus as getEditorLegendDisplayStatus,
  getLegendFeedback as getEditorLegendFeedback,
  getLegendStatusBadge as getEditorLegendStatusBadge,
  getMyLegends as getEditorMyLegends,
} from './creatorLegendService.js';

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

export async function getMyCreatorProfile(providedClient = null) {
  return getCurrentCreatorProfile(providedClient);
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
  return getEditorMyLegends();
}

export async function getCreatorLegends(options) {
  return getEditorCreatorLegends(options);
}

export async function createLegend(payload) {
  return createLegendDraft(payload);
}

export async function deleteLegendDraft(legendId) {
  return deleteEditorLegendDraft(legendId);
}

export async function deleteCreatorLegend(legendId, options = {}) {
  return deleteEditorCreatorLegend(legendId, options);
}

export async function duplicateLegend(legendId) {
  return duplicateEditorLegend(legendId);
}

export function getCreatorLegendStatusKey(legendOrStatus) {
  return getEditorCreatorLegendStatusKey(legendOrStatus);
}

export function canDeleteCreatorLegend(legendOrStatus) {
  return canDeleteEditorCreatorLegend(legendOrStatus);
}

export function canEditCreatorLegend(legendOrStatus) {
  return canEditEditorCreatorLegend(legendOrStatus);
}

export function canSubmitLegend(legendOrStatus) {
  return canSubmitEditorLegend(legendOrStatus);
}

export function canViewLegend(legendOrStatus) {
  return canViewEditorLegend(legendOrStatus);
}

export function getLegendDisplayStatus(legendOrStatus) {
  return getEditorLegendDisplayStatus(legendOrStatus);
}

export function getLegendStatusBadge(legendOrStatus) {
  return getEditorLegendStatusBadge(legendOrStatus);
}

export function getLegendFeedback(legend) {
  return getEditorLegendFeedback(legend);
}

export function getLegendCardActions(legend, options = {}) {
  return getEditorLegendCardActions(legend, options);
}

export function getCreatorLegendPrimaryAction(legend) {
  return getEditorCreatorLegendPrimaryAction(legend);
}

export function getCreatorLegendDeleteLabel(legendOrStatus) {
  return getEditorCreatorLegendDeleteLabel(legendOrStatus);
}

export function getLegendDeleteConfirmation(legend) {
  return getEditorLegendDeleteConfirmation(legend);
}

export function getCreatorLegendCardData(legend, options = {}) {
  return getEditorCreatorLegendCardData(legend, options);
}

export function countCreatorLegendsByStatus(legends, statuses) {
  return countEditorCreatorLegendsByStatus(legends, statuses);
}

export async function updateLegend(legendId, payload) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: accessStatus, error: accessError } = await ensureCreatorCanCreate();
  if (accessError) return { data: null, error: accessError };
  const creatorCandidates = getCreatorIdCandidates(accessStatus);
  if (!creatorCandidates.length) return { data: null, error: new Error('Tu perfil de creador no se encontro. Vuelve a iniciar sesion o contacta al administrador.') };

  let query = client
    .from('legends')
    .update(payload)
    .eq('id', legendId);
  query = creatorCandidates.length === 1
    ? query.eq('creator_id', creatorCandidates[0])
    : query.in('creator_id', creatorCandidates);
  return query.select().single();
}

export async function getMyLegend(legendId) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: accessStatus, error: accessError } = await ensureCreatorCanCreate();
  if (accessError) return { data: null, error: accessError };
  const creatorCandidates = getCreatorIdCandidates(accessStatus);
  if (!creatorCandidates.length) return { data: null, error: null };

  let query = client
    .from('legends')
    .select('*')
    .eq('id', legendId);
  query = creatorCandidates.length === 1
    ? query.eq('creator_id', creatorCandidates[0])
    : query.in('creator_id', creatorCandidates);
  return query.maybeSingle();
}

export async function createLegendVersion(legendId, versionNumber = 1) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: accessStatus, error: accessError } = await ensureCreatorCanCreate();
  if (accessError) return { data: null, error: accessError };
  const userId = accessStatus?.userId;
  if (!userId) return { data: null, error: new Error('Debes iniciar sesion para continuar.') };
  if (!legendId || legendId === 'undefined') return { data: null, error: new Error('No pudimos crear la version inicial.') };

  const existing = await client
    .from('legend_versions')
    .select('*')
    .eq('legend_id', legendId)
    .eq('version_number', Number(versionNumber || 1))
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    console.error('create initial version error', existing.error);
    return { data: null, error: existing.error };
  }

  if (existing.data?.id) return { data: existing.data, error: null };

  const result = await client
    .from('legend_versions')
    .insert({
      legend_id: legendId,
      version_number: Number(versionNumber || 1),
      status: 'draft',
      created_by: userId,
    })
    .select()
    .single();
  if (result.error) {
    console.error('create initial version error', result.error);
    console.error('create initial legend version error', result.error);
    console.error('createLegendDraft versionError', result.error);
    console.error('create legend version error', result.error);
  }
  return result;
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
  if (!versionId || versionId === 'undefined') return { data: [], error: new Error('No pudimos cargar las paginas.') };

  if (import.meta.env.DEV) console.log('versionId', versionId);
  const { data, error } = await client
    .from('legend_pages')
    .select('*')
    .eq('version_id', versionId)
    .order('page_number', { ascending: true });
  if (import.meta.env.DEV) console.log('pages loaded', data ?? []);
  if (error) console.error('getLegendPagesByVersion error', error);

  return { data: data ?? [], error };
}

export async function createLegendPage(payload) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { version_id, page_number, title, text_content, background_asset_id } = payload ?? {};
  if (!version_id || version_id === 'undefined') return { data: null, error: new Error('No pudimos guardar la pagina.') };
  const cleanPayload = {
    version_id,
    page_number,
    title: title ?? null,
    text_content: text_content ?? '',
    background_asset_id: background_asset_id ?? null,
  };

  if (import.meta.env.DEV) console.log('versionId', cleanPayload.version_id);
  const result = await client.from('legend_pages').insert(cleanPayload).select().single();
  if (result.error) console.error('createLegendPage error', result.error);
  return result;
}

// Los codigos se generan contra una edicion fisica (physical_editions), no contra
// la leyenda directa; el canje deriva la leyenda desde edition.legend_id. Para que el
// admin no pueda emitir codigos de la edicion equivocada, cada solicitud debe traer
// su edition_id. Esta funcion reutiliza una edicion existente de la leyenda o crea una
// borrador (permitido por RLS al creador dueno de la leyenda).
async function ensurePhysicalEditionForLegend(client, legendId) {
  const { data: existing, error: readError } = await client
    .from('physical_editions')
    .select('id')
    .eq('legend_id', legendId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (readError) return { data: null, error: readError };
  if (existing?.id) return { data: existing.id, error: null };

  const { data: userData, error: userError } = await getCurrentUser();
  if (userError) return { data: null, error: userError };
  const uid = userData?.user?.id;
  if (!uid) return { data: null, error: new Error('Sesion no valida. Vuelve a iniciar sesion.') };

  const { data: created, error: insertError } = await client
    .from('physical_editions')
    .insert({
      legend_id: legendId,
      edition_name: 'Edicion fisica',
      status: 'draft',
      created_by: uid,
    })
    .select('id')
    .single();
  if (insertError) return { data: null, error: insertError };
  return { data: created.id, error: null };
}

// Self-service: el autor genera sus codigos dentro del cupo que el admin le fijo en la
// edicion; si lo excede (o no hay cupo), el RPC crea una solicitud pendiente de aprobacion.
// Devuelve una fila con { outcome, code_request_id, batch_id, generated, remaining_quota, message }.
export async function selfGenerateCodes(legendId, quantity, prefix, reason) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: accessStatus, error: accessError } = await ensureCreatorCanCreate();
  if (accessError) return { data: null, error: accessError };

  const { data, error } = await client.rpc('self_generate_codes', {
    p_legend_id: legendId,
    p_quantity: Number(quantity),
    p_prefix: prefix || null,
    p_reason: reason || null,
  });
  return { data: Array.isArray(data) ? data[0] : data, error };
}

export async function createCodeRequest(legendId, quantity, reason) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: accessStatus, error: accessError } = await ensureCreatorCanCreate();
  if (accessError) return { data: null, error: accessError };
  const creatorCandidates = getCreatorIdCandidates(accessStatus);
  if (!creatorCandidates.length) return { data: null, error: new Error('Tu perfil de creador no se encontro. Vuelve a iniciar sesion o contacta al administrador.') };

  // Asegura la edicion fisica de la leyenda y ata la solicitud a ella.
  const { data: editionId, error: editionError } = await ensurePhysicalEditionForLegend(client, legendId);
  if (editionError) return { data: null, error: editionError };

  return client
    .from('code_requests')
    .insert({
      creator_id: creatorCandidates[0],
      legend_id: legendId,
      edition_id: editionId,
      quantity_requested: Number(quantity),
      reason,
      status: 'pending',
    })
    .select('*, legends(title, slug)')
    .single();
}

function attachCodeBatchesToRequests(requests = [], batches = [], codes = []) {
  const batchesByRequestId = new Map();
  for (const batch of batches) {
    const requestId = batch.code_request_id;
    if (!requestId) continue;
    const current = batchesByRequestId.get(String(requestId)) || [];
    current.push(batch);
    batchesByRequestId.set(String(requestId), current);
  }

  const codesByBatchId = new Map();
  for (const code of codes) {
    const batchId = code.batch_id;
    if (!batchId) continue;
    const current = codesByBatchId.get(String(batchId)) || [];
    current.push(code);
    codesByBatchId.set(String(batchId), current);
  }

  return requests.map((request) => {
    const requestBatches = batchesByRequestId.get(String(request.id)) || [];
    const requestCodes = requestBatches.flatMap((batch) =>
      (codesByBatchId.get(String(batch.id)) || []).map((code) => ({
        ...code,
        batch,
      }))
    );

    return {
      ...request,
      codeBatches: requestBatches,
      accessCodes: requestCodes,
    };
  });
}

export async function getMyCodeRequests() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  const { data: accessStatus, error: accessError } = await ensureCreatorCanCreate();
  if (accessError) return { data: [], error: accessError };
  const creatorCandidates = getCreatorIdCandidates(accessStatus);
  if (!creatorCandidates.length) return { data: [], error: null };

  let query = client
    .from('code_requests')
    .select('*, legends(title, slug)')
  query = creatorCandidates.length === 1
    ? query.eq('creator_id', creatorCandidates[0])
    : query.in('creator_id', creatorCandidates);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return { data: data ?? [], error };

  const requests = data ?? [];
  const requestIds = requests.map((request) => request.id).filter(Boolean);
  if (!requestIds.length) return { data: requests, error: null };

  const { data: batches, error: batchesError } = await client
    .from('code_batches')
    .select('id, code_request_id, edition_id, quantity, status, prefix, created_at, physical_editions(edition_name, edition_number)')
    .in('code_request_id', requestIds);

  if (batchesError) {
    if (import.meta.env.DEV) console.error('getMyCodeRequests batches error', batchesError);
    return { data: requests, error: null };
  }

  const batchIds = (batches ?? []).map((batch) => batch.id).filter(Boolean);
  if (!batchIds.length) return { data: attachCodeBatchesToRequests(requests, batches ?? [], []), error: null };

  const { data: codes, error: codesError } = await client
    .from('access_codes')
    .select('id, batch_id, display_code, status, assigned_to_user_id, assigned_at, expires_at, created_at')
    .in('batch_id', batchIds)
    .order('created_at', { ascending: false });

  if (codesError) {
    if (import.meta.env.DEV) console.error('getMyCodeRequests codes error', codesError);
    return { data: attachCodeBatchesToRequests(requests, batches ?? [], []), error: null };
  }

  return { data: attachCodeBatchesToRequests(requests, batches ?? [], codes ?? []), error: null };
}

export async function submitVersionForReview(versionId) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  return client.rpc('submit_legend_version_for_review', { p_version_id: versionId });
}
