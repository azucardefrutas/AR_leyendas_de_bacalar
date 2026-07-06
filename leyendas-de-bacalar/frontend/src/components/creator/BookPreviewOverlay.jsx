import React, { useCallback, useEffect, useMemo, useState } from 'react';
import EditorJsPreview from './EditorJsPreview.jsx';
import TemplateSurface from '../../features/templates/components/TemplateSurface.jsx';
import { getTemplateById } from '../../features/templates/templateRegistry.js';

// Fase 3 — clean full-book reading preview. NOT an editor: no toolbar, no panels,
// no handles, no resize or selection affordances. Renders the book continuously:
// template cover → Editor.js pages → template back cover.
export default function BookPreviewOverlay({
  pages = [], coverUrl = '', title = '', author = '', onClose,
  templateId = '', coverData = null, backCoverData = null,
}) {
  const template = templateId ? getTemplateById(templateId) : null;

  // Reading sequence: template cover (or image cover) → pages → template back cover.
  const slides = useMemo(() => {
    const readingPages = (pages || []).map((page, index) => ({
      kind: 'page',
      key: page.client_id || page.id || `page-${index}`,
      title: page.title,
      data: page.editor_data?.blocks ? page.editor_data : { blocks: [] },
    }));
    const list = [];
    if (template) list.push({ kind: 'tpl-cover', key: 'tpl-cover' });
    else if (coverUrl) list.push({ kind: 'cover', key: 'cover' });
    list.push(...readingPages);
    if (template) list.push({ kind: 'tpl-back', key: 'tpl-back' });
    return list;
  }, [pages, coverUrl, template]);

  const [index, setIndex] = useState(0);
  const total = slides.length;
  const safeIndex = Math.min(index, Math.max(total - 1, 0));
  const current = slides[safeIndex];

  const goPrev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);
  const goNext = useCallback(() => setIndex((i) => Math.min(i + 1, total - 1)), [total]);

  useEffect(() => {
    document.body.classList.add('book-preview-open');
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
      else if (event.key === 'ArrowLeft') goPrev();
      else if (event.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('book-preview-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, goPrev, goNext]);

  return (
    <div className="book-preview" role="dialog" aria-modal="true" aria-label="Vista previa del libro">
      <div className="book-preview__bar">
        <span className="book-preview__brand">Vista previa</span>
        <span className="book-preview__counter">
          {current?.kind === 'tpl-cover' || current?.kind === 'cover'
            ? 'Portada'
            : current?.kind === 'tpl-back'
              ? 'Contraportada'
              : `Página ${safeIndex + 1 - (template || coverUrl ? 1 : 0)} de ${pages.length}`}
        </span>
        <button type="button" className="book-preview__close" onClick={onClose} aria-label="Cerrar vista previa">
          Cerrar
        </button>
      </div>

      <div className="book-preview__stage">
        {current?.kind === 'tpl-cover' || current?.kind === 'tpl-back' ? (
          <div className="book-preview__tpl" style={{ width: 'min(52vh, 90vw)' }}>
            <TemplateSurface
              surface={current.kind === 'tpl-cover' ? template.cover : template.backCover}
              data={current.kind === 'tpl-cover' ? (coverData || {}) : (backCoverData || {})}
            />
          </div>
        ) : current?.kind === 'cover' ? (
          <div className="book-preview__cover">
            <img src={coverUrl} alt={`Portada de ${title || 'la leyenda'}`} />
          </div>
        ) : (
          <article className="book-preview__paper">
            {current?.title && <h2 className="book-preview__paper-title">{current.title}</h2>}
            <EditorJsPreview data={current?.data} />
          </article>
        )}
      </div>

      <div className="book-preview__nav">
        <button type="button" onClick={goPrev} disabled={safeIndex === 0} aria-label="Página anterior">‹ Anterior</button>
        {(title || author) && (
          <span className="book-preview__meta">
            {title}{author ? ` · ${author}` : ''}
          </span>
        )}
        <button type="button" onClick={goNext} disabled={safeIndex >= total - 1} aria-label="Página siguiente">Siguiente ›</button>
      </div>
    </div>
  );
}
