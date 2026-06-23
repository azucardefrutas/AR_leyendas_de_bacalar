import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clampFreeLayoutToSheet,
  getInitialFreeLayout,
  getRequiredPageHeight,
  logicalPointFromClient,
  resizeFromHandle,
  rotateFromPointer,
} from './mediaGeometry.js';

const base = {
  mode: 'free',
  x: 100,
  y: 120,
  width: 300,
  height: 200,
  rotation: 0,
  locked: false,
};

test('logicalPointFromClient converts rendered coordinates to the 1120-unit sheet', () => {
  assert.deepEqual(logicalPointFromClient(
    { x: 330, y: 260 },
    { left: 50, top: 40, width: 560 },
  ), { x: 560, y: 440, scale: 0.5 });
});

test('resizeFromHandle resizes from corners and preserves the opposite edge', () => {
  const northwest = resizeFromHandle(base, 'nw', { x: -40, y: -20 });
  const southeast = resizeFromHandle(base, 'se', { x: 80, y: 50 });
  assert.deepEqual(
    { x: northwest.x, y: northwest.y, width: northwest.width, height: northwest.height },
    { x: 60, y: 100, width: 340, height: 220 },
  );
  assert.deepEqual(
    { x: southeast.x, y: southeast.y, width: southeast.width, height: southeast.height },
    { x: 100, y: 120, width: 380, height: 250 },
  );
});

test('resizeFromHandle supports four side handles', () => {
  assert.equal(resizeFromHandle(base, 'n', { x: 0, y: 30 }).height, 170);
  assert.equal(resizeFromHandle(base, 's', { x: 0, y: 30 }).height, 230);
  assert.equal(resizeFromHandle(base, 'w', { x: 30, y: 0 }).width, 270);
  assert.equal(resizeFromHandle(base, 'e', { x: 30, y: 0 }).width, 330);
});

test('resizeFromHandle ignores locked resources and clamps minimum size', () => {
  const locked = resizeFromHandle({ ...base, locked: true }, 'se', { x: 100, y: 100 });
  assert.deepEqual(
    { x: locked.x, y: locked.y, width: locked.width, height: locked.height, locked: locked.locked },
    { x: 100, y: 120, width: 300, height: 200, locked: true },
  );
  assert.equal(resizeFromHandle(base, 'nw', { x: 400, y: 300 }).width, 48);
  assert.equal(resizeFromHandle(base, 'nw', { x: 400, y: 300 }).height, 48);
});

test('rotateFromPointer returns normalized degrees around the resource center', () => {
  assert.equal(rotateFromPointer(base, { x: 250, y: 220 }, { x: 350, y: 220 }), 90);
  assert.equal(rotateFromPointer(base, { x: 250, y: 220 }, { x: 150, y: 220 }), -90);
});

test('clampFreeLayoutToSheet keeps resources recoverable inside the page', () => {
  const clamped = clampFreeLayoutToSheet({
    ...base,
    x: 1100,
    y: -500,
  }, { width: 1120, height: 900 });
  assert.equal(clamped.x, 1072);
  assert.equal(clamped.y, 0);
});

test('getRequiredPageHeight grows beyond text for low visual resources', () => {
  assert.equal(getRequiredPageHeight(620, [
    { mode: 'free', y: 760, height: 300 },
    { mode: 'inline', y: 2000, height: 400 },
  ], { minHeight: 800, padding: 80 }), 1140);
  assert.equal(getRequiredPageHeight(400, [], { minHeight: 800, padding: 80 }), 800);
});

test('getInitialFreeLayout places new resources inside the visible sheet area', () => {
  assert.deepEqual(getInitialFreeLayout({
    width: 520,
    height: 360,
    sheetWidth: 1120,
    visibleTop: 240,
    highestZ: 3,
  }), {
    mode: 'free',
    x: 300,
    y: 288,
    width: 520,
    height: 360,
    rotation: 0,
    zIndex: 4,
    locked: false,
    opacity: 1,
    layer: 'above-text',
    align: 'center',
    anchorBlockId: '',
  });
});
