import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';
import {
  ensureCreatorCanCreate,
  getCreatorIdCandidates,
} from './creatorAccessService.js';
import { getLegendResources } from './assetService.js';

const ACCESS_TYPES = ['free', 'paid', 'subscription', 'code_required', 'mixed'];
const EDITABLE_VERSION_STATUSES = ['draft', 'rejected'];

function getClient() {
  if (!supabase) return { data: null, error: getSupabaseConfigError() };
  return { data: supabase, error: null };
}

function friendlyLegendError(message = 'No pudimos guardar la leyenda.') {
  return new Error(message);
}

function isInvalidId(value) {
  return !value || value === 'undefined' || String(value).trim() === '';
}

function isDev() {
  return import.meta.env.DEV;
}

function debugEditor(label, value) {
  if (isDev()) console.log(label, value);
}

function isLegendOwnedByCreator(legend, creatorCandidates = []) {
  if (!legend?.creator_id) return false;
  return creatorCandidates.map(String).includes(String(legend.creator_id));
}

function isUuidLike(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function normalizeLegendListItem(legend) {
  return {
    ...legend,
    id: legend.id,
    version_id: legend.version_id ?? legend.legend_versions?.[0]?.id ?? null,
  };
}

function cleanLegendPayload(payload = {}) {
  return {
    title: payload.title?.trim(),
    slug: payload.slug?.trim(),
    short_synopsis: payload.short_synopsis?.trim(),
    synopsis: payload.synopsis?.trim(),
    origin_place: payload.origin_place?.trim() || 'Bacalar',
    language: payload.language?.trim() || 'es',
    age_rating: payload.age_rating || 'general',
    access_type: payload.access_type || 'free',
    is_featured: Boolean(payload.is_featured),
  };
}

function validateLegendPayload(payload = {}) {
  if (!payload.title?.trim()) return friendlyLegendError('Completa los datos obligatorios.');
  if (!payload.slug?.trim()) return friendlyLegendError('Completa los datos obligatorios.');
  if (!payload.short_synopsis?.trim()) return friendlyLegendError('Completa los datos obligatorios.');
  if (!payload.synopsis?.trim()) return friendlyLegendError('Completa los datos obligatorios.');
  if (!ACCESS_TYPES.includes(payload.access_type)) return friendlyLegendError('Selecciona un tipo de acceso valido.');
  return null;
}

function normalizePages(pages = []) {
  return pages
    .filter((page) => !page._delete)
    .map((page, index) => ({
      id: page.id,
      page_number: Number(page.page_number || index + 1),
      title: page.title?.trim() || null,
      text_content: page.text_content?.trim() || '',
    }))
    .sort((a, b) => a.page_number - b.page_number);
}

function normalizeGenres(genres = []) {
  return [...new Set(genres.map((genre) => genre?.trim()).filter(Boolean))];
}

async function tryInsertGenre(client, name) {
  const { data, error } = await client.from('genres').insert({ name }).select().single();
  if (!error) return { data, error: null };

  console.error('createLegendDraft error', error);
  return { data: null, error };
}

async function saveLegendGenres(client, legendId, genres = []) {
  const cleanedGenres = normalizeGenres(genres);
  if (!cleanedGenres.length) return { data: [], error: null };

  try {
    const { data: existingGenres, error: existingError } = await client
      .from('genres')
      .select('id, name')
      .in('name', cleanedGenres);

    if (existingError) {
      console.error(existingError);
      return { data: [], error: null };
    }

    const found = existingGenres ?? [];
    const foundNames = new Set(found.map((genre) => genre.name));
    const created = [];

    for (const genreName of cleanedGenres.filter((name) => !foundNames.has(name))) {
      const { data } = await tryInsertGenre(client, genreName);
      if (data) created.push(data);
    }

    const allGenres = [...found, ...created].filter((genre) => genre?.id);
    if (!allGenres.length) return { data: [], error: null };

    const linkPayloads = allGenres.map((genre) => ({
      legend_id: legendId,
      genre_id: genre.id,
    }));

    const { error: linkError } = await client.from('legend_genres').insert(linkPayloads);
    if (linkError) {
      console.error(linkError);
      return { data: allGenres, error: null };
    }

    return { data: allGenres, error: null };
  } catch (error) {
    console.error(error);
    return { data: [], error: null };
  }
}

async function getLatestVersion(client, legendId) {
  const { data, error } = await client
    .from('legend_versions')
    .select('*')
    .eq('legend_id', legendId)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error };
  return { data, error: null };
}

async function getLatestEditableVersion(client, legendId) {
  const { data, error } = await client
    .from('legend_versions')
    .select('*')
    .eq('legend_id', legendId)
    .in('status', EDITABLE_VERSION_STATUSES)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error };
  return { data, error: null };
}

async function getVersionByNumber(client, legendId, versionNumber) {
  const { data, error } = await client
    .from('legend_versions')
    .select('*')
    .eq('legend_id', legendId)
    .eq('version_number', versionNumber)
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error };
  return { data, error: null };
}

async function createDraftVersion(client, legendId, latestVersion = null, createdBy) {
  if (isInvalidId(legendId)) return { data: null, error: friendlyLegendError('No pudimos crear la version inicial.') };
  if (isInvalidId(createdBy)) return { data: null, error: friendlyLegendError('No pudimos crear la version inicial.') };

  const nextVersionNumber = Number(latestVersion?.version_number || 0) + 1;
  const versionNumber = nextVersionNumber || 1;
  const existingResult = await getVersionByNumber(client, legendId, versionNumber);

  if (existingResult.error) {
    console.error('create initial version error', existingResult.error);
    return { data: null, error: existingResult.error };
  }

  if (existingResult.data?.id) return { data: existingResult.data, error: null };

  const versionPayload = {
    legend_id: legendId,
    version_number: versionNumber,
    status: 'draft',
    created_by: createdBy,
  };
  debugEditor('creating initial version', versionPayload);

  const { data, error } = await client
    .from('legend_versions')
    .insert(versionPayload)
    .select()
    .single();

  if (error) {
    console.error('create initial version error', error);
    console.error('create initial legend version error', error);
    console.error('create legend version error', error);

    const retryExistingResult = await getVersionByNumber(client, legendId, versionNumber);
    if (!retryExistingResult.error && retryExistingResult.data?.id) {
      return { data: retryExistingResult.data, error: null };
    }

    return { data: null, error };
  }
  return { data, error: null };
}

async function resolveLegendForEditor(client, identifier) {
  const lookupValue = String(identifier || '').trim();
  if (isInvalidId(lookupValue)) return { data: null, error: friendlyLegendError('No pudimos cargar la leyenda.') };

  const lookupAttempts = [];

  if (isUuidLike(lookupValue)) {
    lookupAttempts.push(
      client
        .from('legends')
        .select('*')
        .eq('id', lookupValue)
        .maybeSingle()
        .then((result) => ({ ...result, source: 'legend.id' })),
    );
  }

  lookupAttempts.push(
    client
      .from('legends')
      .select('*')
      .eq('slug', lookupValue)
      .maybeSingle()
      .then((result) => ({ ...result, source: 'legend.slug' })),
  );

  if (isUuidLike(lookupValue)) {
    lookupAttempts.push(
      client
        .from('legend_versions')
        .select('legend_id')
        .eq('id', lookupValue)
        .maybeSingle()
        .then(async (versionResult) => {
          if (versionResult.error || !versionResult.data?.legend_id) {
            return { data: null, error: versionResult.error, source: 'legend_versions.id' };
          }

          const legendResult = await client
            .from('legends')
            .select('*')
            .eq('id', versionResult.data.legend_id)
            .maybeSingle();
          return { ...legendResult, source: 'legend_versions.id' };
        }),
    );
  }

  let firstError = null;
  for (const attempt of lookupAttempts) {
    const result = await attempt;
    if (result.error) {
      firstError = firstError || result.error;
      console.error('getLegendEditorData error', result.error);
      continue;
    }
    if (result.data?.id) {
      debugEditor('resolved legend source', result.source);
      return { data: result.data, error: null };
    }
  }

  return { data: null, error: firstError };
}

async function validateLegendOwnership(client, legend, accessStatus, creatorCandidates) {
  if (isLegendOwnedByCreator(legend, creatorCandidates)) return true;
  if (isInvalidId(legend?.creator_id)) return false;

  const creatorId = String(legend.creator_id);
  if (!isUuidLike(creatorId)) return false;
  const profileChecks = [
    client
      .from('creator_profiles')
      .select('*')
      .eq('user_id', creatorId)
      .limit(1)
      .maybeSingle(),
  ];

  for (const profileCheck of profileChecks) {
    const { data, error } = await profileCheck;
    if (error) {
      console.error('getLegendEditorData error', error);
      continue;
    }

    if (
      data
      && (
        String(data.user_id) === String(accessStatus?.userId)
        || creatorCandidates.map(String).includes(String(data.user_id))
      )
    ) {
      return true;
    }
  }

  return false;
}

async function insertLegendWithCreatorCandidates(client, payload, creatorCandidates) {
  let lastError = null;

  for (const creatorId of creatorCandidates) {
    const { data, error } = await client
      .from('legends')
      .insert({ ...payload, creator_id: creatorId, status: 'draft' })
      .select()
      .single();

    if (!error && data?.id) return { data, error: null };
    lastError = error;
  }

  console.error(lastError);
  return { data: null, error: lastError };
}

function withCreatorFilter(query, creatorCandidates) {
  if (creatorCandidates.length === 1) return query.eq('creator_id', creatorCandidates[0]);
  return query.in('creator_id', creatorCandidates);
}

export async function createLegendDraft(payload, pages = []) {
  const cleanedPayload = cleanLegendPayload(payload);
  const genres = normalizeGenres(payload.genres ?? []);
  const validationError = validateLegendPayload(cleanedPayload);
  if (validationError) return { data: null, error: validationError };

  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const { data: accessStatus, error: accessError } = await ensureCreatorCanCreate();
    if (accessError) return { data: null, error: accessError };
    const userId = accessStatus?.userId;
    debugEditor('createLegendDraft userId', userId);
    if (isInvalidId(userId)) return { data: null, error: friendlyLegendError('Debes iniciar sesion para continuar.') };

    const creatorCandidates = getCreatorIdCandidates(accessStatus);
    if (!creatorCandidates.length) {
      return { data: null, error: friendlyLegendError('Tu perfil de creador no se encontro. Vuelve a iniciar sesion o contacta al administrador.') };
    }

    const { data: legend, error: legendError } = await insertLegendWithCreatorCandidates(client, cleanedPayload, creatorCandidates);

    if (legendError || !legend?.id) {
      console.error('createLegendDraft error', legendError);
      return { data: null, error: friendlyLegendError('No pudimos guardar la leyenda.') };
    }

    debugEditor('created legend', legend);
    const { data: version, error: versionError } = await createDraftVersion(client, legend.id, null, userId);

    if (versionError || !version?.id) {
      console.error('createLegendDraft versionError', versionError);
      return { data: { legend, version: null, pages: [] }, error: friendlyLegendError('No pudimos crear la version inicial.') };
    }

    await saveLegendGenres(client, legend.id, genres);

    const pagesResult = await saveLegendPages({ versionId: version.id, pages });
    if (pagesResult.error) return { data: { legend, version, pages: [] }, error: pagesResult.error };

    return { data: { legend, version, pages: pagesResult.data }, error: null };
  } catch (error) {
    console.error('createLegendDraft error', error);
    return { data: null, error: friendlyLegendError('No pudimos guardar la leyenda.') };
  }
}

export async function updateLegendDraft(legendId, payload) {
  if (isInvalidId(legendId)) return { data: null, error: friendlyLegendError('No pudimos guardar la leyenda.') };
  const cleanedPayload = cleanLegendPayload(payload);
  const validationError = validateLegendPayload(cleanedPayload);
  if (validationError) return { data: null, error: validationError };

  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const { data: accessStatus, error: accessError } = await ensureCreatorCanCreate();
    if (accessError) return { data: null, error: accessError };
    const creatorCandidates = getCreatorIdCandidates(accessStatus);
    if (!creatorCandidates.length) {
      return { data: null, error: friendlyLegendError('Tu perfil de creador no se encontro. Vuelve a iniciar sesion o contacta al administrador.') };
    }

    const { data: existingLegend, error: existingLegendError } = await resolveLegendForEditor(client, legendId);
    if (existingLegendError || !existingLegend) {
      console.error('getLegendEditorData error', existingLegendError);
      return { data: null, error: friendlyLegendError('No pudimos guardar la leyenda.') };
    }

    const ownsLegend = await validateLegendOwnership(client, existingLegend, accessStatus, creatorCandidates);
    if (!ownsLegend) {
      console.error('getLegendEditorData error', {
        reason: 'cannot update legend that does not belong to current creator',
        legendCreatorId: existingLegend.creator_id,
        creatorCandidates,
      });
      return { data: null, error: friendlyLegendError('No pudimos guardar la leyenda.') };
    }

    const query = client
      .from('legends')
      .update(cleanedPayload)
      .eq('id', existingLegend.id);
    const { data, error } = await query.select().single();

    if (error) {
      console.error(error);
      return { data: null, error: friendlyLegendError('No pudimos guardar la leyenda.') };
    }

    return { data, error: null };
  } catch (error) {
    console.error(error);
    return { data: null, error: friendlyLegendError('No pudimos guardar la leyenda.') };
  }
}

export async function updateLegendGeneralData(legendId, payload) {
  return updateLegendDraft(legendId, payload);
}

export async function getMyLegends() {
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  try {
    const { data: accessStatus, error: accessError } = await ensureCreatorCanCreate();
    if (accessError) return { data: [], error: accessError };
    const creatorCandidates = getCreatorIdCandidates(accessStatus);
    if (!creatorCandidates.length) {
      return { data: [], error: friendlyLegendError('Tu perfil de creador no se encontro. Vuelve a iniciar sesion o contacta al administrador.') };
    }

    const query = client
      .from('legends')
      .select('*')
      .order('created_at', { ascending: false });
    const { data, error } = await withCreatorFilter(query, creatorCandidates);

    if (error) {
      console.error('getMyLegends error', error);
      return { data: [], error: friendlyLegendError('No pudimos cargar tus leyendas.') };
    }

    return { data: (data ?? []).map(normalizeLegendListItem), error: null };
  } catch (error) {
    console.error('getMyLegends error', error);
    return { data: [], error: friendlyLegendError('No pudimos cargar tus leyendas.') };
  }
}

export async function getDrafts() {
  const { data, error } = await getMyLegends();
  if (error) return { data: [], error };
  return {
    data: (data ?? []).filter((legend) => ['draft', 'rejected'].includes(legend.status || 'draft')),
    error: null,
  };
}

export async function getCurrentEditableVersion(legendId) {
  if (isInvalidId(legendId)) return { data: null, error: friendlyLegendError('No pudimos cargar la version de trabajo.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const editableResult = await getLatestEditableVersion(client, legendId);
    if (editableResult.error) {
      console.error('getLegendEditorData error', editableResult.error);
      return { data: null, error: friendlyLegendError('No pudimos cargar la version de trabajo.') };
    }
    if (editableResult.data) return { data: editableResult.data, error: null };

    const { data: latestVersion, error } = await getLatestVersion(client, legendId);
    if (error) {
      console.error('getLegendEditorData error', error);
      return { data: null, error: friendlyLegendError('No pudimos cargar la version de trabajo.') };
    }
    return { data: latestVersion, error: null };
  } catch (error) {
    console.error('getLegendEditorData error', error);
    return { data: null, error: friendlyLegendError('No pudimos cargar la version de trabajo.') };
  }
}

export async function getCurrentDraftVersion(legendId) {
  return getCurrentEditableVersion(legendId);
}

export async function getLegendEditorData(legendId) {
  if (isInvalidId(legendId)) return { data: null, error: friendlyLegendError('No pudimos cargar la leyenda.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    debugEditor('editor legendId', legendId);
    const { data: accessStatus, error: accessError } = await ensureCreatorCanCreate();
    if (accessError) return { data: null, error: accessError };
    debugEditor('current creator profile', accessStatus?.creatorProfile);
    const userId = accessStatus?.userId;
    if (isInvalidId(userId)) return { data: null, error: friendlyLegendError('Debes iniciar sesion para continuar.') };

    const creatorCandidates = getCreatorIdCandidates(accessStatus);
    if (!creatorCandidates.length) {
      return { data: null, error: friendlyLegendError('Tu perfil de creador no se encontro. Vuelve a iniciar sesion o contacta al administrador.') };
    }

    const { data: legend, error: legendError } = await resolveLegendForEditor(client, legendId);
    debugEditor('loaded legend', legend);

    if (legendError || !legend) {
      console.error('getLegendEditorData error', legendError);
      return { data: null, error: friendlyLegendError('No pudimos cargar la leyenda.') };
    }

    const ownsLegend = await validateLegendOwnership(client, legend, accessStatus, creatorCandidates);
    if (!ownsLegend) {
      console.error('getLegendEditorData error', {
        reason: 'legend does not belong to current creator',
        legendCreatorId: legend.creator_id,
        creatorCandidates,
      });
      return { data: null, error: friendlyLegendError('No pudimos cargar la leyenda.') };
    }

    const editableVersionResult = await getLatestEditableVersion(client, legend.id);
    if (editableVersionResult.error) {
      console.error('getLegendEditorData error', editableVersionResult.error);
      return { data: null, error: friendlyLegendError('No pudimos cargar la version de trabajo.') };
    }

    let version = editableVersionResult.data;
    const latestVersionResult = await getLatestVersion(client, legend.id);
    if (latestVersionResult.error) {
      console.error('getLegendEditorData error', latestVersionResult.error);
      return { data: null, error: friendlyLegendError('No pudimos cargar la version de trabajo.') };
    }

    if (!version) {
      const latestVersion = latestVersionResult.data;

      if (!latestVersion) {
        debugEditor('missing legend version', 'Esta leyenda no tenia version inicial. Preparando version draft.');
        const { data: createdVersion, error: createVersionError } = await createDraftVersion(client, legend.id, latestVersion, userId);

        if (createVersionError) {
          console.error('createLegendDraft versionError', createVersionError);
          console.error('recover version error', createVersionError);
          console.error('getLegendEditorData error', createVersionError);
          return { data: null, error: friendlyLegendError('No pudimos crear la version inicial.') };
        }
        version = createdVersion;
      } else {
        version = latestVersion;
      }
    }

    if (!version?.id) {
      return { data: null, error: friendlyLegendError('No pudimos cargar la version de trabajo.') };
    }

    debugEditor('loaded version', version);
    debugEditor('versionId', version.id);
    const { data: pages, error: pagesError } = await client
      .from('legend_pages')
      .select('*')
      .eq('version_id', version.id)
      .order('page_number', { ascending: true });
    debugEditor('pages loaded', pages ?? []);

    if (pagesError) {
      console.error('getLegendEditorData error', pagesError);
    }

    const resourcesResult = await getLegendResources(legend.id);
    const resources = resourcesResult.data ?? { media: [], documents: [], arScenes: [], arMarkers: [] };

    return {
      data: {
        legend,
        version,
        pages: pages ?? [],
        media: resources.media ?? [],
        sourceDocuments: resources.documents ?? [],
        arScenes: resources.arScenes ?? [],
        arMarkers: resources.arMarkers ?? [],
        resources,
      },
      error: pagesError ? friendlyLegendError('No pudimos cargar las paginas.') : null,
    };
  } catch (error) {
    console.error('getLegendEditorData error', error);
    return { data: null, error: friendlyLegendError('No pudimos cargar la leyenda.') };
  }
}

export async function saveLegendPages({ versionId, pages = [] }) {
  if (isInvalidId(versionId)) return { data: [], error: friendlyLegendError('No pudimos guardar las paginas.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: [], error: clientError };

  try {
    debugEditor('versionId', versionId);
    const deletedIds = pages.filter((page) => page._delete && page.id).map((page) => page.id);
    if (deletedIds.length) {
      const { error: deleteError } = await client.from('legend_pages').delete().in('id', deletedIds);
      if (deleteError) {
        console.error('saveLegendPage error', deleteError);
        return { data: [], error: friendlyLegendError('No pudimos guardar las paginas.') };
      }
    }

    const normalizedPages = normalizePages(pages);
    const savedPages = [];

    for (const page of normalizedPages) {
      const payload = {
        version_id: versionId,
        page_number: page.page_number,
        title: page.title,
        text_content: page.text_content,
      };

      const query = page.id
        ? client.from('legend_pages').update(payload).eq('id', page.id).select().single()
        : client.from('legend_pages').insert(payload).select().single();

      const { data, error } = await query;
      if (error) {
        console.error('saveLegendPage error', error);
        return { data: savedPages, error: friendlyLegendError('No pudimos guardar las paginas.') };
      }
      savedPages.push(data);
    }

    return {
      data: savedPages.sort((a, b) => a.page_number - b.page_number),
      error: null,
    };
  } catch (error) {
    console.error('saveLegendPage error', error);
    return { data: [], error: friendlyLegendError('No pudimos guardar las paginas.') };
  }
}

export async function createLegendPage({ versionId, pageNumber, title, textContent }) {
  if (isInvalidId(versionId)) return { data: null, error: friendlyLegendError('No pudimos guardar la pagina.') };
  const page = {
    page_number: pageNumber,
    title,
    text_content: textContent ?? '',
  };
  const result = await saveLegendPages({ versionId, pages: [page] });
  return { data: result.data?.[0] ?? null, error: result.error };
}

export async function updateLegendPage({ pageId, title, textContent, pageNumber }) {
  if (isInvalidId(pageId)) return { data: null, error: friendlyLegendError('No pudimos guardar la pagina.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const payload = {
      title: title?.trim() || null,
      text_content: textContent ?? '',
      page_number: Number(pageNumber || 1),
    };
    const { data, error } = await client
      .from('legend_pages')
      .update(payload)
      .eq('id', pageId)
      .select()
      .single();

    if (error) {
      console.error('saveLegendPage error', error);
      return { data: null, error: friendlyLegendError('No pudimos guardar la pagina.') };
    }

    return { data, error: null };
  } catch (error) {
    console.error('saveLegendPage error', error);
    return { data: null, error: friendlyLegendError('No pudimos guardar la pagina.') };
  }
}

export async function saveLegendPage({ versionId, page }) {
  if (isInvalidId(versionId)) return { data: null, error: friendlyLegendError('No pudimos guardar la pagina.') };
  const result = await saveLegendPages({ versionId, pages: [page] });
  return { data: result.data?.[0] ?? null, error: result.error };
}

export async function deleteLegendPage(pageId) {
  if (isInvalidId(pageId)) return { data: null, error: friendlyLegendError('No pudimos eliminar la pagina.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const { data, error } = await client.from('legend_pages').delete().eq('id', pageId).select().maybeSingle();
    if (error) {
      console.error('saveLegendPage error', error);
      return { data: null, error: friendlyLegendError('No pudimos eliminar la pagina.') };
    }
    return { data, error: null };
  } catch (error) {
    console.error('saveLegendPage error', error);
    return { data: null, error: friendlyLegendError('No pudimos eliminar la pagina.') };
  }
}

export function canEditVersion(version) {
  return EDITABLE_VERSION_STATUSES.includes(version?.status || 'draft');
}

export function validateReadyForReview({ legend, pages }) {
  const validationError = validateLegendPayload(cleanLegendPayload(legend));
  if (validationError) return validationError;
  const validPages = normalizePages(pages).filter((page) => page.text_content);
  if (!validPages.length) return friendlyLegendError('Agrega al menos una pagina antes de enviar a revision.');
  return null;
}

export async function submitLegendForReview(versionId) {
  if (isInvalidId(versionId)) return { data: null, error: friendlyLegendError('No pudimos enviar la leyenda a revision.') };
  const { data: client, error: clientError } = getClient();
  if (clientError) return { data: null, error: clientError };

  try {
    const { data, error } = await client.rpc('submit_legend_version_for_review', { p_version_id: versionId });
    if (error) {
      console.error('submit review error', error);
      return { data: null, error: friendlyLegendError('No pudimos enviar la leyenda a revision.') };
    }
    return { data, error: null };
  } catch (error) {
    console.error('submit review error', error);
    return { data: null, error: friendlyLegendError('No pudimos enviar la leyenda a revision.') };
  }
}
