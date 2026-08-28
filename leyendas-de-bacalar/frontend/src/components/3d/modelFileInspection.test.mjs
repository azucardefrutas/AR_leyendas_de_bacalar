import assert from 'node:assert/strict';
import test from 'node:test';
import { getAnimationClipNames, inspectModelBytes } from './modelFileInspection.js';

function buildGlb(json) {
  const encoded = new TextEncoder().encode(JSON.stringify(json));
  const paddedLength = Math.ceil(encoded.length / 4) * 4;
  const bytes = new Uint8Array(12 + 8 + paddedLength);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.length, true);
  view.setUint32(12, paddedLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  bytes.fill(0x20, 20);
  bytes.set(encoded, 20);
  return bytes;
}

test('reads and names embedded GLB animation clips', () => {
  const config = inspectModelBytes(buildGlb({ animations: [{ name: 'Idle' }, { name: 'Wave' }, {}] }), 'pirata.glb');
  assert.deepEqual(config.clips, ['Idle', 'Wave', 'animation_2']);
  assert.equal(config.defaultClip, 'Idle');
  assert.equal(config.inspected, true);
  assert.equal(config.autoplay, true);
});

test('marks a valid model without animations as inspected static', () => {
  const config = inspectModelBytes(buildGlb({ scenes: [{}] }), 'estatico.glb');
  assert.deepEqual(config.clips, []);
  assert.equal(config.inspected, true);
  assert.equal(config.autoplay, false);
});

test('deduplicates repeated artist clip names', () => {
  assert.deepEqual(getAnimationClipNames({ animations: [{ name: 'Dance' }, { name: 'Dance' }, {}] }), [
    'Dance', 'animation_2',
  ]);
});

test('preserves the exact engine name and rejects incomplete model packages', () => {
  assert.deepEqual(getAnimationClipNames({ animations: [{ name: ' Wave ' }] }), [' Wave ']);
  assert.throws(() => inspectModelBytes(buildGlb({ buffers: [{ uri: 'mesh.bin' }] }), 'pirata.glb'), /archivos externos/);
  assert.throws(() => inspectModelBytes(new Uint8Array(6), 'broken.glb'), /incompleto/);
});
