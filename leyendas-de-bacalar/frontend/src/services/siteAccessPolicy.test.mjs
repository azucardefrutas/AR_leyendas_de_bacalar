import assert from 'node:assert/strict';
import test from 'node:test';

import { SITE_ACCESS_MODES, getSiteAccessDecision, normalizeSiteAccess } from './siteAccessPolicy.js';

const adminUrl = 'https://admin.bacalarlegends-ar.com';

test('site access defaults safely to open for unknown stored values', () => {
  assert.deepEqual(normalizeSiteAccess({ mode: 'unknown' }), { mode: SITE_ACCESS_MODES.OPEN, message: '' });
});

test('catalog-only permits catalog but blocks detail, reader, creator and download routes', () => {
  for (const pathname of ['/', '/catalog']) {
    assert.equal(getSiteAccessDecision({ mode: SITE_ACCESS_MODES.CATALOG_ONLY, pathname, adminUrl }).action, 'allow');
  }
  for (const pathname of ['/legend/demo', '/legend/demo/read', '/reader/library', '/creator', '/descargar', '/ar/demo']) {
    assert.equal(getSiteAccessDecision({ mode: SITE_ACCESS_MODES.CATALOG_ONLY, pathname, adminUrl }).action, 'block');
  }
});

test('closed mode preserves login, auth callback and admin recovery paths', () => {
  for (const pathname of ['/login', '/auth/callback', '/admin', '/admin/settings', '/privacy/readers']) {
    assert.equal(getSiteAccessDecision({ mode: SITE_ACCESS_MODES.CLOSED, pathname, adminUrl }).action, 'allow');
  }
  assert.equal(getSiteAccessDecision({ mode: SITE_ACCESS_MODES.CLOSED, pathname: '/', adminUrl }).action, 'block');
});

test('admin hostname redirects its root and public paths into the admin console', () => {
  assert.deepEqual(
    getSiteAccessDecision({ mode: SITE_ACCESS_MODES.CLOSED, pathname: '/', hostname: 'admin.bacalarlegends-ar.com', adminUrl }),
    { action: 'redirect', to: '/admin' },
  );
  assert.deepEqual(
    getSiteAccessDecision({ mode: SITE_ACCESS_MODES.OPEN, pathname: '/catalog', hostname: 'admin.bacalarlegends-ar.com', adminUrl }),
    { action: 'redirect', to: '/admin' },
  );
});
