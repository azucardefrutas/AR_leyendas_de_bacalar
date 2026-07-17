// `uploadProjectAsset` (assetService) tiene DOS rutas y cada una devuelve una forma
// distinta:
//   - backend (uploadAssetWithBackend): { data: { asset, relation } }
//   - directa Supabase (createAssetRecord): { data: <el asset mismo> }
// Cuál corre depende de shouldUseBackendUpload(assetType, forceBackend), así que leer
// `data.asset.id` a ciegas revienta con un TypeError críptico. Esto normaliza ambas.
export function pickUploadedAsset(result) {
  const data = result?.data;
  if (!data) return null;
  const asset = data.asset ?? data;
  return asset?.id ? asset : null;
}
