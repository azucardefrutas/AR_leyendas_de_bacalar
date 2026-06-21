export function getOrbitControlOptions({ embedded = false, compactControls = false } = {}) {
  return {
    enablePan: !embedded,
    enableZoom: !embedded || compactControls,
    enableRotate: true,
    autoRotate: embedded && !compactControls,
  };
}
