import React, { useState } from 'react';
import Modal from '../../ui/Modal.jsx';

export default function InsertTableModal({ onInsert, onClose }) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [withHeadings, setWithHeadings] = useState(true);

  const submit = (event) => {
    event.preventDefault();
    const r = Math.min(Math.max(Number(rows) || 1, 1), 20);
    const c = Math.min(Math.max(Number(cols) || 1, 1), 12);
    const content = Array.from({ length: r }, () => Array.from({ length: c }, () => ''));
    onInsert({ withHeadings, content });
  };

  return (
    <Modal title="Insertar tabla" onClose={onClose}>
      <form className="editor-modal-form" onSubmit={submit}>
        <div className="editor-modal-row">
          <label className="field"><span>Filas</span>
            <input className="standalone-input" type="number" min="1" max="20" value={rows} onChange={(e) => setRows(e.target.value)} />
          </label>
          <label className="field"><span>Columnas</span>
            <input className="standalone-input" type="number" min="1" max="12" value={cols} onChange={(e) => setCols(e.target.value)} />
          </label>
        </div>
        <label className="editor-modal-check"><input type="checkbox" checked={withHeadings} onChange={(e) => setWithHeadings(e.target.checked)} /> Incluir encabezado</label>
        <div className="editor-modal-actions">
          <button type="button" className="editor-modal-cancel" onClick={onClose}>Cancelar</button>
          <button type="submit" className="editor-modal-confirm">Insertar</button>
        </div>
      </form>
    </Modal>
  );
}
