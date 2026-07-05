import React, { useCallback, useEffect, useMemo, useState } from 'react';
import EditorJsPreview from './EditorJsPreview.jsx';

// Fase 3 — clean full-book reading preview. NOT an editor: no toolbar, no panels,
// no handles, no resize or selection affordances. Renders the cover + every page
// exactly as the reader will see it, reusing the sanitized EditorJsPreview.
export default function BookPreviewOverlay({ pages = [], coverUrl = '', title = '', author = '', onClose }) {
  // Build the reading sequence: optional cover slide first, then the pages.
  const slides = useMemo(() => {
    const readingPages = (pages || []).map((page, index) => ({
      kind: 'page',
      key: page.client_id || page.id || `page-${index}`,
      title: page.title,
      data: page.editor_data?.blocks ? page.editor_data : { blocks: [] },
    }));
    return coverUrl
      ? [{ kind: 'cover', key: 'cover' }, ...readingPages]
      : readingPages;
  }, [pages, coverUrl]);

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
          {current?.kind === 'cover' ? 'Portada' : `Página ${coverUrl ? safeIndex : safeIndex + 1} de ${pages.length}`}
        </span>
        <button type="button" className="book-preview__close" onClick={onClose} aria-label="Cerrar vista previa">
          Cerrar
        </button>
      </div>

      <div className="book-preview__stage">
        {current?.kind === 'cover' ? (
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
