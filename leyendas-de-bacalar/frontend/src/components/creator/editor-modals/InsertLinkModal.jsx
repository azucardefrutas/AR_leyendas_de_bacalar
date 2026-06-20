import React, { useState } from 'react';
import EditorModal from './EditorModal.jsx';
import { buildRelValue, isSafeHttpUrl } from './editorModalUtils.js';

export default function InsertLinkModal({ onInsert, onClose }) {
  const [url, setUrl] = useState('https://');
  const [text, setText] = useState('');
  const [newTab, setNewTab] = useState(true);
  const [noopener, setNoopener] = useState(true);
  const [noreferrer, setNoreferrer] = useState(true);
  const [nofollow, setNofollow] = useState(false);
  const [ugc, setUgc] = useState(false);
  const [sponsored, setSponsored] = useState(false);
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!isSafeHttpUrl(url)) {
      setError('Usa una URL válida que empiece con http:// o https://.');
      return;
    }

    onInsert({
      url: url.trim(),
      text: text.trim() || url.trim(),
      newTab,
      rel: buildRelValue({ newTab, noopener, noreferrer, nofollow, ugc, sponsored }),
    });
  };

  return (
    <EditorModal
      title="Insertar enlace"
      description="Crea un enlace seguro dentro de un bloque de texto."
      onClose={onClose}
    >
      <form className="editor-modal-form" onSubmit={submit}>
        <label className="field">
          <span>URL</span>
          <input data-autofocus value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://ejemplo.com" />
        </label>
        <label className="field">
          <span>Texto</span>
          <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Texto visible del enlace" />
        </label>

        <fieldset className="editor-modal-fieldset">
          <legend>Comportamiento y atributos rel</legend>
          <label className="editor-modal-check"><input type="checkbox" checked={newTab} onChange={(event) => setNewTab(event.target.checked)} /> Abrir en nueva pestaña</label>
          <div className="editor-modal-check-grid">
            <label className="editor-modal-check"><input type="checkbox" checked={noopener} onChange={(event) => setNoopener(event.target.checked)} /> noopener</label>
            <label className="editor-modal-check"><input type="checkbox" checked={noreferrer} onChange={(event) => setNoreferrer(event.target.checked)} /> noreferrer</label>
            <label className="editor-modal-check"><input type="checkbox" checked={nofollow} onChange={(event) => setNofollow(event.target.checked)} /> nofollow</label>
            <label className="editor-modal-check"><input type="checkbox" checked={ugc} onChange={(event) => setUgc(event.target.checked)} /> ugc</label>
            <label className="editor-modal-check"><input type="checkbox" checked={sponsored} onChange={(event) => setSponsored(event.target.checked)} /> sponsored</label>
          </div>
        </fieldset>

        {error && <p className="editor-modal-error" role="alert">{error}</p>}
        <div className="editor-modal-actions">
          <button type="button" className="editor-modal-cancel" onClick={onClose}>Cancelar</button>
          <button type="submit" className="editor-modal-confirm">Insertar enlace</button>
        </div>
      </form>
    </EditorModal>
  );
}
