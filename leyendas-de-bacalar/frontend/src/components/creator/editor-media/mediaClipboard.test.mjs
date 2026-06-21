import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearMediaClipboard,
  copyMediaBlock,
  hasMediaClipboard,
  pasteMediaBlock,
} from './mediaClipboard.js';

const makeSource = () => ({
  type: 'image',
  data: {
    assetId: 'asset-image',
    file: { url: 'https://example.com/cave.png' },
    alt: 'Cueva',
    caption: '',
    layout: {
      mode: 'free',
      x: 100,
      y: 120,
      width: 420,
      height: 280,
      rotation: 12,
      opacity: 0.8,
      zIndex: 4,
      locked: true,
      anchorBlockId: 'old-anchor',
    },
  },
});

test('copyMediaBlock stores a detached serializable resource', () => {
  clearMediaClipboard();
  const source = makeSource();
  const copied = copyMediaBlock(source);
  source.data.layout.x = 999;
  assert.equal(hasMediaClipboard(), true);
  assert.equal(copied.data.layout.x, 100);
  assert.equal(copied.data.assetId, 'asset-image');
});

test('pasteMediaBlock reuses the asset but creates independent layout metadata', () => {
  clearMediaClipboard();
  copyMediaBlock(makeSource());
  const pasted = pasteMediaBlock({
    createId: () => 'new-anchor',
    offset: 24,
    highestZ: 8,
  });

  assert.equal(pasted.type, 'image');
  assert.equal(pasted.data.assetId, 'asset-image');
  assert.equal(pasted.data.layout.anchorBlockId, 'new-anchor');
  assert.equal(pasted.data.layout.x, 124);
  assert.equal(pasted.data.layout.y, 144);
  assert.equal(pasted.data.layout.zIndex, 9);
  assert.equal(pasted.data.layout.locked, false);
});

test('pasteMediaBlock returns null when clipboard is empty', () => {
  clearMediaClipboard();
  assert.equal(pasteMediaBlock(), null);
});
