export const COMPOSITION_WIDTH = 900;
export const COMPOSITION_HEIGHT = 560;
export const MIN_LAYER_SIZE = 48;
export const SUPPORTED_LAYER_TYPES = new Set(['image', 'model3d', 'marker']);

const DEFAULT_SIZES = {
  image: { width: 360, height: 240 },
  model3d: { width: 300, height: 280 },
  marker: { width: 160, height: 160 },
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const safeColor = (value) => (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(String(value || '')) ? String(value) : '#ffffff');
const safeUrl = (value) => (/^https?:\/\//i.test(String(value || '').trim()) ? String(value).trim() : '');

function makeLayerId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeCompositionLayer(layer = {}, index = 0) {
  if (!SUPPORTED_LAYER_TYPES.has(layer.type)) return null;
  const defaults = DEFAULT_SIZES[layer.type];
  const requestedWidth = clamp(Math.round(finite(layer.width, defaults.width)), MIN_LAYER_SIZE, COMPOSITION_WIDTH);
  const requestedHeight = clamp(Math.round(finite(layer.height, defaults.height)), MIN_LAYER_SIZE, COMPOSITION_HEIGHT);
  const x = clamp(Math.round(finite(layer.x, 24 + (index * 24))), 0, COMPOSITION_WIDTH - requestedWidth);
  const y = clamp(Math.round(finite(layer.y, 24 + (index * 24))), 0, COMPOSITION_HEIGHT - requestedHeight);

  return {
    id: String(layer.id || makeLayerId()),
    type: layer.type,
    assetId: String(layer.assetId || ''),
    title: String(layer.title || (layer.type === 'model3d' ? 'Modelo 3D' : layer.type === 'marker' ? 'Marcador' : 'Imagen')),
    url: safeUrl(layer.url || layer.modelUrl || layer.imageUrl || layer.previewUrl),
    caption: String(layer.caption || ''),
    alt: String(layer.alt || ''),
    x,
    y,
    width: requestedWidth,
    height: requestedHeight,
    zIndex: Math.max(1, Math.round(finite(layer.zIndex, index + 1))),
    rotation: clamp(Math.round(finite(layer.rotation, 0)), -180, 180),
    opacity: clamp(finite(layer.opacity, 1), 0.1, 1),
    locked: Boolean(layer.locked),
  };
}

export function normalizeCompositionData(data = {}) {
  const layers = (Array.isArray(data.layers) ? data.layers : [])
    .map((layer, index) => normalizeCompositionLayer(layer, index))
    .filter(Boolean)
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((layer, index) => ({ ...layer, zIndex: index + 1 }));

  return {
    canvas: {
      width: COMPOSITION_WIDTH,
      height: COMPOSITION_HEIGHT,
      background: safeColor(data.canvas?.background),
    },
    layers,
  };
}

export function getCompositionScale(availableWidth) {
  const width = finite(availableWidth, COMPOSITION_WIDTH);
  if (width <= 0) return 1;
  return Math.min(1, width / COMPOSITION_WIDTH);
}

function updateLayer(data, id, updater, { allowLocked = false } = {}) {
  const normalized = normalizeCompositionData(data);
  const layers = normalized.layers.map((layer) => {
    if (String(layer.id) !== String(id) || (layer.locked && !allowLocked)) return layer;
    return updater(layer);
  });
  return normalizeCompositionData({ ...normalized, layers });
}

export function moveLayer(data, id, position = {}) {
  return updateLayer(data, id, (layer) => ({
    ...layer,
    x: clamp(Math.round(finite(position.x, layer.x)), 0, COMPOSITION_WIDTH - layer.width),
    y: clamp(Math.round(finite(position.y, layer.y)), 0, COMPOSITION_HEIGHT - layer.height),
  }));
}

export function resizeLayer(data, id, geometry = {}) {
  return updateLayer(data, id, (layer) => {
    const requestedX = clamp(Math.round(finite(geometry.x, layer.x)), 0, COMPOSITION_WIDTH - MIN_LAYER_SIZE);
    const requestedY = clamp(Math.round(finite(geometry.y, layer.y)), 0, COMPOSITION_HEIGHT - MIN_LAYER_SIZE);
    const width = clamp(
      Math.round(finite(geometry.width, layer.width)),
      MIN_LAYER_SIZE,
      COMPOSITION_WIDTH - requestedX,
    );
    const height = clamp(
      Math.round(finite(geometry.height, layer.height)),
      MIN_LAYER_SIZE,
      COMPOSITION_HEIGHT - requestedY,
    );
    return { ...layer, x: requestedX, y: requestedY, width, height };
  });
}

export function duplicateLayer(data, id, createId = makeLayerId) {
  const normalized = normalizeCompositionData(data);
  const source = normalized.layers.find((layer) => String(layer.id) === String(id));
  if (!source) return normalized;
  const copy = {
    ...source,
    id: createId(),
    x: clamp(source.x + 24, 0, COMPOSITION_WIDTH - source.width),
    y: clamp(source.y + 24, 0, COMPOSITION_HEIGHT - source.height),
    zIndex: normalized.layers.length + 1,
    locked: false,
  };
  return normalizeCompositionData({ ...normalized, layers: [...normalized.layers, copy] });
}

export function removeLayer(data, id) {
  const normalized = normalizeCompositionData(data);
  return normalizeCompositionData({
    ...normalized,
    layers: normalized.layers.filter((layer) => String(layer.id) !== String(id)),
  });
}

export function setLayerLocked(data, id, locked) {
  return updateLayer(data, id, (layer) => ({ ...layer, locked: Boolean(locked) }), { allowLocked: true });
}

export function setLayerOpacity(data, id, opacity) {
  return updateLayer(data, id, (layer) => ({ ...layer, opacity: clamp(finite(opacity, layer.opacity), 0.1, 1) }), { allowLocked: true });
}

export function alignLayer(data, id, alignment) {
  return updateLayer(data, id, (layer) => {
    const positions = {
      left: 0,
      center: Math.round((COMPOSITION_WIDTH - layer.width) / 2),
      right: COMPOSITION_WIDTH - layer.width,
    };
    return { ...layer, x: positions[alignment] ?? layer.x };
  });
}

export function bringLayerForward(data, id) {
  const normalized = normalizeCompositionData(data);
  const index = normalized.layers.findIndex((layer) => String(layer.id) === String(id));
  if (index < 0 || index === normalized.layers.length - 1) return normalized;
  const layers = [...normalized.layers];
  const [layer] = layers.splice(index, 1);
  layers.push(layer);
  return normalizeCompositionData({
    ...normalized,
    layers: layers.map((item, layerIndex) => ({ ...item, zIndex: layerIndex + 1 })),
  });
}

export function sendLayerBackward(data, id) {
  const normalized = normalizeCompositionData(data);
  const index = normalized.layers.findIndex((layer) => String(layer.id) === String(id));
  if (index <= 0) return normalized;
  const layers = [...normalized.layers];
  const [layer] = layers.splice(index, 1);
  layers.unshift(layer);
  return normalizeCompositionData({
    ...normalized,
    layers: layers.map((item, layerIndex) => ({ ...item, zIndex: layerIndex + 1 })),
  });
}

export function addLayer(data, payload = {}, createId = makeLayerId) {
  const normalized = normalizeCompositionData(data);
  const type = SUPPORTED_LAYER_TYPES.has(payload.type) ? payload.type : 'image';
  const defaults = DEFAULT_SIZES[type];
  const offset = 24 + ((normalized.layers.length % 8) * 20);
  const layer = normalizeCompositionLayer({
    ...payload,
    id: createId(),
    type,
    x: payload.x ?? offset,
    y: payload.y ?? offset,
    width: payload.width ?? defaults.width,
    height: payload.height ?? defaults.height,
    zIndex: normalized.layers.length + 1,
  }, normalized.layers.length);
  return normalizeCompositionData({ ...normalized, layers: [...normalized.layers, layer] });
}

export function useLayerAsBackground(data, id) {
  const normalized = normalizeCompositionData(data);
  const source = normalized.layers.find((layer) => String(layer.id) === String(id));
  if (!source || source.type !== 'image') return normalized;
  const layers = normalized.layers
    .filter((layer) => layer.id !== source.id)
    .map((layer, index) => ({ ...layer, zIndex: index + 2 }));
  return normalizeCompositionData({
    ...normalized,
    layers: [{
      ...source,
      x: 0,
      y: 0,
      width: COMPOSITION_WIDTH,
      height: COMPOSITION_HEIGHT,
      zIndex: 1,
      locked: true,
    }, ...layers],
  });
}
