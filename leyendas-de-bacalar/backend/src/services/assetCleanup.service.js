import { supabaseAdmin } from '../config/supabaseAdmin.js';

// Borrar una leyenda (o un hotspot) nunca borro sus assets ni sus archivos: la fila
// de `assets` y el objeto en Storage quedaban huerfanos para siempre, sin nada que
// los apuntara. Este servicio cierra esa fuga y es reutilizable por cualquier flujo
// de borrado.
//
// Regla de oro: las FK RESTRICT de `assets` son el arbitro. No mantenemos aqui una
// lista de quien referencia que (se desincronizaria en cuanto alguien agregue una
// tabla); intentamos el DELETE y si la base responde 23503 el asset sigue en uso y
// se queda intacto.
const FK_VIOLATION = '23503';

// El arbitro FK solo funciona con las RESTRICT. Estas referencias son ON DELETE SET NULL:
// no bloquean el DELETE, asi que un asset compartido entre una leyenda y (por ejemplo) la
// portada del perfil del creador se borraria y le dejaria el perfil sin imagen, en
// silencio. Sobreviven al borrado de una leyenda, asi que hay que comprobarlas a mano.
// (legend_pages.background_asset_id y document_render_pages.thumbnail_asset_id tambien son
// SET NULL, pero desaparecen junto con la leyenda, asi que no hace falta protegerlas.)
const SOFT_REFERENCES = [
  { table: 'creator_profiles', column: 'cover_asset_id' },
  { table: 'cover_templates', column: 'background_asset_id' },
  { table: 'cover_templates', column: 'preview_asset_id' },
];

const findSoftReferencedIds = async (ids) => {
  const referenced = new Set();

  for (const { table, column } of SOFT_REFERENCES) {
    const { data, error } = await supabaseAdmin.from(table).select(column).in(column, ids);
    if (error) throw new Error(`No pudimos comprobar ${table}.${column}: ${error.message}`);
    for (const row of data || []) {
      if (row[column]) referenced.add(String(row[column]));
    }
  }

  return referenced;
};

// Cada asset guarda su bucket en metadata.bucket al registrarse (ver storage.service.js).
// file_url no sirve: es null en los buckets privados.
const DEFAULT_BUCKET = 'legend-assets';
const bucketFor = (asset) => asset?.metadata?.bucket || DEFAULT_BUCKET;

const uniqueIds = (ids) => [...new Set((ids || []).filter(Boolean).map(String))];

const idsFrom = (rows, ...columns) =>
  (rows || []).flatMap((row) => columns.map((column) => row[column]));

/**
 * Reune todos los assets que cuelgan de una leyenda. Hay que llamarlo ANTES de
 * borrarla: despues del DELETE las relaciones ya no existen y las rutas de Storage
 * se pierden para siempre.
 */
export const collectLegendAssetIds = async (legendId) => {
  if (!legendId) return [];

  const pick = async (table, filterColumn, value, ...columns) => {
    if (!value?.length && Array.isArray(value)) return [];
    const query = supabaseAdmin.from(table).select(columns.join(', '));
    const { data, error } = Array.isArray(value)
      ? await query.in(filterColumn, value)
      : await query.eq(filterColumn, value);
    if (error) throw new Error(`No pudimos leer ${table}: ${error.message}`);
    return data || [];
  };

  // Directos a la leyenda.
  const media = await pick('legend_media', 'legend_id', legendId, 'asset_id');
  const documents = await pick('legend_source_documents', 'legend_id', legendId, 'asset_id');
  const renders = await pick('document_render_pages', 'legend_id', legendId, 'image_asset_id', 'thumbnail_asset_id');
  const hotspots = await pick('interactive_hotspots', 'legend_id', legendId, 'marker_asset_id');

  // Indirectos: version -> pagina -> escena -> marcador.
  const versions = await pick('legend_versions', 'legend_id', legendId, 'id');
  const versionIds = uniqueIds(idsFrom(versions, 'id'));
  const pages = versionIds.length
    ? await pick('legend_pages', 'version_id', versionIds, 'id', 'background_asset_id')
    : [];
  const pageIds = uniqueIds(idsFrom(pages, 'id'));
  const scenes = pageIds.length
    ? await pick('ar_scenes', 'page_id', pageIds, 'id', 'model_asset_id')
    : [];
  const sceneIds = uniqueIds(idsFrom(scenes, 'id'));
  const markers = sceneIds.length
    ? await pick('ar_markers', 'ar_scene_id', sceneIds, 'marker_asset_id')
    : [];

  return uniqueIds([
    ...idsFrom(media, 'asset_id'),
    ...idsFrom(documents, 'asset_id'),
    ...idsFrom(renders, 'image_asset_id', 'thumbnail_asset_id'),
    ...idsFrom(hotspots, 'marker_asset_id'),
    ...idsFrom(pages, 'background_asset_id'),
    ...idsFrom(scenes, 'model_asset_id'),
    ...idsFrom(markers, 'marker_asset_id'),
  ]);
};

/**
 * Borra los assets indicados que ya no referencie nadie, junto con su archivo en
 * Storage. Los que sigan en uso se conservan sin ruido.
 *
 * Nunca lanza: la limpieza es una operacion secundaria y no debe tumbar el borrado
 * principal, que para el usuario ya ocurrio (mismo criterio que page_count en §15).
 */
export const purgeOrphanAssets = async (assetIds) => {
  const ids = uniqueIds(assetIds);
  const report = { candidatos: ids.length, assetsBorrados: 0, assetsEnUso: 0, archivosBorrados: 0 };
  if (!ids.length) return report;

  try {
    const { data: assets, error } = await supabaseAdmin
      .from('assets')
      .select('id, storage_path, metadata')
      .in('id', ids);
    if (error) throw new Error(error.message);

    const protectedIds = await findSoftReferencedIds(ids);

    const removed = [];
    for (const asset of assets || []) {
      if (protectedIds.has(String(asset.id))) {
        report.assetsEnUso += 1;
        continue;
      }
      // Uno por uno: un borrado en lote fallaria entero si un solo asset sigue en uso.
      const { error: deleteError } = await supabaseAdmin.from('assets').delete().eq('id', asset.id);
      if (!deleteError) {
        removed.push(asset);
      } else if (deleteError.code === FK_VIOLATION) {
        report.assetsEnUso += 1;
      } else {
        throw new Error(deleteError.message);
      }
    }
    report.assetsBorrados = removed.length;

    // La fila primero y el archivo despues, nunca al reves: si Storage falla queda un
    // archivo huerfano (basura invisible), mientras que borrar el archivo antes dejaria
    // un asset vivo apuntando a la nada, que el lector si mostraria roto.
    const byBucket = new Map();
    for (const asset of removed) {
      if (!asset.storage_path) continue;
      const bucket = bucketFor(asset);
      if (!byBucket.has(bucket)) byBucket.set(bucket, []);
      byBucket.get(bucket).push(asset.storage_path);
    }

    for (const [bucket, paths] of byBucket) {
      for (let i = 0; i < paths.length; i += 100) {
        const batch = paths.slice(i, i + 100);
        const { data, error: storageError } = await supabaseAdmin.storage.from(bucket).remove(batch);
        if (storageError) {
          console.error('purgeOrphanAssets storage remove failed', { bucket, count: batch.length, reason: storageError.message });
          continue;
        }
        report.archivosBorrados += data?.length ?? 0;
      }
    }
  } catch (error) {
    console.error('purgeOrphanAssets failed', { reason: error.message });
  }

  return report;
};
