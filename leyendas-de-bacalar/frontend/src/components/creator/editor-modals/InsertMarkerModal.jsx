import React, { useMemo, useState } from 'react';
import EditorModal from './EditorModal.jsx';

export default function InsertMarkerModal({ assets = [], onInsert, onClose, onUploadAsset }) {
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
  const selectedMarker = options.find((asset) => String(asset.id) === String(assetId));

  const uploadMarker = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Selecciona un marcador PNG, JPG o WebP.');
      event.target.value = '';
      return;
    }

    setUploading(true);
    setError('');
    try {
      const uploaded = await onUploadAsset(file);
      if (!uploaded?.id) throw new Error('El marcador se subió, pero no devolvió un asset válido.');
      setUploadedAsset(uploaded);
      setAssetId(String(uploaded.id));
      if (!title.trim()) setTitle(uploaded.name || file.name);
    } catch (uploadError) {
      setError(uploadError?.message || 'No se pudo subir el marcador.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!selectedMarker) {
      setError('Selecciona o sube un marcador.');
      return;
    }
    onInsert({
      assetId: selectedMarker.id,
      title: title.trim() || selectedMarker.name || 'Marcador',
      caption: caption.trim(),
      previewUrl: selectedMarker.previewUrl || '',
      displayMode: 'inline-card',
    });
  };

  return (
    <EditorModal
      title="Insertar marcador"
      description="Selecciona una imagen guardada o sube un marcador para esta historia."
      onClose={onClose}
      busy={uploading}
    >
      <form className="editor-modal-form" onSubmit={submit}>
        <label className="field">
          <span>Marcador disponible</span>
          <select data-autofocus value={assetId} onChange={(event) => { setAssetId(event.target.value); setError(''); }} disabled={uploading}>
            <option value="">Selecciona un marcador…</option>
            {options.map((asset) => <option key={asset.id} value={asset.id}>{asset.name || asset.id}</option>)}
          </select>
        </label>

        {selectedMarker && (
          <div className="editor-modal-marker-preview">
            {selectedMarker.previewUrl
              ? <img src={selectedMarker.previewUrl} alt="" />
              : <span aria-hidden="true">AR</span>}
            <div>
              <strong>{selectedMarker.name || 'Marcador'}</strong>
              <small>{selectedMarker.status || 'guardado'}</small>
            </div>
          </div>
        )}

        {onUploadAsset && (
          <label className="field editor-modal-file-field">
            <span>Subir marcador nuevo</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadMarker} disabled={uploading} />
            <small>El asset se guarda en la leyenda y queda seleccionado automáticamente.</small>
          </label>
        )}

        <label className="field">
          <span>Título</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Marcador" disabled={uploading} />
        </label>
        <label className="field">
          <span>Caption <em>opcional</em></span>
          <input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Descripción breve" disabled={uploading} />
        </label>

        {error && <p className="editor-modal-error" role="alert">{error}</p>}
        <div className="editor-modal-actions">
          <button type="button" className="editor-modal-cancel" onClick={onClose} disabled={uploading}>Cancelar</button>
          <button type="submit" className="editor-modal-confirm" disabled={uploading || !assetId}>
            {uploading ? 'Subiendo…' : 'Insertar marcador'}
          </button>
        </div>
      </form>
    </EditorModal>
  );
}
