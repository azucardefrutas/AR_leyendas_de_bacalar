import React, { useMemo, useState } from 'react';
import Button from '../ui/Button.jsx';
import FloorArViewer from './FloorArViewer.jsx';
import MindArViewer from './MindArViewer.jsx';
import { getScanHistory, recordScan } from '../../lib/arScanHistory.js';

function ArCameraExperience({ experience }) {
  const scene = experience?.scene || {};
  const modelAsset = experience?.modelAsset || null;
  const modelUrl = modelAsset?.url || '';
  const markerImageUrl = experience?.markerImageUrl || experience?.markerAsset?.url || '';
  const mindUrl = experience?.mindUrl || '';

  const floorReady = experience?.floorArReady ?? Boolean(modelUrl);
  const markerReady = experience?.markerArReady ?? Boolean(markerImageUrl || mindUrl);

  // Modo por defecto: marcador si esta disponible, si no, piso.
  const [mode, setMode] = useState(markerReady ? 'marker' : 'floor');
  const [history, setHistory] = useState(() => getScanHistory());

  const sceneName = scene?.name || 'Escena AR';

  function handleViewed(usedMode) {
    if (!scene?.id) return;
    const next = recordScan({
      id: scene.id,
      name: sceneName,
      modelUrl,
      mode: usedMode,
    });
    setHistory(next);
  }

  const modelLabel = modelAsset?.metadata?.original_name || modelAsset?.asset_type || 'Modelo 3D';

  const activeViewer = useMemo(() => {
    if (mode === 'floor') {
      return floorReady ? (
        <FloorArViewer modelUrl={modelUrl} name={sceneName} onView={() => handleViewed('floor')} />
      ) : (
        <div className="ar-engine-note">
          <span>Piso</span>
          <strong>Sin modelo 3D</strong>
          <p>Esta escena todavia no tiene un modelo GLB para colocar en el piso.</p>
        </div>
      );
    }
    return markerReady ? (
      <MindArViewer
        markerImageUrl={markerImageUrl}
        mindUrl={mindUrl}
        modelUrl={modelUrl}
        name={sceneName}
        onFound={() => handleViewed('marker')}
      />
    ) : (
      <div className="ar-engine-note">
        <span>Marcador</span>
        <strong>Sin marcador de referencia</strong>
        <p>Sube la imagen del marcador desde el editor de la leyenda para habilitar el escaneo.</p>
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, floorReady, markerReady, modelUrl, markerImageUrl, mindUrl, sceneName]);

  return (
    <section className="ar-camera-card">
      <div className="ar-camera-stage">{activeViewer}</div>

      <div className="ar-camera-controls">
        <div>
          <span className="ar-status-pill">{scene?.status === 'published' ? 'Escena publicada' : 'Escena AR'}</span>
          <h2>{sceneName}</h2>
          <p>Modelo: {modelLabel}</p>
        </div>

        <div className="ar-mode-toggle" role="tablist" aria-label="Modo de realidad aumentada">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'marker'}
            className={`ar-mode-btn ${mode === 'marker' ? 'is-active' : ''}`}
            onClick={() => setMode('marker')}
            disabled={!markerReady}
          >
            Escanear marcador
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'floor'}
            className={`ar-mode-btn ${mode === 'floor' ? 'is-active' : ''}`}
            onClick={() => setMode('floor')}
            disabled={!floorReady}
          >
            Ver en el piso
          </button>
        </div>

        {modelAsset?.url && (
          <a className="btn btn-ghost" href={modelAsset.url} target="_blank" rel="noreferrer">
            Abrir modelo
          </a>
        )}

        {history.length > 0 && (
          <div className="ar-scanned-strip">
            <h3>Ya escaneados ({history.length})</h3>
            <ul>
              {history.slice(0, 8).map((item) => (
                <li key={item.id} className={item.id === scene?.id ? 'is-current' : ''}>
                  <span className="ar-scanned-dot" aria-hidden="true" />
                  {item.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export default ArCameraExperience;
