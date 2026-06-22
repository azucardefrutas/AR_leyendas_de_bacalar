import test from 'node:test';
import assert from 'node:assert/strict';

import { getNextMediaCandidate, uniqueMediaCandidates } from './mediaSelection.js';

test('uniqueMediaCandidates preserves the visual stacking order', () => {
  const background = { id: 'background' };
  const model = { id: 'model' };

  assert.deepEqual(
    uniqueMediaCandidates([model, model, background, null]),
    [model, background],
  );
});

test('getNextMediaCandidate selects the resource directly underneath the current one', () => {
  const background = { id: 'background' };
  const model = { id: 'model' };

  assert.equal(getNextMediaCandidate([model, background], model), background);
});

test('getNextMediaCandidate removes duplicates and wraps through the stack', () => {
  const background = { id: 'background' };
  const model = { id: 'model' };

  assert.equal(getNextMediaCandidate([model, model, background], background), model);
});

test('getNextMediaCandidate safely handles empty and single-item stacks', () => {
  const image = { id: 'image' };

  assert.equal(getNextMediaCandidate([], image), null);
  assert.equal(getNextMediaCandidate([image], image), null);
});
