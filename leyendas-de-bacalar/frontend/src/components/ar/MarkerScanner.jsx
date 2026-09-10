import React, { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../ui/Button.jsx';
import { loadExternalScript } from '../../lib/loadExternalScript.js';

// Escaner MULTI-marcador para la web (invitados incluidos). Misma idea que la app movil
// (marcador -> modelo -> ruleta de emotes) pero en el navegador con MindAR sobre A-Frame.
// Compila todas las imagenes de marcador en un solo .mind al vuelo, ancla cada modelo a su
// target y reproduce animaciones (aframe-extras). El retículo tipo QR ayuda a enfocar.
const AFRAME_SRC = 'https://aframe.io/releases/1.5.0/aframe.min.js';
const MINDAR_AFRAME_SRC = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js';
const MINDAR_COMPILER_SRC = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js';
// aframe-extras aporta `animation-mixer`, que reproduce las animaciones del GLB.
const AFRAME_EXTRAS_SRC = 'https://cdn.jsdelivr.net/npm/aframe-extras@7.5.4/dist/aframe-extras.min.js';

function loadCrossOriginImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen de un marcador (CORS o URL).'));
    img.src = url;
  });
}

// Cache en memoria del .mind ya compilado (dura la sesion): detener/reiniciar no recompila.
const mindBufferCache = new Map();

// Cache PERSISTENTE del .mind en IndexedDB: sobrevive recargas y visitas futuras, asi la
// 2a vez el reconocimiento es INSTANTANEO (sin recompilar). La clave es la firma de las URLs
// de marcador ordenadas; si cambian los marcadores, la clave cambia y se recompila solo.
const IDB_NAME = 'leyendas-ar';
const IDB_STORE = 'mind-cache';

function idbOpen() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('sin-indexeddb')); return; }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('idb-error'));
  });
}

async function idbGet(key) {
  try {
    const db = await idbOpen();
    return await new Promise((resolve) => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function idbSet(key, value) {
  try {
    const db = await idbOpen();
    await new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* cache best-effort: si falla, solo recompila la proxima vez */ }
}

// Compila TODAS las imagenes de marcador a un unico .mind (blob URL). El indice del target
// coincide con el orden del arreglo. Orden de busqueda: memoria -> IndexedDB -> compilar.
async function compileMarkersToMind(imageUrls, onProgress) {
  const key = imageUrls.slice().sort().join('|');

  const inMemory = mindBufferCache.get(key);
  if (inMemory) {
    onProgress?.(1);
    return URL.createObjectURL(new Blob([inMemory]));
  }

  const cached = await idbGet(key);
  if (cached) {
    mindBufferCache.set(key, cached);
    onProgress?.(1);
    return URL.createObjectURL(new Blob([cached]));
  }

  const mod = await import(/* @vite-ignore */ MINDAR_COMPILER_SRC);
  const Compiler = mod?.Compiler || (typeof window !== 'undefined' ? window.MINDAR?.IMAGE?.Compiler : null);
  if (!Compiler) throw new Error('El compilador de MindAR no esta disponible.');
  const images = await Promise.all(imageUrls.map(loadCrossOriginImage));
  const compiler = new Compiler();
  await compiler.compileImageTargets(images, (p) => onProgress?.(p));
  const buffer = await compiler.exportData();
  mindBufferCache.set(key, buffer);
  idbSet(key, buffer); // best-effort, no bloquea el arranque
  return URL.createObjectURL(new Blob([buffer]));
}

// La escala guardada es para Viro (metros). En A-Frame/MindAR conviene un tamano relativo
// al marcador; escalamos con un valor prudente y estable.
function webScale(scale) {
  if (Array.isArray(scale) && Number(scale[0]) > 0) return Math.min(1.5, Math.max(0.1, Number(scale[0]) * 6));
  const n = Number(scale);
  if (n > 0 && n < 3) return Math.min(1.5, Math.max(0.1, n * 6));
  return 0.5;
}

function MarkerScanner({ scenes = [] }) {
  // Contenedor IMPERATIVO exclusivo para A-Frame/MindAR: React nunca le pone hijos, para
  // que no choque con el DOM que inyecta el motor (evita "removeChild is not a child").
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const compiledUrlRef = useRef(null);
  const modelRefs = useRef([]);
  const [status, setStatus] = useState('idle'); // idle | compiling | loading | scanning | error
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(null); // { index, name, clips, labels }
  const [activeClip, setActiveClip] = useState('');

  const usable = useMemo(
    () => scenes.filter((s) => s.markerImageUrl && s.modelUrl),
    [scenes],
  );

  function teardown() {
    const sceneEl = sceneRef.current;
    if (sceneEl) {
      try { sceneEl.systems?.['mindar-image']?.stop?.(); } catch { /* MindAR pudo no iniciar */ }
      // Solo removemos el nodo que NOSOTROS creamos, envuelto en try/catch (A-Frame pudo
      // haberlo movido). Nunca tocamos nodos de React.
      try { sceneEl.parentNode?.removeChild(sceneEl); } catch { /* ya removido */ }
      sceneRef.current = null;
    }
    modelRefs.current = [];
    if (compiledUrlRef.current) {
      URL.revokeObjectURL(compiledUrlRef.current);
      compiledUrlRef.current = null;
    }
  }

  useEffect(() => () => teardown(), []);

  // Reproduce un clip concreto (emote) en el modelo activo, en bucle.
  function playClip(clip) {
    const el = modelRefs.current[active?.index];
    if (!el) return;
    el.setAttribute('animation-mixer', `clip: ${clip}; loop: repeat; crossFadeDuration: 0.2`);
    setActiveClip(clip);
  }

  async function start() {
    if (status === 'compiling' || status === 'loading' || status === 'scanning') return;
    setError('');
    setActive(null);
    setActiveClip('');
    setProgress(0);
    if (!usable.length) {
      setStatus('error');
      setError('No hay marcadores publicados para escanear todavia.');
      return;
    }
    try {
      // 1) Compilar todos los marcadores en un .mind.
      setStatus('compiling');
      const targetSrc = await compileMarkersToMind(
        usable.map((s) => s.markerImageUrl),
        (p) => setProgress(Math.round((p || 0) * 100)),
      );
      compiledUrlRef.current = targetSrc;

      // 2) Cargar el motor (A-Frame + MindAR + aframe-extras).
      setStatus('loading');
      await loadExternalScript(AFRAME_SRC, { globalCheck: () => (typeof window !== 'undefined' ? window.AFRAME : null) });
      await loadExternalScript(MINDAR_AFRAME_SRC, { globalCheck: () => window.AFRAME?.components?.['mindar-image'] });
      await loadExternalScript(AFRAME_EXTRAS_SRC, { globalCheck: () => window.AFRAME?.components?.['animation-mixer'] });
      if (!mountRef.current) return;

      // 3) Montar la escena AR. Renderer afinado para WebGL fluido (sin tirones).
      const sceneEl = document.createElement('a-scene');
      sceneEl.setAttribute('embedded', '');
      sceneEl.setAttribute('color-space', 'sRGB');
      // alpha: true -> el canvas 3D es TRANSPARENTE y se ve el video de la camara detras
      // (sin esto el fondo negro tapa la camara). antialias/mediump = fluido.
      sceneEl.setAttribute('renderer', 'colorManagement: true; alpha: true; antialias: true; precision: mediump');
      sceneEl.setAttribute('vr-mode-ui', 'enabled: false');
      sceneEl.setAttribute('device-orientation-permission-ui', 'enabled: false');
      // Tracker afinado para precision y estabilidad "tipo Google Lens":
      //  - maxTrack: 1  -> enfoca UN marcador a la vez (mas FPS, engancha mas rapido y estable).
      //  - filterMinCF: 0.0001 (10x menor que el default 0.001) -> mata el temblor cuando el
      //    marcador esta quieto; filterBeta: 1000 mantiene la respuesta rapida al mover el telefono
      //    (filtro One-Euro: suave en reposo, agil en movimiento).
      //  - warmupTolerance: 3 -> engancha rapido sin falsos positivos.
      //  - missTolerance: 8 -> no se cae ni parpadea ante desenfoques o tapones breves.
      sceneEl.setAttribute(
        'mindar-image',
        `imageTargetSrc: ${targetSrc}; autoStart: true; maxTrack: 1; filterMinCF: 0.0001; filterBeta: 1000; warmupTolerance: 3; missTolerance: 8; uiScanning: no; uiLoading: no; uiError: no;`,
      );
      sceneEl.style.width = '100%';
      sceneEl.style.height = '100%';

      // Iluminacion envolvente (que no se vean oscuros).
      const amb = document.createElement('a-entity');
      amb.setAttribute('light', 'type: ambient; intensity: 1.3; color: #ffffff');
      sceneEl.appendChild(amb);
      const dir = document.createElement('a-entity');
      dir.setAttribute('light', 'type: directional; intensity: 0.9; color: #ffffff');
      dir.setAttribute('position', '1 2 1');
      sceneEl.appendChild(dir);

      const camera = document.createElement('a-camera');
      camera.setAttribute('position', '0 0 0');
      camera.setAttribute('look-controls', 'enabled: false');
      sceneEl.appendChild(camera);

      modelRefs.current = [];
      usable.forEach((s, index) => {
        const target = document.createElement('a-entity');
        target.setAttribute('mindar-image-target', `targetIndex: ${index}`);

        const model = document.createElement('a-gltf-model');
        model.setAttribute('src', s.modelUrl);
        model.setAttribute('position', '0 0 0');
        model.setAttribute('rotation', '0 0 0');
        const sc = webScale(s.scale);
        model.setAttribute('scale', `${sc} ${sc} ${sc}`);
        const clip = s.animationConfig?.defaultClip || s.animationConfig?.clips?.[0];
        model.setAttribute('animation-mixer', clip ? `clip: ${clip}; loop: repeat` : 'loop: repeat');
        target.appendChild(model);
        modelRefs.current[index] = model;

        target.addEventListener('targetFound', () => {
          setActive({
            index,
            name: s.name || 'Modelo',
            clips: s.animationConfig?.clips || [],
            labels: s.animationConfig?.labels || {},
          });
          setActiveClip(clip || '');
        });
        target.addEventListener('targetLost', () => {
          setActive((current) => (current?.index === index ? null : current));
        });
        sceneEl.appendChild(target);
      });

      mountRef.current.appendChild(sceneEl);
      sceneRef.current = sceneEl;
      setStatus('scanning');

      // Al pasar a pantalla completa (clase is-immersive), el contenedor cambia de tamano.
      // MindAR/A-Frame dimensionan el video y el lienzo con el tamano del contenedor en el
      // momento de arrancar, asi que pedimos un recalculo (resize) DESPUES de que el layout
      // fullscreen ya aplico, para que la camara llene la pantalla sin franjas negras. Varios
      // disparos cubren el arranque de la camara (que tarda unos ms en dar dimensiones).
      const nudgeResize = () => { try { window.dispatchEvent(new Event('resize')); } catch { /* noop */ } };
      requestAnimationFrame(nudgeResize);
      setTimeout(nudgeResize, 250);
      setTimeout(nudgeResize, 800);
    } catch (startError) {
      teardown();
      setStatus('error');
      setError(startError?.message || 'No se pudo iniciar el escaner.');
    }
  }

  function stop() {
    teardown();
    setStatus('idle');
    setActive(null);
    setActiveClip('');
  }

  const busy = status === 'compiling' || status === 'loading';
  const showReticle = status === 'scanning' && !active;
  const hasEmotes = Boolean(active && active.clips.length > 0);

  return (
    <div className={`marker-scanner${status === 'scanning' ? ' is-immersive' : ''}`}>
      <div className="marker-scanner-stage">
        <div ref={mountRef} className="marker-scanner-canvas" aria-hidden="true" />
        {status !== 'scanning' && (
          <div className="marker-scanner-placeholder">
            <span>Realidad aumentada</span>
            <strong>Escanear marcadores</strong>
            <p>
              {status === 'compiling'
                ? `Preparando el reconocimiento… ${progress}% (solo la primera vez en este dispositivo)`
                : status === 'loading'
                  ? 'Abriendo cámara…'
                  : 'Toca “Iniciar cámara” y apunta a un marcador impreso.'}
            </p>
          </div>
        )}

        {/* Retículo tipo QR: esquinas + línea que barre. Guía para enfocar el marcador. */}
        {showReticle && (
          <div className="marker-scanner-reticle" aria-hidden="true">
            <span className="msr-corner msr-tl" />
            <span className="msr-corner msr-tr" />
            <span className="msr-corner msr-bl" />
            <span className="msr-corner msr-br" />
            <span className="msr-line" />
            <span className="marker-scanner-hint">Buscando marcador…</span>
          </div>
        )}

        {active && (
          <div className="marker-scanner-pill is-found">{active.name}</div>
        )}
      </div>

      {/* Ruleta de emotes (adaptada a web) para modelos con animación. */}
      {hasEmotes && (
        <div className="marker-scanner-emotes" role="group" aria-label="Emotes del modelo">
          <span className="marker-scanner-emotes-title">Emotes · {active.clips.length}</span>
          <div className="marker-scanner-emotes-wheel">
            {active.clips.map((clip) => (
              <button
                key={clip}
                type="button"
                className={`marker-scanner-emote${activeClip === clip ? ' is-active' : ''}`}
                onClick={() => playClip(clip)}
              >
                {active.labels?.[clip] || clip}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="marker-scanner-controls">
        {status !== 'scanning' ? (
          <Button type="button" onClick={start} disabled={busy || !usable.length}>
            {busy ? 'Preparando...' : 'Iniciar cámara'}
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={stop}>Detener</Button>
        )}
      </div>

      {error && <p className="error-message">{error}</p>}
      {!usable.length && status === 'idle' && (
        <p className="marker-scanner-note">Aún no hay marcadores publicados para escanear.</p>
      )}
    </div>
  );
}

export default MarkerScanner;
