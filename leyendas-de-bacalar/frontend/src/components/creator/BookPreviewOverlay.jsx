import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { animate } from 'animejs';
import ConalitegStyleReader from '../reader/ConalitegStyleReader.jsx';
import LoadingState from '../ui/LoadingState.jsx';
import { buildPreviewPages, buildReaderPagesFromBundle } from '../../utils/readerPages.js';
import { buildBookModelsFromBundle } from '../../utils/bookModels.js';
import { getReaderBundle } from '../../services/backendApiService.js';

// Lazy: the 3D viewer (three.js) loads only when the author taps a model marker in
// the preview — the same viewer the real reader opens.
const Model3DViewer = lazy(() => import('../3d/Model3DViewer.jsx'));

// Adapt a reader-bundle ar_scene + model asset to the shape Model3DViewer expects.
// Mirrors ReadingPage.buildScene so "Ver como lector" behaves like the audience view.
function buildScene(arScene, modelAssets = []) {
  if (!arScene) return null;
  const model = arScene.modelAssetId
    ? modelAssets.find((asset) => String(asset.id) === String(arScene.modelAssetId))
    : null;
  return {
    id: arScene.id,
    name: arScene.name,
    description: arScene.description,
    status: arScene.status,
    page_id: arScene.pageId,
    interactionConfig: arScene.interactionConfig || {},
    assets: model
      ? {
          url: model.url || '',
          asset_type: model.assetType,
          mime_type: model.mimeType,
          file_size: model.fileSize,
          metadata: model.metadata || {},
        }
      : null,
  };
}

// "Ver como lector" — the book exactly as the audience reads it, with the CONALITEG
// page-flip physics (react-pageflip). Manual legends build from the editor's LIVE
// local state (portada → páginas con modelos 3D → contraportada). Uploaded (PDF)
// legends fetch the reader bundle so the SAVED marker/model hotspots show on their
// page, just like the public reader.
export default function BookPreviewOverlay({
  pages = [], renderedPages = [], title = '', author = '', onClose,
  templateId = '', coverData = null, backCoverData = null, legendId = null,
}) {
  const rootRef = useRef(null);
  const isPdf = renderedPages.length > 0;
  const [bundle, setBundle] = useState(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [sceneModal, setSceneModal] = useState(null);

  // For PDF books, load the reader bundle (rendered pages + saved hotspots enriched
  // with marker image + 3D model). Best-effort: if it fails we still show the pages.
  useEffect(() => {
    if (!legendId || !isPdf) return undefined;
    let active = true;
    setBundleLoading(true);
    getReaderBundle(legendId)
      .then((data) => { if (active) setBundle(data); })
      .catch(() => { if (active) setBundle(null); })
      .finally(() => { if (active) setBundleLoading(false); });
    return () => { active = false; };
  }, [legendId, isPdf]);

  const useBundle = isPdf && bundle && (bundle.renderedPages?.length ?? 0) > 0;

  const readerPages = useMemo(() => {
    if (useBundle) return buildReaderPagesFromBundle(bundle);
    return buildPreviewPages(pages, { templateId, coverData, backCoverData, renderedPages });
  }, [useBundle, bundle, pages, renderedPages, templateId, coverData, backCoverData]);

  const hotspots = useMemo(() => {
    if (!useBundle) return [];
    const markerAssets = bundle.markerAssets ?? [];
    const arScenes = bundle.arScenes ?? [];
    const modelAssets = bundle.modelAssets ?? [];
    return (bundle.hotspots ?? []).map((hotspot) => ({
      ...hotspot,
      markerAsset: hotspot.markerAssetId
        ? markerAssets.find((asset) => String(asset.id) === String(hotspot.markerAssetId)) || null
        : null,
      scene: hotspot.arSceneId
        ? buildScene(arScenes.find((scene) => String(scene.id) === String(hotspot.arSceneId)), modelAssets)
        : null,
    }));
  }, [useBundle, bundle]);

  const bookModels = useMemo(() => (useBundle ? buildBookModelsFromBundle(bundle) : []), [useBundle, bundle]);

  function handleHotspotClick(hotspot) {
    const scene = hotspot?.scene;
    // Only open markers that actually carry a 3D model — never an empty viewer.
    if (scene?.assets?.url) {
      setSceneModal({ scene, pageNumber: hotspot.sourcePageNumber ?? null });
    }
  }

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

  // Immersive-reader chrome: the bar tucks away shortly after opening and while the
  // reader's pointer is over the book, and slides back in only when the cursor
  // reaches the top edge (or on tap, for touch). This way it never covers the book.
  const [chromeVisible, setChromeVisible] = useState(true);
  useEffect(() => {
    let hideTimer = setTimeout(() => setChromeVisible(false), 2000);
    const scheduleHide = (delay) => {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setChromeVisible(false), delay);
    };
    const onMove = (event) => {
      if (event.pointerType === 'mouse' && event.clientY < 110) {
        clearTimeout(hideTimer);
        setChromeVisible(true);
      } else {
        scheduleHide(900);
      }
    };
    const onTap = () => { setChromeVisible(true); scheduleHide(2600); };
    // Capture phase: react-pageflip swallows pointer events over the book, so a
    // normal (bubbling) window listener never fires while the cursor is on a page.
    // Capturing guarantees onMove runs before the flipbook can stop propagation.
    const opts = { capture: true, passive: true };
    window.addEventListener('pointermove', onMove, opts);
    window.addEventListener('pointerdown', onTap, opts);
    return () => {
      clearTimeout(hideTimer);
      window.removeEventListener('pointermove', onMove, opts);
      window.removeEventListener('pointerdown', onTap, opts);
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
        {isPdf && bundleLoading && !bundle ? (
          <p className="book-preview-reader__msg">Preparando la vista del lector…</p>
        ) : readerPages.length === 0 ? (
          <p className="book-preview-reader__msg">
            Aún no hay páginas para previsualizar. Escribe contenido y vuelve a intentar.
          </p>
        ) : (
          <ConalitegStyleReader
            pages={readerPages}
            hotspots={hotspots}
            models={bookModels}
            onHotspotClick={handleHotspotClick}
            flippingTime={1000}
            maxShadowOpacity={0.62}
          />
        )}
      </div>

      {sceneModal && (
        <Suspense fallback={<LoadingState message="Cargando modelo 3D..." />}>
          <Model3DViewer
            scene={sceneModal.scene}
            onClose={() => setSceneModal(null)}
            hideHeading
          />
        </Suspense>
      )}
    </div>
  );
}
