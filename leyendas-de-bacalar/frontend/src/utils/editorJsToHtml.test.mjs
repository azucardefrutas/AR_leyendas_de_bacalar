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
