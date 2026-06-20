import React, { useState } from 'react';
import Modal from '../../ui/Modal.jsx';

const isHttpUrl = (value = '') => /^https?:\/\//i.test(String(value).trim());

/**
 * Insert a link as a sanitized paragraph block. The preview/backend sanitize the markup,
 * so no raw HTML is ever shown.
 */
export default function InsertLinkModal({ onInsert, onClose }) {
  const [url, setUrl] = useState('https://');
  const [text, setText] = useState('');
  const [newTab, setNewTab] = useState(true);
  const [noopener, setNoopener] = useState(true);
  const [nofollow, setNofollow] = useState(false);
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!isHttpUrl(url)) { setError('La URL debe empezar con http(s)://'); return; }
    const rel = [noopener && 'noopener noreferrer', nofollow && 'nofollow'].filter(Boolean).join(' ');
    onInsert({ url: url.trim(), text: (text.trim() || url.trim()), newTab, rel });
  };

  return (
    <Modal title="Insertar enlace" onClose={onClose}>
      <form className="editor-modal-form" onSubmit={submit}>
        <label className="field"><span>URL</span>
          <input className="standalone-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
        </label>
        <label className="field"><span>Texto</span>
          <input className="standalone-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Texto del enlace" />
        </label>
        <label className="editor-modal-check"><input type="checkbox" checked={newTab} onChange={(e) => setNewTab(e.target.checked)} /> Abrir en nueva pestaña</label>
        <label className="editor-modal-check"><input type="checkbox" checked={noopener} onChange={(e) => setNoopener(e.target.checked)} /> rel="noopener noreferrer"</label>
        <label className="editor-modal-check"><input type="checkbox" checked={nofollow} onChange={(e) => setNofollow(e.target.checked)} /> rel="nofollow"</label>
        {error && <p className="error-message">{error}</p>}
        <div className="editor-modal-actions">
          <button type="button" className="editor-modal-cancel" onClick={onClose}>Cancelar</button>
          <button type="submit" className="editor-modal-confirm">Insertar</button>
        </div>
      </form>
    </Modal>
  );
}
