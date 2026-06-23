import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HIGHLIGHT_COLOR_OPTIONS,
  TEXT_COLOR_OPTIONS,
  resolveEditorColor,
} from './editorColorPalette.js';

test('editor color palettes include the default text and highlight colors', () => {
  assert.equal(TEXT_COLOR_OPTIONS.includes('#0f172a'), true);
  assert.equal(HIGHLIGHT_COLOR_OPTIONS.includes('#fef08a'), true);
});

test('editor color palettes contain safe unique six-digit colors', () => {
  for (const palette of [TEXT_COLOR_OPTIONS, HIGHLIGHT_COLOR_OPTIONS]) {
    assert.equal(new Set(palette).size, palette.length);
    assert.equal(palette.every((color) => /^#[0-9a-f]{6}$/.test(color)), true);
  }
});

test('resolveEditorColor accepts safe colors and rejects arbitrary values', () => {
  assert.equal(resolveEditorColor('#0891b2', '#0f172a'), '#0891b2');
  assert.equal(resolveEditorColor('javascript:alert(1)', '#0f172a'), '#0f172a');
});
