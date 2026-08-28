import assert from 'node:assert/strict';
import test from 'node:test';
import { zipSync } from 'three/addons/libs/fflate.module.js';
import { expandModelFiles, extractGlbFilesFromZip } from './modelArchive.js';

const zipped = (entries, level = 6) => new File([zipSync(entries, { level })], 'meshy.zip', { type: 'application/zip' });
const content = new Uint8Array([1, 2, 3, 4]);

for (const level of [0, 6]) {
  test(`extracts independent GLBs, ignoring other files (compression ${level})`, async () => {
    const source = zipped({ 'exports/walk.glb': content, 'exports/wave.GLB': content, 'readme.txt': content }, level);
    const files = await extractGlbFilesFromZip(source);
    assert.deepEqual(files.map((file) => file.name), ['walk.glb', 'wave.GLB']);
    for (const file of files) assert.deepEqual(new Uint8Array(await file.arrayBuffer()), content);
  });
}

test('ZIP extraction strips paths rather than writing them to disk', async () => {
  const [file] = await extractGlbFilesFromZip(zipped({ '../../pirata.glb': content }));
  assert.equal(file.name, 'pirata.glb');
});

test('combines a single GLB and a ZIP without merging animation clips', async () => {
  const single = new File([content], 'pirata.glb');
  const files = await expandModelFiles([single, zipped({ 'other.glb': content })]);
  assert.equal(files[0], single);
  assert.deepEqual(files.map((file) => file.name), ['pirata.glb', 'other.glb']);
});

test('rejects archives without GLBs and truncated model streams', async () => {
  await assert.rejects(() => extractGlbFilesFromZip(zipped({ 'readme.txt': content })), /no contiene archivos GLB/i);
  const complete = zipped({ 'pirata.glb': new Uint8Array(1024) }, 0);
  const broken = new File([complete.slice(0, 80)], 'broken.zip');
  await assert.rejects(() => extractGlbFilesFromZip(broken));
});

test('rejects excessive model and entry counts', async () => {
  const models = Object.fromEntries(Array.from({ length: 41 }, (_, index) => [`${index}.glb`, content]));
  await assert.rejects(() => extractGlbFilesFromZip(zipped(models)), /40 modelos/i);
  const entries = Object.fromEntries(Array.from({ length: 257 }, (_, index) => [`${index}.txt`, content]));
  await assert.rejects(() => extractGlbFilesFromZip(zipped(entries)), /demasiados archivos/i);
});

test('rejects oversized and unsupported selections before reading file data', async () => {
  await assert.rejects(() => expandModelFiles([{ name: 'large.glb', size: 101 * 1024 * 1024 }]), /100 MB/);
  await assert.rejects(() => extractGlbFilesFromZip({ size: 251 * 1024 * 1024 }), /250 MB/);
  await assert.rejects(() => expandModelFiles([new File([content], 'pirata.fbx')]), /no es GLB ni ZIP/);
  await assert.rejects(() => expandModelFiles([]), /Selecciona/);
});
