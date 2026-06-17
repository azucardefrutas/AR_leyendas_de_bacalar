import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { getHotspotsForReaderPage } from '../../utils/readerPages.js';

const MAX_SINGLE_PAGE_WIDTH = 540;
const MAX_DESKTOP_PAGE_WIDTH = 520;
const MIN_PAGE_WIDTH = 260;
const InlineModel3DViewer = lazy(() => import('../3d/Model3DViewer.jsx'));

const clampPercent = (value, min, max) => Math.min(max, Math.max(min, value));

function ReaderIcon({ name }) {
  const commonProps = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.25,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': 'true',
  };

  if (name === 'previous') {
    return (
      <svg {...commonProps}>
        <path d="m15 18-6-6 6-6" />
      </svg>
    );
  }

  if (name === 'next') {
    return (
      <svg {...commonProps}>
        <path d="m9 18 6-6-6-6" />
      </svg>
    );
  }

  if (name === 'fullscreen') {
    return (
      <svg {...commonProps}>
        <path d="M8 3H5a2 2 0 0 0-2 2v3" />
        <path d="M16 3h3a2 2 0 0 1 2 2v3" />
        <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
        <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M16 3v3a2 2 0 0 0 2 2h3" />
      <path d="M8 21v-3a2 2 0 0 0-2-2H3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function hotspotHasModel(hotspot) {
  return Boolean(hotspot.scene || hotspot.arSceneId || hotspot.ar_scene_id);
}

function getHotspotMarkerUrl(hotspot) {
  const marker = hotspot.markerAsset || hotspot.marker_asset || null;
  return marker?.url || marker?.fileUrl || marker?.public_url || marker?.file_url || marker?.external_url || '';
}

function HotspotMarker({ hotspot, index, onClick }) {
  const btnRef = useRef(null);
  const onClickRef = useRef(onClick);
  const hotspotRef = useRef(hotspot);
  onClickRef.current = onClick;
  hotspotRef.current = hotspot;

  const widthPct = Number(hotspot.width) > 0 ? `${Math.min(1, Number(hotspot.width)) * 100}%` : null;
  const heightPct = Number(hotspot.height) > 0 ? `${Math.min(1, Number(hotspot.height)) * 100}%` : null;
  const withModel = hotspotHasModel(hotspot);
  const markerUrl = getHotspotMarkerUrl(hotspot);

  // The page-flip library (react-pageflip) attaches NATIVE listeners on an ancestor
  // and flips on pointer/click. React's synthetic stopPropagation fires too late to
  // stop them, so tapping a marker also turned the page. We attach native listeners
  // on the marker that (a) swallow the flip-start events and (b) open the model on
  // the native click — so the marker captures the tap and the book never flips.
  useEffect(() => {
    const el = btnRef.current;
    if (!el) return undefined;
    const stop = (event) => { event.stopPropagation(); };
    const open = (event) => {
      event.stopPropagation();
      event.preventDefault();
      onClickRef.current?.(hotspotRef.current);
    };
    el.addEventListener('pointerdown', stop);
    el.addEventListener('mousedown', stop);
    el.addEventListener('touchstart', stop);
    el.addEventListener('mouseup', stop);
    el.addEventListener('touchend', stop);
    el.addEventListener('click', open);
    return () => {
      el.removeEventListener('pointerdown', stop);
      el.removeEventListener('mousedown', stop);
      el.removeEventListener('touchstart', stop);
      el.removeEventListener('mouseup', stop);
      el.removeEventListener('touchend', stop);
      el.removeEventListener('click', open);
    };
  }, [withModel]);

  if (!withModel) return null;

  return (
    <button
      ref={btnRef}
      type="button"
      className={`reader-hotspot ${withModel ? 'has-model' : 'no-model'}`}
      style={{
        left: `${Number(hotspot.x) * 100}%`,
        top: `${Number(hotspot.y) * 100}%`,
        ...(widthPct ? { width: widthPct } : null),
        ...(heightPct ? { height: heightPct } : null),
      }}
      title={hotspot.label || 'Ver modelo 3D'}
      aria-label={hotspot.label || `Marcador ${index + 1}`}
    >
      {markerUrl ? (
        <img src={markerUrl} alt="" aria-hidden="true" />
      ) : (
        <span className="reader-hotspot-badge">3D</span>
      )}
    </button>
  );
}

function InlineModelLayer({ hotspot }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const el = panelRef.current;
    if (!el) return undefined;
    const stop = (event) => {
      event.stopPropagation();
      if (event.type === 'wheel' && event.cancelable) event.preventDefault();
    };
    const wheelOptions = { passive: false };
    el.addEventListener('pointerdown', stop);
    el.addEventListener('mousedown', stop);
    el.addEventListener('touchstart', stop);
    el.addEventListener('mouseup', stop);
    el.addEventListener('touchend', stop);
    el.addEventListener('click', stop);
    el.addEventListener('dblclick', stop);
    el.addEventListener('wheel', stop, wheelOptions);
    return () => {
      el.removeEventListener('pointerdown', stop);
      el.removeEventListener('mousedown', stop);
      el.removeEventListener('touchstart', stop);
      el.removeEventListener('mouseup', stop);
      el.removeEventListener('touchend', stop);
      el.removeEventListener('click', stop);
      el.removeEventListener('dblclick', stop);
      el.removeEventListener('wheel', stop, wheelOptions);
    };
  }, []);

  return (
    <section
      ref={panelRef}
      className="reader-inline-model"
      style={{
        left: `${clampPercent(Number(hotspot.x) * 100, 34, 66)}%`,
        top: `${clampPercent(Number(hotspot.y) * 100, 24, 76)}%`,
      }}
      aria-label={`Modelo 3D ${hotspot.label || ''}`.trim()}
    >
      <Suspense fallback={<div className="reader-inline-model-loading">Cargando modelo...</div>}>
        <InlineModel3DViewer scene={hotspot.scene} title={hotspot.scene?.name || hotspot.label} embedded />
      </Suspense>
    </section>
  );
}

const FlipPage = React.forwardRef(({
  page,
  hotspots,
  onHotspotClick,
}, ref) => {
  const modelHotspots = hotspots.filter((hotspot) => hotspot?.scene?.assets?.url);
  const markerHotspots = hotspots.filter((hotspot) => !hotspot?.scene?.assets?.url);

  return (
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
        {markerHotspots.map((hotspot, index) => (
          <HotspotMarker key={hotspot.id} hotspot={hotspot} index={index} onClick={onHotspotClick} />
        ))}
        {modelHotspots.map((hotspot) => (
          <InlineModelLayer key={`inline-model-${hotspot.id}`} hotspot={hotspot} />
        ))}
      </div>
      <span className="pdf-flip-page-number">{page.pageNumber}</span>
    </div>
  );
});

FlipPage.displayName = 'FlipPage';

/**
 * CONALITEG-style book reader. Consumes pre-rendered PDF page images from the
 * backend and overlays the interactive hotspots. Manual legend pages reuse the
 * same physical book shell so all stories share one reader behavior.
 */
function ConalitegStyleReader({ pages = [], hotspots = [], onHotspotClick }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 820,
  }));
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
      frame = requestAnimationFrame(() => {
        setViewport({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      });
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

  const openHotspotModel = useCallback((hotspot) => {
    onHotspotClick?.(hotspot);
  }, [onHotspotClick]);

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

  const isSinglePage = viewport.width < 900;
  const verticalReserve = isSinglePage ? 168 : 176;
  const maxPageHeight = Math.max(360, viewport.height - verticalReserve);
  const maxSpreadWidth = Math.min(viewport.width - 120, 1180);
  const maxPageWidthByWidth = isSinglePage
    ? Math.min(MAX_SINGLE_PAGE_WIDTH, viewport.width - 28)
    : Math.min(MAX_DESKTOP_PAGE_WIDTH, Math.floor((maxSpreadWidth - 24) / 2));
  const maxPageWidthByHeight = Math.floor(maxPageHeight / aspect);
  const pageWidth = Math.max(
    MIN_PAGE_WIDTH,
    Math.floor(Math.min(maxPageWidthByWidth, maxPageWidthByHeight)),
  );
  const pageHeight = Math.round(pageWidth * aspect);
  const isCoverView = !isSinglePage && currentPage <= 1;

  return (
    <div
      className={`pdf-flipbook ${isFullscreen ? 'fullscreen' : ''} ${isSinglePage ? 'is-single' : 'is-spread'} ${isCoverView ? 'is-cover' : 'is-open'}`}
      ref={containerRef}
    >
      <div className="pdf-flipbook-stage" aria-label="Visor de libro">
        <button
          type="button"
          className="pdf-flipbook-nav-button pdf-flipbook-nav-button-prev"
          onClick={goPrevious}
          disabled={currentPage <= 1}
          aria-label="Pagina anterior"
        >
          <ReaderIcon name="previous" />
        </button>

        <div
          className={`pdf-flipbook-book-wrap ${isSinglePage ? 'is-single' : 'is-spread'} ${isCoverView ? 'is-cover' : 'is-open'}`}
          style={{ '--reader-page-width': `${pageWidth}px`, '--reader-page-height': `${pageHeight}px` }}
        >
          <HTMLFlipBook
            key={`${pageWidth}x${pageHeight}`}
            ref={bookRef}
            width={pageWidth}
            height={pageHeight}
            size="fixed"
            minWidth={MIN_PAGE_WIDTH}
            maxWidth={MAX_DESKTOP_PAGE_WIDTH}
            minHeight={360}
            maxHeight={Math.round(MAX_DESKTOP_PAGE_WIDTH * aspect)}
            showCover
            usePortrait={isSinglePage}
            mobileScrollSupport
            clickEventForward
            useMouseEvents
            drawShadow
            showPageCorners
            flippingTime={920}
            startZIndex={8}
            maxShadowOpacity={0.52}
            onFlip={handleFlip}
            className="pdf-flipbook-book"
          >
            {pages.map((page, index) => (
              <FlipPage
                key={`${page.type}-${page.pageNumber}-${index}`}
                page={page}
                hotspots={hotspotsByPageIndex[index] ?? []}
                onHotspotClick={openHotspotModel}
              />
            ))}
          </HTMLFlipBook>
        </div>

        <button
          type="button"
          className="pdf-flipbook-nav-button pdf-flipbook-nav-button-next"
          onClick={goNext}
          disabled={currentPage >= numPages}
          aria-label="Pagina siguiente"
        >
          <ReaderIcon name="next" />
        </button>
      </div>

      <div className="pdf-flipbook-controls" aria-label="Controles del libro">
        <button
          type="button"
          className="pdf-flipbook-control-button"
          onClick={goPrevious}
          disabled={currentPage <= 1}
          aria-label="Pagina anterior"
          title="Pagina anterior"
        >
          <ReaderIcon name="previous" />
        </button>
        <span className="pdf-flipbook-page-indicator">Pagina {Math.min(currentPage, numPages)} de {numPages}</span>
        <label className="pdf-flipbook-goto">
          <span>Ir a pagina</span>
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
        <button
          type="button"
          className="pdf-flipbook-control-button"
          onClick={goNext}
          disabled={currentPage >= numPages}
          aria-label="Pagina siguiente"
          title="Pagina siguiente"
        >
          <ReaderIcon name="next" />
        </button>
        <button
          type="button"
          className="pdf-flipbook-control-button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        >
          <ReaderIcon name={isFullscreen ? 'exitFullscreen' : 'fullscreen'} />
        </button>
      </div>
    </div>
  );
}

export default ConalitegStyleReader;
