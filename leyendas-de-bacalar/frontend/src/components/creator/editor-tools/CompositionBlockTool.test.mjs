import assert from 'node:assert/strict';
import test from 'node:test';

import { serializeCompositionData } from './CompositionBlockTool.js';

test('serializes only persistent composition data', () => {
  const result = serializeCompositionData({
    canvas: { width: 400, height: 300, background: '#abc' },
    selectedLayerId: 'model',
    manipulating3dId: 'model',
    layers: [{
      id: 'model',
      type: 'model3d',
      assetId: 'asset-model',
      title: 'Oso',
      modelUrl: 'https://example.com/bear.glb',
      x: 120,
      y: 80,
      width: 300,
      height: 220,
      zIndex: 8,
      rotation: 12,
      opacity: 0.75,
      locked: true,
      selected: true,
    }],
  });

  assert.deepEqual(result.canvas, { width: 900, height: 560, background: '#abc' });
  assert.deepEqual(result.layers[0], {
    id: 'model',
    type: 'model3d',
    assetId: 'asset-model',
    title: 'Oso',
    url: 'https://example.com/bear.glb',
    caption: '',
    alt: '',
    x: 120,
    y: 80,
    width: 300,
    height: 220,
    zIndex: 1,
    rotation: 12,
    opacity: 0.75,
    locked: true,
  });
  assert.equal('selectedLayerId' in result, false);
  assert.equal('manipulating3dId' in result, false);
});

test('keeps image and marker references without exposing transient fields', () => {
  const result = serializeCompositionData({
    layers: [
      { id: 'image', type: 'image', assetId: 'a', imageUrl: 'https://example.com/a.png', alt: 'Cueva' },
      { id: 'marker', type: 'marker', assetId: 'b', previewUrl: 'https://example.com/b.png', title: 'Marcador' },
    ],
  });

  assert.equal(result.layers[0].url, 'https://example.com/a.png');
  assert.equal(result.layers[1].url, 'https://example.com/b.png');
  assert.deepEqual(result.layers.map((layer) => layer.zIndex), [1, 2]);
});
