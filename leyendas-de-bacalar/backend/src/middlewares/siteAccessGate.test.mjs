import assert from 'node:assert/strict';
import test from 'node:test';

import { createSiteAccessGate } from './siteAccessGate.js';

function createResponse() {
  return {
    headers: {},
    statusCode: null,
    payload: null,
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.payload = value;
      return this;
    },
  };
}

test('site access gate allows requests while the platform is open', async () => {
  const gate = createSiteAccessGate(async () => ({ mode: 'open', message: '' }));
  const response = createResponse();
  let continued = false;

  await gate({}, response, () => { continued = true; });

  assert.equal(continued, true);
  assert.equal(response.statusCode, null);
});

test('site access gate blocks content APIs with a non-cacheable 423 response', async () => {
  const gate = createSiteAccessGate(async () => ({ mode: 'closed', message: 'Acceso suspendido.' }));
  const response = createResponse();

  await gate({}, response, () => assert.fail('restricted requests must not continue'));

  assert.equal(response.statusCode, 423);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.deepEqual(response.payload, {
    ok: false,
    code: 'SITE_ACCESS_RESTRICTED',
    mode: 'closed',
    error: 'Acceso suspendido.',
  });
});
