export function getModelAsset(scene = {}) {
  const value = scene?.assets || scene?.asset || scene?.model || scene?.modelAsset || scene?.model_asset;
  return Array.isArray(value) ? value[0] || null : value || null;
}

export function getModelUrl(scene = {}) {
  const asset = getModelAsset(scene);
  return scene?.modelUrl || asset?.url || asset?.fileUrl || asset?.public_url || asset?.file_url || asset?.external_url || '';
}
