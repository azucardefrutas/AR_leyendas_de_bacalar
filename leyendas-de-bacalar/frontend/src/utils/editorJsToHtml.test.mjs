import assert from 'node:assert/strict';
import test from 'node:test';

import { editorJsToHtml } from './editorJsToHtml.js';

test('renders visual model and marker blocks without exposing UUIDs as labels', () => {
  const html = editorJsToHtml({
    blocks: [
      { type: 'model3d', data: { assetId: 'model-uuid', title: 'El sisimite.glb', caption: 'Modelo principal' } },
      { type: 'leyendaMarker', data: { assetId: 'marker-uuid', title: 'Marcador jaguar', imageUrl: 'https://example.com/marker.png' } },
    ],
  });

  assert.match(html, /El sisimite\.glb/);
  assert.match(html, /Marcador jaguar/);
  assert.match(html, /https:\/\/example\.com\/marker\.png/);
  assert.doesNotMatch(html, /model-uuid|marker-uuid/);
});

test('uses image alternative text independently from its caption', () => {
  const html = editorJsToHtml({
    blocks: [{
      type: 'image',
      data: { file: { url: 'https://example.com/laguna.png' }, alt: 'Laguna de Bacalar', caption: 'Amanecer' },
    }],
  });

  assert.match(html, /alt="Laguna de Bacalar"/);
});

test('renders composition layers without raw ids or unsafe image URLs', () => {
  const html = editorJsToHtml({
    blocks: [{
      type: 'composition',
      data: {
        canvas: { width: 900, height: 560, background: '#ffffff' },
        layers: [
          {
            id: 'layer-image',
            type: 'image',
            assetId: 'image-uuid',
            title: 'Cueva',
            url: 'https://example.com/cave.png?x=1&y=2',
            x: 0,
            y: 0,
            width: 900,
            height: 560,
            zIndex: 1,
          },
          {
            id: 'layer-model',
            type: 'model3d',
            assetId: 'model-uuid',
            title: 'Oso 3D',
            url: 'https://example.com/bear.glb',
            x: 300,
            y: 100,
            width: 300,
            height: 300,
            zIndex: 2,
          },
          {
            id: 'layer-marker',
            type: 'marker',
            assetId: 'marker-uuid',
            title: 'Marcador',
            url: 'javascript:alert(1)',
            x: 700,
            y: 20,
            width: 120,
            height: 120,
            zIndex: 3,
          },
        ],
      },
    }],
  });

  assert.match(html, /ejs-composition-preview/);
  assert.match(html, /https:\/\/example\.com\/cave\.png\?x=1&amp;y=2/);
  assert.match(html, /Oso 3D/);
  assert.match(html, /Marcador/);
  assert.doesNotMatch(html, /image-uuid|model-uuid|marker-uuid/);
  assert.doesNotMatch(html, /javascript:/);
});
