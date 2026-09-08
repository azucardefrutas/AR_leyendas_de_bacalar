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
    clips: [' Idle ', 'Wave'],
    labels: {},
    defaultClip: 'Wave',
    inspected: true,
    autoplay: true,
    loop: 'once',
    speed: 2,
    trigger: 'marker-found',
  });
});

test('builds emote labels only for renamed clips (ignora vacíos, iguales o de clips ausentes)', () => {
  const cfg = normalizeModelAnimationConfig({
    clips: ['Running', 'Walking', 'Alert'],
    labels: { Running: '  Correr  ', Walking: 'Walking', Alert: '', Jumping: 'Saltar' },
  });
  assert.deepEqual(cfg.labels, { Running: 'Correr' });
});
