import assert from 'node:assert/strict';
import test from 'node:test';

test('editor inline mode enables rotation and zoom without auto rotation', async () => {
  const { getOrbitControlOptions } = await import('./model3dViewerOptions.js');

  assert.deepEqual(getOrbitControlOptions({ embedded: true, compactControls: true }), {
    enablePan: false,
    enableZoom: true,
    enableRotate: true,
    autoRotate: false,
  });
});

test('reader embedded mode keeps its existing passive behavior', async () => {
  const { getOrbitControlOptions } = await import('./model3dViewerOptions.js');

  assert.deepEqual(getOrbitControlOptions({ embedded: true, compactControls: false }), {
    enablePan: false,
    enableZoom: false,
    enableRotate: true,
    autoRotate: true,
  });
});
