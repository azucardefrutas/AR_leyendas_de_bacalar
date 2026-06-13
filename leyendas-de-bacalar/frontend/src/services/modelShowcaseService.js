import { getSupabaseConfigError, supabase } from '../lib/supabaseClient.js';
import { STORAGE_BUCKETS } from './assetService.js';

// Muted Bacalar palette used as card backgrounds / poster placeholders.
// No neon, no heavy black: petrol, dark turquoise, lagoon, mangrove, navy, sand.
const SHOWCASE_PALETTE = [
  '#0F4C5C', // petrol
  '#0B3D4A', // lagoon
  '#245A4F', // mangrove
  '#152659', // navy
  '#13414F', // dark turquoise
  '#5E5A48', // muted sand
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
    posterPath: '/assets/portada el sismite.png',
    backgroundColor: '#245A4F',
  },
  {
    id: 'local-bruja',
    name: 'La Bruja',
    legendTitle: 'La Bruja',
    modelPath: '/landing-intro/models/La bruja.glb',
    posterPath: '/assets/portada la bruja.png',
    backgroundColor: '#152659',
  },
  {
    id: 'local-serpiente',
    name: 'La Serpiente del Mar',
    legendTitle: 'La serpiente del mar',
    modelPath: '/landing-intro/models/dragon del mar.glb',
    posterPath: '/assets/portada_ la serpiente del mar.png',
    backgroundColor: '#0B3D4A',
  },
  {
    id: 'local-duendes',
    name: 'Los Duendes del Monte',
    legendTitle: 'Los duendes del monte',
    modelPath: '/landing-intro/models/duendes del bosque.glb',
    posterPath: '/assets/portada los duentes del monte.png',
    backgroundColor: '#2C5547',
  },
  {
    id: 'local-animales',
    name: 'Extraños Animales',
    legendTitle: 'Extraños animales',
    modelPath: '/landing-intro/models/extrañas criaturas.glb',
    posterPath: '/assets/portada_extraños animales.png',
    backgroundColor: '#0F4C5C',
  },
  {
    id: 'local-libro',
    name: 'El Libro de las Leyendas',
    legendTitle: 'Leyendas de Bacalar',
    modelPath: '/assets/models/Libro_bacalar.glb',
    posterPath: '/assets/Libro abierto.png',
    backgroundColor: '#13414F',
  },
];

// Browsers/loaders need spaces and accented characters percent-encoded.
function encodePath(path) {
  return path ? encodeURI(path) : '';
}

// Shape every item the showcase renders so the component stays dumb.
function buildItem({ id, name, legendTitle, modelUrl, poster, backgroundColor }) {
  const url = modelUrl || '';
  return {
    id,
    name: name || 'Modelo 3D',
    legendTitle: legendTitle || '',
    modelUrl: url,
    poster: poster || '',
    backgroundColor: backgroundColor || SHOWCASE_PALETTE[0],
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
      backgroundColor: model.backgroundColor,
    }),
  );
}

function getStoredFileName(storagePath = '') {
  const segment = String(storagePath).split('/').pop() || '';
  const withoutTimestamp = segment.replace(/^\d+-/, '');
  return decodeURIComponent(withoutTimestamp).replace(/\.[^.]+$/, '') || 'Modelo 3D';
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

    items.push(
      buildItem({
        id: String(asset.id),
        name: asset.metadata?.original_name || getStoredFileName(asset.storage_path),
        legendTitle: legendTitleById.get(legendId),
        modelUrl,
        poster: '',
        backgroundColor: SHOWCASE_PALETTE[paletteIndex % SHOWCASE_PALETTE.length],
      }),
    );
    paletteIndex += 1;
  }

  return items;
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
export async function getShowcaseModels() {
  if (!supabase) {
    return { data: getLocalShowcaseModels(), source: 'local', error: getSupabaseConfigError() };
  }

  try {
    const dbItems = await getDatabaseShowcaseModels(supabase);
    if (dbItems.length) {
      return { data: dbItems, source: 'database', error: null };
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('[modelShowcase] unexpected error', error);
  }

  return { data: getLocalShowcaseModels(), source: 'local', error: null };
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
        backgroundColor: SHOWCASE_PALETTE[paletteIndex % SHOWCASE_PALETTE.length],
      });
      paletteIndex += 1;
      return item;
    });
}
