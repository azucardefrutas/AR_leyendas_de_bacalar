import React, { useEffect, useMemo, useState } from 'react';
import DocumentPreview from './DocumentPreview.jsx';

function useIsMobile(query = '(max-width: 768px)') {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia(query);
    const onChange = (event) => setIsMobile(event.matches);
    mql.addEventListener('change', onChange);
    setIsMobile(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return isMobile;
}

/**
 * Editorial preview with an optional "doble página" mode. Renders a source PDF/image
 * page with pdfjs (via DocumentPreview); when spread mode is on, a wide sheet is shown
 * as an open book [left][right] on desktop and one half per view on mobile.
 *
 * Builds the visual-page mapping (visualPageNumber, sourcePageNumber, side) so markers
 * can later be normalized against the correct visual half.
 *
 * Props: file, fileUrl, onActiveVisualPageChange({ visualPageNumber, sourcePageNumber, side })
 */
export default function BookSpreadPreview({ file = null, fileUrl = '', onActiveVisualPageChange, className = '' }) {
  const isMobile = useIsMobile();
  const [pageCount, setPageCount] = useState(0);
  const [sourcePage, setSourcePage] = useState(1);
  const [mobileSide, setMobileSide] = useState('left'); // only used in spread + mobile
  const [spreadMode, setSpreadMode] = useState(false);
  const [wideHint, setWideHint] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);

  // Compute the active visual page (for the status label + marker mapping).
  const activeVisual = useMemo(() => {
    if (!spreadMode) {
      return { visualPageNumber: sourcePage, sourcePageNumber: sourcePage, side: 'full' };
    }
    const side = isMobile ? mobileSide : 'left'; // desktop shows both halves at once
    const visualPageNumber = isMobile
      ? (sourcePage - 1) * 2 + (mobileSide === 'right' ? 2 : 1)
      : (sourcePage - 1) * 2 + 1;
    return { visualPageNumber, sourcePageNumber: sourcePage, side };
  }, [spreadMode, isMobile, sourcePage, mobileSide]);

  useEffect(() => {
    if (onActiveVisualPageChange) onActiveVisualPageChange(activeVisual);
  }, [activeVisual, onActiveVisualPageChange]);

  // Reset when the source changes.
  useEffect(() => {
    setSourcePage(1);
    setMobileSide('left');
    setHintDismissed(false);
  }, [file, fileUrl]);

  const handlePageMeta = (meta) => {
    if (sourcePage === 1) setWideHint(Boolean(meta?.isWideSpread));
  };

  const goPrev = () => {
    if (spreadMode && isMobile) {
      if (mobileSide === 'right') { setMobileSide('left'); return; }
      if (sourcePage > 1) { setSourcePage((p) => p - 1); setMobileSide('right'); }
      return;
    }
    setSourcePage((p) => Math.max(1, p - 1));
  };

  const goNext = () => {
    if (spreadMode && isMobile) {
      if (mobileSide === 'left') { setMobileSide('right'); return; }
      if (sourcePage < pageCount) { setSourcePage((p) => p + 1); setMobileSide('left'); }
      return;
    }
    setSourcePage((p) => Math.min(pageCount || p, p + 1));
  };

  const atStart = sourcePage <= 1 && (!spreadMode || !isMobile || mobileSide === 'left');
  const atEnd = sourcePage >= pageCount && (!spreadMode || !isMobile || mobileSide === 'right');

  const sideLabel = activeVisual.side === 'left' ? ' — lado izquierdo'
    : activeVisual.side === 'right' ? ' — lado derecho'
      : '';
  const statusLabel = pageCount
    ? `Página PDF ${sourcePage} de ${pageCount}${spreadMode ? sideLabel : ''}`
    : 'Cargando documento…';

  const showSpreadOpenBook = spreadMode && !isMobile;

  return (
    <div className={`book-spread-wrap ${className}`.trim()}>
      <div className="book-spread-toolbar">
        <div className="book-spread-nav">
          <button type="button" onClick={goPrev} disabled={atStart} aria-label="Anterior">‹</button>
          <span className="book-spread-status">{statusLabel}</span>
          <button type="button" onClick={goNext} disabled={atEnd} aria-label="Siguiente">›</button>
        </div>
        <label className="book-spread-toggle">
          <input
            type="checkbox"
            checked={spreadMode}
            onChange={(event) => { setSpreadMode(event.target.checked); setMobileSide('left'); }}
          />
          <span>Modo doble página</span>
        </label>
      </div>

      {wideHint && !spreadMode && !hintDismissed && (
        <div className="book-spread-hint" role="status">
          <span>Parece una doble página. ¿Quieres dividirla en dos?</span>
          <div>
            <button type="button" onClick={() => { setSpreadMode(true); setHintDismissed(true); }}>Dividir</button>
            <button type="button" className="ghost" onClick={() => setHintDismissed(true)}>Ahora no</button>
          </div>
        </div>
      )}

      {showSpreadOpenBook ? (
        <div className="book-spread-preview">
          <DocumentPreview
            file={file}
            fileUrl={fileUrl}
            pageNumber={sourcePage}
            side="left"
            spreadMode
            onPageCountChange={setPageCount}
            onPageMeta={handlePageMeta}
          />
          <DocumentPreview
            file={file}
            fileUrl={fileUrl}
            pageNumber={sourcePage}
            side="right"
            spreadMode
          />
        </div>
      ) : (
        <div className="book-spread-single">
          <DocumentPreview
            file={file}
            fileUrl={fileUrl}
            pageNumber={sourcePage}
            side={activeVisual.side}
            spreadMode={spreadMode}
            onPageCountChange={setPageCount}
            onPageMeta={handlePageMeta}
          />
        </div>
      )}
    </div>
  );
}
