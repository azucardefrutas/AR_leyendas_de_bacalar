import React, { Suspense, lazy, useState } from 'react';
import AppIcon from '../ui/AppIcon.jsx';

// El visor de piso (model-viewer por CDN) solo se carga cuando el usuario elige
// un modelo, no al montar el botón.
const FloorArViewer = lazy(() => import('./FloorArViewer.jsx'));

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

  if (!models.length) return null;

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
                <h3>Ver en tu espacio (AR)</h3>
                <p>Elige un modelo para colocarlo en el piso con la cámara.</p>
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
                    <button type="button" onClick={() => setActive(model)}>
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

      {active && (
        <div className="ar-models-viewer-overlay" role="dialog" aria-modal="true" aria-label="Realidad aumentada">
          <div className="ar-models-viewer-head">
            <button type="button" className="btn btn-ghost" onClick={() => setActive(null)}>
              ← Modelos
            </button>
            <strong>{cleanModelName(active.name) || `Modelo ${models.indexOf(active) + 1}`}</strong>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => { setActive(null); setSheetOpen(false); }}
            >
              Cerrar
            </button>
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
