import {
  MEDIA_SHEET_WIDTH,
  normalizeMediaLayout,
} from './mediaLayoutState.js';

const LEGACY_COMPOSITION_WIDTH = 900;
const SUPPORTED_TYPES = new Set(['image', 'model3d', 'marker']);

const safeUrl = (value) => (
  /^https?:\/\//i.test(String(value || '').trim()) ? String(value).trim() : ''
);

function migrateLayer(layer, compositionId, index) {
  if (!SUPPORTED_TYPES.has(layer?.type)) return null;

  const assetId = String(layer.assetId || '');
  const url = safeUrl(layer.url || layer.imageUrl || layer.modelUrl || layer.previewUrl);
  if (!assetId && !url) return null;

  const scale = MEDIA_SHEET_WIDTH / LEGACY_COMPOSITION_WIDTH;
  const layout = normalizeMediaLayout({
    mode: 'free',
    align: 'left',
    layer: 'above-text',
    x: Number(layer.x || 0) * scale,
    y: Number(layer.y || 0) * scale,
    width: Number(layer.width || 0) * scale,
    height: Number(layer.height || 0) * scale,
    rotation: layer.rotation,
    zIndex: layer.zIndex || index + 1,
    locked: layer.locked,
    opacity: layer.opacity,
    anchorBlockId: compositionId,
  });
  const id = `${compositionId || 'composition'}-${String(layer.id || index + 1)}`;
  const shared = {
    assetId,
    title: String(layer.title || ''),
    caption: String(layer.caption || ''),
    layout,
  };

  if (layer.type === 'image') {
    return {
      id,
      type: 'image',
      data: {
        assetId,
        file: { url },
        alt: String(layer.alt || ''),
        caption: shared.caption,
        withBorder: false,
        withBackground: false,
        stretched: false,
        layout,
        crop: null,
      },
    };
  }

  if (layer.type === 'model3d') {
    return {
      id,
      type: 'model3d',
      data: {
        ...shared,
        title: shared.title || 'Modelo 3D',
        modelUrl: url,
        displayMode: 'inline-model',
      },
    };
  }

  return {
    id,
    type: 'leyendaMarker',
    data: {
      ...shared,
      title: shared.title || 'Marcador',
      imageUrl: url,
      displayMode: 'inline-image',
      crop: null,
    },
  };
}

export function migrateCompositionBlock(block = {}) {
  if (block.type !== 'composition') return [block];
  const layers = Array.isArray(block.data?.layers) ? block.data.layers : [];
  if (!layers.length) return [];
  const migrated = layers
    .map((layer, index) => migrateLayer(layer, String(block.id || ''), index))
    .filter(Boolean);
  return migrated.length ? migrated : [block];
}

export function migrateEditorDataMedia(editorData = {}) {
  const blocks = Array.isArray(editorData.blocks) ? editorData.blocks : [];
  if (!blocks.some((block) => block?.type === 'composition')) return editorData;
  return {
    ...editorData,
    blocks: blocks.flatMap((block) => migrateCompositionBlock(block)),
  };
}
