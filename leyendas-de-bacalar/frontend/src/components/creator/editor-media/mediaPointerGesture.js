export function hasExceededDragThreshold(start, current, threshold = 4) {
  if (!start || !current) return false;
  return Math.hypot(current.x - start.x, current.y - start.y) >= threshold;
}

export function areSelectionPointsNear(first, second, tolerance = 8) {
  if (!first || !second) return false;
  return Math.hypot(second.x - first.x, second.y - first.y) <= tolerance;
}

export function shouldCycleMediaSelection({
  isCurrentSelected,
  moved,
  previousPoint,
  point,
}) {
  return Boolean(
    isCurrentSelected
    && !moved
    && areSelectionPointsNear(previousPoint, point),
  );
}

export function shouldResetMediaSelectionCycle({ clickedMedia }) {
  return !clickedMedia;
}

export function canStartMediaPointerGesture({
  button,
  locked,
  interacting3d,
  interactiveTarget,
}) {
  return button === 0 && !locked && !interacting3d && !interactiveTarget;
}

export function shouldPromoteMediaToFree(mode) {
  return mode !== 'free';
}
