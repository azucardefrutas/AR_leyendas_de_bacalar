export function getOrbitControlOptions({
  embedded = false,
  compactControls = false,
  interactionEnabled = true,
  fullControls = false,
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
  // Blender-like free manipulation: rotate + move (pan up/down/around) + zoom, with
  // damping so it glides to a soft stop. Used by the reader's floating page model.
  if (fullControls) {
    return {
      enablePan: true,
      enableZoom: true,
      enableRotate: true,
      autoRotate: false,
      enableDamping: true,
      dampingFactor: 0.09,
      screenSpacePanning: true,
      zoomSpeed: 0.9,
      panSpeed: 0.85,
      minDistance: 1.4,
      maxDistance: 14,
    };
  }
  return {
    enablePan: !embedded,
    enableZoom: !embedded || compactControls,
    enableRotate: true,
    autoRotate: embedded && !compactControls,
  };
}
