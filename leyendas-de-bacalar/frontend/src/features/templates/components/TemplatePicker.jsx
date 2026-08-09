import { memo, useMemo } from 'react';
import TemplateSurface from './TemplateSurface.jsx';
import { listTemplates } from '../templateRegistry.js';

// Word/Canva-like gallery. Each card renders a LIVE cover thumbnail from the
// template definition (not an image), pre-filled with the legend's title/author.
const templates = listTemplates();

function TemplatePicker({ value, onSelect, meta = {} }) {
  const previewData = useMemo(() => ({
    content: { title: meta.title || '', subtitle: meta.subtitle || '', author: meta.author || '' },
  }), [meta.author, meta.subtitle, meta.title]);

  return (
    <div className="tpl-picker">
      <div className="tpl-grid">
        {templates.map((template) => {
          const active = value === template.id;
          return (
            <button
              type="button"
              key={template.id}
              className={`tpl-card${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onSelect?.(template.id)}
            >
              <div className="tpl-card__thumb">
                <TemplateSurface surface={template.cover} data={previewData} />
              </div>
              <span className="tpl-card__cat">{template.category}</span>
              <div className="tpl-card__meta">
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </div>
              <span className="tpl-card__use">
                {active ? 'Seleccionada' : 'Usar plantilla'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default memo(TemplatePicker);
