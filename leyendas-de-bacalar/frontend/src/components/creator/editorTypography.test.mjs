import test from 'node:test';
import assert from 'node:assert/strict';

import {
  FONT_OPTIONS,
  fontSizeToLegacyValue,
  normalizeFontFamily,
  normalizeFontSize,
  normalizeHexColor,
} from './editorTypography.js';

test('font options expose the approved free editorial families', () => {
  assert.deepEqual(FONT_OPTIONS.map((option) => option.value), [
    'Inter',
    'Nunito Sans',
    'Work Sans',
    'Montserrat',
    'Poppins',
    'Raleway',
    'Lora',
    'Playfair Display',
    'Merriweather',
    'Libre Baskerville',
    'Crimson Pro',
    'Cormorant Garamond',
    'Newsreader',
  ]);
  assert.equal(FONT_OPTIONS.every((option) => (
    option.label
    && option.value
    && option.stack
    && ['sans', 'serif'].includes(option.category)
  )), true);
});

test('normalizeFontFamily rejects arbitrary injected font names', () => {
  assert.equal(normalizeFontFamily('Lora'), 'Lora');
  assert.equal(normalizeFontFamily('url(javascript:alert(1))'), 'Inter');
});

test('normalizeFontSize clamps author input and maps it to execCommand values', () => {
  assert.equal(normalizeFontSize(3), 10);
  assert.equal(normalizeFontSize(80), 72);
  assert.equal(normalizeFontSize(24), 24);
  assert.equal(fontSizeToLegacyValue(12), 2);
  assert.equal(fontSizeToLegacyValue(24), 5);
  assert.equal(fontSizeToLegacyValue(64), 7);
});

test('normalizeHexColor accepts six-digit colors only', () => {
  assert.equal(normalizeHexColor('#0f172a'), '#0f172a');
  assert.equal(normalizeHexColor('red'), '#0f172a');
  assert.equal(normalizeHexColor('#fff'), '#0f172a');
});
