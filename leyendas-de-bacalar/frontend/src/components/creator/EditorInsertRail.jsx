import React, { useEffect, useRef, useState } from 'react';
import { EditorIcon } from './EditorJsToolbar.jsx';

const actions = [
  { id: 'text', label: 'Texto', icon: 'text' },
  { id: 'image', label: 'Imagen', icon: 'image' },
  { id: 'model3d', label: 'Modelo 3D', icon: 'box', gatedBy: 'model3d' },
  { id: 'marker', label: 'Marcador', icon: 'bookmark', gatedBy: 'marker' },
  { id: 'table', label: 'Tabla', icon: 'table' },
  { id: 'delimiter', label: 'Separador', icon: 'minus' },
];

export default function EditorInsertRail({
  onInsertBlock,
  onOpenModal,
  showModel3d = false,
  showMarker = false,
}) {
  const [open, setOpen] = useState(false);
  const railRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!railRef.current?.contains(event.target)) setOpen(false);
    };
    const closeEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside, true);
    window.addEventListener('keydown', closeEscape, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside, true);
      window.removeEventListener('keydown', closeEscape, true);
    };
  }, [open]);

  const runAction = (id) => {
    if (id === 'text') onInsertBlock?.('paragraph', { text: '' });
    if (id === 'delimiter') onInsertBlock?.('delimiter', {});
    if (['image', 'model3d', 'marker', 'table'].includes(id)) onOpenModal?.(id);
    setOpen(false);
  };

  const visibleActions = actions.filter((action) => (
    action.gatedBy !== 'model3d' || showModel3d
  ) && (
    action.gatedBy !== 'marker' || showMarker
  ));

  return (
    <div ref={railRef} className={`editor-insert-rail ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="editor-insert-rail__trigger"
        aria-label={open ? 'Cerrar herramientas de inserción' : 'Insertar contenido'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <EditorIcon name={open ? 'close' : 'plus'} size={18} />
      </button>

      <div className="editor-insert-rail__panel" aria-label="Insertar en la página">
        {visibleActions.map((action) => (
          <button
            key={action.id}
            type="button"
            aria-label={`Insertar ${action.label.toLowerCase()}`}
            title={action.label}
            onClick={() => runAction(action.id)}
          >
            <EditorIcon name={action.icon} size={18} />
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
