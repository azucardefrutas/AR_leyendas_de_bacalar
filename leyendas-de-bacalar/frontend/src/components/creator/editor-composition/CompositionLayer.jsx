import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';

const Model3DViewer = lazy(() => import('../../3d/Model3DViewer.jsx'));

function isInteractiveControl(target) {
  return target instanceof Element && Boolean(target.closest('button, input, select, textarea, a'));
}

export default function CompositionLayer({
  layer,
  scale,
  selected,
  manipulating3d,
  onSelect,
  onMove,
  onResize,
  onDelete,
  onToggle3d,
  onDeselect,
}) {
  const interactionRef = useRef(null);
  const visibilityRef = useRef(null);
  const [modelVisible, setModelVisible] = useState(false);

  useEffect(() => {
    if (layer.type !== 'model3d') return undefined;
    const node = visibilityRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setModelVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setModelVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '160px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [layer.type]);

  const startPointerInteraction = (event, mode, corner = 'se') => {
    if (interactionRef.current || (mode === 'move' && isInteractiveControl(event.target))) return;
    onSelect(layer.id);
    if (layer.locked || manipulating3d) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    interactionRef.current = {
      pointerId: event.pointerId,
      mode,
      corner,
      startX: event.clientX,
      startY: event.clientY,
      layer: { ...layer },
    };
  };

  const handlePointerMove = (event) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    event.preventDefault();
    const dx = (event.clientX - interaction.startX) / Math.max(scale, 0.01);
    const dy = (event.clientY - interaction.startY) / Math.max(scale, 0.01);
    const original = interaction.layer;

    if (interaction.mode === 'move') {
      onMove(layer.id, { x: original.x + dx, y: original.y + dy });
      return;
    }

    const west = interaction.corner.includes('w');
    const north = interaction.corner.includes('n');
    onResize(layer.id, {
      x: west ? original.x + dx : original.x,
      y: north ? original.y + dy : original.y,
      width: original.width + (west ? -dx : dx),
      height: original.height + (north ? -dy : dy),
    });
  };

  const stopPointerInteraction = (event) => {
    if (interactionRef.current?.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    interactionRef.current = null;
  };

  const handleKeyDown = (event) => {
    if (isInteractiveControl(event.target)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (manipulating3d) onToggle3d(layer.id);
      else onDeselect();
      return;
    }
    if ((event.key === 'Delete' || event.key === 'Backspace') && !layer.locked) {
      event.preventDefault();
      onDelete(layer.id);
      return;
    }
    const delta = event.shiftKey ? 10 : 1;
    const moves = {
      ArrowLeft: { x: layer.x - delta, y: layer.y },
      ArrowRight: { x: layer.x + delta, y: layer.y },
      ArrowUp: { x: layer.x, y: layer.y - delta },
      ArrowDown: { x: layer.x, y: layer.y + delta },
    };
    if (moves[event.key] && !layer.locked && !manipulating3d) {
      event.preventDefault();
      onMove(layer.id, moves[event.key]);
    }
  };

  const isBackground = layer.type === 'image'
    && layer.x === 0 && layer.y === 0 && layer.width === 900 && layer.height === 560;

  return (
    <div
      ref={visibilityRef}
      className={`ejs-composition__layer ejs-composition__layer--${layer.type} ${selected ? 'is-selected' : ''} ${layer.locked ? 'is-locked' : ''} ${manipulating3d ? 'is-manipulating-3d' : ''} ${isBackground ? 'is-background' : ''}`}
      style={{
        left: layer.x,
        top: layer.y,
        width: layer.width,
        height: layer.height,
        zIndex: layer.zIndex,
        opacity: layer.opacity,
        transform: `rotate(${layer.rotation}deg)`,
      }}
      role="group"
      tabIndex={selected ? 0 : -1}
      aria-label={`${layer.type === 'model3d' ? 'Modelo 3D' : layer.type === 'marker' ? 'Marcador' : 'Imagen'}: ${layer.title}`}
      aria-selected={selected}
      aria-disabled={layer.locked}
      onPointerDown={(event) => startPointerInteraction(event, 'move')}
      onPointerMove={handlePointerMove}
      onPointerUp={stopPointerInteraction}
      onPointerCancel={stopPointerInteraction}
      onDoubleClick={() => layer.type === 'model3d' && onToggle3d(layer.id)}
      onKeyDown={handleKeyDown}
    >
      {layer.type === 'model3d' ? (
        <div className="ejs-composition__model">
          {modelVisible && layer.url ? (
            <Suspense fallback={<div className="ejs-composition__placeholder">Cargando modelo 3D…</div>}>
              <Model3DViewer
                modelUrl={layer.url}
                title={layer.title}
                embedded
                hideHeading
                compactControls
                interactionEnabled={manipulating3d}
              />
            </Suspense>
          ) : (
            <div className="ejs-composition__placeholder">
              <strong>{layer.title || 'Modelo 3D'}</strong>
              <span>{layer.url ? 'Modelo listo para cargar' : 'URL del modelo no disponible'}</span>
            </div>
          )}
        </div>
      ) : layer.url ? (
        <img src={layer.url} alt={layer.alt || layer.title} draggable="false" loading="lazy" />
      ) : (
        <div className="ejs-composition__placeholder">
          <strong>{layer.title}</strong>
          <span>Recurso sin URL disponible</span>
        </div>
      )}

      {selected && !layer.locked && !manipulating3d && ['nw', 'ne', 'sw', 'se'].map((corner) => (
        <button
          key={corner}
          type="button"
          className={`ejs-composition__resize-handle is-${corner}`}
          aria-label={`Redimensionar desde ${corner}`}
          onPointerDown={(event) => startPointerInteraction(event, 'resize', corner)}
          onPointerMove={handlePointerMove}
          onPointerUp={stopPointerInteraction}
          onPointerCancel={stopPointerInteraction}
        />
      ))}
    </div>
  );
}
