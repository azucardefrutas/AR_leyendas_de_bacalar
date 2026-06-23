export function getOrbitControlOptions({
  embedded = false,
  compactControls = false,
  interactionEnabled = true,
} = {}) {
  if (!interactionEnabled) {
    return {
      enabled: false,
      enablePan: false,
      enableZoom: false,
      enableRotate: false,
      autoRotate: false,
    };
  }
  return {
    enablePan: !embedded,
    enableZoom: !embedded || compactControls,
    enableRotate: true,
    autoRotate: embedded && !compactControls,
  };
}
