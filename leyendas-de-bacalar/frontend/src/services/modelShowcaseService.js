import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';
import { STORAGE_BUCKETS } from './assetService.js';

// Light, subtle per-model gradients (used behind each model render). Soft and
// premium — no heavy/dark fills. Cycled for database-sourced models.
const SHOWCASE_GRADIENTS = [
  'linear-gradient(155deg, #d8f3ec 0%, #bfe6f1 100%)', // cian/verde claro
  'linear-gradient(155deg, #ece4f5 0%, #dcdcf2 100%)', // lavanda claro
  'linear-gradient(155deg, #f1e8d6 0%, #e2d3b6 100%)', // arena claro
  'linear-gradient(155deg, #ddefdc 0%, #c8e8dd 100%)', // verde menta
  'linear-gradient(155deg, #dceff3 0%, #cbe2ef 100%)', // aqua claro
  'linear-gradient(155deg, #dde8f4 0%, #cad9ee 100%)', // azul claro
];

// Real, already-shipped project models (the same GLBs used by the landing intro).
// Used as a graceful, functional fallback when no published 3D models exist in the
// database yet (or Supabase is not configured). These are real legend assets, not
// demo placeholders.
const LOCAL_SHOWCASE_MODELS = [
  {
    id: 'local-sismite',
    name: 'El Sismité',
    legendTitle: 'El Sismité',
    modelPath: '/landing-intro/models/El sismite.glb',
    posterPath: '/landing-intro/Img_models/Sisimite.webp',
    background: 'linear-gradient(155deg, #f1e8d6 0%, #e2d3b6 100%)', // arena claro
  },
  {
    id: 'local-bruja',
    name: 'La Bruja',
    legendTitle: 'La Bruja',
    modelPath: '/landing-intro/models/La bruja.glb',
    posterPath: '/landing-intro/Img_models/La_bruja.webp',
    background: 'linear-gradient(155deg, #ece4f5 0%, #dcdcf2 100%)', // lavanda claro
  },
  {
    id: 'local-serpiente',
    name: 'La Serpiente del Mar',
    legendTitle: 'La serpiente del mar',
    modelPath: '/landing-intro/models/dragon del mar.glb',
    posterPath: '/landing-intro/Img_models/Dragon_del_mar.webp',
    background: 'linear-gradient(155deg, #d8f3ec 0%, #bfe6f1 100%)', // cian/verde claro
  },
  {
    id: 'local-duendes',
    name: 'Los Duendes del Monte',
    legendTitle: 'Los duendes del monte',
    modelPath: '/landing-intro/models/duendes del bosque.glb',
    posterPath: '/landing-intro/Img_models/Duendes_del_bosque.webp',
    background: 'linear-gradient(155deg, #ddefdc 0%, #c8e8dd 100%)', // verde menta
  },
  {
    id: 'local-animales',
    name: 'Extraños Animales',
    legendTitle: 'Extraños animales',
    modelPath: '/landing-intro/models/extrañas criaturas.glb',
    posterPath: '/landing-intro/Img_models/Extrañas_criaturas.webp',
    background: 'linear-gradient(155deg, #dceff3 0%, #cbe2ef 100%)', // aqua claro
  },
  {
    id: 'local-upb',
    name: 'Universidad Politécnica de Bacalar',
    legendTitle: 'Objeto cultural',
    modelPath: '/landing-intro/models/UPB.glb',
    posterPath: '/landing-intro/Img_models/UPB.webp',
    background: 'linear-gradient(155deg, #dde8f4 0%, #cad9ee 100%)', // azul claro
  },
];

const LOCAL_MODEL_LOOKUP = new Map(
  LOCAL_SHOWCASE_MODELS.map((model) => [
    normalizeModelKey(model.modelPath),
    {
      name: model.name,
      legendTitle: model.legendTitle,
      poster: encodePath(model.posterPath),
      background: model.background,
    },
  ]),
);

// Browsers/loaders need spaces and accented characters percent-encoded.
function encodePath(path) {
  return path ? encodeURI(path) : '';
}

function normalizeModelKey(value = '') {
  const raw = String(value || '')
    .split('?')[0]
    .split('#')[0]
    .split('/')
    .pop()
    .trim();
  if (!raw) return '';

  return decodeURIComponent(raw)
    .replace(/^\d+-/, '')
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getModelKeyFromAsset(asset = {}, modelUrl = '') {
  return normalizeModelKey(asset.storage_path || asset.file_url || asset.external_url || modelUrl);
}

function cleanModelName(value = '') {
  const base = normalizeModelKey(value);
  if (!base) return 'Modelo 3D';
  return base.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Shape every item the showcase renders so the component stays dumb.
function buildItem({ id, name, legendTitle, modelUrl, poster, background, modelKey }) {
  const url = modelUrl || '';
  return {
    id,
    name: name || 'Modelo 3D',
    legendTitle: legendTitle || '',
    modelUrl: url,
    poster: poster || '',
    background: background || SHOWCASE_GRADIENTS[0],
    modelKey: modelKey || normalizeModelKey(url || name),
    // Minimal scene object so the existing Model3DViewer can show a header.
    scene: { name: name || 'Modelo 3D', description: null, assets: { url } },
  };
}

function getLocalShowcaseModels() {
  return LOCAL_SHOWCASE_MODELS.map((model) =>
    buildItem({
      id: model.id,
      name: model.name,
      legendTitle: model.legendTitle,
      modelUrl: encodePath(model.modelPath),
      poster: encodePath(model.posterPath),
      background: model.background,
    }),
  );
}

function getStoredFileName(storagePath = '') {
  const segment = String(storagePath).split('/').pop() || '';
  const withoutTimestamp = segment.replace(/^\d+-/, '');
  return decodeURIComponent(withoutTimestamp).replace(/\.[^.]+$/, '') || 'Modelo 3D';
}

function uniqueByModel(items = []) {
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    const key = item.modelKey || normalizeModelKey(item.modelUrl || item.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

function resolveModelAssetUrl(client, asset) {
  if (asset.file_url) return asset.file_url;
  if (asset.external_url) return asset.external_url;
  if (asset.storage_path) {
    const bucket = asset.metadata?.bucket || STORAGE_BUCKETS.assets;
    const { data } = client.storage.from(bucket).getPublicUrl(asset.storage_path);
    return data?.publicUrl || '';
  }
  return '';
}

// Best-effort: only surface model_3d assets that belong to a PUBLISHED legend, so
// the public showcase never leaks private/unpublished content. Never throws; any
// failure (RLS, config, network) simply yields an empty result and triggers the
// local fallback upstream.
async function getDatabaseShowcaseModels(client) {
  const { data: legends, error: legendsError } = await client
    .from('legends')
    .select('id, title')
    .eq('status', 'published');

  if (legendsError) {
    if (import.meta.env.DEV) console.error('[modelShowcase] legends error', legendsError);
    return [];
  }

  const legendTitleById = new Map((legends ?? []).map((legend) => [String(legend.id), legend.title]));
  if (!legendTitleById.size) return [];

  const { data: assets, error: assetsError } = await client
    .from('assets')
    .select('id, asset_type, file_url, external_url, storage_path, file_size, metadata, created_at')
    .eq('asset_type', 'model_3d')
    .order('created_at', { ascending: false });

  if (assetsError) {
    if (import.meta.env.DEV) console.error('[modelShowcase] assets error', assetsError);
    return [];
  }

  const items = [];
  let paletteIndex = 0;
  for (const asset of assets ?? []) {
    const legendId = asset.metadata?.legend_id ? String(asset.metadata.legend_id) : '';
    if (!legendId || !legendTitleById.has(legendId)) continue;

    const modelUrl = resolveModelAssetUrl(client, asset);
    if (!modelUrl) continue;
    const modelKey = getModelKeyFromAsset(asset, modelUrl);
    const localMatch = LOCAL_MODEL_LOOKUP.get(modelKey);
    const rawName = asset.metadata?.display_name || asset.metadata?.original_name || getStoredFileName(asset.storage_path);

    items.push(
      buildItem({
        id: String(asset.id),
        name: localMatch?.name || cleanModelName(rawName),
        legendTitle: localMatch?.legendTitle || legendTitleById.get(legendId),
        modelUrl,
        poster: localMatch?.poster || '',
        background: localMatch?.background || SHOWCASE_GRADIENTS[paletteIndex % SHOWCASE_GRADIENTS.length],
        modelKey,
      }),
    );
    paletteIndex += 1;
  }

  return uniqueByModel(items);
}

/**
 * Resolve the models for the public 3D showcase.
 *
 * Strategy (frontend-only, no backend/DB changes):
 *   1. If Supabase is configured, try to read model_3d assets from published legends.
 *   2. Otherwise (or if none / blocked by RLS), fall back to the real shipped GLBs.
 *
 * @returns {Promise<{ data: object[], source: 'database' | 'local', error: Error | null }>}
 */
const DB_LOOKUP_TIMEOUT_MS = 3500;

// Resolve to [] if the lookup takes too long, so a slow/unreachable Supabase
// (paused project, no network) never leaves the showcase stuck on "loading".
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve([]), ms);
    }),
  ]);
}

export async function getShowcaseModels() {
  const localItems = getLocalShowcaseModels();
  if (!supabase) {
    return { data: localItems, source: 'local', error: getSupabaseConfigError() };
  }

  try {
    const dbItems = await withTimeout(getDatabaseShowcaseModels(supabase), DB_LOOKUP_TIMEOUT_MS);
    if (dbItems.length) {
      return { data: uniqueByModel([...dbItems, ...localItems]), source: 'database', error: null };
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('[modelShowcase] unexpected error', error);
  }

  return { data: localItems, source: 'local', error: null };
}

/**
 * Normalize AR scenes (e.g. from a legend's reader bundle) into showcase items so
 * the section can also be fed directly with existing scene data.
 */
export function mapScenesToShowcaseItems(scenes = []) {
  let paletteIndex = 0;
  return (scenes ?? [])
    .map((scene) => {
      const asset = scene?.assets || scene?.asset || scene?.model_asset || null;
      const modelUrl = asset?.url || asset?.public_url || asset?.file_url || asset?.external_url || '';
      const item = buildItem({
        id: String(scene?.id ?? `scene-${paletteIndex}`),
        name: scene?.name || asset?.metadata?.original_name || 'Modelo 3D',
        legendTitle: scene?.legendTitle || scene?.legend_title || '',
        modelUrl,
        poster: scene?.poster || '',
        background: SHOWCASE_GRADIENTS[paletteIndex % SHOWCASE_GRADIENTS.length],
      });
      paletteIndex += 1;
      return item;
    });
}
