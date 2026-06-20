import React, { useState } from 'react';
import Modal from '../../ui/Modal.jsx';

/**
 * Pick an already-uploaded marker to embed as a light card. For "crear desde cero"
 * stories — NOT the PDF page hotspot system.
 */
export default function InsertMarkerModal({ assets = [], onInsert, onClose, onGoToResources }) {
  const [assetId, setAssetId] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!assetId) { setError('Selecciona un marcador.'); return; }
    const found = assets.find((asset) => String(asset.id) === String(assetId));
    onInsert({
      assetId,
      title: title.trim() || found?.name || 'Marcador',
      caption: caption.trim(),
      displayMode: 'inline-card',
    });
  };

  return (
    <Modal title="Insertar marcador" onClose={onClose}>
      <form className="editor-modal-form" onSubmit={submit}>
        {assets.length ? (
          <label className="field"><span>Marcador</span>
            <select className="standalone-input" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="">Selecciona…</option>
              {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name || asset.id}</option>)}
            </select>
          </label>
        ) : (
          <p className="creator-muted">
            No hay marcadores subidos para esta leyenda todavía.
            {onGoToResources && <> <button type="button" className="inline-link-button" onClick={onGoToResources}>Subir marcador</button></>}
          </p>
        )}
        <label className="field"><span>Título</span>
          <input className="standalone-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Marcador" />
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
