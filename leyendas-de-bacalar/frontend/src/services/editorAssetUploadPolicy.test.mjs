import assert from 'node:assert/strict';
import test from 'node:test';

test('falls back only for the stale backend editor_image allowlist error', async () => {
  const { shouldFallbackEditorImageUpload } = await import('./editorAssetUploadPolicy.js');

  assert.equal(shouldFallbackEditorImageUpload({
    phase: 'prepare',
    supabaseError: { message: 'Invalid file metadata: unsupported purpose "editor_image".' },
  }), true);
  assert.equal(shouldFallbackEditorImageUpload({
    phase: 'register',
    supabaseError: { message: 'Could not register asset.' },
  }), false);
  assert.equal(shouldFallbackEditorImageUpload({
    phase: 'prepare',
    supabaseError: { message: 'unsupported purpose "model_3d"' },
  }), false);
});
