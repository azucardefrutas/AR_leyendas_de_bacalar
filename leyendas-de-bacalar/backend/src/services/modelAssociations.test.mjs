import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-key';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
const { supabaseAdmin } = await import('../config/supabaseAdmin.js');
const { createScene, listScenes } = await import('./interactiveHotspots.service.js');
const { getMobileArScenes } = await import('./mobileAr.service.js');

afterEach(() => mock.restoreAll());

function database(tables) {
  mock.method(supabaseAdmin, 'from', (table) => {
    if (!tables[table]) throw new Error(`Unexpected table ${table}`);
    const filters = [];
    let single = false;
    let insert = null;
    let update = null;
    const query = {
      select: () => query,
      order: () => query,
      eq: (key, value) => { filters.push((row) => (key === 'metadata->>legend_id' ? row.metadata?.legend_id : row[key]) === value); return query; },
      in: (key, values) => { filters.push((row) => values.includes(row[key])); return query; },
      insert: (value) => { insert = value; return query; },
      update: (value) => { update = value; return query; },
      single: () => { single = true; return query; },
      maybeSingle: () => { single = true; return query; },
      then(resolve, reject) {
        try {
          let rows = tables[table].filter((row) => filters.every((filter) => filter(row)));
          if (insert) {
            const row = { id: `new-${tables[table].length}`, ...insert };
            tables[table].push(row);
            rows = [row];
          }
          if (update) rows.forEach((row) => Object.assign(row, update));
          return Promise.resolve({ data: structuredClone(single ? rows[0] || null : rows), error: null }).then(resolve, reject);
        } catch (error) { return Promise.reject(error).then(resolve, reject); }
      },
    };
    return query;
  });
}

const context = { legendId: 'legend', userId: 'author', roles: ['creator'] };
const baseTables = () => ({
  legends: [{ id: 'legend', creator_id: 'author', status: 'draft' }],
  assets: [{ id: 'asset', asset_type: 'model_3d', file_url: 'https://example.test/model.glb', metadata: { legend_id: 'legend' } }],
  ar_scenes: [], interactive_hotspots: [], ar_markers: [],
});

test('one model asset gets separate digital and physical scenes without overwriting story settings', async () => {
  const tables = baseTables();
  tables.ar_scenes.push({ id: 'story-scene', model_asset_id: 'asset', interaction_config: { scope: 'story', animation: { clips: ['Idle'] } } });
  database(tables);
  const physical = await createScene({ ...context, payload: { model_asset_id: 'asset', scope: 'physical', animation_config: { clips: ['Wave'], inspected: true } } });
  assert.notEqual(physical.id, 'story-scene');
  assert.deepEqual(tables.ar_scenes[0].interaction_config.animation.clips, ['Idle']);
  assert.equal(physical.interaction_config.scope, 'physical');
  const again = await createScene({ ...context, payload: { model_asset_id: 'asset', scope: 'physical', animation_config: { clips: ['Wave'] } } });
  assert.equal(again.id, physical.id);
  assert.equal(tables.ar_scenes.length, 2);
});

test('model libraries separate new and legacy physical associations from digital resources', async () => {
  const tables = baseTables();
  tables.ar_scenes.push(
    { id: 'digital', model_asset_id: 'asset', interaction_config: { scope: 'story' } },
    { id: 'mobile', model_asset_id: 'asset', interaction_config: { scope: 'physical', animation: { inspected: true } } },
    { id: 'legacy', model_asset_id: 'asset', interaction_config: {} },
  );
  tables.interactive_hotspots.push({ legend_id: 'legend', ar_scene_id: 'legacy', target_type: 'physical_edition' });
  database(tables);
  assert.deepEqual((await listScenes(context)).map((scene) => scene.id), ['digital']);
  const physical = await listScenes({ ...context, scope: 'physical' });
  assert.deepEqual(physical.map((scene) => scene.id), ['mobile', 'legacy']);
  assert.equal(physical[0].animationConfig.inspected, true);
  assert.equal(physical[0].animationConfig.clips.length, 0);
});

test('cross-author and cross-legend requests cannot associate a model', async () => {
  const tables = baseTables();
  database(tables);
  await assert.rejects(() => createScene({ ...context, userId: 'other', payload: { model_asset_id: 'asset' } }), /Forbidden/);
  tables.assets[0].metadata.legend_id = 'other-legend';
  await assert.rejects(() => createScene({ ...context, payload: { model_asset_id: 'asset' } }), /does not belong/);
  assert.equal(tables.ar_scenes.length, 0);
});

test('the backend mobile feed preserves two markers for one model and their separate codes', async () => {
  const tables = baseTables();
  for (const id of ['a', 'b']) {
    tables.interactive_hotspots.push({ id, ar_scene_id: 'scene', marker_asset_id: id, target_type: 'physical_edition', status: 'published', legend: { id: 'legend', status: 'published' }, marker: { file_url: `${id}.png` }, scene: { model: { file_url: 'same.glb' } } });
    tables.ar_markers.push({ ar_scene_id: 'scene', marker_asset_id: id, marker_code: `code-${id}` });
  }
  database(tables);
  const scenes = await getMobileArScenes();
  assert.equal(scenes.length, 2);
  assert.deepEqual(scenes.map((scene) => scene.markerCode), ['code-a', 'code-b']);
});
