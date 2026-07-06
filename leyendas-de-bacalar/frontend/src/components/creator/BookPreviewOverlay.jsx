import React, { useEffect, useMemo, useRef } from 'react';
import { animate } from 'animejs';
import ConalitegStyleReader from '../reader/ConalitegStyleReader.jsx';
import { buildPreviewPages } from '../../utils/readerPages.js';

// "Vista previa" — the book with the SAME CONALITEG page-flip physics as the reader
// (react-pageflip), but built from the editor's LIVE local state (unsaved), so the
// author sees the book take shape instantly: portada → páginas → contraportada.
// Distinct from "Ver como lector", which renders the saved reader-bundle.
export default function BookPreviewOverlay({
  pages = [], title = '', author = '', onClose,
  templateId = '', coverData = null, backCoverData = null,
}) {
  const rootRef = useRef(null);
  const readerPages = useMemo(
    () => buildPreviewPages(pages, { templateId, coverData, backCoverData }),
    [pages, templateId, coverData, backCoverData],
  );

  useEffect(() => {
    document.body.classList.add('book-preview-open');
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('book-preview-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Entrance polish — fade the overlay + slide the bar in. Only opacity touches the
  // stage: a transform on the stage would become the containing block for the
  // reader's position:fixed controls (gear + bottom bar) and misplace them.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    animate(root, { opacity: [0, 1], duration: 240, ease: 'outQuad' });
    const bar = root.querySelector('.book-preview-reader__bar');
    if (bar) animate(bar, { translateY: [-16, 0], opacity: [0, 1], duration: 460, ease: 'outExpo' });
    const stage = root.querySelector('.book-preview-reader__stage');
    if (stage) animate(stage, { opacity: [0, 1], duration: 560, delay: 90, ease: 'outQuad' });
  }, []);

  return (
    <div
      className="book-preview-reader reader-stage"
      role="dialog"
      aria-modal="true"
      aria-label="Vista previa del libro"
      ref={rootRef}
    >
      <div className="book-preview-reader__bar">
        <span className="book-preview-reader__brand">
          <span className="material-symbols-rounded" aria-hidden="true">auto_stories</span>
          <span className="book-preview-reader__brand-text">
            <strong>Vista previa</strong>
            <em>{title || 'Cómo va quedando tu libro'}</em>
          </span>
        </span>
        {author && <span className="book-preview-reader__meta">{author}</span>}
        <button type="button" className="book-preview-reader__close" onClick={onClose}>
          <span className="material-symbols-rounded" aria-hidden="true">close</span>
          Cerrar
        </button>
      </div>

      <div className="book-preview-reader__stage">
        {readerPages.length === 0 ? (
          <p className="book-preview-reader__msg">
            Aún no hay páginas para previsualizar. Escribe contenido y vuelve a intentar.
          </p>
        ) : (
          <ConalitegStyleReader pages={readerPages} hotspots={[]} onHotspotClick={() => {}} />
        )}
      </div>
    </div>
  );
}
