import React, { Suspense, lazy, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import { getSceneAnimationConfig } from './modelAnimationConfig.js';
import { getModelAsset, getModelUrl } from './modelScene.js';

const Model3DViewer = lazy(() => import('./Model3DViewer.jsx'));

function getMarkerAsset(marker = {}) {
  return marker?.assets || marker?.asset || marker?.marker || marker?.markerAsset || marker?.marker_asset || null;
}

const sceneStatusLabels = {
  draft: 'Borrador',
  in_review: 'En revision',
  active: 'Activa',
  inactive: 'Inactiva',
  rejected: 'Rechazada',
  published: 'Publicada',
  approved: 'Aprobada',
  archived: 'Archivada',
};

function formatFileSize(size) {
  const bytes = Number(size || 0);
  if (!bytes) return 'No disponible';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ArSceneModal({ scene, marker = null, pageNumber = null, onClose }) {
  const [showViewer, setShowViewer] = useState(false);
  const [detectedClips, setDetectedClips] = useState(null);

  if (!scene) return null;

  const modelAsset = getModelAsset(scene);
  const modelUrl = getModelUrl(scene);
  const markerAsset = getMarkerAsset(marker);
  const statusLabel = sceneStatusLabels[String(scene.status || '').toLowerCase()] || scene.status || 'No disponible';
  const modelName = modelAsset?.metadata?.original_name || modelAsset?.name || 'Modelo 3D';
  const savedAnimation = getSceneAnimationConfig(scene);
  const clips = detectedClips ?? savedAnimation.clips;
  const animationLabel = clips.length
    ? `Animado · ${clips.length} ${clips.length === 1 ? 'clip' : 'clips'}`
    : (detectedClips || savedAnimation.inspected ? 'Modelo estatico' : 'Animacion sin analizar');

  return (
    <Modal title={scene.name || 'Escena 3D'} onClose={onClose}>
      <div className="ar-scene-modal">
        <div className="ar-scene-modal-status">
          <span className="ar-scene-badge">3D / AR</span>
          <span className="ar-scene-badge">{statusLabel}</span>
          {modelUrl && <span className={`ar-scene-badge ${clips.length ? 'is-animated' : ''}`}>{animationLabel}</span>}
          {pageNumber != null && <span className="ar-scene-badge">Pagina {pageNumber}</span>}
        </div>

        {modelUrl ? (
          <p className="ar-scene-modal-note">
            Abre el modelo en el visor 3D interactivo o descarga el archivo original.
          </p>
        ) : (
          <p className="ar-scene-modal-note">
            Esta escena todavia no tiene un modelo 3D disponible para cargar.
          </p>
        )}

        {scene.description && <p className="ar-scene-modal-description">{scene.description}</p>}

        <dl className="ar-scene-modal-grid">
          <div>
            <dt>Modelo 3D</dt>
            <dd>{modelName}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>{modelAsset?.asset_type || modelAsset?.mime_type || 'No disponible'}</dd>
          </div>
          <div>
            <dt>Tamano</dt>
            <dd>{formatFileSize(modelAsset?.file_size || modelAsset?.size_bytes)}</dd>
          </div>
          {marker && (
            <div>
              <dt>Marcador asociado</dt>
              <dd>{markerAsset?.metadata?.original_name || marker.marker_code || 'Sin nombre'}</dd>
            </div>
          )}
        </dl>

        <div className="ar-scene-modal-actions">
          {modelUrl ? (
            <>
              <Button type="button" onClick={() => setShowViewer(true)}>
                Ver modelo 3D
              </Button>
              <a className="btn btn-ghost" href={modelUrl} target="_blank" rel="noreferrer">
                Abrir / descargar
              </a>
              <a className="btn btn-ghost" href={`/ar/scene/${scene.id}`}>
                Ver en Realidad Aumentada
              </a>
            </>
          ) : (
            <span className="ar-scene-modal-empty">Esta escena todavia no tiene un modelo 3D asociado.</span>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>

      {showViewer && modelUrl && (
        <Suspense fallback={null}>
          <Model3DViewer
            scene={scene}
            modelUrl={modelUrl}
            title={scene.name}
            animationConfig={savedAnimation}
            onAnimationsDetected={setDetectedClips}
            onClose={() => setShowViewer(false)}
          />
        </Suspense>
      )}
    </Modal>
  );
}

export default ArSceneModal;
