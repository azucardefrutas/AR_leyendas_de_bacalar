import assert from 'node:assert/strict';
import test from 'node:test';

import * as filePolicy from './fileValidation.service.js';

const { validateFileMetadata } = filePolicy;

test('accepts editor images for the signed upload pipeline', () => {
  const result = validateFileMetadata({
    filename: 'Leyendas de Bacalar.png',
    mimeType: 'image/png',
    sizeBytes: 24_000,
    purpose: 'editor_image',
  });

  assert.equal(result.ok, true);
  assert.equal(result.normalized.purpose, 'editor_image');
});

test('normalizes an octet-stream GLB by its safe extension', () => {
  const result = validateFileMetadata({
    filename: 'sisimite.glb',
    mimeType: 'application/octet-stream',
    sizeBytes: 2_400_000,
    purpose: 'model_3d',
  });

  assert.equal(result.ok, true);
});

test('maps editor purposes to existing asset enum values and metadata kinds', () => {
  assert.equal(typeof filePolicy.getAssetRegistrationPolicy, 'function');
  assert.deepEqual(filePolicy.getAssetRegistrationPolicy('editor_image'), {
    assetType: 'illustration',
    metadataKind: 'editor_image',
    metadataContext: 'manual_editor',
  });
  assert.deepEqual(filePolicy.getAssetRegistrationPolicy('model_3d'), {
    assetType: 'model_3d',
    metadataKind: 'editor_model_3d',
    metadataContext: 'manual_editor',
  });
  assert.deepEqual(filePolicy.getAssetRegistrationPolicy('marker_image'), {
    assetType: 'marker_image',
    metadataKind: 'editor_marker',
    metadataContext: 'manual_editor',
  });
});
