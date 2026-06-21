import assert from 'node:assert/strict';
import test from 'node:test';

import * as blockTools from './editorBlockTools.js';

test('normalizes persisted block layout to supported values', () => {
  assert.equal(typeof blockTools.normalizeBlockLayout, 'function');
  assert.deepEqual(
    blockTools.normalizeBlockLayout({ width: 9999, height: 280, align: 'invalid' }, { defaultWidth: 520 }),
    { width: 1120, height: 280, align: 'center' },
  );
});

test('preserves auto height and clamps the minimum width', () => {
  assert.deepEqual(
    blockTools.normalizeBlockLayout({ width: 20, height: 'auto', align: 'left' }, { defaultWidth: 180 }),
    { width: 120, height: 'auto', align: 'left' },
  );
});

test('normalizes image data with asset id, URL and persisted layout', () => {
  assert.equal(typeof blockTools.normalizeImageBlockData, 'function');
  assert.deepEqual(blockTools.normalizeImageBlockData({
    assetId: 'asset-image',
    file: { url: 'https://example.com/image.png' },
    alt: 'Una laguna',
    caption: 'Bacalar',
    layout: { width: 640, height: 'auto', align: 'right' },
  }), {
    assetId: 'asset-image',
    file: { url: 'https://example.com/image.png' },
    alt: 'Una laguna',
    caption: 'Bacalar',
    withBorder: false,
    withBackground: false,
    stretched: false,
    layout: {
      mode: 'inline',
      align: 'right',
      layer: 'above-text',
      x: 0,
      y: 0,
      width: 640,
      height: 'auto',
      rotation: 0,
      zIndex: 1,
      locked: false,
      opacity: 1,
      anchorBlockId: '',
    },
    crop: null,
  });
});

test('normalizes model and marker data without replacing visible names with UUIDs', () => {
  assert.equal(typeof blockTools.normalizeAssetBlockData, 'function');
  assert.deepEqual(blockTools.normalizeAssetBlockData({
    assetId: 'asset-model',
    title: '',
    caption: 'Criatura de la selva',
    layout: { width: 520, height: 360, align: 'center' },
  }, { kind: 'model3d', toolTitle: 'Modelo 3D' }), {
    assetId: 'asset-model',
    title: 'Modelo 3D',
    caption: 'Criatura de la selva',
    displayMode: 'inline-model',
    modelUrl: '',
    imageUrl: '',
    layout: {
      mode: 'inline',
      align: 'center',
      layer: 'above-text',
      x: 0,
      y: 0,
      width: 520,
      height: 360,
      rotation: 0,
      zIndex: 1,
      locked: false,
      opacity: 1,
      anchorBlockId: '',
    },
    crop: null,
  });
});

test('recognizes a safe inline model URL', () => {
  assert.equal(typeof blockTools.canRenderInlineModel, 'function');
  assert.equal(blockTools.canRenderInlineModel({ modelUrl: 'https://example.com/model.glb' }), true);
  assert.equal(blockTools.canRenderInlineModel({ modelUrl: 'javascript:alert(1)' }), false);
});

test('upgrades legacy model cards to inline model mode when saved again', () => {
  const data = blockTools.normalizeAssetBlockData({
    assetId: 'asset-model',
    title: 'Sisimite',
    displayMode: 'inline-card',
  }, { kind: 'model3d', toolTitle: 'Modelo 3D' });

  assert.equal(data.displayMode, 'inline-model');
});

test('resolves a legacy model URL from its registered asset id', () => {
  assert.equal(typeof blockTools.resolveModelBlockData, 'function');
  const data = blockTools.resolveModelBlockData({ assetId: 'asset-model', title: '' }, [
    { id: 'asset-model', name: 'sisimite.glb', previewUrl: 'https://example.com/sisimite.glb' },
  ]);

  assert.equal(data.modelUrl, 'https://example.com/sisimite.glb');
  assert.equal(data.title, 'sisimite.glb');
  assert.equal(data.displayMode, 'inline-model');
});
