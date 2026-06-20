import React, { useMemo, useState } from 'react';
import EditorModal from './EditorModal.jsx';

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (!bytes) return 'Tamaño no disponible';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function InsertModel3DModal({ assets = [], onInsert, onClose, onUploadAsset }) {
  const [assetId, setAssetId] = useState('');
  const [uploadedAsset, setUploadedAsset] = useState(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

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
      const uploaded = await onUploadAsset(file);
      if (!uploaded?.id) throw new Error('El modelo se subió, pero no devolvió un asset válido.');
      setUploadedAsset(uploaded);
      setAssetId(String(uploaded.id));
      if (!title.trim()) setTitle(uploaded.name || file.name);
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
      title: title.trim() || selectedModel.name || 'Modelo 3D',
      caption: caption.trim(),
      displayMode: 'inline-card',
      modelUrl: selectedModel.previewUrl || '',
      layout: { width: 520, height: 360, align: 'center' },
    });
  };

  return (
    <EditorModal
      title="Insertar modelo 3D"
      description="Selecciona un asset existente o sube un GLB/GLTF sin cargarlo en el modal."
      onClose={onClose}
      busy={uploading}
    >
      <form className="editor-modal-form" onSubmit={submit}>
        <label className="field">
          <span>Modelo disponible</span>
          <select data-autofocus value={assetId} onChange={(event) => { setAssetId(event.target.value); setError(''); }} disabled={uploading}>
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

        {onUploadAsset && (
          <label className="field editor-modal-file-field">
            <span>Subir modelo nuevo</span>
            <input type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" onChange={uploadModel} disabled={uploading} />
            <small>El asset se guarda en la leyenda y queda seleccionado automáticamente.</small>
          </label>
        )}

        <label className="field">
          <span>Título</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Modelo 3D" disabled={uploading} />
        </label>
        <label className="field">
          <span>Caption <em>opcional</em></span>
          <input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Descripción breve" disabled={uploading} />
        </label>

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
