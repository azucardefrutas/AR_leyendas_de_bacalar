import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import Button from '../ui/Button.jsx';
import { getHotspotsForReaderPage } from '../../utils/readerPages.js';

const MAX_PAGE_DISPLAY_WIDTH = 470;

function hotspotHasModel(hotspot) {
  return Boolean(hotspot.scene || hotspot.arSceneId || hotspot.ar_scene_id);
}

function HotspotMarker({ hotspot, index, onClick }) {
  const widthPct = Number(hotspot.width) > 0 ? `${Math.min(1, Number(hotspot.width)) * 100}%` : null;
  const heightPct = Number(hotspot.height) > 0 ? `${Math.min(1, Number(hotspot.height)) * 100}%` : null;
  const withModel = hotspotHasModel(hotspot);

  return (
    <button
      type="button"
      className={`reader-hotspot ${withModel ? 'has-model' : 'no-model'}`}
      style={{
        left: `${Number(hotspot.x) * 100}%`,
        top: `${Number(hotspot.y) * 100}%`,
        ...(widthPct ? { width: widthPct } : null),
        ...(heightPct ? { height: heightPct } : null),
      }}
      title={hotspot.label || (withModel ? 'Ver modelo 3D' : 'Marcador sin modelo 3D')}
      aria-label={hotspot.label || `Marcador ${index + 1}`}
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick(hotspot);
      }}
    >
      {withModel && <span className="reader-hotspot-badge">3D</span>}
    </button>
  );
}

const FlipPage = React.forwardRef(({ page, hotspots, onHotspotClick }, ref) => (
  <div className={`pdf-flip-page ${page.type === 'manual' ? 'pdf-flip-page-manual' : ''}`} ref={ref}>
    {page.type === 'rendered_pdf' && page.imageUrl ? (
      <img src={page.imageUrl} alt={`Pagina ${page.pageNumber}`} draggable={false} loading="lazy" />
    ) : page.type === 'manual' ? (
      <div className="reader-paper">
        {page.title && <h3 className="reader-paper-title">{page.title}</h3>}
        <div className="reader-paper-text">{page.textContent}</div>
      </div>
    ) : (
      <div className="pdf-flip-page-loading">Pagina {page.pageNumber}</div>
    )}
    <div className="pdf-flip-page-overlay">
      {hotspots.map((hotspot, index) => (
        <HotspotMarker key={hotspot.id} hotspot={hotspot} index={index} onClick={onHotspotClick} />
      ))}
    </div>
    <span className="pdf-flip-page-number">{page.pageNumber}</span>
  </div>
));

FlipPage.displayName = 'FlipPage';

/**
 * CONALITEG-style book reader. Consumes pre-rendered PDF page images from the
 * backend (renderedPages) and overlays the interactive hotspots. No frontend PDF
 * rendering: pages are images already prepared by the Render backend.
 */
function ConalitegStyleReader({ pages = [], hotspots = [], onHotspotClick }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1280));
  const bookRef = useRef(null);
  const containerRef = useRef(null);

  const numPages = pages.length;
  const firstPage = pages[0];
  const aspect = firstPage?.width && firstPage?.height
    ? Number(firstPage.height) / Number(firstPage.width)
    : 1.414;

  const hotspotsByPageIndex = useMemo(
    () => pages.map((page) => getHotspotsForReaderPage(page, hotspots)),
    [pages, hotspots],
  );

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    let frame = 0;
    function onResize() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setViewportWidth(window.innerWidth));
    }
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const goPrevious = useCallback(() => bookRef.current?.pageFlip()?.flipPrev(), []);
  const goNext = useCallback(() => bookRef.current?.pageFlip()?.flipNext(), []);

  function handleFlip(event) {
    setCurrentPage(Number(event.data) + 1);
  }

  function goToPage(value) {
    const page = Math.max(1, Math.min(numPages, Number(value) || 1));
    bookRef.current?.pageFlip()?.turnToPage(page - 1);
    setCurrentPage(page);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      }
    } catch {
      // Fullscreen is best-effort.
    }
  }

  if (!numPages) {
    return (
      <div className="pdf-flipbook pdf-flipbook-error">
        <p>Este libro aun no tiene paginas para mostrar.</p>
      </div>
    );
  }

  // Big, responsive CONALITEG-style spread: two large pages on desktop, one on mobile.
  const isNarrow = viewportWidth < 820;
  const pageWidth = isNarrow
    ? Math.min(MAX_PAGE_DISPLAY_WIDTH + 130, Math.floor(viewportWidth * 0.9))
    : Math.min(680, Math.floor((Math.min(viewportWidth, 1680) * 0.94 - 40) / 2));
  const pageHeight = Math.round(pageWidth * aspect);

  return (
    <div className={`pdf-flipbook ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
      <div className="pdf-flipbook-stage">
        <HTMLFlipBook
          key={`${pageWidth}x${pageHeight}`}
          ref={bookRef}
          width={pageWidth}
          height={pageHeight}
          size="fixed"
          minWidth={280}
          maxWidth={760}
          minHeight={360}
          maxHeight={Math.round(760 * aspect)}
          showCover
          usePortrait
          mobileScrollSupport
          flippingTime={700}
          maxShadowOpacity={0.45}
          onFlip={handleFlip}
          className="pdf-flipbook-book"
        >
          {pages.map((page, index) => (
            <FlipPage
              key={`${page.type}-${page.pageNumber}-${index}`}
              page={page}
              hotspots={hotspotsByPageIndex[index] ?? []}
              onHotspotClick={onHotspotClick}
            />
          ))}
        </HTMLFlipBook>
      </div>

      <div className="pdf-flipbook-controls">
        <Button type="button" variant="ghost" onClick={goPrevious} disabled={currentPage <= 1}>Anterior</Button>
        <span className="pdf-flipbook-page-indicator">Pagina {Math.min(currentPage, numPages)} / {numPages}</span>
        <Button type="button" variant="ghost" onClick={goNext} disabled={currentPage >= numPages}>Siguiente</Button>
        <label className="pdf-flipbook-goto">
          <span>Ir a</span>
          <input
            type="number"
            min="1"
            max={numPages}
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') goToPage(pageInput); }}
            onBlur={() => goToPage(pageInput)}
          />
        </label>
        <Button type="button" variant="ghost" onClick={toggleFullscreen}>
          {isFullscreen ? 'Salir' : 'Pantalla completa'}
        </Button>
      </div>
    </div>
  );
}

export default ConalitegStyleReader;
