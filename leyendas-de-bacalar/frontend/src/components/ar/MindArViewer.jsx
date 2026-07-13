import React, { useEffect, useRef, useState } from 'react';
import Button from '../ui/Button.jsx';
import { loadExternalScript } from '../../lib/loadExternalScript.js';

// AR de marcador (image tracking) con MindAR sobre A-Frame, cargado por CDN.
// Flujo:
//  1. Resolver el "target" a rastrear:
//     - si hay un .mind precompilado (mindUrl) -> se usa directo (mas rapido/robusto).
//     - si solo hay imagen de marcador -> se compila a .mind al vuelo en el navegador.
//  2. Cargar A-Frame + el build mindar-image-aframe (scripts clasicos que registran
//     los componentes <a-scene mindar-image> y mindar-image-target).
//  3. Montar una <a-scene> embebida con el GLB anclado al marcador.
const AFRAME_SRC = 'https://aframe.io/releases/1.5.0/aframe.min.js';
const MINDAR_AFRAME_SRC = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js';
const MINDAR_COMPILER_SRC = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js';

function isMindFile(url = '') {
  return String(url).toLowerCase().split('?')[0].endsWith('.mind');
}

function loadCrossOriginImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen del marcador (revisa CORS o la URL).'));
    img.src = url;
  });
}

// Compila una imagen de marcador a un archivo .mind en memoria (blob URL).
async function compileMarkerToMind(imageUrl) {
  // El bundle prod de MindAR es autocontenido; se importa como modulo desde el CDN.
  // @vite-ignore evita que Vite intente resolver/pre-bundlear la URL remota.
  const mod = await import(/* @vite-ignore */ MINDAR_COMPILER_SRC);
  const Compiler = mod?.Compiler || (typeof window !== 'undefined' ? window.MINDAR?.IMAGE?.Compiler : null);
  if (!Compiler) throw new Error('El compilador de marcadores de MindAR no esta disponible.');

  const image = await loadCrossOriginImage(imageUrl);
  const compiler = new Compiler();
  await compiler.compileImageTargets([image], () => {});
  const buffer = await compiler.exportData();
  return URL.createObjectURL(new Blob([buffer]));
}

/**
 * @param {{
 *   markerImageUrl?: string, mindUrl?: string, modelUrl?: string,
 *   name?: string, scale?: number, onFound?: () => void,
 * }} props
 */
function MindArViewer({ markerImageUrl, mindUrl, modelUrl, name = 'Modelo 3D', scale = 0.6, onFound }) {
  const stageRef = useRef(null);
  const sceneRef = useRef(null);
  const compiledUrlRef = useRef(null);
  const onFoundRef = useRef(onFound);
  const [status, setStatus] = useState('idle'); // idle | loading | compiling | scanning | error
  const [error, setError] = useState('');
  const [found, setFound] = useState(false);

  useEffect(() => {
    onFoundRef.current = onFound;
  }, [onFound]);

  const hasTarget = Boolean(mindUrl && isMindFile(mindUrl)) || Boolean(markerImageUrl);

  function teardown() {
    const sceneEl = sceneRef.current;
    if (sceneEl) {
      try {
        sceneEl.systems?.['mindar-image']?.stop?.();
      } catch {
        // Detener MindAR puede fallar si nunca inicio; no es critico.
      }
      sceneEl.parentNode?.removeChild(sceneEl);
      sceneRef.current = null;
    }
    if (stageRef.current) stageRef.current.innerHTML = '';
    if (compiledUrlRef.current) {
      URL.revokeObjectURL(compiledUrlRef.current);
      compiledUrlRef.current = null;
    }
  }

  useEffect(() => () => teardown(), []);

  async function start() {
    if (status === 'scanning' || status === 'loading' || status === 'compiling') return;
    setError('');
    setFound(false);

    if (!modelUrl) {
      setStatus('error');
      setError('Esta escena no tiene un modelo 3D asociado para mostrar.');
      return;
    }
    if (!hasTarget) {
      setStatus('error');
      setError('Este marcador aun no tiene imagen ni archivo .mind para reconocer.');
      return;
    }

    try {
      // 1) Resolver el target (.mind directo o compilado desde la imagen).
      let targetSrc;
      if (mindUrl && isMindFile(mindUrl)) {
        targetSrc = mindUrl;
      } else {
        setStatus('compiling');
        targetSrc = await compileMarkerToMind(markerImageUrl);
        compiledUrlRef.current = targetSrc;
      }

      // 2) Cargar el motor (A-Frame + MindAR) por CDN.
      setStatus('loading');
      await loadExternalScript(AFRAME_SRC, {
        globalCheck: () => (typeof window !== 'undefined' ? window.AFRAME : null),
      });
      await loadExternalScript(MINDAR_AFRAME_SRC, {
        globalCheck: () => (typeof window !== 'undefined' ? window.AFRAME?.components?.['mindar-image'] : null),
      });
      if (!stageRef.current) return;

      // 3) Montar la escena AR embebida.
      const sceneEl = document.createElement('a-scene');
      sceneEl.setAttribute('embedded', '');
      sceneEl.setAttribute('color-space', 'sRGB');
      sceneEl.setAttribute('renderer', 'colorManagement: true, physicallyCorrectLights');
      sceneEl.setAttribute('vr-mode-ui', 'enabled: false');
      sceneEl.setAttribute('device-orientation-permission-ui', 'enabled: false');
      sceneEl.setAttribute(
        'mindar-image',
        `imageTargetSrc: ${targetSrc}; autoStart: true; uiScanning: no; uiLoading: no; uiError: no;`,
      );
      sceneEl.style.width = '100%';
      sceneEl.style.height = '100%';

      const camera = document.createElement('a-camera');
      camera.setAttribute('position', '0 0 0');
      camera.setAttribute('look-controls', 'enabled: false');
      sceneEl.appendChild(camera);

      const target = document.createElement('a-entity');
      target.setAttribute('mindar-image-target', 'targetIndex: 0');

      const model = document.createElement('a-gltf-model');
      model.setAttribute('src', modelUrl);
      model.setAttribute('position', '0 0 0');
      model.setAttribute('rotation', '0 0 0');
      model.setAttribute('scale', `${scale} ${scale} ${scale}`);
      target.appendChild(model);
      sceneEl.appendChild(target);

      target.addEventListener('targetFound', () => {
        setFound(true);
        if (onFoundRef.current) onFoundRef.current();
      });
      target.addEventListener('targetLost', () => setFound(false));

      stageRef.current.innerHTML = '';
      stageRef.current.appendChild(sceneEl);
      sceneRef.current = sceneEl;
      setStatus('scanning');
    } catch (startError) {
      teardown();
      setStatus('error');
      setError(startError?.message || 'No se pudo iniciar el reconocimiento de marcador.');
    }
  }

  function stop() {
    teardown();
    setStatus('idle');
    setFound(false);
  }

  const busy = status === 'loading' || status === 'compiling';

  return (
    <div className="ar-mind-viewer">
      <div ref={stageRef} className="ar-mind-stage">
        {status !== 'scanning' && (
          <div className="ar-mind-placeholder">
            <span>Image tracking</span>
            <strong>Escanear marcador (MindAR)</strong>
            <p>
              {status === 'compiling'
                ? 'Preparando el marcador...'
                : status === 'loading'
                  ? 'Cargando motor AR...'
                  : 'Apunta la camara al marcador impreso de la leyenda.'}
            </p>
          </div>
        )}
        {status === 'scanning' && !found && (
          <div className="ar-mind-scanning-pill">Buscando marcador...</div>
        )}
      </div>

      <div className="ar-mind-controls">
        {status !== 'scanning' ? (
          <Button type="button" onClick={start} disabled={busy || !hasTarget}>
            {busy ? 'Preparando...' : 'Iniciar escaneo'}
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={stop}>
            Detener
          </Button>
        )}
      </div>

      {error && <p className="error-message">{error}</p>}
      {!hasTarget && status === 'idle' && (
        <p className="ar-mind-note">
          Este marcador todavia no tiene imagen de referencia. Subela desde el editor de la leyenda.
        </p>
      )}
    </div>
  );
}

export default MindArViewer;
