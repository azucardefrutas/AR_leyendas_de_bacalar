import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SITE_ACCESS_MODES,
  isSiteAccessRestricted,
  normalizeSiteAccess,
} from './siteAccessPolicy.js';

test('site access defaults to open for missing or invalid values', () => {
  assert.deepEqual(normalizeSiteAccess(), { mode: SITE_ACCESS_MODES.OPEN, message: '' });
  assert.deepEqual(normalizeSiteAccess({ mode: 'invalid' }), { mode: SITE_ACCESS_MODES.OPEN, message: '' });
});

test('site access accepts the two restricted modes and sanitizes messages', () => {
  assert.deepEqual(
    normalizeSiteAccess({ mode: SITE_ACCESS_MODES.CATALOG_ONLY, message: '  Pausa editorial  ' }),
    { mode: SITE_ACCESS_MODES.CATALOG_ONLY, message: 'Pausa editorial' },
  );
  assert.equal(normalizeSiteAccess({ mode: SITE_ACCESS_MODES.CLOSED, message: 'x'.repeat(600) }).message.length, 500);
  assert.equal(isSiteAccessRestricted({ mode: SITE_ACCESS_MODES.CLOSED }), true);
  assert.equal(isSiteAccessRestricted({ mode: SITE_ACCESS_MODES.OPEN }), false);
});
