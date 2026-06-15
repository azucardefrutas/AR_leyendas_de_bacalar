import React, { Suspense, lazy, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';

// Lazy-loaded so the heavy three.js / react-three bundle is only fetched when the
// user actually opens the 3D viewer.
const Model3DViewer = lazy(() => import('./Model3DViewer.jsx'));

function getModelAsset(scene = {}) {
  return scene.assets || scene.asset || scene.model_asset || null;
}

function getModelUrl(asset = {}) {
  return asset?.url || asset?.public_url || asset?.file_url || asset?.external_url || '';
}

function getMarkerAsset(marker = {}) {
  return marker?.assets || marker?.asset || null;
}

function getCameraArConfig(scene = {}) {
  return scene.interaction_config?.camera_ar
    || scene.interactionConfig?.cameraAr
    || scene.interactionConfig?.camera_ar
    || scene.metadata?.camera_ar
    || scene.metadata?.ar_camera
    || null;
}

function isCameraArReady(scene = {}) {
  const config = getCameraArConfig(scene);
  return Boolean(
    config?.enabled
    && (config.trackingUrl || config.tracking_url || config.trackingAssetUrl || config.mindUrl || config.pattUrl),
  );
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

/**
 * Minimal AR scene viewer placeholder. The real WebGL/3D viewer is not ready yet,
 * so this shows the scene metadata, the linked 3D model and a clear status.
 * No new dependencies are introduced.
 */
function ArSceneModal({ scene, marker = null, pageNumber = null, onClose }) {
  const [showViewer, setShowViewer] = useState(false);

  if (!scene) return null;

  const modelAsset = getModelAsset(scene);
  const modelUrl = getModelUrl(modelAsset);
  const markerAsset = getMarkerAsset(marker);
  const statusLabel = sceneStatusLabels[String(scene.status || '').toLowerCase()] || scene.status || 'No disponible';
  const modelName = modelAsset?.metadata?.original_name || modelAsset?.name || 'Modelo 3D';
  const cameraArReady = isCameraArReady(scene);

  return (
    <Modal title={scene.name || 'Escena 3D'} onClose={onClose}>
      <div className="ar-scene-modal">
        <div className="ar-scene-modal-status">
          <span className="ar-scene-badge">3D / AR</span>
          <span className="ar-scene-badge">{statusLabel}</span>
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
              {cameraArReady && (
                <a className="btn btn-ghost" href={`/ar/scene/${scene.id}`}>
                  Ver con camara AR
                </a>
              )}
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
            onClose={() => setShowViewer(false)}
          />
        </Suspense>
      )}
    </Modal>
  );
}

export default ArSceneModal;
