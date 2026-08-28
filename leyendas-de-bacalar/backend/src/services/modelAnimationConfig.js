const ANIMATION_LOOPS = new Set(['repeat', 'once', 'pingpong']);
const ANIMATION_TRIGGERS = new Set(['load', 'tap', 'marker-found']);
const cleanClipName = (value) => typeof value === 'string' && value.trim() ? value : '';

export const normalizeModelAnimationConfig = (value = {}) => {
  if (!value || typeof value !== 'object') value = {};
  const clips = [...new Set((Array.isArray(value.clips) ? value.clips : [])
    .map(cleanClipName)
    .filter(Boolean))].slice(0, 32);
  const requestedDefault = cleanClipName(value.defaultClip || value.clip);
  return {
    clips,
    defaultClip: clips.includes(requestedDefault) ? requestedDefault : (clips[0] || ''),
    inspected: value.inspected === true || clips.length > 0,
    autoplay: clips.length > 0 && value.autoplay !== false,
    loop: ANIMATION_LOOPS.has(value.loop) ? value.loop : 'repeat',
    speed: Math.min(2, Math.max(0.25, Number(value.speed) || 1)),
    trigger: ANIMATION_TRIGGERS.has(value.trigger) ? value.trigger : 'load',
  };
};
