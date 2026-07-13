import React, { useEffect, useRef, useState } from 'react';
import { loadExternalScript } from '../../lib/loadExternalScript.js';

// Google model-viewer: visor 3D + boton nativo "Ver en tu espacio" (AR de piso).
// En Android usa Scene Viewer con el GLB directo. En iOS el boton AR requiere
// ademas una version .usdz del modelo (los autores solo suben .glb), por eso en
// iOS por ahora funciona el visor 3D pero no el lanzamiento AR nativo.
const MODEL_VIEWER_SRC = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js';

/**
 * AR de colocacion en el piso usando <model-viewer>. Recibe la URL del GLB.
 */
function FloorArViewer({ modelUrl, name = 'Modelo 3D', onView }) {
  const containerRef = useRef(null);
  const onViewRef = useRef(onView);
  const notifiedRef = useRef(false);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    onViewRef.current = onView;
  }, [onView]);

  useEffect(() => {
    let cancelled = false;
    notifiedRef.current = false;

    if (!modelUrl) {
      setStatus('error');
      return undefined;
    }

    setStatus('loading');
    loadExternalScript(MODEL_VIEWER_SRC, {
      module: true,
      globalCheck: () => (typeof window !== 'undefined' ? window.customElements?.get('model-viewer') : null),
    })
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const el = document.createElement('model-viewer');
        el.setAttribute('src', modelUrl);
        el.setAttribute('alt', name);
        el.setAttribute('camera-controls', '');
        el.setAttribute('auto-rotate', '');
        el.setAttribute('touch-action', 'pan-y');
        el.setAttribute('shadow-intensity', '1');
        el.setAttribute('ar', '');
        el.setAttribute('ar-modes', 'webxr scene-viewer quick-look');
        el.setAttribute('ar-scale', 'auto');
        el.setAttribute('loading', 'eager');
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.backgroundColor = 'transparent';
        el.addEventListener('load', () => {
          if (!notifiedRef.current) {
            notifiedRef.current = true;
            if (onViewRef.current) onViewRef.current();
          }
        });
        el.addEventListener('error', () => {
          if (!cancelled) setStatus('error');
        });
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(el);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [modelUrl, name]);

  return (
    <div className="ar-floor-viewer">
      <div ref={containerRef} className="ar-floor-stage" aria-label={`Visor AR de piso: ${name}`} />
      {status === 'loading' && <p className="ar-floor-hint">Cargando visor 3D...</p>}
      {status === 'error' && (
        <p className="error-message">No se pudo cargar el modelo 3D. Verifica el archivo GLB o tu conexion.</p>
      )}
      {status === 'ready' && (
        <p className="ar-floor-hint">
          Gira el modelo con el dedo. En un telefono, toca el boton <strong>Ver en tu espacio</strong> para colocarlo en el piso real.
        </p>
      )}
    </div>
  );
}

export default FloorArViewer;
