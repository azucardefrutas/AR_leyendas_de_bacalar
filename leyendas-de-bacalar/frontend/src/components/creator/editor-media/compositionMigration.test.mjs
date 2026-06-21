import test from 'node:test';
import assert from 'node:assert/strict';

import {
  migrateCompositionBlock,
  migrateEditorDataMedia,
} from './compositionMigration.js';

const compositionBlock = {
  id: 'composition-1',
  type: 'composition',
  data: {
    canvas: { width: 900, height: 560, background: '#ffffff' },
    layers: [
      {
        id: 'image-layer',
        type: 'image',
        assetId: 'image-asset',
        url: 'https://example.com/cave.png',
        alt: 'Cueva',
        x: 20,
        y: 30,
        width: 450,
        height: 280,
        zIndex: 1,
        opacity: 0.8,
      },
      {
        id: 'model-layer',
        type: 'model3d',
        assetId: 'model-asset',
        url: 'https://example.com/bear.glb',
        title: 'Oso',
        x: 300,
        y: 100,
        width: 260,
        height: 260,
        zIndex: 2,
      },
      {
        id: 'marker-layer',
        type: 'marker',
        assetId: 'marker-asset',
        url: 'https://example.com/marker.png',
        title: 'Marcador',
        x: 700,
        y: 420,
        width: 120,
        height: 120,
        zIndex: 3,
      },
    ],
  },
};

test('migrateCompositionBlock converts layers into independent media blocks', () => {
  const result = migrateCompositionBlock(compositionBlock);

  assert.deepEqual(result.map((block) => block.type), ['image', 'model3d', 'leyendaMarker']);
  assert.equal(result[0].data.assetId, 'image-asset');
  assert.equal(result[0].data.file.url, 'https://example.com/cave.png');
  assert.equal(result[0].data.layout.mode, 'free');
  assert.equal(result[0].data.layout.anchorBlockId, 'composition-1');
  assert.equal(result[0].data.layout.width, 560);
  assert.equal(result[1].data.modelUrl, 'https://example.com/bear.glb');
  assert.equal(result[1].data.displayMode, 'inline-model');
  assert.equal(result[2].data.imageUrl, 'https://example.com/marker.png');
  assert.equal(result[2].data.layout.zIndex, 3);
});

test('migrateEditorDataMedia is idempotent and preserves surrounding blocks', () => {
  const document = {
    time: 123,
    version: '2.30.0',
    blocks: [
      { id: 'before', type: 'paragraph', data: { text: 'Antes' } },
      compositionBlock,
      { id: 'after', type: 'paragraph', data: { text: 'Después' } },
    ],
  };

  const migrated = migrateEditorDataMedia(document);
  const secondPass = migrateEditorDataMedia(migrated);

  assert.equal(migrated.blocks[0].id, 'before');
  assert.equal(migrated.blocks.at(-1).id, 'after');
  assert.equal(migrated.blocks.some((block) => block.type === 'composition'), false);
  assert.deepEqual(secondPass, migrated);
});

test('invalid composition remains untouched instead of losing its data', () => {
  const invalid = {
    id: 'invalid',
    type: 'composition',
    data: { canvas: { width: 900, height: 560 }, layers: [{ type: 'video' }] },
  };

  assert.deepEqual(migrateCompositionBlock(invalid), [invalid]);
});
