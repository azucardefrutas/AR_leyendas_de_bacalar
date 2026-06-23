import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { getCompositionScale, normalizeCompositionData } from './compositionState.js';

const Model3DViewer = lazy(() => import('../../3d/Model3DViewer.jsx'));

export default function CompositionPreview({ data }) {
  const composition = normalizeCompositionData(data);
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [activeModelId, setActiveModelId] = useState('');

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return undefined;
    const update = () => setScale(getCompositionScale(node.clientWidth));
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={wrapperRef}
      className="ejs-composition-preview"
      style={{ height: composition.canvas.height * scale }}
      aria-label="Composición visual"
    >
      <div
        className="ejs-composition-preview__stage"
        style={{
          width: composition.canvas.width,
          height: composition.canvas.height,
          background: composition.canvas.background,
          transform: `scale(${scale})`,
        }}
      >
        {composition.layers.map((layer) => (
          <div
            key={layer.id}
            className={`ejs-composition-preview__layer ejs-composition-preview__layer--${layer.type}`}
            style={{
              left: layer.x,
              top: layer.y,
              width: layer.width,
              height: layer.height,
              zIndex: layer.zIndex,
              opacity: layer.opacity,
              transform: `rotate(${layer.rotation}deg)`,
            }}
          >
            {layer.type === 'model3d' ? (
              activeModelId === layer.id && layer.url ? (
                <Suspense fallback={<div className="ejs-composition__placeholder">Cargando modelo 3D…</div>}>
                  <Model3DViewer
                    modelUrl={layer.url}
                    title={layer.title}
                    embedded
                    hideHeading
                    compactControls
                  />
                </Suspense>
              ) : (
                <div className="ejs-composition-preview__model-placeholder">
                  <strong>{layer.title || 'Modelo 3D'}</strong>
                  {layer.url
                    ? <button type="button" onClick={() => setActiveModelId(layer.id)}>Ver modelo</button>
                    : <span>Modelo no disponible</span>}
                </div>
              )
            ) : layer.url ? (
              <img src={layer.url} alt={layer.alt || layer.title} loading="lazy" />
            ) : (
              <div className="ejs-composition__placeholder"><strong>{layer.title}</strong></div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
