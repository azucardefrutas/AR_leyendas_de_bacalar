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

  if (authenticated) {
    const accessToken = await getAccessToken();
    requestHeaders.Authorization = `Bearer ${accessToken}`;
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

export async function uploadFileToSignedUrl({ signedUrl, file }) {
  if (!signedUrl || !file) {
    throw new BackendApiError('No pudimos preparar la subida del archivo.', { status: 400 });
  }

  let response;

  try {
    response = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
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
