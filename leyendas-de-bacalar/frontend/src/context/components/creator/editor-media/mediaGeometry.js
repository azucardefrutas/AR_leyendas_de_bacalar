import {
  MEDIA_MIN_SIZE,
  MEDIA_SHEET_WIDTH,
  normalizeMediaLayout,
} from './mediaLayoutState.js';

const finite = (value, fallback = 0) => (
  Number.isFinite(Number(value)) ? Number(value) : fallback
);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function logicalPointFromClient(point = {}, sheetRect = {}) {
  const renderedWidth = Math.max(1, finite(sheetRect.width, MEDIA_SHEET_WIDTH));
  const scale = renderedWidth / MEDIA_SHEET_WIDTH;
  return {
    x: Math.round((finite(point.x) - finite(sheetRect.left)) / scale),
    y: Math.round((finite(point.y) - finite(sheetRect.top)) / scale),
    scale,
  };
}

export function resizeFromHandle(layout, handle, delta = {}) {
  const normalized = normalizeMediaLayout(layout);
  if (normalized.locked) return normalized;

  const dx = finite(delta.x);
  const dy = finite(delta.y);
  let { x, y, width, height } = normalized;
  const numericHeight = height === 'auto' ? MEDIA_MIN_SIZE : height;
  height = numericHeight;

  if (handle.includes('w')) {
    const nextWidth = Math.max(MEDIA_MIN_SIZE, width - dx);
    x += width - nextWidth;
    width = nextWidth;
  }
  if (handle.includes('e')) width = Math.max(MEDIA_MIN_SIZE, width + dx);
  if (handle.includes('n')) {
    const nextHeight = Math.max(MEDIA_MIN_SIZE, height - dy);
    y += height - nextHeight;
    height = nextHeight;
  }
  if (handle.includes('s')) height = Math.max(MEDIA_MIN_SIZE, height + dy);

  return normalizeMediaLayout({ ...normalized, x, y, width, height });
}

export function rotateFromPointer(layout, center = {}, pointer = {}) {
  if (normalizeMediaLayout(layout).locked) return normalizeMediaLayout(layout).rotation;
  const radians = Math.atan2(
    finite(pointer.y) - finite(center.y),
    finite(pointer.x) - finite(center.x),
  );
  const degrees = Math.round((radians * 180) / Math.PI) + 90;
  return ((degrees + 180) % 360 + 360) % 360 - 180;
}

export function clampFreeLayoutToSheet(layout, sheet = {}) {
  const normalized = normalizeMediaLayout(layout);
  const sheetWidth = Math.max(MEDIA_MIN_SIZE, finite(sheet.width, MEDIA_SHEET_WIDTH));
  const sheetHeight = Math.max(MEDIA_MIN_SIZE, finite(sheet.height, 800));
  const visible = MEDIA_MIN_SIZE;
  return normalizeMediaLayout({
    ...normalized,
    x: clamp(normalized.x, -(normalized.width - visible), sheetWidth - visible),
    y: clamp(
      normalized.y,
      -((normalized.height === 'auto' ? visible : normalized.height) - visible),
      sheetHeight - visible,
    ),
  });
}

export function getRequiredPageHeight(
  textBottom,
  layouts = [],
  { minHeight = 800, padding = 80 } = {},
) {
  const mediaBottom = layouts
    .map((layout) => normalizeMediaLayout(layout))
    .filter((layout) => layout.mode === 'free')
    .reduce((highest, layout) => Math.max(
      highest,
      layout.y + (layout.height === 'auto' ? MEDIA_MIN_SIZE : layout.height),
    ), 0);
  return Math.ceil(Math.max(minHeight, finite(textBottom) + padding, mediaBottom + padding));
}

export function getInitialFreeLayout({
  width = 520,
  height = 360,
  sheetWidth = MEDIA_SHEET_WIDTH,
  visibleTop = 0,
  highestZ = 0,
} = {}) {
  return normalizeMediaLayout({
    mode: 'free',
    x: Math.round((sheetWidth - width) / 2),
    y: Math.max(24, Math.round(visibleTop + 48)),
    width,
    height,
    rotation: 0,
    zIndex: highestZ + 1,
    locked: false,
    opacity: 1,
    layer: 'above-text',
    align: 'center',
  });
}
