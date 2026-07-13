// Construye la lista de modelos 3D de un libro a partir del reader-bundle del
// backend (público-seguro, esquiva RLS). Cada modelo del libro = una entrada.
// Se usa tanto en el lector como en la página de detalle de la leyenda.

export function buildBookModelsFromBundle(bundle) {
  const modelAssets = bundle?.modelAssets ?? [];
  const seen = new Set();
  const models = [];
  modelAssets.forEach((asset) => {
    const url = asset?.url || asset?.fileUrl || asset?.file_url || asset?.external_url || '';
    if (!url || seen.has(url)) return;
    seen.add(url);
    models.push({
      id: asset.id || url,
      name: asset?.metadata?.original_name || asset?.name || '',
      modelUrl: url,
    });
  });
  return models;
}
