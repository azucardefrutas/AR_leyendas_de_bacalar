// FASE 2 — PRUEBAS DE VERSIÓN (sistema integrado).
// Levanta la aplicación Express REAL en un puerto efímero y ejerce el contrato HTTP
// de extremo a extremo: salud, cabeceras de seguridad, CORS, manejo de 404, cuerpo
// JSON inválido y protección de rutas autenticadas.
//
// No requiere Supabase real: se usan credenciales ficticias y los casos elegidos
// resuelven ANTES de cualquier llamada de red (por eso no se envían tokens Bearer
// bien formados, que sí dispararían una petición externa).

import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, describe, test } from 'node:test';

// Debe configurarse ANTES de importar la app (env.js valida al cargar).
// dotenv no sobreescribe variables ya presentes, así que estos valores mandan.
process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '4010';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';

const ALLOWED_ORIGIN = 'http://localhost:5173';
const DENIED_ORIGIN = 'http://sitio-malicioso.example';

let server;
let baseUrl;

before(async () => {
  const { default: app } = await import('./index.js');
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    server.close();
    await once(server, 'close');
  }
});

describe('Salud del servicio', () => {
  test('GET /health responde 200 con el contrato esperado', async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);

    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, 'leyendas-backend');
    assert.equal(typeof body.version, 'string');
  });
});

describe('Cabeceras de seguridad', () => {
  test('aplica el subconjunto de cabeceras endurecidas', async () => {
    const response = await fetch(`${baseUrl}/health`);

    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('x-dns-prefetch-control'), 'off');
    assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-site');
    assert.match(response.headers.get('permissions-policy'), /camera=\(\)/);
  });

  test('no revela la tecnología del servidor (x-powered-by deshabilitado)', async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.headers.get('x-powered-by'), null);
  });
});

describe('Manejo de rutas inexistentes', () => {
  test('GET a una ruta desconocida responde 404 en JSON', async () => {
    const response = await fetch(`${baseUrl}/ruta-que-no-existe`);
    assert.equal(response.status, 404);

    const body = await response.json();
    assert.equal(body.ok, false);
    assert.match(body.error, /Route not found: GET \/ruta-que-no-existe/);
  });
});

describe('CORS por lista de permitidos', () => {
  test('permite el origen configurado del frontend', async () => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { Origin: ALLOWED_ORIGIN },
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), ALLOWED_ORIGIN);
  });

  test('responde el preflight OPTIONS del origen permitido', async () => {
    const response = await fetch(`${baseUrl}/api/v1/documents/prepare-upload`, {
      method: 'OPTIONS',
      headers: {
        Origin: ALLOWED_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), ALLOWED_ORIGIN);
  });

  test('NO expone la cabecera CORS a un origen no autorizado', async () => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { Origin: DENIED_ORIGIN },
    });

    // El origen no permitido nunca debe recibir access-control-allow-origin.
    assert.equal(response.headers.get('access-control-allow-origin'), null);
  });
});

describe('Protección de rutas autenticadas', () => {
  test('GET /api/v1/auth/me sin cabecera Authorization responde 401', async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/me`);
    assert.equal(response.status, 401);

    const body = await response.json();
    assert.equal(body.ok, false);
    assert.equal(body.error, 'Unauthorized.');
  });

  test('rechaza un esquema de autorización distinto de Bearer', async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: 'Token abc123' },
    });

    assert.equal(response.status, 401);
  });

  test('rechaza una cabecera Bearer malformada (sin token)', async () => {
    const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: 'Bearer' },
    });

    assert.equal(response.status, 401);
  });

  // Flujo crítico del proyecto (§16): la subida de documentos nunca debe ser anónima.
  test('POST /api/v1/documents/prepare-upload sin sesión responde 401', async () => {
    const response = await fetch(`${baseUrl}/api/v1/documents/prepare-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: 'x.pdf', mimeType: 'application/pdf', sizeBytes: 1000 }),
    });

    assert.equal(response.status, 401);
  });

  test('POST /api/v1/documents/register-upload sin sesión responde 401', async () => {
    const response = await fetch(`${baseUrl}/api/v1/documents/register-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath: 'x' }),
    });

    assert.equal(response.status, 401);
  });
});

describe('Validación del cuerpo de la petición', () => {
  test('un JSON malformado no derriba el servicio (responde 4xx)', async () => {
    const response = await fetch(`${baseUrl}/api/v1/documents/prepare-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ esto no es json valido',
    });

    assert.ok(
      response.status >= 400 && response.status < 500,
      `Se esperaba un estado 4xx y se obtuvo ${response.status}`,
    );
  });

  test('el servicio sigue respondiendo después de las peticiones inválidas', async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
  });
});
