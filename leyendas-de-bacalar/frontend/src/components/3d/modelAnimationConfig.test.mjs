import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeAnimationConfig } from './modelAnimationConfig.js';

test('normalizes and deduplicates embedded model clips', () => {
  assert.deepEqual(normalizeAnimationConfig({
    clips: [' Idle ', 'Wave', 'Wave', '', 'Dance'],
    defaultClip: 'Wave',
    autoplay: true,
    loop: 'once',
    speed: 1.5,
    trigger: 'tap',
  }), {
    clips: [' Idle ', 'Wave', 'Dance'],
    defaultClip: 'Wave',
    inspected: true,
    autoplay: true,
    loop: 'once',
    speed: 1.5,
    trigger: 'tap',
  });
});
test('keeps static models inactive and clamps unsafe values', () => {
  assert.deepEqual(normalizeAnimationConfig({
    clips: [],
    autoplay: true,
    loop: 'invalid',
    speed: 99,
    trigger: 'invalid',
  }, 'marker-found'), {
    clips: [],
    defaultClip: '',
    inspected: false,
    autoplay: false,
    loop: 'repeat',
    speed: 2,
    trigger: 'marker-found',
  });
});

test('distinguishes an inspected static file from missing legacy metadata', () => {
  assert.equal(normalizeAnimationConfig({ inspected: true }).inspected, true);
  assert.equal(normalizeAnimationConfig(null).inspected, false);
});
