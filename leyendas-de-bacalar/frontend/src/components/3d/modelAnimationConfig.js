const LOOP_MODES = new Set(['repeat', 'once', 'pingpong']);
const TRIGGERS = new Set(['load', 'tap', 'marker-found']);

// Clip names are engine identifiers, not labels: preserve their exact spelling.
const cleanClipName = (value) => typeof value === 'string' && value.trim() ? value : '';

// Nombre visible (renombrable) del emote. El clip conserva su id real; `labels` solo mapea
// id_real -> "Nombre bonito" para la ruleta de la app. Se guardan solo los labels que
// difieren del nombre real.
const cleanLabel = (value) => (typeof value === 'string' ? value.trim().slice(0, 60) : '');
export function buildAnimationLabels(raw, clips) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const clip of clips) {
    const label = cleanLabel(src[clip]);
    if (label && label !== clip) out[clip] = label;
  }
  return out;
}

export function normalizeAnimationConfig(value = {}, fallbackTrigger = 'load') {
  if (!value || typeof value !== 'object') value = {};
  const clips = [...new Set((Array.isArray(value.clips) ? value.clips : [])
    .map(cleanClipName)
    .filter(Boolean))].slice(0, 32);
  const requestedDefault = cleanClipName(value.defaultClip || value.clip);
  const defaultClip = clips.includes(requestedDefault) ? requestedDefault : (clips[0] || '');
  const speed = Math.min(2, Math.max(0.25, Number(value.speed) || 1));
  const inspected = value.inspected === true || clips.length > 0;

  return {
    clips,
    labels: buildAnimationLabels(value.labels, clips),
    defaultClip,
    inspected,
    autoplay: clips.length > 0 && value.autoplay !== false,
    loop: LOOP_MODES.has(value.loop) ? value.loop : 'repeat',
    speed,
    trigger: TRIGGERS.has(value.trigger) ? value.trigger : fallbackTrigger,
  };
}
export function getSceneAnimationConfig(scene = {}) {
  return normalizeAnimationConfig(
    scene?.animationConfig || scene?.interaction_config?.animation || scene?.interactionConfig?.animation || getModelAsset(scene)?.metadata?.animation || {},
  );
}
import { getModelAsset } from './modelScene.js';
