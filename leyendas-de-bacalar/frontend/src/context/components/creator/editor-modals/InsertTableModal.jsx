import React, { useState } from 'react';
import EditorModal from './EditorModal.jsx';
import { buildTableContent } from './editorModalUtils.js';

export default function InsertTableModal({ onInsert, onClose }) {
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(3);
  const [includeHeader, setIncludeHeader] = useState(true);

  const submit = (event) => {
    event.preventDefault();
    onInsert({
      withHeadings: includeHeader,
      content: buildTableContent(rows, columns, includeHeader),
    });
  };

  return (
    <EditorModal
      title="Insertar tabla"
      description="Define la estructura inicial; podrás editar cada celda dentro del lienzo."
      onClose={onClose}
      size="sm"
    >
      <form className="editor-modal-form" onSubmit={submit}>
        <div className="editor-modal-row">
          <label className="field">
            <span>Filas</span>
            <input data-autofocus type="number" min="1" max="20" value={rows} onChange={(event) => setRows(event.target.value)} />
          </label>
          <label className="field">
            <span>Columnas</span>
            <input type="number" min="1" max="12" value={columns} onChange={(event) => setColumns(event.target.value)} />
          </label>
        </div>
        <label className="editor-modal-check">
          <input type="checkbox" checked={includeHeader} onChange={(event) => setIncludeHeader(event.target.checked)} />
          Incluir encabezado
        </label>
        <div className="editor-modal-actions">
          <button type="button" className="editor-modal-cancel" onClick={onClose}>Cancelar</button>
          <button type="submit" className="editor-modal-confirm">Insertar tabla</button>
        </div>
      </form>
    </EditorModal>
  );
}
