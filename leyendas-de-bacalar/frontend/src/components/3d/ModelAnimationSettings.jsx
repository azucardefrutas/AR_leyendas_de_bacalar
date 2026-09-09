import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import AppIcon from '../ui/AppIcon.jsx';
import { normalizeAnimationConfig } from './modelAnimationConfig.js';

const Model3DViewer = lazy(() => import('./Model3DViewer.jsx'));

export default function ModelAnimationSettings({ modelUrl, value, onChange, context = 'story' }) {
  const fallbackTrigger = context === 'marker' ? 'marker-found' : 'load';
  const config = useMemo(() => {
    const normalized = normalizeAnimationConfig(value, fallbackTrigger);
    return context === 'marker'
      ? { ...normalized, speed: 1, loop: normalized.loop === 'once' ? 'once' : 'repeat', trigger: 'marker-found' }
      : normalized;
  }, [context, fallbackTrigger, value]);
  const [inspection, setInspection] = useState(modelUrl ? 'loading' : 'idle');
  const [previewPlaying, setPreviewPlaying] = useState(true);
  // Borrador local de los nombres que se están escribiendo, para que borrar el texto NO lo
  // reponga solo (el config solo guarda los labels ya confirmados).
  const [labelDrafts, setLabelDrafts] = useState({});

  useEffect(() => {
    setInspection(modelUrl ? 'loading' : 'idle');
    setLabelDrafts({});
  }, [modelUrl]);

  const handleDetected = useCallback((detectedClips) => {
    const clips = [...new Set((detectedClips || []).filter(Boolean))];
    setInspection(clips.length ? 'animated' : 'static');
    const next = normalizeAnimationConfig({
      ...config,
      clips,
      inspected: true,
      autoplay: config.inspected ? config.autoplay : clips.length > 0,
      defaultClip: clips.includes(value?.defaultClip) ? value.defaultClip : clips[0],
      trigger: config.trigger,
    }, fallbackTrigger);
    if (JSON.stringify(next) !== JSON.stringify(config)) onChange(next);
  }, [config, fallbackTrigger, onChange, value]);

  // Renombra un emote: guarda un label id_real -> "Nombre bonito". Se escribe libremente
  // (incluido vacío) apoyándose en `labelDrafts`, así borrar el texto NO lo repone solo. En
  // el config solo se guardan los labels que difieren del nombre real (vacío = usar el real).
  const onLabelChange = useCallback((clip, text) => {
    setLabelDrafts((drafts) => ({ ...drafts, [clip]: text }));
    const labels = { ...config.labels };
    const trimmed = text.trim();
    if (!trimmed || trimmed === clip) delete labels[clip];
    else labels[clip] = text.slice(0, 60);
    onChange({ ...config, labels });
  }, [config, onChange]);

  // El input muestra lo que el usuario está escribiendo (borrador) o el label guardado; si
  // no hay ninguno, queda vacío (el nombre real se ve como caption arriba y de placeholder).
  const labelValue = (clip) => (
    Object.prototype.hasOwnProperty.call(labelDrafts, clip)
      ? labelDrafts[clip]
      : (config.labels[clip] ?? '')
  );

  if (!modelUrl) return null;

  return (
    <section className="model-animation-settings" aria-label="Animaciones del modelo">
      <div className="model-animation-preview">
        <Suspense fallback={<div className="model-animation-loading">Analizando modelo...</div>}>
          <Model3DViewer
            modelUrl={modelUrl}
            animationConfig={{ ...config, autoplay: previewPlaying, trigger: 'load', loop: 'repeat' }}
            onAnimationsDetected={handleDetected}
            onModelError={() => setInspection('error')}
            embedded
            compactControls
            hideHeading
          />
        </Suspense>
        {inspection === 'animated' && (
          <button type="button" className="model-animation-play" title={previewPlaying ? 'Pausar vista previa' : 'Reproducir vista previa'}
            aria-label={previewPlaying ? 'Pausar vista previa' : 'Reproducir vista previa'} onClick={() => setPreviewPlaying((playing) => !playing)}>
            <AppIcon name={previewPlaying ? 'pause' : 'play_arrow'} size={20} />
          </button>
        )}
      </div>

      <div className="model-animation-fields">
        <div className={`model-animation-status is-${inspection}`}>
          <AppIcon name={inspection === 'animated' ? 'animation' : inspection === 'error' ? 'error' : 'deployed_code'} size={19} />
          <span>
            {inspection === 'loading' && 'Analizando animaciones...'}
            {inspection === 'static' && 'Modelo estatico, sin clips internos'}
            {inspection === 'animated' && `Modelo animado · ${config.clips.length} ${config.clips.length === 1 ? 'emote' : 'emotes'}`}
            {inspection === 'error' && 'No se pudo abrir el archivo para revisar sus animaciones'}
          </span>
        </div>

        {inspection === 'animated' && (
          <>
            {context === 'marker' ? (
              <div className="model-animation-renames" aria-label="Nombres de los emotes">
                <span className="model-animation-renames-hint">Renombra cada animación como saldrá en la ruleta de la app:</span>
                {config.clips.map((clip) => (
                  <label key={clip} className="model-animation-rename">
                    <span className="model-animation-rename-id" title={clip}>{clip}</span>
                    <input
                      type="text"
                      className="input"
                      value={labelValue(clip)}
                      maxLength={60}
                      placeholder="Nombre para la ruleta (opcional)"
                      aria-label={`Nombre del emote ${clip}`}
                      onChange={(event) => onLabelChange(clip, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className="model-animation-clips" aria-label="Emotes detectados">
                {config.clips.map((clip) => <span key={clip}>{clip}</span>)}
              </div>
            )}
            <label className="field">
              <span>Animacion inicial</span>
              <select value={config.defaultClip} onChange={(event) => onChange({ ...config, defaultClip: event.target.value })}>
                {config.clips.map((clip) => <option key={clip} value={clip}>{config.labels[clip] || clip}</option>)}
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
                  {context === 'story' && <option value="pingpong">Ida y vuelta</option>}
                </select>
              </label>
              {context === 'story' && <label className="field">
                <span>Velocidad</span>
                <select value={config.speed} onChange={(event) => onChange({ ...config, speed: Number(event.target.value) })}>
                  <option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1">1x</option>
                  <option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="2">2x</option>
                </select>
              </label>}
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
