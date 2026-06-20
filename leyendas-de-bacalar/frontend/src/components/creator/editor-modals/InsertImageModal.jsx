import React, { useState } from 'react';
import Modal from '../../ui/Modal.jsx';

const isHttpUrl = (value = '') => /^https?:\/\//i.test(String(value).trim());

/**
 * Insert an image by URL or by uploading a file. File upload is delegated to the parent
 * `onUploadImage(file) -> url` (reuses the project's asset upload); if not provided, only
 * URL is available.
 */
export default function InsertImageModal({ onInsert, onClose, onUploadImage }) {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const insertWithUrl = (finalUrl) => {
    onInsert({ url: finalUrl, alt: alt.trim(), caption: caption.trim() });
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!onUploadImage) { setError('La subida no está disponible aquí; usa una URL.'); return; }
    setUploading(true);
    setError('');
    try {
      const uploadedUrl = await onUploadImage(file);
      if (!uploadedUrl) throw new Error('No se obtuvo URL.');
      insertWithUrl(uploadedUrl);
    } catch (uploadError) {
      setError(uploadError?.message || 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const submitUrl = (event) => {
    event.preventDefault();
    if (!isHttpUrl(url)) { setError('La URL debe empezar con http(s)://'); return; }
    insertWithUrl(url.trim());
  };

  return (
    <Modal title="Insertar imagen" onClose={onClose}>
      <form className="editor-modal-form" onSubmit={submitUrl}>
        <label className="field"><span>Subir imagen</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} disabled={uploading || !onUploadImage} />
        </label>
        <p className="editor-modal-or">— o —</p>
        <label className="field"><span>URL de imagen</span>
          <input className="standalone-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </label>
        <label className="field"><span>Texto alternativo</span>
          <input className="standalone-input" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Describe la imagen" />
        </label>
        <label className="field"><span>Caption</span>
          <input className="standalone-input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Texto debajo (opcional)" />
        </label>
        {uploading && <p className="creator-muted">Subiendo imagen…</p>}
        {error && <p className="error-message">{error}</p>}
        <div className="editor-modal-actions">
          <button type="button" className="editor-modal-cancel" onClick={onClose}>Cancelar</button>
          <button type="submit" className="editor-modal-confirm" disabled={uploading}>Insertar URL</button>
        </div>
      </form>
    </Modal>
  );
}
