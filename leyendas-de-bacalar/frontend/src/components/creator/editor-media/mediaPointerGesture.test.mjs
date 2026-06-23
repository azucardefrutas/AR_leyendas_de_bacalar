import test from 'node:test';
import assert from 'node:assert/strict';

import {
  areSelectionPointsNear,
  canStartMediaPointerGesture,
  hasExceededDragThreshold,
  shouldPromoteMediaToFree,
  shouldResetMediaSelectionCycle,
  shouldCycleMediaSelection,
} from './mediaPointerGesture.js';

test('hasExceededDragThreshold ignores small pointer jitter', () => {
  assert.equal(
    hasExceededDragThreshold({ x: 10, y: 10 }, { x: 13, y: 12 }),
    false,
  );
  assert.equal(
    hasExceededDragThreshold({ x: 10, y: 10 }, { x: 16, y: 10 }),
    true,
  );
});

test('areSelectionPointsNear keeps repeated clicks within the same visual point', () => {
  assert.equal(
    areSelectionPointsNear({ x: 100, y: 100 }, { x: 104, y: 105 }),
    true,
  );
  assert.equal(
    areSelectionPointsNear({ x: 100, y: 100 }, { x: 120, y: 100 }),
    false,
  );
});

test('shouldCycleMediaSelection cycles only a selected stationary repeated click', () => {
  const previousPoint = { x: 100, y: 100 };
  const point = { x: 102, y: 103 };

  assert.equal(shouldCycleMediaSelection({
    isCurrentSelected: true,
    moved: false,
    previousPoint,
    point,
  }), true);
  assert.equal(shouldCycleMediaSelection({
    isCurrentSelected: true,
    moved: true,
    previousPoint,
    point,
  }), false);
  assert.equal(shouldCycleMediaSelection({
    isCurrentSelected: false,
    moved: false,
    previousPoint,
    point,
  }), false);
});

test('shouldResetMediaSelectionCycle keeps the click point while switching media layers', () => {
  assert.equal(shouldResetMediaSelectionCycle({ clickedMedia: true }), false);
  assert.equal(shouldResetMediaSelectionCycle({ clickedMedia: false }), true);
});

test('canStartMediaPointerGesture accepts inline media and rejects blocked interactions', () => {
  assert.equal(canStartMediaPointerGesture({
    button: 0,
    locked: false,
    interacting3d: false,
    interactiveTarget: false,
  }), true);
  assert.equal(canStartMediaPointerGesture({
    button: 0,
    locked: true,
    interacting3d: false,
    interactiveTarget: false,
  }), false);
  assert.equal(canStartMediaPointerGesture({
    button: 0,
    locked: false,
    interacting3d: true,
    interactiveTarget: false,
  }), false);
});

test('shouldPromoteMediaToFree promotes legacy inline and wrapped resources', () => {
  assert.equal(shouldPromoteMediaToFree('inline'), true);
  assert.equal(shouldPromoteMediaToFree('wrap-left'), true);
  assert.equal(shouldPromoteMediaToFree('wrap-right'), true);
  assert.equal(shouldPromoteMediaToFree('free'), false);
});
