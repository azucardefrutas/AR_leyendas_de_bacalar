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
  createLegendDraft,
  deleteCreatorLegend as deleteEditorCreatorLegend,
  deleteLegendDraft as deleteEditorLegendDraft,
  getCreatorLegendCardData as getEditorCreatorLegendCardData,
  getCreatorLegendStatusKey as getEditorCreatorLegendStatusKey,
  getCreatorLegends as getEditorCreatorLegends,
  getLegendCardActions as getEditorLegendCardActions,
  getLegendDeleteConfirmation as getEditorLegendDeleteConfirmation,
  getLegendDisplayStatus as getEditorLegendDisplayStatus,
  getLegendFeedback as getEditorLegendFeedback,
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

export async function getCreatorLegends() {
  return getEditorCreatorLegends();
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

export function getCreatorLegendStatusKey(legendOrStatus) {
  return getEditorCreatorLegendStatusKey(legendOrStatus);
}

export function canDeleteCreatorLegend(legendOrStatus) {
  return canDeleteEditorCreatorLegend(legendOrStatus);
}

export function canEditCreatorLegend(legendOrStatus) {
  return canEditEditorCreatorLegend(legendOrStatus);
}

export function getLegendDisplayStatus(legendOrStatus) {
  return getEditorLegendDisplayStatus(legendOrStatus);
}

export function getLegendFeedback(legend) {
  return getEditorLegendFeedback(legend);
}

export function getLegendCardActions(legend, options = {}) {
  return getEditorLegendCardActions(legend, options);
}

export function getLegendDeleteConfirmation(legend) {
  return getEditorLegendDeleteConfirmation(legend);
}

export function getCreatorLegendCardData(legend, options = {}) {
  return getEditorCreatorLegendCardData(legend, options);
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

export async function createCodeRequest(legendId, quantity, reason) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  const { data: accessStatus, error: accessError } = await ensureCreatorCanCreate();
  if (accessError) return { data: null, error: accessError };
  const creatorCandidates = getCreatorIdCandidates(accessStatus);
  if (!creatorCandidates.length) return { data: null, error: new Error('Tu perfil de creador no se encontro. Vuelve a iniciar sesion o contacta al administrador.') };

  return client
    .from('code_requests')
    .insert({
      creator_id: creatorCandidates[0],
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

  return { data: data ?? [], error };
}

export async function submitVersionForReview(versionId) {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  return client.rpc('submit_legend_version_for_review', { p_version_id: versionId });
}
