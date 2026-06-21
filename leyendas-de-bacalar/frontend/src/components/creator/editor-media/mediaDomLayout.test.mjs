import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getMediaBlockStyle,
  getScaledMediaGeometry,
} from './mediaDomLayout.js';

test('getScaledMediaGeometry scales logical sheet coordinates responsively', () => {
  assert.deepEqual(getScaledMediaGeometry({
    mode: 'free',
    x: 280,
    y: 140,
    width: 560,
    height: 280,
  }, 560), {
    x: 140,
    y: 70,
    width: 280,
    height: 140,
    scale: 0.5,
  });
});

test('inline mode remains in normal Editor.js flow', () => {
  const style = getMediaBlockStyle({ mode: 'inline', width: 520, align: 'center' });
  assert.equal(style.position, 'relative');
  assert.equal(style.float, 'none');
  assert.equal(style.clear, 'both');
  assert.equal(style.width, '100%');
});

test('wrap modes float the Editor.js block so following text can wrap', () => {
  const left = getMediaBlockStyle({ mode: 'wrap-left', width: 360 }, 1120);
  const right = getMediaBlockStyle({ mode: 'wrap-right', width: 360 }, 1120);

  assert.equal(left.float, 'left');
  assert.equal(left.width, '360px');
  assert.equal(left.margin, '0 24px 16px 0');
  assert.equal(right.float, 'right');
  assert.equal(right.margin, '0 0 16px 24px');
});

test('free mode positions the Editor.js block across the editorial sheet', () => {
  const style = getMediaBlockStyle({
    mode: 'free',
    layer: 'behind-text',
    x: 120,
    y: 90,
    width: 420,
    height: 300,
    zIndex: 4,
    opacity: 0.7,
    rotation: 8,
  }, 1120);

  assert.equal(style.position, 'absolute');
  assert.equal(style.left, '120px');
  assert.equal(style.top, '90px');
  assert.equal(style.width, '420px');
  assert.equal(style.height, '300px');
  assert.equal(style.zIndex, '4');
  assert.equal(style.opacity, '0.7');
  assert.equal(style.transform, 'rotate(8deg)');
});
