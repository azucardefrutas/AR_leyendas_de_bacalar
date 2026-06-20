import React, { useState } from 'react';
import EditorModal from './EditorModal.jsx';
import { isSafeHttpUrl } from './editorModalUtils.js';

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export default function InsertImageModal({ onInsert, onClose, onUploadImage }) {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const chooseFile = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    if (selectedFile && !IMAGE_TYPES.has(selectedFile.type)) {
      setFile(null);
      setError('Selecciona una imagen PNG, JPG o WebP.');
      event.target.value = '';
      return;
    }
    setFile(selectedFile);
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!file && !isSafeHttpUrl(url)) {
      setError('Selecciona una imagen o usa una URL http(s) válida.');
      return;
    }

    setUploading(true);
    try {
      const uploadedAsset = file ? await onUploadImage(file) : null;
      const finalUrl = file
        ? (typeof uploadedAsset === 'string' ? uploadedAsset : uploadedAsset?.previewUrl || uploadedAsset?.url)
        : url.trim();
      if (!finalUrl) throw new Error('No se obtuvo una URL utilizable para la imagen.');
      onInsert({
        assetId: typeof uploadedAsset === 'object' ? uploadedAsset?.id || '' : '',
        url: finalUrl,
        alt: alt.trim(),
        caption: caption.trim(),
      });
    } catch (uploadError) {
      setError(uploadError?.message || 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <EditorModal
      title="Insertar imagen"
      description="Sube una imagen de la leyenda o utiliza una URL externa segura."
      onClose={onClose}
      busy={uploading}
    >
      <form className="editor-modal-form" onSubmit={submit}>
        {onUploadImage && (
          <label className="field editor-modal-file-field">
            <span>Subir desde computadora</span>
            <input data-autofocus type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseFile} disabled={uploading} />
            {file && <small>{file.name}</small>}
          </label>
        )}

        {onUploadImage && <p className="editor-modal-or"><span>o</span></p>}

        <label className="field">
          <span>URL de imagen</span>
          <input data-autofocus={!onUploadImage || undefined} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://ejemplo.com/imagen.webp" disabled={uploading || Boolean(file)} />
        </label>
        <label className="field">
          <span>Texto alternativo</span>
          <input value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="Describe el contenido de la imagen" disabled={uploading} />
        </label>
        <label className="field">
          <span>Caption <em>opcional</em></span>
          <input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Texto visible debajo de la imagen" disabled={uploading} />
        </label>

        {error && <p className="editor-modal-error" role="alert">{error}</p>}
        <div className="editor-modal-actions">
          <button type="button" className="editor-modal-cancel" onClick={onClose} disabled={uploading}>Cancelar</button>
          <button type="submit" className="editor-modal-confirm" disabled={uploading || (!file && !url.trim())}>
            {uploading ? 'Subiendo…' : 'Insertar imagen'}
          </button>
        </div>
      </form>
    </EditorModal>
  );
}
