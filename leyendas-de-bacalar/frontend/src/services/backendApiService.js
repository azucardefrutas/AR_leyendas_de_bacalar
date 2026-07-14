import { getSession } from './authService.js';

const backendUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, '');

const STATUS_MESSAGES = {
  400: 'No pudimos validar la solicitud.',
  401: 'Inicia sesion para continuar.',
  403: 'No tienes permisos para realizar esta accion.',
  503: 'El servicio no esta disponible temporalmente.',
  500: 'No pudimos conectar con el servidor.',
};

export class BackendApiError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message);
    this.name = 'BackendApiError';
    this.status = status;
    this.data = data;
  }
}

function getBackendUrl() {
  if (!backendUrl) {
    throw new BackendApiError('Backend URL no configurada. Configura VITE_BACKEND_URL para usar el backend.');
  }

  return backendUrl;
}

function buildBackendUrl(path) {
  const baseUrl = getBackendUrl();
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path || ''}`;
  return `${baseUrl}${normalizedPath}`;
}

function logBackendError(operation, { url, method, status, error } = {}) {
  if (!import.meta.env.DEV) return;
  console.error('[BackendAPI] Error real:', {
    operation,
    url,
    method,
    status,
    error,
  });
}

async function getAccessToken() {
  const { data, error } = await getSession();
  const accessToken = data?.session?.access_token;

  if (error || !accessToken) {
    throw new BackendApiError(STATUS_MESSAGES[401], { status: 401 });
  }

  return accessToken;
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    return null;
  }

  return response.json();
}

export async function requestBackend(path, options = {}) {
  const {
    authenticated = true,
    body,
    headers,
    method = body ? 'POST' : 'GET',
    operation = 'backend-request',
    ...fetchOptions
  } = options;

  const requestHeaders = {
    Accept: 'application/json',
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  if (authenticated === true) {
    const accessToken = await getAccessToken();
    requestHeaders.Authorization = `Bearer ${accessToken}`;
  } else if (authenticated === 'optional') {
    // Attach the token if the user is signed in, but allow anonymous access too
    // (used by public reader endpoints like reader-bundle for free legends).
    try {
      const accessToken = await getAccessToken();
      requestHeaders.Authorization = `Bearer ${accessToken}`;
    } catch {
      // Anonymous request is fine.
    }
  }

  const url = buildBackendUrl(path);
  let response;

  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...fetchOptions,
    });
  } catch (error) {
    logBackendError(operation, {
      url,
      method,
      status: 0,
      error: error?.message || error,
    });
    throw new BackendApiError('No se pudo conectar con el backend. Verifica que este activo.', {
      status: 0,
      data: {
        operation,
        url,
      },
    });
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    const message = data?.error || data?.message || STATUS_MESSAGES[response.status] || 'No pudimos completar la solicitud.';
    logBackendError(operation, {
      url,
      method,
      status: response.status,
      error: message,
    });
    throw new BackendApiError(message, {
      status: response.status,
      data,
    });
  }

  return data;
}

// Admin: change a user's status (suspend/activate). Sensitive action gated by the
// backend's requireRole(['admin']) — no longer a direct table write from the browser.
export async function setUserStatusBackend(userId, status) {
  return requestBackend(`/api/v1/admin/users/${userId}/status`, {
    method: 'POST',
    body: { status },
    operation: 'admin-set-user-status',
  });
}

async function requestBackendFile(path, { operation = 'backend-file' } = {}) {
  const accessToken = await getAccessToken();
  const url = buildBackendUrl(path);
  let response;

  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/csv',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    logBackendError(operation, { url, method: 'GET', status: 0, error: error?.message || error });
    throw new BackendApiError('No se pudo conectar con el backend. Verifica que este activo.', { status: 0 });
  }

  if (!response.ok) {
    const data = await parseResponse(response);
    const message = data?.error || data?.message || STATUS_MESSAGES[response.status] || 'No pudimos descargar el archivo.';
    logBackendError(operation, { url, method: 'GET', status: response.status, error: message });
    throw new BackendApiError(message, { status: response.status, data });
  }

  return response.blob();
}

export function getBackendHealth() {
  return requestBackend('/health', { authenticated: false });
}

export function getBackendMe() {
  return requestBackend('/api/v1/auth/me');
}

export function getBackendRoles() {
  return requestBackend('/api/v1/auth/roles');
}

export function checkBackendAdminAccess() {
  return requestBackend('/api/v1/auth/admin-check');
}

export function getCreatorCodesOverview() {
  return requestBackend('/api/v1/creator/codes/overview', {
    operation: 'creator-codes-overview',
  });
}

export function generateCreatorCodes(payload) {
  return requestBackend('/api/v1/creator/codes', {
    method: 'POST',
    operation: 'generate-creator-codes',
    body: payload,
  });
}

export async function downloadCreatorCodeBatchCsv(batchId, filename = 'codigos.csv') {
  const blob = await requestBackendFile(
    `/api/v1/creator/code-batches/${encodeURIComponent(batchId)}/export.csv`,
    { operation: 'export-creator-code-batch' },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function getLegendDocumentContext(legendId) {
  return requestBackend(`/api/v1/documents/legend/${encodeURIComponent(legendId)}/context`);
}

export function validateLegendFileMetadata({ legendId, filename, mimeType, sizeBytes, purpose }) {
  return requestBackend('/api/v1/documents/validate-file', {
    method: 'POST',
    body: {
      legendId,
      filename,
      mimeType,
      sizeBytes,
      purpose,
    },
  });
}

export function prepareLegendUpload({ legendId, filename, mimeType, sizeBytes, purpose }) {
  return requestBackend('/api/v1/documents/prepare-upload', {
    method: 'POST',
    operation: 'prepare-upload',
    body: {
      legendId,
      filename,
      mimeType,
      sizeBytes,
      purpose,
    },
  });
}

// Creator write path moved to the backend (single call, server-side orchestration).
// Callers fall back to the Supabase-direct path when the backend is unreachable.
export function createLegendDraftBackend(legend) {
  return requestBackend('/api/v1/legends', {
    method: 'POST',
    operation: 'create-legend-draft',
    body: { legend },
  });
}

export function updateLegendGeneralBackend(legendId, legend) {
  return requestBackend(`/api/v1/legends/${encodeURIComponent(legendId)}`, {
    method: 'PATCH',
    operation: 'update-legend-general',
    body: { legend },
  });
}

export function duplicateLegendBackend(legendId) {
  return requestBackend(`/api/v1/legends/${encodeURIComponent(legendId)}/duplicate`, {
    method: 'POST',
    operation: 'duplicate-legend',
  });
}

// Admin dashboard counters aggregated server-side (one call vs ~10 from the browser).
export function getAdminStatsBackend() {
  return requestBackend('/api/v1/admin/stats', { operation: 'admin-stats' });
}

// Full editor payload (legend + version + pages + genres + resources) in one call.
export function getEditorDataBackend(legendId) {
  return requestBackend(`/api/v1/legends/${encodeURIComponent(legendId)}/editor`, { operation: 'editor-load' });
}

// Content reviews list joined server-side (one call vs 4 round-trips).
export function getContentReviewsBackend() {
  return requestBackend('/api/v1/admin/reviews', { operation: 'admin-reviews' });
}

// Admin legends list enriched server-side (one call vs many parallel queries).
export function getAdminLegendsBackend() {
  return requestBackend('/api/v1/admin/legends', { operation: 'admin-legends' });
}

// Enriched creator legend list aggregated server-side (one call vs ~5 + client loops).
export function getCreatorLegendsBackend(limit) {
  const qs = Number.isFinite(Number(limit)) && Number(limit) > 0 ? `?limit=${encodeURIComponent(limit)}` : '';
  return requestBackend(`/api/v1/creator/legends${qs}`, { operation: 'creator-legends' });
}

// Backend-sanitized HTML + stats for an Editor.js page. Use on save so stored
// rendered_html is sanitized server-side (no scripts / unsafe markup).
export function renderEditorHtml(legendId, editorData) {
  return requestBackend(`/api/v1/legends/${encodeURIComponent(legendId)}/editor-content/render-html`, {
    method: 'POST',
    operation: 'editor-render-html',
    body: { editorData },
  });
}

// Upload an editor image through the backend (service-role + server-side mime/size
// validation). Returns the public URL. Multipart, so it does not use requestBackend.
export async function uploadEditorImageBackend(legendId, file) {
  const url = buildBackendUrl(`/api/v1/legends/${encodeURIComponent(legendId)}/editor-assets/image`);
  const accessToken = await getAccessToken();
  const form = new FormData();
  form.append('image', file);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
      body: form,
    });
  } catch (networkError) {
    throw new BackendApiError('No se pudo conectar con el backend para subir la imagen.', { status: 0, data: networkError });
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.file?.url) {
    throw new BackendApiError(data?.message || STATUS_MESSAGES[response.status] || 'No se pudo subir la imagen.', {
      status: response.status,
      data,
    });
  }
  return data.file.url;
}

// Save editorial pages through the backend so rendered_html is sanitized server-side.
export function saveEditorPagesBackend(legendId, versionId, pages) {
  return requestBackend(`/api/v1/legends/${encodeURIComponent(legendId)}/versions/${encodeURIComponent(versionId)}/editor-pages`, {
    method: 'PUT',
    operation: 'editor-pages-save',
    body: { pages },
  });
}

export function getEditorPagesBackend(legendId, versionId) {
  return requestBackend(`/api/v1/legends/${encodeURIComponent(legendId)}/versions/${encodeURIComponent(versionId)}/editor-pages`, {
    method: 'GET',
    operation: 'editor-pages-get',
  });
}

export function registerLegendUpload({ legendId, bucket, path, filename, mimeType, sizeBytes, purpose }) {
  return requestBackend('/api/v1/documents/register-upload', {
    method: 'POST',
    operation: 'register-upload',
    body: {
      legendId,
      bucket,
      path,
      filename,
      mimeType,
      sizeBytes,
      purpose,
    },
  });
}

export function startDocumentExtraction(sourceDocumentId) {
  return requestBackend(`/api/v1/documents/${encodeURIComponent(sourceDocumentId)}/extraction/start`, {
    method: 'POST',
    operation: 'start-document-extraction',
  });
}

export function generatePagesFromDocument(sourceDocumentId) {
  return requestBackend(`/api/v1/documents/${encodeURIComponent(sourceDocumentId)}/pages/generate`, {
    method: 'POST',
    operation: 'generate-pages-from-document',
  });
}

export function getSourceDocumentViewUrl(sourceDocumentId) {
  return requestBackend(`/api/v1/documents/${encodeURIComponent(sourceDocumentId)}/view-url`, {
    method: 'GET',
    operation: 'get-source-document-view-url',
  });
}

export function proposeAiPagesFromDocument(sourceDocumentId) {
  return requestBackend(`/api/v1/documents/${encodeURIComponent(sourceDocumentId)}/pages/propose-ai`, {
    method: 'POST',
    operation: 'propose-ai-pages-from-document',
  });
}

// Canje de codigo fisico -> digital. Todo el procesamiento (normalizacion, rate-limit,
// validacion y canje) ocurre en el backend; aqui solo enviamos el codigo tal cual.
export function redeemCodeBackend(code) {
  return requestBackend('/api/v1/reader/codes/redeem', {
    method: 'POST',
    operation: 'redeem-code',
    body: { code },
  });
}

export function getReaderLegendReadingContext(legendId) {
  return requestBackend(`/api/v1/reader/legends/${encodeURIComponent(legendId)}/reading-context`, {
    operation: 'reader-reading-context',
  });
}

// Single grouped read for the reader experience (legend + author + genres + cover
// + banner + source document + rendered_pages + legend_pages fallback + hotspots +
// scenes + model/marker assets). Public for free/published legends (optional auth).
export function getReaderBundle(legendId) {
  return requestBackend(`/api/v1/legends/${encodeURIComponent(legendId)}/reader-bundle`, {
    authenticated: 'optional',
    operation: 'reader-bundle',
  });
}

// Creator/admin: current render status of a source document's pages.
export function getDocumentRenderStatus(sourceDocumentId) {
  return requestBackend(`/api/v1/documents/${encodeURIComponent(sourceDocumentId)}/render-pages`, {
    operation: 'render-status',
  });
}

// Creator/admin: trigger (or retry with force) the backend PDF -> images render.
export function startDocumentRender(sourceDocumentId, { force = false } = {}) {
  return requestBackend(`/api/v1/documents/${encodeURIComponent(sourceDocumentId)}/render-pages`, {
    method: 'POST',
    operation: 'render-pages',
    body: { force },
  });
}

export function listLegendHotspots(legendId, params = {}) {
  const search = new URLSearchParams();
  if (params.targetType) search.set('targetType', params.targetType);
  if (params.sourceDocumentId) search.set('sourceDocumentId', params.sourceDocumentId);
  if (params.sourcePageNumber) search.set('sourcePageNumber', String(params.sourcePageNumber));
  if (params.pageId) search.set('pageId', params.pageId);
  const queryString = search.toString();
  return requestBackend(
    `/api/v1/legends/${encodeURIComponent(legendId)}/hotspots${queryString ? `?${queryString}` : ''}`,
    { operation: 'list-hotspots' },
  );
}

export function createLegendHotspot(legendId, payload) {
  return requestBackend(`/api/v1/legends/${encodeURIComponent(legendId)}/hotspots`, {
    method: 'POST',
    operation: 'create-hotspot',
    body: payload,
  });
}

// Creates (or reuses) the AR scene that links a 3D model to the legend. Done via the
// backend (service role) because the ar_scenes RLS INSERT policy rejects scenes with a
// null page_id (rendered-PDF models). Returns { ok, scene }.
export function createLegendScene(legendId, payload) {
  return requestBackend(`/api/v1/legends/${encodeURIComponent(legendId)}/scenes`, {
    method: 'POST',
    operation: 'create-scene',
    body: payload,
  });
}

// Registers an AR marker (marker image → scene) via the backend (service role). ar_markers
// has no legend_id, so the backend validates ownership through the legend + scene + asset.
// This replaces the previous direct anon insert from the browser. Returns { ok, marker }.
export function createLegendMarker(legendId, payload) {
  return requestBackend(`/api/v1/legends/${encodeURIComponent(legendId)}/markers`, {
    method: 'POST',
    operation: 'create-marker',
    body: payload,
  });
}

// Lists the legend's 3D scenes (service-role on the backend) so the creator selector
// can see scenes whose page_id is null, which the ar_scenes RLS SELECT policy hides
// from the anon client. Returns { ok, scenes }.
export function listLegendScenes(legendId) {
  return requestBackend(`/api/v1/legends/${encodeURIComponent(legendId)}/scenes`, {
    method: 'GET',
    operation: 'list-scenes',
  });
}

export function updateLegendHotspot(legendId, hotspotId, payload) {
  return requestBackend(
    `/api/v1/legends/${encodeURIComponent(legendId)}/hotspots/${encodeURIComponent(hotspotId)}`,
    { method: 'PATCH', operation: 'update-hotspot', body: payload },
  );
}

export function deleteLegendHotspot(legendId, hotspotId) {
  return requestBackend(
    `/api/v1/legends/${encodeURIComponent(legendId)}/hotspots/${encodeURIComponent(hotspotId)}`,
    { method: 'DELETE', operation: 'delete-hotspot' },
  );
}

export async function uploadFileToSignedUrl({ signedUrl, file, contentType }) {
  if (!signedUrl || !file) {
    throw new BackendApiError('No pudimos preparar la subida del archivo.', { status: 400 });
  }

  let response;

  try {
    response = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType || file.type || 'application/octet-stream',
      },
      body: file,
    });
  } catch (error) {
    logBackendError('signed-upload', {
      url: 'signed-upload-url',
      method: 'PUT',
      status: 0,
      error: error?.message || error,
    });
    throw new BackendApiError('Error al subir archivo a Storage. No se pudo conectar con la URL firmada.', {
      status: 0,
    });
  }

  if (!response.ok) {
    throw new BackendApiError('No pudimos subir el archivo a Storage.', {
      status: response.status,
    });
  }

  return {
    ok: true,
    status: response.status,
  };
}
