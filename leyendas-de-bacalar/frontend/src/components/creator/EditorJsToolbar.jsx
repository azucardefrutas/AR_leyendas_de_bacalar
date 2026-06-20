import React from 'react';

export function EditorIcon({ name, size = 18, strokeWidth = 1.8, className = '' }) {
  const iconProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': true,
  };

  const paths = {
    bold: <><path d="M6 4h8a4 4 0 0 1 0 8H6z" /><path d="M6 12h9a4 4 0 0 1 0 8H6z" /></>,
    italic: <><path d="M19 4h-9" /><path d="M14 20H5" /><path d="m15 4-6 16" /></>,
    underline: <><path d="M6 3v7a6 6 0 0 0 12 0V3" /><path d="M4 21h16" /></>,
    strikethrough: <><path d="M16 4H9a3 3 0 0 0-2.8 4" /><path d="M14 20h-4a4 4 0 0 1-4-4" /><path d="M4 12h16" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1" /><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1" /></>,
    list: <><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>,
    checklist: <><path d="m3 6 2 2 4-4" /><path d="M11 6h10" /><path d="m3 12 2 2 4-4" /><path d="M11 12h10" /><path d="m3 18 2 2 4-4" /><path d="M11 18h10" /></>,
    quote: <><path d="M3 21c3 0 7-1 7-8V5c0-1.2-.8-2-2-2H4c-1.2 0-2 .8-2 2v6c0 1.2.8 2 2 2h3c0 3-1 5-4 6" /><path d="M14 21c3 0 7-1 7-8V5c0-1.2-.8-2-2-2h-4c-1.2 0-2 .8-2 2v6c0 1.2.8 2 2 2h3c0 3-1 5-4 6" /></>,
    minus: <path d="M5 12h14" />,
    table: <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" /></>,
    image: <><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" /></>,
    box: <><path d="m21 8-9-5-9 5 9 5z" /><path d="m3 8 9 5 9-5" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></>,
    bookmark: <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />,
    eye: <><path d="M2.1 12a10 10 0 0 1 19.8 0 10 10 0 0 1-19.8 0" /><circle cx="12" cy="12" r="3" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" /></>,
    close: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></>,
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 15H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></>,
    pages: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  };

  return <svg {...iconProps}>{paths[name]}</svg>;
}

function ToolbarButton({ label, icon, text, onClick, onMouseDown }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} onMouseDown={onMouseDown}>
      {icon ? <EditorIcon name={icon} /> : <span className="editor-toolbar-text-icon">{text}</span>}
    </button>
  );
}

export default function EditorJsToolbar({
  onInline,
  onInsertBlock,
  onOpenModal,
  showModel3d = false,
  showMarker = false,
}) {
  const keepSelection = (event) => event.preventDefault();

  return (
    <div className="editorial-editor__toolbar" role="toolbar" aria-label="Herramientas de formato">
      <div className="editorial-editor__toolbar-group" aria-label="Formato de texto">
        <ToolbarButton label="Negrita" icon="bold" onMouseDown={keepSelection} onClick={() => onInline('bold')} />
        <ToolbarButton label="Cursiva" icon="italic" onMouseDown={keepSelection} onClick={() => onInline('italic')} />
        <ToolbarButton label="Subrayado" icon="underline" onMouseDown={keepSelection} onClick={() => onInline('underline')} />
        <ToolbarButton label="Tachado" icon="strikethrough" onMouseDown={keepSelection} onClick={() => onInline('strikeThrough')} />
        <ToolbarButton label="Insertar enlace" icon="link" onClick={() => onOpenModal('link')} />
      </div>

      <span className="editorial-editor__toolbar-sep" aria-hidden="true" />

      <div className="editorial-editor__toolbar-group" aria-label="Bloques">
        <ToolbarButton label="Título H2" text="H2" onClick={() => onInsertBlock('header', { text: '', level: 2 })} />
        <ToolbarButton label="Subtítulo H3" text="H3" onClick={() => onInsertBlock('header', { text: '', level: 3 })} />
        <ToolbarButton label="Lista" icon="list" onClick={() => onInsertBlock('list', { style: 'unordered', items: [] })} />
        <ToolbarButton label="Checklist" icon="checklist" onClick={() => onInsertBlock('checklist', { items: [] })} />
        <ToolbarButton label="Cita" icon="quote" onClick={() => onInsertBlock('quote', { text: '', caption: '' })} />
        <ToolbarButton label="Separador" icon="minus" onClick={() => onInsertBlock('delimiter', {})} />
        <ToolbarButton label="Tabla" icon="table" onClick={() => onOpenModal('table')} />
        <ToolbarButton label="Imagen" icon="image" onClick={() => onOpenModal('image')} />
        {showModel3d && <ToolbarButton label="Modelo 3D" icon="box" onClick={() => onOpenModal('model3d')} />}
        {showMarker && <ToolbarButton label="Marcador" icon="bookmark" onClick={() => onOpenModal('marker')} />}
      </div>
    </div>
  );
}
