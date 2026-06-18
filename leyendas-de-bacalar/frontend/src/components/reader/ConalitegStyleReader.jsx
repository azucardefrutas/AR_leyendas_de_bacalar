import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { getHotspotsForReaderPage } from '../../utils/readerPages.js';

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

// Canva-style color palette for the reader theme picker (12-18 colors max).
const READER_THEMES = [
  { id: 'paper', name: 'Papel clásico', color: '#f7f2e6' },
  { id: 'sepia', name: 'Sepia', color: '#d8b982' },
  { id: 'sand', name: 'Arena', color: '#ead7b1' },
  { id: 'night', name: 'Noche', color: '#0d0d0d' },
  { id: 'deep-blue', name: 'Azul profundo', color: '#152659' },
  { id: 'laguna', name: 'Laguna', color: '#049dd9' },
  { id: 'turquoise', name: 'Turquesa', color: '#30cff2' },
  { id: 'dark-cyan', name: 'Cian oscuro', color: '#087ea4' },
  { id: 'mangrove', name: 'Verde manglar', color: '#0f766e' },
  { id: 'jade', name: 'Verde jade', color: '#10b981' },
  { id: 'deep-purple', name: 'Morado profundo', color: '#4c1d95' },
  { id: 'violet', name: 'Violeta', color: '#7c3aed' },
  { id: 'coral', name: 'Rojo coral', color: '#ef4444' },
  { id: 'orange', name: 'Naranja', color: '#f97316' },
  { id: 'gold', name: 'Dorado', color: '#c4933f' },
  { id: 'gray', name: 'Gris elegante', color: '#374151' },
];
const READER_THEME_IDS = READER_THEMES.map((theme) => theme.id);

function hexToRgb(hex) {
  const clean = String(hex).replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function readerLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Per the design spec: dark colors -> white text, light colors -> dark text.
// Guarantees we never render white text on a light background (or vice versa).
function getContrastText(hexColor) {
  return readerLuminance(hexColor) < 0.45 ? '#ffffff' : '#111827';
}

function mixHex(hex, target, amount) {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  const channel = (x, y) => Math.round(x + (y - x) * amount);
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(channel(a.r, b.r))}${toHex(channel(a.g, b.g))}${toHex(channel(a.b, b.b))}`;
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Build the full CSS-variable set for a theme color, with automatic contrast so the
// panel, glass controls and back button stay legible on any background (light or dark).
function buildReaderThemeVars(color) {
  const isDark = readerLuminance(color) < 0.45;
  return {
    '--reader-bg': `linear-gradient(180deg, ${mixHex(color, '#ffffff', isDark ? 0.05 : 0.16)} 0%, ${color} 55%, ${mixHex(color, '#000000', 0.18)} 100%)`,
    '--reader-text': isDark ? '#ffffff' : '#111827',
    '--reader-muted': isDark ? 'rgba(255, 255, 255, 0.72)' : 'rgba(17, 24, 39, 0.62)',
    '--reader-accent': color,
    '--reader-accent-ink': getContrastText(color),
    '--reader-surface': isDark ? rgba(mixHex(color, '#0b1020', 0.5), 0.88) : rgba('#ffffff', 0.9),
    '--reader-control-bg': isDark ? rgba(mixHex(color, '#0b1020', 0.45), 0.82) : rgba('#ffffff', 0.84),
    '--reader-control-border': isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(15, 23, 42, 0.14)',
    '--reader-border': isDark ? 'rgba(255, 255, 255, 0.20)' : 'rgba(15, 23, 42, 0.14)',
    '--reader-ring': isDark ? '#ffffff' : '#0f172a',
  };
}

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

  if (name === 'settings') {
    return (
      <svg {...commonProps}>
        <path d="M4 21v-7" />
        <path d="M4 10V3" />
        <path d="M12 21v-9" />
        <path d="M12 8V3" />
        <path d="M20 21v-5" />
        <path d="M20 12V3" />
        <path d="M2 14h4" />
        <path d="M10 8h4" />
        <path d="M18 16h4" />
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
  const primaryModelHotspot = modelHotspots[0] ?? null;
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
        {primaryModelHotspot && (
          <InlineModelLayer key={`inline-model-${primaryModelHotspot.id}`} hotspot={primaryModelHotspot} />
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
function ConalitegStyleReader({ pages = [], hotspots = [], onHotspotClick }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readerSettings, setReaderSettings] = useState(loadReaderSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
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

      <button
        type="button"
        className="reader-settings-button"
        onClick={() => setSettingsOpen((open) => !open)}
        aria-label="Configurar lectura"
        aria-expanded={settingsOpen}
        aria-controls="reader-settings-panel"
        title="Configurar lectura"
      >
        <ReaderIcon name="settings" />
      </button>

      {settingsOpen && (
        <aside id="reader-settings-panel" className="reader-settings-panel" aria-label="Configuracion del lector">
          <div className="reader-settings-panel-header">
            <strong>Lectura</strong>
            <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Cerrar configuracion">x</button>
          </div>

          <div className="reader-settings-group">
            <span>Tema y color</span>
            <div className="theme-color-grid" role="group" aria-label="Color del lector">
              {READER_THEMES.map((theme) => {
                const selected = readerSettings.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    className={`theme-color-dot ${selected ? 'is-selected' : ''}`}
                    style={{ background: theme.color }}
                    title={theme.name}
                    aria-label={`Usar tema ${theme.name}`}
                    aria-pressed={selected}
                    onClick={() => updateReaderSetting('theme', theme.id)}
                  >
                    {selected && (
                      <span
                        className="material-symbols-rounded theme-color-check"
                        style={{ color: getContrastText(theme.color) }}
                        aria-hidden="true"
                      >
                        check
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="reader-settings-group">
            <span>Tamano del libro</span>
            <div className="reader-settings-options">
              {[
                ['fit', 'Ajustado'],
                ['large', 'Grande'],
                ['full', 'Pantalla'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={readerSettings.bookSize === value ? 'is-active' : ''}
                  onClick={() => updateReaderSetting('bookSize', value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="reader-settings-group">
            <span>Controles</span>
            <div className="reader-settings-options">
              {[
                ['always', 'Siempre'],
                ['auto', 'Automaticos'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={readerSettings.controlsMode === value ? 'is-active' : ''}
                  onClick={() => updateReaderSetting('controlsMode', value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="reader-settings-fullscreen" onClick={toggleFullscreen}>
            {isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          </button>
        </aside>
      )}

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
