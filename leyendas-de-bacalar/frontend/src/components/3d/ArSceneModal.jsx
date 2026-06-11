import React from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';

function getModelAsset(scene = {}) {
  return scene.assets || scene.asset || scene.model_asset || null;
}

function getModelUrl(asset = {}) {
  return asset?.url || asset?.public_url || asset?.file_url || asset?.external_url || '';
}

function getMarkerAsset(marker = {}) {
  return marker?.assets || marker?.asset || null;
}

const sceneStatusLabels = {
  draft: 'Borrador',
  in_review: 'En revision',
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
  if (!scene) return null;

  const modelAsset = getModelAsset(scene);
  const modelUrl = getModelUrl(modelAsset);
  const markerAsset = getMarkerAsset(marker);
  const statusLabel = sceneStatusLabels[String(scene.status || '').toLowerCase()] || scene.status || 'No disponible';
  const modelName = modelAsset?.metadata?.original_name || modelAsset?.name || 'Modelo 3D';

  return (
    <Modal title={scene.name || 'Escena 3D'} onClose={onClose}>
      <div className="ar-scene-modal">
        <div className="ar-scene-modal-status">
          <span className="ar-scene-badge">3D / AR</span>
          <span className="ar-scene-badge">{statusLabel}</span>
          {pageNumber != null && <span className="ar-scene-badge">Pagina {pageNumber}</span>}
        </div>

        <p className="ar-scene-modal-note">
          El visor 3D interactivo esta en preparacion. Por ahora puedes revisar los datos de la
          escena y abrir o descargar el modelo asociado.
        </p>

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
            <a className="btn" href={modelUrl} target="_blank" rel="noreferrer">
              Abrir modelo 3D
            </a>
          ) : (
            <Button type="button" variant="ghost" disabled>
              Modelo no disponible
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ArSceneModal;
