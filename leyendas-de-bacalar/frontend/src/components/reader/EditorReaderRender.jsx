import React, { useEffect, useState } from 'react';
import ConalitegStyleReader from './ConalitegStyleReader.jsx';
import { buildReaderPagesFromBundle } from '../../utils/readerPages.js';
import { getReaderBundle } from '../../services/backendApiService.js';

// Opens the SAME reader the public sees (ConalitegStyleReader), from the editor,
// so the creator checks exactly how the book renders: cover → pages → back cover.
// Fetches the reader-bundle (the creator can read their own draft), so written and
// uploaded (PDF) stories both work through one path — identical to production.
export default function EditorReaderRender({ legendId, onClose }) {
  const [state, setState] = useState({ loading: true, error: '', pages: [], hotspots: [] });

  useEffect(() => {
    let active = true;
    getReaderBundle(legendId)
      .then((bundle) => {
        if (!active) return;
        setState({
          loading: false,
          error: '',
          pages: buildReaderPagesFromBundle(bundle),
          hotspots: bundle?.hotspots ?? [],
        });
      })
      .catch((error) => {
        if (active) setState({ loading: false, error: error?.message || 'No se pudo generar el render.', pages: [], hotspots: [] });
      });
    return () => { active = false; };
  }, [legendId]);

  useEffect(() => {
    document.body.classList.add('editor-reader-open');
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('editor-reader-open');
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="editor-reader-render reader-stage" role="dialog" aria-modal="true" aria-label="Render del libro (vista de lector)">
      <div className="editor-reader-render__bar">
        <span className="editor-reader-render__brand">
          <span className="material-symbols-rounded" aria-hidden="true">menu_book</span>
          Render del lector · CONALITEG
        </span>
        <button type="button" className="editor-reader-render__close" onClick={onClose}>Cerrar</button>
      </div>

      <div className="editor-reader-render__stage">
        {state.loading ? (
          <p className="editor-reader-render__msg">Generando el render del libro...</p>
        ) : state.error ? (
          <p className="editor-reader-render__msg editor-reader-render__msg--err">{state.error}</p>
        ) : state.pages.length === 0 ? (
          <p className="editor-reader-render__msg">Este libro aún no tiene páginas para renderizar. Guarda contenido y vuelve a intentar.</p>
        ) : (
          <ConalitegStyleReader pages={state.pages} hotspots={state.hotspots} onHotspotClick={() => {}} />
        )}
      </div>
    </div>
  );
}
