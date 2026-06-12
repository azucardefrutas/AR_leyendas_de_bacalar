import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Button from '../ui/Button.jsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const RENDER_TARGET_WIDTH = 820;
const MAX_PAGE_DISPLAY_WIDTH = 460;

function hotspotHasModel(hotspot) {
  return Boolean(hotspot.scene || hotspot.ar_scene_id);
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

const FlipPage = React.forwardRef(({ imageUrl, pageNumber, hotspots, onHotspotClick }, ref) => (
  <div className="pdf-flip-page" ref={ref}>
    {imageUrl ? (
      <>
        <img src={imageUrl} alt={`Pagina ${pageNumber}`} draggable={false} />
        <div className="pdf-flip-page-overlay">
          {hotspots.map((hotspot, index) => (
            <HotspotMarker key={hotspot.id} hotspot={hotspot} index={index} onClick={onHotspotClick} />
          ))}
        </div>
        <span className="pdf-flip-page-number">{pageNumber}</span>
      </>
    ) : (
      <div className="pdf-flip-page-loading">Renderizando pagina {pageNumber}...</div>
    )}
  </div>
));

FlipPage.displayName = 'FlipPage';

/**
 * CONALITEG-style reader: renders each PDF page to an image with pdfjs-dist and
 * shows them in a clean react-pageflip book, overlaying the interactive hotspots
 * so the final user can open the linked 3D scene.
 */
function PdfFlipbookReader({ pdfUrl, hotspots = [], onHotspotClick, onError, initialPage = 1 }) {
  const [pageImages, setPageImages] = useState([]);
  const [numPages, setNumPages] = useState(0);
  const [pageAspect, setPageAspect] = useState(1.414);
  const [status, setStatus] = useState('loading'); // loading | rendering | ready | error
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomed, setZoomed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const bookRef = useRef(null);
  const containerRef = useRef(null);

  const hotspotsByPage = useMemo(() => {
    const map = new Map();
    for (const hotspot of hotspots) {
      const page = Number(hotspot.sourcePageNumber ?? hotspot.source_page_number);
      if (!Number.isInteger(page) || page < 1) continue;
      if (!map.has(page)) map.set(page, []);
      map.get(page).push(hotspot);
    }
    return map;
  }, [hotspots]);

  useEffect(() => {
    let cancelled = false;

    async function renderPdf() {
      setStatus('loading');
      setPageImages([]);
      setNumPages(0);
      setCurrentPage(1);

      try {
        const pdf = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
        if (cancelled) return;
        if (!pdf.numPages) {
          setStatus('error');
          if (onError) onError(new Error('PDF sin paginas.'));
          return;
        }

        setNumPages(pdf.numPages);
        setStatus('rendering');
        const images = new Array(pdf.numPages).fill(null);

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled) return;
          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          if (pageNumber === 1) setPageAspect(baseViewport.height / baseViewport.width);
          const scale = RENDER_TARGET_WIDTH / baseViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const context = canvas.getContext('2d');
          await page.render({ canvasContext: context, viewport }).promise;
          if (cancelled) return;

          images[pageNumber - 1] = canvas.toDataURL('image/jpeg', 0.86);
          setPageImages([...images]);
          page.cleanup();
        }

        if (!cancelled) setStatus('ready');
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        if (onError) onError(error);
      }
    }

    if (pdfUrl) {
      renderPdf();
    } else {
      setStatus('error');
      if (onError) onError(new Error('PDF URL missing.'));
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl]);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (status !== 'ready') return;
    const target = Number(initialPage);
    if (Number.isInteger(target) && target > 1 && target <= numPages) {
      bookRef.current?.pageFlip()?.turnToPage(target - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

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

  const pageWidth = Math.min(MAX_PAGE_DISPLAY_WIDTH, RENDER_TARGET_WIDTH);
  const pageHeight = Math.round(pageWidth * pageAspect);
  const renderedCount = pageImages.filter(Boolean).length;

  if (status === 'error') {
    return (
      <div className="pdf-flipbook pdf-flipbook-error">
        <p>No se pudo cargar el documento de esta leyenda.</p>
      </div>
    );
  }

  return (
    <div className={`pdf-flipbook ${isFullscreen ? 'fullscreen' : ''}`} ref={containerRef}>
      {status !== 'ready' ? (
        <div className="pdf-flipbook-loading">
          <span>
            {status === 'loading'
              ? 'Cargando documento...'
              : `Preparando paginas (${renderedCount}/${numPages})...`}
          </span>
        </div>
      ) : (
        <>
          <div className={`pdf-flipbook-stage ${zoomed ? 'zoomed' : ''}`}>
            <HTMLFlipBook
              ref={bookRef}
              width={pageWidth}
              height={pageHeight}
              size="fixed"
              minWidth={220}
              maxWidth={RENDER_TARGET_WIDTH}
              minHeight={280}
              maxHeight={Math.round(RENDER_TARGET_WIDTH * pageAspect)}
              showCover={false}
              usePortrait
              mobileScrollSupport
              flippingTime={650}
              maxShadowOpacity={0.4}
              onFlip={handleFlip}
              className="pdf-flipbook-book"
            >
              {pageImages.map((imageUrl, index) => (
                <FlipPage
                  key={index}
                  imageUrl={imageUrl}
                  pageNumber={index + 1}
                  hotspots={hotspotsByPage.get(index + 1) ?? []}
                  onHotspotClick={onHotspotClick}
                />
              ))}
            </HTMLFlipBook>
          </div>

          <div className="pdf-flipbook-controls">
            <Button type="button" variant="ghost" onClick={goPrevious} disabled={currentPage <= 1}>Anterior</Button>
            <label className="pdf-flipbook-goto">
              <span>Pagina</span>
              <input
                type="number"
                min="1"
                max={numPages}
                value={Math.min(currentPage, numPages)}
                onChange={(event) => goToPage(event.target.value)}
              />
              <span>de {numPages}</span>
            </label>
            <Button type="button" variant="ghost" onClick={goNext} disabled={currentPage >= numPages}>Siguiente</Button>
            <Button type="button" variant="ghost" onClick={() => setZoomed((value) => !value)}>
              {zoomed ? 'Alejar' : 'Acercar'}
            </Button>
            <Button type="button" variant="ghost" onClick={toggleFullscreen}>
              {isFullscreen ? 'Salir' : 'Pantalla completa'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default PdfFlipbookReader;
