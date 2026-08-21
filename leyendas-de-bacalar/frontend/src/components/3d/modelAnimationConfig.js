const LOOP_MODES = new Set(['repeat', 'once', 'pingpong']);
const TRIGGERS = new Set(['load', 'tap', 'marker-found']);

const cleanClipName = (value) => String(value || '').trim().slice(0, 160);

export function normalizeAnimationConfig(value = {}, fallbackTrigger = 'load') {
  const clips = [...new Set((Array.isArray(value.clips) ? value.clips : [])
    .map(cleanClipName)
    .filter(Boolean))].slice(0, 32);
  const requestedDefault = cleanClipName(value.defaultClip || value.clip);
  const defaultClip = clips.includes(requestedDefault) ? requestedDefault : (clips[0] || '');
  const speed = Math.min(2, Math.max(0.25, Number(value.speed) || 1));

  return {
    clips,
    defaultClip,
    autoplay: clips.length > 0 && value.autoplay !== false,
    loop: LOOP_MODES.has(value.loop) ? value.loop : 'repeat',
    speed,
    trigger: TRIGGERS.has(value.trigger) ? value.trigger : fallbackTrigger,
  };
}
export function getSceneAnimationConfig(scene = {}) {
  return normalizeAnimationConfig(
    scene.animationConfig || scene.interaction_config?.animation || scene.interactionConfig?.animation || {},
  );
}
