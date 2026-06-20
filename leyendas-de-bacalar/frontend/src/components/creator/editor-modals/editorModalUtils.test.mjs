import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRelValue,
  buildTableContent,
  isSafeHttpUrl,
} from './editorModalUtils.js';

test('accepts only http and https URLs', () => {
  assert.equal(isSafeHttpUrl('https://example.com/image.webp'), true);
  assert.equal(isSafeHttpUrl('http://example.com'), true);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpUrl('data:image/png;base64,abc'), false);
  assert.equal(isSafeHttpUrl('file:///tmp/image.png'), false);
});

test('builds a table with named header cells', () => {
  assert.deepEqual(buildTableContent(2, 3, true), [
    ['Encabezado 1', 'Encabezado 2', 'Encabezado 3'],
    ['', '', ''],
  ]);
});

test('normalizes link rel attributes without duplicates', () => {
  assert.equal(
    buildRelValue({ newTab: true, noopener: true, noreferrer: true, nofollow: true, ugc: false, sponsored: false }),
    'noopener noreferrer nofollow',
  );
});
