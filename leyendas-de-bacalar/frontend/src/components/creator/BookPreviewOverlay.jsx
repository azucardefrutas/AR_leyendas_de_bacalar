import React, { useEffect, useMemo, useRef, useState } from 'react';
import { animate } from 'animejs';
import ConalitegStyleReader from '../reader/ConalitegStyleReader.jsx';
import { buildPreviewPages } from '../../utils/readerPages.js';

// "Ver como lector" — the book exactly as the audience reads it, with the CONALITEG
// page-flip physics (react-pageflip), built from the editor's LIVE local state so
// the author sees it instantly: portada → páginas (con modelos 3D) → contraportada.
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

  // Entrance fade of the whole overlay (opacity only — a transform on the stage
  // would become the containing block for the reader's fixed controls). Respects
  // reduced motion. The bar's own show/hide is handled by CSS transitions below.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    animate(root, { opacity: [0, 1], duration: 260, ease: 'outQuad' });
  }, []);

  // Auto-hide the floating bar so it stops covering the book; it slides back in on
  // any activity (mouse move, tap, key) and tucks away after a couple idle seconds.
  const [chromeVisible, setChromeVisible] = useState(true);
  useEffect(() => {
    let timer = null;
    const show = () => {
      setChromeVisible(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setChromeVisible(false), 2800);
    };
    show();
    const events = ['pointermove', 'pointerdown', 'keydown', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, show, { passive: true }));
    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((event) => window.removeEventListener(event, show));
    };
  }, []);

  return (
    <div
      className="book-preview-reader reader-stage"
      role="dialog"
      aria-modal="true"
      aria-label="Ver el libro como lector"
      ref={rootRef}
    >
      <div className={`book-preview-reader__bar${chromeVisible ? '' : ' is-hidden'}`}>
        <span className="book-preview-reader__brand">
          <span className="material-symbols-rounded" aria-hidden="true">auto_stories</span>
          <span className="book-preview-reader__brand-text">
            <strong>Ver como lector</strong>
            <em>{title || 'Así se verá tu libro'}</em>
          </span>
        </span>
        {author && <span className="book-preview-reader__meta">{author}</span>}
        <button type="button" className="book-preview-reader__close" onClick={onClose} aria-label="Cerrar" title="Cerrar">
          <span className="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </div>

      <div className="book-preview-reader__stage">
        {readerPages.length === 0 ? (
          <p className="book-preview-reader__msg">
            Aún no hay páginas para previsualizar. Escribe contenido y vuelve a intentar.
          </p>
        ) : (
          <ConalitegStyleReader
            pages={readerPages}
            hotspots={[]}
            onHotspotClick={() => {}}
            flippingTime={1000}
            maxShadowOpacity={0.62}
          />
        )}
      </div>
    </div>
  );
}
