import assert from 'node:assert/strict';
import test from 'node:test';
import { getModelUrl } from './modelScene.js';
import { getSceneAnimationConfig } from './modelAnimationConfig.js';

test('resolves model relations returned by creator, reader and backend', () => {
  for (const relation of ['assets', 'asset', 'model', 'modelAsset', 'model_asset']) {
    for (const field of ['url', 'fileUrl', 'file_url', 'public_url', 'external_url']) {
      assert.equal(getModelUrl({ [relation]: { [field]: 'https://example.test/model.glb' } }), 'https://example.test/model.glb');
    }
  }
  assert.equal(getModelUrl({ assets: [{ file_url: 'model.glb' }] }), 'model.glb');
  assert.equal(getModelUrl(null), '');
});

test('reads animation metadata from a model asset without a saved scene config', () => {
  const config = getSceneAnimationConfig({ model: { metadata: { animation: { clips: ['Dance'] } } } });
  assert.equal(config.defaultClip, 'Dance');
  assert.equal(config.inspected, true);
});
