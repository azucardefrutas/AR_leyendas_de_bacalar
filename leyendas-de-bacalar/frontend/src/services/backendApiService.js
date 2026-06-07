import { getSession } from './authService.js';

const backendUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/+$/, '');

const STATUS_MESSAGES = {
  400: 'No pudimos validar la solicitud.',
  401: 'Inicia sesion para continuar.',
  403: 'No tienes permisos para realizar esta accion.',
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
    throw new BackendApiError('Configura VITE_BACKEND_URL para usar el backend.');
  }

  return backendUrl;
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

  const response = await fetch(`${getBackendUrl()}${path}`, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...fetchOptions,
  });

  const data = await parseResponse(response);

  if (!response.ok) {
    const message = data?.error || STATUS_MESSAGES[response.status] || 'No pudimos completar la solicitud.';
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
