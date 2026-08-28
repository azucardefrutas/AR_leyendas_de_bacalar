import assert from 'node:assert/strict';
import test from 'node:test';
import { getEmoteWheelPage } from './emoteWheelLayout.js';

test('keeps six emote targets visible without overlapping on phone and tablet widths', () => {
  for (const size of [256, 296, 340]) {
    const { items } = getEmoteWheelPage(['1', '2', '3', '4', '5', '6'], 0, size);
    for (const item of items) {
      assert.ok(item.width >= 48 && item.height >= 48);
      assert.ok(item.left >= 0 && item.top >= 0 && item.left + item.width <= size && item.top + item.height <= size);
      for (const other of items.filter((candidate) => candidate !== item)) {
        const overlap = item.left < other.left + other.width && item.left + item.width > other.left
          && item.top < other.top + other.height && item.top + item.height > other.top;
        assert.equal(overlap, false);
      }
    }
  }
});

test('paginates all clips and clamps an out-of-date page', () => {
  const clips = Array.from({ length: 17 }, (_, index) => `Emote ${index}`);
  const last = getEmoteWheelPage(clips, 99, 340);
  assert.equal(last.pageCount, 3);
  assert.equal(last.pageIndex, 2);
  assert.deepEqual(last.items.map((item) => item.clip), clips.slice(12));
});
