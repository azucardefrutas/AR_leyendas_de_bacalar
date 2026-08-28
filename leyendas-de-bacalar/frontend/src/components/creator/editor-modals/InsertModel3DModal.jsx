import { useMemo, useState } from 'react';
import EditorModal from './EditorModal.jsx';
import ModelAnimationSettings from '../../3d/ModelAnimationSettings.jsx';
import { normalizeAnimationConfig } from '../../3d/modelAnimationConfig.js';
import { inspectModelFile } from '../../3d/modelFileInspection.js';

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (!bytes) return 'Tamaño no disponible';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function InsertModel3DModal({ assets = [], onInsert, onClose, onUploadAsset }) {
  const [assetId, setAssetId] = useState('');
  const [uploadedAsset, setUploadedAsset] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [animationConfig, setAnimationConfig] = useState(() => normalizeAnimationConfig({}));

  const options = useMemo(() => {
    if (!uploadedAsset) return assets;
    return [uploadedAsset, ...assets.filter((asset) => String(asset.id) !== String(uploadedAsset.id))];
  }, [assets, uploadedAsset]);
  const selectedModel = options.find((asset) => String(asset.id) === String(assetId));

  const uploadModel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/\.(glb|gltf)$/i.test(file.name)) {
      setError('Selecciona un archivo GLB o GLTF.');
      event.target.value = '';
      return;
    }

    setUploading(true);
    setError('');
    try {
      const inspectedAnimation = await inspectModelFile(file, 'load');
      const uploaded = await onUploadAsset(file);
      if (!uploaded?.id) throw new Error('El modelo se subió, pero no devolvió un asset válido.');
      setUploadedAsset({ ...uploaded, animationConfig: inspectedAnimation });
      setAssetId(String(uploaded.id));
      setAnimationConfig(inspectedAnimation);
    } catch (uploadError) {
      setError(uploadError?.message || 'No se pudo subir el modelo 3D.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!selectedModel) {
      setError('Selecciona o sube un modelo 3D.');
      return;
    }
    onInsert({
      assetId: selectedModel.id,
      title: selectedModel.name || 'Modelo 3D',
      caption: '',
      displayMode: 'inline-model',
      modelUrl: selectedModel.previewUrl || '',
      animationConfig,
      layout: { width: 520, height: 360, align: 'center' },
    });
  };

  return (
    <EditorModal
      title="Insertar modelo 3D"
      description="Usa una sola carga. El sistema detecta si el GLB/GLTF incluye animaciones."
      onClose={onClose}
      busy={uploading}
    >
      <form className="editor-modal-form" onSubmit={submit}>
        <label className="field">
          <span>Modelo disponible</span>
          <select
            data-autofocus
            value={assetId}
            onChange={(event) => {
              const nextId = event.target.value;
              const nextModel = options.find((asset) => String(asset.id) === String(nextId));
              setAssetId(nextId);
              setAnimationConfig(normalizeAnimationConfig(nextModel?.animationConfig || {}));
              setError('');
            }}
            disabled={uploading}
          >
            <option value="">Selecciona un modelo…</option>
            {options.map((asset) => <option key={asset.id} value={asset.id}>{asset.name || asset.id}</option>)}
          </select>
        </label>

        {selectedModel && (
          <div className="editor-modal-asset-summary">
            <strong>{selectedModel.name || 'Modelo 3D'}</strong>
            <span>{formatBytes(selectedModel.fileSize)} · {selectedModel.status || 'guardado'}</span>
          </div>
        )}

        {selectedModel?.previewUrl && (
          <ModelAnimationSettings
            modelUrl={selectedModel.previewUrl}
            value={animationConfig}
            onChange={setAnimationConfig}
            context="story"
          />
        )}

        {onUploadAsset && (
          <label className="field editor-modal-file-field">
            <span>Subir modelo nuevo</span>
            <input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={uploadModel} disabled={uploading} />
            <small>El asset se guarda en la leyenda y queda seleccionado automáticamente.</small>
          </label>
        )}

        {error && <p className="editor-modal-error" role="alert">{error}</p>}
        <div className="editor-modal-actions">
          <button type="button" className="editor-modal-cancel" onClick={onClose} disabled={uploading}>Cancelar</button>
          <button type="submit" className="editor-modal-confirm" disabled={uploading || !assetId}>
            {uploading ? 'Subiendo…' : 'Insertar modelo'}
          </button>
        </div>
      </form>
    </EditorModal>
  );
}
