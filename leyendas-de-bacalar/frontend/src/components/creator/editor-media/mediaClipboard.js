import { normalizeMediaLayout } from './mediaLayoutState.js';

let clipboard = null;

const clone = (value) => JSON.parse(JSON.stringify(value));

export function clearMediaClipboard() {
  clipboard = null;
}

export function hasMediaClipboard() {
  return Boolean(clipboard);
}

export function copyMediaBlock(block) {
  if (!block?.type || !block?.data) return null;
  clipboard = clone(block);
  return clone(clipboard);
}

export function pasteMediaBlock({
  createId = () => globalThis.crypto?.randomUUID?.() || `media-${Date.now()}`,
  offset = 24,
  highestZ = 1,
} = {}) {
  if (!clipboard) return null;
  const next = clone(clipboard);
  const layout = normalizeMediaLayout(next.data.layout);
  next.data.layout = normalizeMediaLayout({
    ...layout,
    x: layout.x + offset,
    y: layout.y + offset,
    zIndex: highestZ + 1,
    locked: false,
    anchorBlockId: createId(),
  });
  return next;
}
