import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EditorIcon } from '../EditorJsToolbar.jsx';
import CompositionLayer from './CompositionLayer.jsx';
import {
  COMPOSITION_HEIGHT,
  COMPOSITION_WIDTH,
  addLayer,
  alignLayer,
  bringLayerForward,
  duplicateLayer,
  getCompositionScale,
  moveLayer,
  normalizeCompositionData,
  removeLayer,
  resizeLayer,
  sendLayerBackward,
  setLayerLocked,
  setLayerOpacity,
  applyLayerAsBackground,
} from './compositionState.js';

const TYPE_LABELS = { image: 'Imagen', model3d: 'Modelo 3D', marker: 'Marcador' };

function IconAction({ label, icon, text, onClick, active = false, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      className={`${active ? 'is-active' : ''} ${danger ? 'is-danger' : ''}`}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.();
      }}
      disabled={disabled}
    >
      {icon ? <EditorIcon name={icon} size={16} /> : text}
    </button>
  );
}

export default function CompositionCanvas({
  data,
  readOnly = false,
  onChange,
  onRequestAsset,
}) {
  const [composition, setComposition] = useState(() => normalizeCompositionData(data));
  const [selectedId, setSelectedId] = useState('');
  const [manipulating3dId, setManipulating3dId] = useState('');
  const [layersOpen, setLayersOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const wrapperRef = useRef(null);
  const dataRef = useRef(composition);
  dataRef.current = composition;

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

  const selected = composition.layers.find((layer) => layer.id === selectedId) || null;
  const orderedLayers = useMemo(
    () => [...composition.layers].sort((a, b) => b.zIndex - a.zIndex),
    [composition.layers],
  );

  const commit = (operation) => {
    const next = normalizeCompositionData(operation(dataRef.current));
    dataRef.current = next;
    setComposition(next);
    onChange?.(next);
  };

  const requestAsset = (type) => {
    onRequestAsset?.(type, (payload) => {
      commit((current) => addLayer(current, {
        ...payload,
        type,
        url: payload.url || payload.modelUrl || payload.imageUrl || payload.previewUrl || '',
      }));
      const latest = dataRef.current.layers[dataRef.current.layers.length - 1];
      setSelectedId(latest?.id || '');
    });
  };

  const setWidthPercent = (percent) => {
    if (!selected) return;
    const width = Math.round(COMPOSITION_WIDTH * percent);
    const ratio = selected.height / selected.width;
    const height = Math.min(COMPOSITION_HEIGHT, Math.max(48, Math.round(width * ratio)));
    commit((current) => resizeLayer(current, selected.id, { width, height }));
  };

  if (readOnly) {
    return <div className="ejs-composition__placeholder">La composición está en modo de solo lectura.</div>;
  }

  const contextLeft = selected
    ? Math.max(8, Math.min((selected.x + (selected.width / 2)) * scale, (COMPOSITION_WIDTH * scale) - 8))
    : 0;
  const contextTop = selected
    ? Math.max(8, (selected.y * scale) - 46)
    : 0;

  return (
    <section className="ejs-composition" aria-label="Composición visual">
      <div className="ejs-composition__topbar" role="toolbar" aria-label="Agregar recursos a la composición">
        <IconAction label="Agregar imagen" icon="image" onClick={() => requestAsset('image')} disabled={!onRequestAsset} />
        <IconAction label="Agregar modelo 3D" icon="box" onClick={() => requestAsset('model3d')} disabled={!onRequestAsset} />
        <IconAction label="Agregar marcador" icon="bookmark" onClick={() => requestAsset('marker')} disabled={!onRequestAsset} />
        <label className="ejs-composition__background">
          <span>Fondo</span>
          <input
            type="color"
            value={composition.canvas.background}
            onChange={(event) => commit((current) => ({
              ...current,
              canvas: { ...current.canvas, background: event.target.value },
            }))}
          />
        </label>
        <IconAction label="Mostrar capas" icon="layers" active={layersOpen} onClick={() => setLayersOpen((value) => !value)} />
      </div>

      <div
        ref={wrapperRef}
        className="ejs-composition__viewport"
        style={{ height: COMPOSITION_HEIGHT * scale }}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            setSelectedId('');
            setManipulating3dId('');
          }
        }}
      >
        <div
          className="ejs-composition__stage"
          style={{
            width: COMPOSITION_WIDTH,
            height: COMPOSITION_HEIGHT,
            background: composition.canvas.background,
            transform: `scale(${scale})`,
          }}
        >
          {composition.layers.map((layer) => (
            <CompositionLayer
              key={layer.id}
              layer={layer}
              scale={scale}
              selected={layer.id === selectedId}
              manipulating3d={layer.id === manipulating3dId}
              onSelect={(id) => {
                setSelectedId(id);
                if (id !== manipulating3dId) setManipulating3dId('');
              }}
              onMove={(id, position) => commit((current) => moveLayer(current, id, position))}
              onResize={(id, geometry) => commit((current) => resizeLayer(current, id, geometry))}
              onDelete={(id) => {
                commit((current) => removeLayer(current, id));
                setSelectedId('');
                setManipulating3dId('');
              }}
              onToggle3d={(id) => setManipulating3dId((current) => current === id ? '' : id)}
              onDeselect={() => {
                setSelectedId('');
                setManipulating3dId('');
              }}
            />
          ))}
        </div>

        {selected && (
          <div
            className="ejs-composition__context"
            role="toolbar"
            aria-label={`Controles de ${selected.title}`}
            style={{ left: contextLeft, top: contextTop }}
          >
            {selected.type === 'model3d' && (
              <IconAction
                label={manipulating3dId === selected.id ? 'Volver a mover capa' : 'Manipular modelo 3D'}
                icon="box"
                active={manipulating3dId === selected.id}
                onClick={() => setManipulating3dId((current) => current === selected.id ? '' : selected.id)}
              />
            )}
            <IconAction label="Duplicar" text="Duplicar" onClick={() => commit((current) => duplicateLayer(current, selected.id))} />
            <IconAction label="Traer al frente" text="Frente" onClick={() => commit((current) => bringLayerForward(current, selected.id))} />
            <IconAction label="Enviar atrás" text="Atrás" onClick={() => commit((current) => sendLayerBackward(current, selected.id))} />
            <IconAction
              label={selected.locked ? 'Desbloquear' : 'Bloquear'}
              text={selected.locked ? 'Desbloquear' : 'Bloquear'}
              active={selected.locked}
              onClick={() => commit((current) => setLayerLocked(current, selected.id, !selected.locked))}
            />
            <IconAction label="Alinear a la izquierda" text="Izq." onClick={() => commit((current) => alignLayer(current, selected.id, 'left'))} />
            <IconAction label="Alinear al centro" text="Centro" onClick={() => commit((current) => alignLayer(current, selected.id, 'center'))} />
            <IconAction label="Alinear a la derecha" text="Der." onClick={() => commit((current) => alignLayer(current, selected.id, 'right'))} />
            {[0.25, 0.5, 1].map((percent) => (
              <IconAction key={percent} label={`Tamaño ${percent * 100}%`} text={`${percent * 100}%`} onClick={() => setWidthPercent(percent)} />
            ))}
            <label className="ejs-composition__opacity">
              <span>Opacidad</span>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={selected.opacity}
                onChange={(event) => commit((current) => setLayerOpacity(current, selected.id, event.target.value))}
              />
            </label>
            {selected.type === 'image' && (
              <IconAction label="Usar imagen como fondo" text="Usar como fondo" onClick={() => commit((current) => applyLayerAsBackground(current, selected.id))} />
            )}
            <IconAction
              label="Eliminar capa"
              icon="trash"
              danger
              disabled={selected.locked}
              onClick={() => {
                commit((current) => removeLayer(current, selected.id));
                setSelectedId('');
              }}
            />
          </div>
        )}

        {layersOpen && (
          <aside className="ejs-composition__layers-panel" aria-label="Capas de la composición">
            <header>
              <strong>Capas</strong>
              <button type="button" onClick={() => setLayersOpen(false)} aria-label="Cerrar capas"><EditorIcon name="close" size={15} /></button>
            </header>
            {orderedLayers.length ? orderedLayers.map((layer) => (
              <div key={layer.id} className={`ejs-composition__layer-row ${layer.id === selectedId ? 'is-selected' : ''}`}>
                <button
                  type="button"
                  className="ejs-composition__layer-select"
                  onClick={() => setSelectedId(layer.id)}
                >
                  <span>{TYPE_LABELS[layer.type]}</span>
                  <strong>{layer.title}</strong>
                  {layer.locked && <small>Bloqueada</small>}
                </button>
                <div className="ejs-composition__layer-actions">
                  <IconAction
                    label={layer.locked ? `Desbloquear ${layer.title}` : `Bloquear ${layer.title}`}
                    text={layer.locked ? 'Abrir' : 'Fijar'}
                    onClick={() => commit((current) => setLayerLocked(current, layer.id, !layer.locked))}
                  />
                  <IconAction label={`Traer ${layer.title} al frente`} text="↑" onClick={() => commit((current) => bringLayerForward(current, layer.id))} />
                  <IconAction label={`Enviar ${layer.title} atrás`} text="↓" onClick={() => commit((current) => sendLayerBackward(current, layer.id))} />
                </div>
              </div>
            )) : <p>No hay capas todavía.</p>}
          </aside>
        )}
      </div>
    </section>
  );
}
