import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MEDIA_SHEET_WIDTH,
  applyCropPan,
  applyCropZoom,
  bringMediaForward,
  moveFreeMedia,
  normalizeCrop,
  normalizeMediaLayout,
  promoteMediaLayoutToFree,
  resetCrop,
  resizeMedia,
  sendMediaBackward,
  setMediaLocked,
  setMediaMode,
  setMediaOpacity,
  setTextLayer,
} from './mediaLayoutState.js';

test('normalizeMediaLayout preserves a valid hybrid layout', () => {
  assert.deepEqual(normalizeMediaLayout({
    mode: 'free',
    align: 'right',
    layer: 'behind-text',
    x: 140,
    y: 80,
    width: 480,
    height: 320,
    rotation: 12,
    zIndex: 6,
    locked: true,
    opacity: 0.65,
    anchorBlockId: 'paragraph-1',
  }), {
    mode: 'free',
    align: 'right',
    layer: 'behind-text',
    x: 140,
    y: 80,
    width: 480,
    height: 320,
    rotation: 12,
    zIndex: 6,
    locked: true,
    opacity: 0.65,
    anchorBlockId: 'paragraph-1',
  });
});

test('normalizeMediaLayout clamps unsafe values and rejects unsupported modes', () => {
  assert.deepEqual(normalizeMediaLayout({
    mode: 'absolute',
    align: 'sideways',
    layer: 'under-everything',
    x: -40,
    y: -5,
    width: MEDIA_SHEET_WIDTH * 2,
    height: 2,
    zIndex: -10,
    opacity: 3,
  }), {
    mode: 'inline',
    align: 'center',
    layer: 'above-text',
    x: 0,
    y: 0,
    width: MEDIA_SHEET_WIDTH,
    height: 48,
    rotation: 0,
    zIndex: 1,
    locked: false,
    opacity: 1,
    anchorBlockId: '',
  });
});

test('normalizeMediaLayout upgrades the previous width height align layout', () => {
  assert.deepEqual(normalizeMediaLayout({
    width: 360,
    height: 'auto',
    align: 'left',
  }, { defaultWidth: 520, defaultHeight: 'auto' }), {
    mode: 'inline',
    align: 'left',
    layer: 'above-text',
    x: 0,
    y: 0,
    width: 360,
    height: 'auto',
    rotation: 0,
    zIndex: 1,
    locked: false,
    opacity: 1,
    anchorBlockId: '',
  });
});

test('normalizeCrop keeps crop data bounded and non-destructive', () => {
  assert.deepEqual(normalizeCrop({
    x: -0.4,
    y: 0.35,
    width: 2,
    height: 0,
    zoom: 9,
  }), {
    x: 0,
    y: 0.35,
    width: 1,
    height: 0.05,
    zoom: 4,
  });
});

test('normalizeCrop returns null when no crop was saved', () => {
  assert.equal(normalizeCrop(), null);
  assert.equal(normalizeCrop(null), null);
});

test('media layout operations keep saved geometry normalized', () => {
  const initial = normalizeMediaLayout({ width: 300, height: 200 });
  const free = setMediaMode(initial, 'free');
  const moved = moveFreeMedia(free, { x: 165, y: 90 });
  const resized = resizeMedia(moved, { width: 440, height: 315 });

  assert.deepEqual(resized, {
    ...initial,
    mode: 'free',
    x: 165,
    y: 90,
    width: 440,
    height: 315,
  });
});

test('promoteMediaLayoutToFree preserves the measured visual geometry', () => {
  assert.deepEqual(promoteMediaLayoutToFree({
    mode: 'inline',
    width: 129,
    height: 192,
    zIndex: 3,
  }, {
    x: 380,
    y: 120,
    width: 360,
    height: 536,
  }), {
    mode: 'free',
    align: 'center',
    layer: 'above-text',
    x: 380,
    y: 120,
    width: 360,
    height: 536,
    rotation: 0,
    zIndex: 3,
    locked: false,
    opacity: 1,
    anchorBlockId: '',
  });
});

test('layer, z index, lock and opacity operations persist', () => {
  const initial = normalizeMediaLayout({});
  const changed = setMediaOpacity(
    setMediaLocked(
      sendMediaBackward(
        bringMediaForward(
          setTextLayer(initial, 'behind-text'),
        ),
      ),
      true,
    ),
    0.42,
  );

  assert.equal(changed.layer, 'behind-text');
  assert.equal(changed.zIndex, 1);
  assert.equal(changed.locked, true);
  assert.equal(changed.opacity, 0.42);
});

test('crop operations pan, zoom and reset without modifying the asset URL', () => {
  const initial = normalizeCrop({ x: 0.2, y: 0.2, width: 0.6, height: 0.6, zoom: 1 });
  const panned = applyCropPan(initial, { x: 0.8, y: -0.2 });
  const zoomed = applyCropZoom(panned, 2.5);

  assert.deepEqual(panned, { x: 0.8, y: 0, width: 0.6, height: 0.6, zoom: 1 });
  assert.equal(zoomed.zoom, 2.5);
  assert.equal(resetCrop(), null);
});
