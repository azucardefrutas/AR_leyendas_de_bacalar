import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import AppIcon from '../ui/AppIcon.jsx';
import { normalizeAnimationConfig } from './modelAnimationConfig.js';

const Model3DViewer = lazy(() => import('./Model3DViewer.jsx'));

export default function ModelAnimationSettings({ modelUrl, value, onChange, context = 'story' }) {
  const fallbackTrigger = context === 'marker' ? 'marker-found' : 'load';
  const config = useMemo(
    () => normalizeAnimationConfig(value, fallbackTrigger),
    [fallbackTrigger, value],
  );
  const [inspection, setInspection] = useState(modelUrl ? 'loading' : 'idle');

  useEffect(() => setInspection(modelUrl ? 'loading' : 'idle'), [modelUrl]);

  const handleDetected = useCallback((detectedClips) => {
    const clips = [...new Set((detectedClips || []).filter(Boolean))];
    setInspection(clips.length ? 'animated' : 'static');
    const next = normalizeAnimationConfig({
      ...value,
      clips,
      defaultClip: clips.includes(value?.defaultClip) ? value.defaultClip : clips[0],
      trigger: value?.trigger || fallbackTrigger,
    }, fallbackTrigger);
    if (JSON.stringify(next) !== JSON.stringify(config)) onChange(next);
  }, [config, fallbackTrigger, onChange, value]);

  if (!modelUrl) return null;

  return (
    <section className="model-animation-settings" aria-label="Animaciones del modelo">
      <div className="model-animation-preview">
        <Suspense fallback={<div className="model-animation-loading">Analizando modelo...</div>}>
          <Model3DViewer
            modelUrl={modelUrl}
            animationConfig={config}
            onAnimationsDetected={handleDetected}
            embedded
            compactControls
            hideHeading
          />
        </Suspense>
      </div>

      <div className="model-animation-fields">
        <div className={`model-animation-status is-${inspection}`}>
          <AppIcon name={inspection === 'animated' ? 'animation' : 'deployed_code'} size={19} />
          <span>
            {inspection === 'loading' && 'Analizando animaciones...'}
            {inspection === 'static' && 'Modelo estatico, sin clips internos'}
            {inspection === 'animated' && `Modelo animado · ${config.clips.length} ${config.clips.length === 1 ? 'emote' : 'emotes'}`}
          </span>
        </div>

        {inspection === 'animated' && (
          <>
            <div className="model-animation-clips" aria-label="Emotes detectados">
              {config.clips.map((clip) => <span key={clip}>{clip}</span>)}
            </div>
            <label className="field">
              <span>Animacion inicial</span>
              <select value={config.defaultClip} onChange={(event) => onChange({ ...config, defaultClip: event.target.value })}>
                {config.clips.map((clip) => <option key={clip} value={clip}>{clip}</option>)}
              </select>
            </label>
            <div className="model-animation-row">
              <label className="model-animation-toggle">
                <input type="checkbox" checked={config.autoplay} onChange={(event) => onChange({ ...config, autoplay: event.target.checked })} />
                <span>Reproducir automaticamente</span>
              </label>
              <label className="field">
                <span>Ciclo</span>
                <select value={config.loop} onChange={(event) => onChange({ ...config, loop: event.target.value })}>
                  <option value="repeat">Continuo</option>
                  <option value="once">Una vez</option>
                  <option value="pingpong">Ida y vuelta</option>
                </select>
              </label>
              <label className="field">
                <span>Velocidad</span>
                <select value={config.speed} onChange={(event) => onChange({ ...config, speed: Number(event.target.value) })}>
                  <option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1">1x</option>
                  <option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option>
                </select>
              </label>
            </div>
            {context === 'story' && (
              <label className="field">
                <span>Activacion</span>
                <select value={config.trigger} onChange={(event) => onChange({ ...config, trigger: event.target.value })}>
                  <option value="load">Al mostrar la pagina</option>
                  <option value="tap">Al tocar el modelo</option>
                </select>
              </label>
            )}
          </>
        )}
      </div>
    </section>
  );
}
