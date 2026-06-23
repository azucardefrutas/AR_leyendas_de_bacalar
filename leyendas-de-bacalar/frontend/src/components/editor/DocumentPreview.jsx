import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Reuse the same worker setup the reader already uses (pdfjs-dist v6).
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const RENDER_TARGET_WIDTH = 1100;
// A page much wider than tall is most likely a two-page spread on a single sheet.
const SPREAD_RATIO_THRESHOLD = 1.25;

/**
 * Frontend PDF preview that does NOT depend on the backend having extracted pages.
 * Renders a single source page with pdfjs from a local File (recently selected) or a
 * Storage URL. Optionally crops the page to a visual half ("left"/"right") so a wide
 * spread sheet can be shown as two visual pages.
 *
 * Props:
 *  - file        : File (preferred when present)
 *  - fileUrl     : string (Storage/signed URL fallback)
 *  - pageNumber  : 1-based source page (default 1)
 *  - side        : 'full' | 'left' | 'right' (default 'full')
 *  - spreadMode  : when false, side is ignored (always full)
 *  - onPageCountChange(count)
 *  - onPageMeta({ width, height, aspectRatio, isWideSpread })
 *  - onRenderError(error)
 */
export default function DocumentPreview({
  file = null,
  fileUrl = '',
  pageNumber = 1,
  side = 'full',
  spreadMode = false,
  onPageCountChange,
  onPageMeta,
  onRenderError,
  className = '',
}) {
  const canvasRef = useRef(null);
  const docRef = useRef(null); // loaded pdfjs document proxy
  const docKeyRef = useRef(''); // identifies the current source to avoid reloads
  const renderTaskRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const effectiveSide = spreadMode ? side : 'full';
  const sourceKey = file ? `file:${file.name}:${file.size}:${file.lastModified}` : `url:${fileUrl}`;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!file && !fileUrl) {
        setStatus('idle');
        return;
      }
      setStatus('loading');
      setErrorMessage('');

      try {
        // Load the document once per source; reuse it for page/side changes.
        if (docKeyRef.current !== sourceKey || !docRef.current) {
          if (docRef.current) {
            try { await docRef.current.destroy(); } catch { /* ignore */ }
            docRef.current = null;
          }
          const params = file
            ? { data: await file.arrayBuffer() }
            : { url: fileUrl };
          const pdf = await pdfjsLib.getDocument(params).promise;
          if (cancelled) { try { await pdf.destroy(); } catch { /* ignore */ } return; }
          docRef.current = pdf;
          docKeyRef.current = sourceKey;
          if (onPageCountChange) onPageCountChange(pdf.numPages);
        }

        const pdf = docRef.current;
        const safePage = Math.min(Math.max(1, Number(pageNumber) || 1), pdf.numPages);
        const page = await pdf.getPage(safePage);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const aspectRatio = baseViewport.width / baseViewport.height;
        const isWideSpread = aspectRatio > SPREAD_RATIO_THRESHOLD;
        if (onPageMeta) {
          onPageMeta({
            width: baseViewport.width,
            height: baseViewport.height,
            aspectRatio,
            isWideSpread,
          });
        }

        const scale = RENDER_TARGET_WIDTH / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const fullWidth = Math.ceil(viewport.width);
        const fullHeight = Math.ceil(viewport.height);

        // Render the full page to an offscreen canvas first.
        const offscreen = document.createElement('canvas');
        offscreen.width = fullWidth;
        offscreen.height = fullHeight;
        const offCtx = offscreen.getContext('2d');
        renderTaskRef.current = page.render({ canvasContext: offCtx, viewport });
        await renderTaskRef.current.promise;
        renderTaskRef.current = null;
        if (cancelled) { page.cleanup(); return; }

        // Copy the requested region (full / left half / right half) into the visible canvas.
        const canvas = canvasRef.current;
        if (!canvas) { page.cleanup(); return; }
        const halfWidth = Math.floor(fullWidth / 2);
        const cropWidth = effectiveSide === 'full' ? fullWidth : halfWidth;
        const cropX = effectiveSide === 'right' ? fullWidth - halfWidth : 0;
        canvas.width = cropWidth;
        canvas.height = fullHeight;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, cropWidth, fullHeight);
        ctx.drawImage(offscreen, cropX, 0, cropWidth, fullHeight, 0, 0, cropWidth, fullHeight);

        page.cleanup();
        if (!cancelled) setStatus('ready');
      } catch (error) {
        if (cancelled || error?.name === 'RenderingCancelledException') return;
        setStatus('error');
        setErrorMessage('No se pudo leer el documento. Verifica el archivo o reintenta.');
        if (onRenderError) onRenderError(error);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch { /* ignore */ }
        renderTaskRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceKey, pageNumber, effectiveSide, reloadKey]);

  // Destroy the pdf document when the component unmounts.
  useEffect(() => () => {
    if (docRef.current) {
      try { docRef.current.destroy(); } catch { /* ignore */ }
      docRef.current = null;
    }
  }, []);

  return (
    <div className={`document-preview document-preview--${effectiveSide} ${className}`.trim()}>
      <canvas ref={canvasRef} className="document-preview__canvas" />

      {status === 'loading' && (
        <div className="document-preview__overlay">
          <span className="document-preview__spinner" aria-hidden="true" />
          <span>Renderizando documento…</span>
        </div>
      )}

      {status === 'error' && (
        <div className="document-preview__overlay document-preview__overlay--error" role="alert">
          <span>{errorMessage}</span>
          <button
            type="button"
            className="document-preview__retry"
            onClick={() => { docKeyRef.current = ''; setReloadKey((value) => value + 1); }}
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
