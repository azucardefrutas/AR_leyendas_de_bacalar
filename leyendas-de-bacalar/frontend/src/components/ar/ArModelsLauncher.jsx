import React, { Suspense, lazy, useState } from 'react';
import AppIcon from '../ui/AppIcon.jsx';
import { supportsWebcamGestures } from '../../utils/deviceType.js';

// El visor de piso (model-viewer por CDN) solo se carga cuando el usuario elige
// un modelo, no al montar el botón.
const FloorArViewer = lazy(() => import('./FloorArViewer.jsx'));
// El modo gestos (webcam + MediaPipe) es para escritorio; carga diferida para que su
// pipeline (three.js + tasks-vision) solo baje cuando el usuario lo abre.
const GestureArViewer = lazy(() => import('./GestureArViewer.jsx'));

// Solo PC con webcam usa gestos. En móvil/tablet se conserva el AR nativo de
// model-viewer ("Ver en tu espacio"), que ya funciona.
const supportsGestureAr = supportsWebcamGestures();

function cleanModelName(name = '') {
  const base = String(name).replace(/\.(glb|gltf)$/i, '').trim();
  // Ocultar nombres poco útiles (uuid, timestamps, "Escena AR ...").
  if (!base) return '';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(base)) return '';
  if (/^\d{10,}/.test(base)) return '';
  if (/^escena ar/i.test(base)) return '';
  return base;
}

/**
 * Botón con icono de cámara que abre un selector con los modelos 3D del libro
 * (Modelo 1, 2, 3...). Al elegir uno se abre en AR de piso.
 *
 * @param {{ models: Array<{id:string,name?:string,modelUrl:string}>, variant?: 'floating'|'inline' }} props
 */
function ArModelsLauncher({ models = [], variant = 'floating' }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [active, setActive] = useState(null);
  const [mode, setMode] = useState('floor'); // 'gesture' (webcam PC) | 'floor' (model-viewer)

  if (!models.length) return null;

  const openModel = (model) => {
    setActive(model);
    setMode(supportsGestureAr ? 'gesture' : 'floor');
  };
  const closeViewer = () => { setActive(null); setSheetOpen(false); };

  return (
    <>
      <button
        type="button"
        className={`ar-models-trigger ${variant === 'floating' ? 'is-floating' : 'is-inline'}`}
        onClick={() => setSheetOpen(true)}
        aria-label="Ver modelos en realidad aumentada"
        title="Ver modelos en AR"
      >
        <AppIcon name="photo_camera" size={variant === 'inline' ? 20 : 22} />
        {variant === 'inline' && <span>Ver en AR</span>}
      </button>

      {sheetOpen && !active && (
        <div
          className="ar-models-sheet-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Modelos en AR"
          onClick={() => setSheetOpen(false)}
        >
          <div className="ar-models-sheet" onClick={(event) => event.stopPropagation()}>
            <header className="ar-models-sheet-head">
              <div>
                <h3>{supportsGestureAr ? 'Manipula el modelo con gestos' : 'Ver en tu espacio (AR)'}</h3>
                <p>
                  {supportsGestureAr
                    ? 'Elige un modelo y muévelo con las manos frente a tu cámara.'
                    : 'Elige un modelo para colocarlo en el piso con la cámara.'}
                </p>
              </div>
              <button
                type="button"
                className="ar-models-close"
                onClick={() => setSheetOpen(false)}
                aria-label="Cerrar"
              >
                <AppIcon name="close" size={20} />
              </button>
            </header>

            <ul className="ar-models-list">
              {models.map((model, index) => {
                const nice = cleanModelName(model.name);
                return (
                  <li key={model.id}>
                    <button type="button" onClick={() => openModel(model)}>
                      <span className="ar-models-index">{index + 1}</span>
                      <span className="ar-models-label">
                        <strong>{`Modelo ${index + 1}`}</strong>
                        {nice && <em>{nice}</em>}
                      </span>
                      <AppIcon name="view_in_ar" size={22} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {active && mode === 'gesture' && (
        <Suspense fallback={<div className="ar-models-viewer-overlay"><div className="ar-floor-hint">Preparando cámara…</div></div>}>
          <GestureArViewer
            modelUrl={active.modelUrl}
            name={cleanModelName(active.name) || `Modelo ${models.indexOf(active) + 1}`}
            onClose={closeViewer}
            onFallback={() => setMode('floor')}
          />
        </Suspense>
      )}

      {active && mode === 'floor' && (
        <div className="ar-models-viewer-overlay" role="dialog" aria-modal="true" aria-label="Realidad aumentada">
          <div className="ar-models-viewer-head">
            <button type="button" className="btn btn-ghost" onClick={() => setActive(null)}>
              ← Modelos
            </button>
            <strong>{cleanModelName(active.name) || `Modelo ${models.indexOf(active) + 1}`}</strong>
            <div className="ar-models-viewer-head-actions">
              {supportsGestureAr && (
                <button type="button" className="btn btn-ghost" onClick={() => setMode('gesture')}>
                  <AppIcon name="waving_hand" size={18} /> Gestos
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={closeViewer}>
                Cerrar
              </button>
            </div>
          </div>
          <div className="ar-models-viewer-body">
            <Suspense fallback={<div className="ar-floor-hint">Cargando visor 3D...</div>}>
              <FloorArViewer modelUrl={active.modelUrl} name={cleanModelName(active.name) || 'Modelo 3D'} />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}

export default ArModelsLauncher;
