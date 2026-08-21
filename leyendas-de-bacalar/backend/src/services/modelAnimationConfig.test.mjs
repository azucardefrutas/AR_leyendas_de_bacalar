import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeModelAnimationConfig } from './modelAnimationConfig.js';

test('validates model animation input before persisting it', () => {
  assert.deepEqual(normalizeModelAnimationConfig({
    clips: [' Idle ', 'Wave', 'Wave'],
    defaultClip: 'Wave',
    autoplay: true,
    loop: 'once',
    speed: 8,
    trigger: 'marker-found',
  }), {
    clips: ['Idle', 'Wave'],
    defaultClip: 'Wave',
    autoplay: true,
    loop: 'once',
    speed: 2,
    trigger: 'marker-found',
  });
});
