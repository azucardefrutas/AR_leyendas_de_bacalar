// Nombre visible (renombrable) de cada emote: `labels` mapea id_real -> "Nombre bonito".
// La ruleta muestra el label; al tocarlo se reproduce el clip real. Solo se guardan los
// labels que difieren del nombre real (el resto cae al nombre real).
function buildLabels(raw, clips) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const clip of clips) {
    const label = typeof src[clip] === 'string' ? src[clip].trim().slice(0, 60) : '';
    if (label && label !== clip) out[clip] = label;
  }
  return out;
}

export function normalizeAnimationConfig(value = {}) {
  if (!value || typeof value !== 'object') value = {};
  const clips = [...new Set((Array.isArray(value.clips) ? value.clips : [])
    .filter((clip) => typeof clip === 'string' && clip.trim()))].slice(0, 32);
  return {
    clips,
    labels: buildLabels(value.labels, clips),
    defaultClip: clips.includes(value.defaultClip) ? value.defaultClip : (clips[0] || ''),
    inspected: value.inspected === true || clips.length > 0,
    autoplay: clips.length > 0 && value.autoplay !== false,
    loop: value.loop === 'once' ? 'once' : 'repeat',
  };
}

export function mapPhysicalArScenes(rows = [], markers = []) {
  const codeByPair = new Map(markers.map((marker) => [`${marker.ar_scene_id}:${marker.marker_asset_id}`, marker.marker_code]));
  return rows.filter((row) => row.target_type === 'physical_edition' && row.status === 'published'
    && row.legend?.status === 'published' && row.scene?.model?.file_url && row.marker?.file_url)
    .map((row) => ({
      id: row.id,
      markerCode: codeByPair.get(`${row.ar_scene_id}:${row.marker_asset_id}`) || null,
      legend: { id: row.legend.id, title: row.legend.title, slug: row.legend.slug },
      name: row.label || row.scene.name || row.legend.title,
      markerImageUrl: row.marker.file_url,
      modelUrl: row.scene.model.file_url,
      scale: row.scene.scale || null,
      position: row.scene.position || null,
      rotation: row.scene.rotation || null,
      animationConfig: normalizeAnimationConfig(row.scene.interaction_config?.animation || row.scene.model.metadata?.animation),
    }));
}
