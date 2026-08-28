import assert from 'node:assert/strict';
import test from 'node:test';
import { mapPhysicalArScenes, normalizeAnimationConfig } from './arSceneData.js';

const row = (id, markerId) => ({
  id, marker_asset_id: markerId, ar_scene_id: 'scene', target_type: 'physical_edition', status: 'published',
  legend: { id: 'legend', title: 'Leyenda', status: 'published' },
  marker: { file_url: `${markerId}.png` },
  scene: { model: { file_url: 'same.glb' }, interaction_config: { animation: { clips: ['Idle', 'Wave'] } } },
});

test('keeps distinct markers that reuse one model and resolves each marker code', () => {
  const scenes = mapPhysicalArScenes([row('one', 'a'), row('two', 'b')], [
    { ar_scene_id: 'scene', marker_asset_id: 'a', marker_code: 'CODE-A' },
    { ar_scene_id: 'scene', marker_asset_id: 'b', marker_code: 'CODE-B' },
  ]);
  assert.equal(scenes.length, 2);
  assert.deepEqual(scenes.map((scene) => scene.markerCode), ['CODE-A', 'CODE-B']);
  assert.equal(scenes[1].animationConfig.clips[1], 'Wave');
});

test('does not mix digital story hotspots, unpublished stories or broken associations', () => {
  assert.deepEqual(mapPhysicalArScenes([
    { ...row('digital', 'a'), target_type: 'legend_page' },
    { ...row('draft', 'b'), legend: { status: 'draft' } },
    { ...row('broken', 'c'), marker: null },
  ]), []);
});

test('preserves exact clip names and distinguishes static from unknown metadata', () => {
  assert.deepEqual(normalizeAnimationConfig({ clips: [' Wave ', ' Wave '] }).clips, [' Wave ']);
  assert.equal(normalizeAnimationConfig({ inspected: true }).inspected, true);
  assert.equal(normalizeAnimationConfig(null).inspected, false);
});
