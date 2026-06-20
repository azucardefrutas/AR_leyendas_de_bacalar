import React, { useState } from 'react';
import Modal from '../../ui/Modal.jsx';

/**
 * Pick an already-uploaded 3D model to embed as a light inline card (no GLB loaded here).
 * For "crear desde cero" stories — independent from the PDF hotspot/marker system.
 */
export default function InsertModel3DModal({ assets = [], onInsert, onClose, onGoToResources }) {
  const [assetId, setAssetId] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!assetId) { setError('Selecciona un modelo 3D.'); return; }
    const found = assets.find((asset) => String(asset.id) === String(assetId));
    onInsert({
      assetId,
      title: title.trim() || found?.name || 'Modelo 3D',
      caption: caption.trim(),
      displayMode: 'inline-card',
    });
  };

  return (
    <Modal title="Insertar modelo 3D" onClose={onClose}>
      <form className="editor-modal-form" onSubmit={submit}>
        {assets.length ? (
          <label className="field"><span>Modelo 3D</span>
            <select className="standalone-input" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="">Selecciona…</option>
              {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name || asset.id}</option>)}
            </select>
          </label>
        ) : (
          <p className="creator-muted">
            No hay modelos 3D subidos para esta leyenda todavía.
            {onGoToResources && <> <button type="button" className="inline-link-button" onClick={onGoToResources}>Subir modelo</button></>}
          </p>
        )}
        <label className="field"><span>Título</span>
          <input className="standalone-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Modelo 3D" />
        </label>
        <label className="field"><span>Caption</span>
          <input className="standalone-input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Texto (opcional)" />
        </label>
        {error && <p className="error-message">{error}</p>}
        <div className="editor-modal-actions">
          <button type="button" className="editor-modal-cancel" onClick={onClose}>Cancelar</button>
          <button type="submit" className="editor-modal-confirm" disabled={!assets.length}>Insertar</button>
        </div>
      </form>
    </Modal>
  );
}
