import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import DOMPurify from 'dompurify';
import { getHotspotsForReaderPage } from '../../utils/readerPages.js';
import AppIcon from '../ui/AppIcon.jsx';
import ReaderSettingsPanel from './ReaderSettingsPanel.jsx';
import ReaderBottomControls from './ReaderBottomControls.jsx';
import ArModelsLauncher from '../ar/ArModelsLauncher.jsx';
import { READER_THEMES, READER_THEME_IDS, getContrastText, buildReaderThemeVars } from './readerTheme.js';
import TemplateSurface from '../../features/templates/components/TemplateSurface.jsx';
import { getTemplateById } from '../../features/templates/templateRegistry.js';

// Live-content renderer (real inline 3D models + marker images). Lazy so the public
// reader — which renders pre-rendered HTML — never pays for three.js up front.
const EditorJsPreview = lazy(() => import('../creator/EditorJsPreview.jsx'));

const MIN_PAGE_WIDTH = 260;
const READER_STORAGE_KEY = 'leyendas.reader.preferences';
const DEFAULT_READER_SETTINGS = {
  theme: 'paper',
  bookSize: 'large',
  controlsMode: 'auto',
};
const BOOK_SIZE_CONFIG = {
  fit: {
    spreadWidthRatio: 0.88,
    singleWidthRatio: 0.92,
    heightReserve: 118,
    mobileHeightReserve: 138,
    maxSpreadWidth: 1420,
    maxSingleWidth: 620,
  },
  large: {
    spreadWidthRatio: 0.94,
    singleWidthRatio: 0.96,
    heightReserve: 88,
    mobileHeightReserve: 112,
    maxSpreadWidth: 1640,
    maxSingleWidth: 760,
  },
  full: {
    spreadWidthRatio: 0.98,
    singleWidthRatio: 0.98,
    heightReserve: 54,
    mobileHeightReserve: 82,
    maxSpreadWidth: 1900,
    maxSingleWidth: 900,
  },
};
const InlineModel3DViewer = lazy(() => import('../3d/Model3DViewer.jsx'));

const clampPercent = (value, min, max) => Math.min(max, Math.max(min, value));

function loadReaderSettings() {
  if (typeof window === 'undefined') return DEFAULT_READER_SETTINGS;
  try {
    const raw = window.localStorage.getItem(READER_STORAGE_KEY);
    if (!raw) return DEFAULT_READER_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      theme: READER_THEME_IDS.includes(parsed.theme) ? parsed.theme : DEFAULT_READER_SETTINGS.theme,
      bookSize: ['fit', 'large', 'full'].includes(parsed.bookSize) ? parsed.bookSize : DEFAULT_READER_SETTINGS.bookSize,
      controlsMode: ['always', 'auto'].includes(parsed.controlsMode) ? parsed.controlsMode : DEFAULT_READER_SETTINGS.controlsMode,
    };
  } catch {
    return DEFAULT_READER_SETTINGS;
  }
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

// The inline 3D model shown on a page. It floats right where its marker sits (printed
// on the PDF beneath) and is manipulated like a Blender object — rotate, pan
// up/down/around and zoom — grabbing it anywhere on its (optionally invisible)
// canvas. The white backdrop is toggled from the reader's bottom bar (`hideBackdrop`).
// The flip-book library attaches NATIVE listeners on an ancestor and React's
// synthetic events can't stop them reliably, so the flip-guard is a native listener
// (same pattern as HotspotMarker); OrbitControls handles the 3D gestures itself.
function InlineModelLayer({ hotspot, hideBackdrop = false }) {
  const panelRef = useRef(null);

  // Swallow the flip-start events over the model so the page never turns while the
  // reader manipulates it. OrbitControls (native, on the canvas) still rotates/pans/
  // zooms because its listeners fire before this ancestor stop.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return undefined;
    const stop = (event) => {
      event.stopPropagation();
      if (event.type === 'wheel' && event.cancelable) event.preventDefault();
    };
    const wheelOptions = { passive: false };
    const events = ['pointerdown', 'mousedown', 'touchstart', 'mouseup', 'touchend', 'click', 'dblclick'];
    events.forEach((type) => el.addEventListener(type, stop));
    el.addEventListener('wheel', stop, wheelOptions);
    return () => {
      events.forEach((type) => el.removeEventListener(type, stop));
      el.removeEventListener('wheel', stop, wheelOptions);
    };
  }, []);

  const title = hotspot.scene?.name || hotspot.label || 'Modelo 3D';

  return (
    <section
      ref={panelRef}
      className={`reader-inline-model${hideBackdrop ? ' is-bare' : ''}`}
      aria-label={`Modelo 3D ${hotspot.label || ''}`.trim()}
    >
      <div className="reader-inline-model-stage">
        <Suspense fallback={<div className="reader-inline-model-loading">Cargando modelo...</div>}>
          <InlineModel3DViewer scene={hotspot.scene} title={title} embedded fullControls />
        </Suspense>
      </div>
    </section>
  );
}

const FlipPage = React.forwardRef(({
  page,
  hotspots,
  onHotspotClick,
  hideBackdrop = false,
}, ref) => {
  // Editorial template cover / back cover — rendered by the template engine
  // (not Editor.js). No hotspots or page number on these sheets.
  if (page.type === 'template-cover' || page.type === 'template-back') {
    const template = getTemplateById(page.templateId);
    const surface = template ? (page.type === 'template-cover' ? template.cover : template.backCover) : null;
    return (
      <div className="pdf-flip-page pdf-flip-page-template" ref={ref}>
        {surface && <TemplateSurface surface={surface} data={page.templateData} fill />}
      </div>
    );
  }

  const modelHotspots = hotspots.filter((hotspot) => hotspot?.scene?.assets?.url);
  const primaryModelHotspot = modelHotspots[0] ?? null;
  const markerHotspots = hotspots.filter((hotspot) => !hotspot?.scene?.assets?.url);

  return (
    <div className={`pdf-flip-page ${page.type === 'manual' ? 'pdf-flip-page-manual' : ''}`} ref={ref}>
      {page.type === 'rendered_pdf' && page.imageUrl ? (
        <img src={page.imageUrl} alt={`Pagina ${page.pageNumber}`} draggable={false} loading="lazy" />
      ) : page.type === 'manual' ? (
        <div className="reader-paper">
          {page.title && <h3 className="reader-paper-title">{page.title}</h3>}
          {page.editorData?.blocks?.length ? (
            // Local preview ("Ver como lector"): render the live blocks so real 3D
            // models and marker images appear, auto-fitted by the reader CSS below.
            <div className="reader-paper-text reader-paper-html editorial-content">
              <Suspense fallback={<div className="reader-paper-loading">Cargando contenido…</div>}>
                <EditorJsPreview data={page.editorData} />
              </Suspense>
            </div>
          ) : page.renderedHtml
            ? <div className="reader-paper-text reader-paper-html editorial-content" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(page.renderedHtml) }} />
            : <div className="reader-paper-text">{page.textContent}</div>}
        </div>
      ) : (
        <div className="pdf-flip-page-loading">Pagina {page.pageNumber}</div>
      )}
      <div className="pdf-flip-page-overlay">
        {markerHotspots.map((hotspot, index) => (
          <HotspotMarker key={hotspot.id} hotspot={hotspot} index={index} onClick={onHotspotClick} />
        ))}
        {primaryModelHotspot && (
          <InlineModelLayer
            key={`inline-model-${primaryModelHotspot.id}`}
            hotspot={primaryModelHotspot}
            hideBackdrop={hideBackdrop}
          />
        )}
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
function ConalitegStyleReader({
  pages = [],
  hotspots = [],
  models = [],
  onHotspotClick,
  // Physics of the page turn (react-pageflip). Defaults keep the public reader
  // exactly as-is; "Ver como lector" passes weightier, richer values.
  flippingTime = 920,
  maxShadowOpacity = 0.52,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readerSettings, setReaderSettings] = useState(loadReaderSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  // The page model floats without its white "canvas" by default (nicer over the page);
  // the reader can toggle the backdrop back on from the bottom bar.
  const [hideModelBackdrop, setHideModelBackdrop] = useState(true);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 820,
  }));
  const bookRef = useRef(null);
  const containerRef = useRef(null);
  const hideControlsTimerRef = useRef(0);

  const numPages = pages.length;
  const firstPage = pages[0];
  const aspect = firstPage?.width && firstPage?.height
    ? Number(firstPage.height) / Number(firstPage.width)
    : 1.414;

  const hotspotsByPageIndex = useMemo(
    () => pages.map((page) => getHotspotsForReaderPage(page, hotspots)),
    [pages, hotspots],
  );

  // Whether any page carries an inline 3D model — gates the bottom-bar backdrop toggle.
  const hasInlineModel = useMemo(
    () => hotspotsByPageIndex.some((list) => list.some((hotspot) => hotspot?.scene?.assets?.url)),
    [hotspotsByPageIndex],
  );

  const updateReaderSetting = useCallback((key, value) => {
    setReaderSettings((current) => ({ ...current, [key]: value }));
  }, []);

  const showReaderControls = useCallback(() => {
    setControlsVisible(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(READER_STORAGE_KEY, JSON.stringify(readerSettings));
    } catch {
      // Reader preferences are optional.
    }
  }, [readerSettings]);

  useEffect(() => {
    const stage = containerRef.current?.closest('.reader-stage');
    if (!stage) return undefined;
    const activeTheme = READER_THEMES.find((theme) => theme.id === readerSettings.theme) || READER_THEMES[0];
    const vars = buildReaderThemeVars(activeTheme.color);
    stage.setAttribute('data-reader-theme', readerSettings.theme);
    stage.setAttribute('data-reader-size', readerSettings.bookSize);
    // Inline CSS variables (highest priority) drive every reader surface so any of the
    // palette colors gets correct, auto-contrasted text/controls without per-theme CSS.
    Object.entries(vars).forEach(([name, value]) => stage.style.setProperty(name, value));
    return () => {
      stage.removeAttribute('data-reader-theme');
      stage.removeAttribute('data-reader-size');
      Object.keys(vars).forEach((name) => stage.style.removeProperty(name));
    };
  }, [readerSettings.theme, readerSettings.bookSize]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const activeTheme = READER_THEMES.find((theme) => theme.id === readerSettings.theme) || READER_THEMES[0];
    try {
      window.localStorage.setItem('readerThemeColor', activeTheme.color);
      window.localStorage.setItem('readerThemeName', activeTheme.name);
      window.localStorage.setItem('readerTextColor', getContrastText(activeTheme.color));
      window.localStorage.setItem('readerBookSize', readerSettings.bookSize);
      window.localStorage.setItem('readerControlsMode', readerSettings.controlsMode);
    } catch {
      // Individual keys are a convenience mirror of the JSON preferences; optional.
    }
  }, [readerSettings]);

  useEffect(() => {
    if (readerSettings.controlsMode !== 'auto' || settingsOpen) {
      setControlsVisible(true);
      window.clearTimeout(hideControlsTimerRef.current);
      return undefined;
    }

    window.clearTimeout(hideControlsTimerRef.current);
    hideControlsTimerRef.current = window.setTimeout(() => setControlsVisible(false), 2600);
    return () => window.clearTimeout(hideControlsTimerRef.current);
  }, [controlsVisible, readerSettings.controlsMode, settingsOpen]);

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
  const sizeConfig = BOOK_SIZE_CONFIG[readerSettings.bookSize] ?? BOOK_SIZE_CONFIG.large;
  const verticalReserve = isFullscreen
    ? (isSinglePage ? 78 : 42)
    : (isSinglePage ? sizeConfig.mobileHeightReserve : sizeConfig.heightReserve);
  const maxPageHeight = Math.max(360, viewport.height - verticalReserve);
  const maxSpreadWidth = Math.min(
    Math.max(320, viewport.width * sizeConfig.spreadWidthRatio),
    sizeConfig.maxSpreadWidth,
  );
  const maxPageWidthByWidth = isSinglePage
    ? Math.min(sizeConfig.maxSingleWidth, viewport.width * sizeConfig.singleWidthRatio)
    : Math.floor((maxSpreadWidth - 16) / 2);
  const maxPageWidthByHeight = Math.floor(maxPageHeight / aspect);
  const pageWidth = Math.max(
    MIN_PAGE_WIDTH,
    Math.floor(Math.min(maxPageWidthByWidth, maxPageWidthByHeight)),
  );
  const pageHeight = Math.round(pageWidth * aspect);
  const isCoverView = !isSinglePage && currentPage <= 1;

  return (
    <div
      className={`pdf-flipbook reader-theme-${readerSettings.theme} reader-size-${readerSettings.bookSize} controls-${readerSettings.controlsMode} ${controlsVisible || settingsOpen ? 'controls-visible' : 'controls-hidden'} ${isFullscreen ? 'fullscreen' : ''} ${isSinglePage ? 'is-single' : 'is-spread'} ${isCoverView ? 'is-cover' : 'is-open'}`}
      ref={containerRef}
      onPointerMove={showReaderControls}
      onPointerDown={showReaderControls}
      onTouchStart={showReaderControls}
    >
      <div className="pdf-flipbook-stage" aria-label="Visor de libro">
        <button
          type="button"
          className="pdf-flipbook-nav-button pdf-flipbook-nav-button-prev"
          onClick={goPrevious}
          disabled={currentPage <= 1}
          aria-label="Pagina anterior"
        >
          <AppIcon name="chevron_left" size={30} />
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
            maxWidth={Math.max(pageWidth, sizeConfig.maxSingleWidth)}
            minHeight={360}
            maxHeight={Math.max(pageHeight, Math.round(sizeConfig.maxSingleWidth * aspect))}
            showCover
            usePortrait={isSinglePage}
            mobileScrollSupport
            clickEventForward
            useMouseEvents
            drawShadow
            showPageCorners
            flippingTime={flippingTime}
            startZIndex={8}
            maxShadowOpacity={maxShadowOpacity}
            onFlip={handleFlip}
            className="pdf-flipbook-book"
          >
            {pages.map((page, index) => (
              <FlipPage
                key={`${page.type}-${page.pageNumber}-${index}`}
                page={page}
                hotspots={hotspotsByPageIndex[index] ?? []}
                onHotspotClick={openHotspotModel}
                hideBackdrop={hideModelBackdrop}
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
          <AppIcon name="chevron_right" size={30} />
        </button>
      </div>

      <button
        type="button"
        className="reader-settings-button"
        onClick={() => setSettingsOpen((open) => !open)}
        aria-label="Configurar lectura"
        aria-expanded={settingsOpen}
        aria-controls="reader-settings-panel"
        title="Configurar lectura"
      >
        <AppIcon name="tune" size={22} />
      </button>

      <ArModelsLauncher models={models} variant="floating" />

      {settingsOpen && (
        <ReaderSettingsPanel
          settings={readerSettings}
          onChange={updateReaderSetting}
          onClose={() => setSettingsOpen(false)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      )}

      <ReaderBottomControls
        currentPage={currentPage}
        numPages={numPages}
        pageInput={pageInput}
        onPageInput={setPageInput}
        onGoToPage={goToPage}
        onPrev={goPrevious}
        onNext={goNext}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        hasModel={hasInlineModel}
        modelBackdropHidden={hideModelBackdrop}
        onToggleModelBackdrop={() => setHideModelBackdrop((value) => !value)}
      />
    </div>
  );
}

export default ConalitegStyleReader;
