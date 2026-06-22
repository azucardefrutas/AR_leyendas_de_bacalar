export const MEDIA_SHEET_WIDTH = 1120;
export const MEDIA_MIN_SIZE = 48;
export const MEDIA_MODES = new Set(['inline', 'wrap-left', 'wrap-right', 'free']);
export const MEDIA_ALIGNMENTS = new Set(['left', 'center', 'right']);
export const MEDIA_TEXT_LAYERS = new Set(['above-text', 'behind-text']);

const finite = (value, fallback) => (
  Number.isFinite(Number(value)) ? Number(value) : fallback
);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function normalizeCrop(crop) {
  if (!crop || typeof crop !== 'object') return null;
  return {
    x: clamp(finite(crop.x, 0), 0, 1),
    y: clamp(finite(crop.y, 0), 0, 1),
    width: clamp(finite(crop.width, 1), 0.05, 1),
    height: clamp(finite(crop.height, 1), 0.05, 1),
    zoom: clamp(finite(crop.zoom, 1), 1, 4),
  };
}

export function normalizeMediaLayout(
  layout = {},
  { defaultWidth = 520, defaultHeight = 'auto' } = {},
) {
  const requestedWidth = finite(layout.width, defaultWidth);
  const width = Math.round(clamp(requestedWidth, MEDIA_MIN_SIZE, MEDIA_SHEET_WIDTH));
  const requestedHeight = layout.height;
  const height = requestedHeight === 'auto'
    ? 'auto'
    : Math.round(clamp(finite(requestedHeight, defaultHeight === 'auto' ? MEDIA_MIN_SIZE : defaultHeight), MEDIA_MIN_SIZE, 1200));

  return {
    mode: MEDIA_MODES.has(layout.mode) ? layout.mode : 'inline',
    align: MEDIA_ALIGNMENTS.has(layout.align) ? layout.align : 'center',
    layer: MEDIA_TEXT_LAYERS.has(layout.layer) ? layout.layer : 'above-text',
    x: Math.max(0, Math.round(finite(layout.x, 0))),
    y: Math.max(0, Math.round(finite(layout.y, 0))),
    width,
    height,
    rotation: clamp(Math.round(finite(layout.rotation, 0)), -180, 180),
    zIndex: Math.max(1, Math.round(finite(layout.zIndex, 1))),
    locked: Boolean(layout.locked),
    opacity: clamp(finite(layout.opacity, 1), 0.1, 1),
    anchorBlockId: String(layout.anchorBlockId || ''),
  };
}

export function setMediaMode(layout, mode) {
  const normalized = normalizeMediaLayout(layout);
  const nextMode = MEDIA_MODES.has(mode) ? mode : normalized.mode;
  const align = nextMode === 'wrap-left'
    ? 'left'
    : nextMode === 'wrap-right'
      ? 'right'
      : normalized.align;
  return normalizeMediaLayout({ ...normalized, mode: nextMode, align });
}

export function promoteMediaLayoutToFree(layout, geometry = {}) {
  const normalized = normalizeMediaLayout(layout);
  return normalizeMediaLayout({
    ...normalized,
    mode: 'free',
    x: finite(geometry.x, normalized.x),
    y: finite(geometry.y, normalized.y),
    width: finite(geometry.width, normalized.width),
    height: geometry.height === 'auto'
      ? 'auto'
      : finite(
        geometry.height,
        normalized.height === 'auto' ? MEDIA_MIN_SIZE : normalized.height,
      ),
  });
}

export function moveFreeMedia(layout, position = {}) {
  const normalized = normalizeMediaLayout(layout);
  if (normalized.locked || normalized.mode !== 'free') return normalized;
  return normalizeMediaLayout({
    ...normalized,
    x: finite(position.x, normalized.x),
    y: finite(position.y, normalized.y),
  });
}

export function resizeMedia(layout, size = {}) {
  const normalized = normalizeMediaLayout(layout);
  if (normalized.locked) return normalized;
  return normalizeMediaLayout({
    ...normalized,
    width: finite(size.width, normalized.width),
    height: size.height === 'auto'
      ? 'auto'
      : finite(size.height, normalized.height === 'auto' ? MEDIA_MIN_SIZE : normalized.height),
  });
}

export function setTextLayer(layout, layer) {
  const normalized = normalizeMediaLayout(layout);
  return normalizeMediaLayout({
    ...normalized,
    layer: MEDIA_TEXT_LAYERS.has(layer) ? layer : normalized.layer,
  });
}

export function bringMediaForward(layout) {
  const normalized = normalizeMediaLayout(layout);
  return normalizeMediaLayout({ ...normalized, zIndex: normalized.zIndex + 1 });
}

export function sendMediaBackward(layout) {
  const normalized = normalizeMediaLayout(layout);
  return normalizeMediaLayout({ ...normalized, zIndex: normalized.zIndex - 1 });
}

export function setMediaLocked(layout, locked) {
  return normalizeMediaLayout({ ...normalizeMediaLayout(layout), locked });
}

export function setMediaOpacity(layout, opacity) {
  return normalizeMediaLayout({ ...normalizeMediaLayout(layout), opacity });
}

export function applyCropPan(crop, position = {}) {
  const normalized = normalizeCrop(crop) || normalizeCrop({});
  return normalizeCrop({
    ...normalized,
    x: finite(position.x, normalized.x),
    y: finite(position.y, normalized.y),
  });
}

export function applyCropZoom(crop, zoom) {
  const normalized = normalizeCrop(crop) || normalizeCrop({});
  return normalizeCrop({ ...normalized, zoom });
}

export function resetCrop() {
  return null;
}
