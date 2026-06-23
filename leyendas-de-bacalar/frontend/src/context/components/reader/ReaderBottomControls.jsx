import React from 'react';
import AppIcon from '../ui/AppIcon.jsx';

/**
 * Floating bottom navigation bar for the reader (prev / page indicator / go-to /
 * next / fullscreen). Presentational and reusable — the parent reader owns the
 * paging state and passes handlers.
 */
export default function ReaderBottomControls({
  currentPage,
  numPages,
  pageInput,
  onPageInput,
  onGoToPage,
  onPrev,
  onNext,
  isFullscreen,
  onToggleFullscreen,
}) {
  return (
    <div className="pdf-flipbook-controls" aria-label="Controles del libro">
      <button
        type="button"
        className="pdf-flipbook-control-button"
        onClick={onPrev}
        disabled={currentPage <= 1}
        aria-label="Pagina anterior"
        title="Pagina anterior"
      >
        <AppIcon name="chevron_left" size={24} />
      </button>
      <span className="pdf-flipbook-page-indicator">Pagina {Math.min(currentPage, numPages)} de {numPages}</span>
      <label className="pdf-flipbook-goto">
        <span>Ir a pagina</span>
        <input
          type="number"
          min="1"
          max={numPages}
          value={pageInput}
          onChange={(event) => onPageInput(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter') onGoToPage(pageInput); }}
          onBlur={() => onGoToPage(pageInput)}
        />
      </label>
      <button
        type="button"
        className="pdf-flipbook-control-button"
        onClick={onNext}
        disabled={currentPage >= numPages}
        aria-label="Pagina siguiente"
        title="Pagina siguiente"
      >
        <AppIcon name="chevron_right" size={24} />
      </button>
      <button
        type="button"
        className="pdf-flipbook-control-button"
        onClick={onToggleFullscreen}
        aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
      >
        <AppIcon name={isFullscreen ? 'fullscreen_exit' : 'fullscreen'} size={24} />
      </button>
    </div>
  );
}
