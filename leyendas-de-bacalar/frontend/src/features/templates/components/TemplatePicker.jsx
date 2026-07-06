import React from 'react';
import TemplateSurface from './TemplateSurface.jsx';
import { listTemplates } from '../templateRegistry.js';

// Word/Canva-like gallery. Each card renders a LIVE cover thumbnail from the
// template definition (not an image), pre-filled with the legend's title/author.
export default function TemplatePicker({ value, onSelect, meta = {} }) {
  const templates = listTemplates();
  const previewData = {
    content: { title: meta.title || '', subtitle: meta.subtitle || '', author: meta.author || '' },
  };

  return (
    <div className="tpl-picker">
      <div className="tpl-picker__head">
        <h3>Elige una plantilla</h3>
        <p>Se crea tu libro con portada y contraportada listas. Podrás editarlas después.</p>
      </div>

      <div className="tpl-grid">
        {templates.map((template) => {
          const active = value === template.id;
          return (
            <div
              key={template.id}
              className={`tpl-card${active ? ' is-active' : ''}`}
              role="button"
              tabIndex={0}
              aria-pressed={active}
              onClick={() => onSelect?.(template.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect?.(template.id);
                }
              }}
            >
              <div className="tpl-card__thumb">
                <TemplateSurface surface={template.cover} data={previewData} />
              </div>
              <span className="tpl-card__cat">{template.category}</span>
              <div className="tpl-card__meta">
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </div>
              <button
                type="button"
                className="tpl-card__use"
                onClick={(event) => { event.stopPropagation(); onSelect?.(template.id); }}
              >
                {active ? 'Seleccionada' : 'Usar plantilla'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
