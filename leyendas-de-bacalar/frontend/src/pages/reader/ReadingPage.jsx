import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import Modal from '../../components/ui/Modal.jsx';
import PhysicalBookActivationModal from '../../components/reader/PhysicalBookActivationModal.jsx';
import ArSceneModal from '../../components/3d/ArSceneModal.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useRoles } from '../../hooks/useRoles.js';
import { getLegendBySlug } from '../../services/legendService.js';
import { getReaderBundle, startDocumentRender } from '../../services/backendApiService.js';
import { buildReaderPagesFromBundle } from '../../utils/readerPages.js';

// Lazy: the book viewer (react-pageflip) only loads when a legend actually opens.
const ConalitegStyleReader = lazy(() => import('../../components/reader/ConalitegStyleReader.jsx'));

// Adapt a reader-bundle ar_scene + model asset to what ArSceneModal expects.
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

function ReadingPage() {
  const { slug } = useParams();
  const { isAuthenticated, user } = useAuth();
  const { roles } = useRoles();
  const [legend, setLegend] = useState(null);
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locked, setLocked] = useState(false);
  const [activationOpen, setActivationOpen] = useState(false);
  const [sceneModal, setSceneModal] = useState(null);
  const [hotspotNotice, setHotspotNotice] = useState(false);
  const [rendering, setRendering] = useState(false);

  const loadReader = useCallback(async () => {
    setLoading(true);
    setError(null);
    setLocked(false);

    const { data, error: legendError } = await getLegendBySlug(slug);
    if (legendError || !data) {
      setError(legendError ?? new Error('Leyenda no encontrada.'));
      setLoading(false);
      return;
    }
    setLegend(data);

    try {
      const readerBundle = await getReaderBundle(data.id);
      setBundle(readerBundle);
    } catch (bundleError) {
      if (bundleError?.status === 403) {
        setLocked(true);
      } else {
        setError(new Error('No pudimos abrir esta lectura.'));
      }
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    loadReader();
  }, [loadReader, isAuthenticated]);

  // Immersive reading: hide the global navbar while the book is open.
  useEffect(() => {
    document.body.classList.add('reading-immersive');
    return () => document.body.classList.remove('reading-immersive');
  }, []);

  if (loading) return <LoadingState message="Abriendo libro..." />;
  if (error) return <EmptyState title="No se pudo abrir la lectura" message={error.message} />;

  const title = legend?.title || bundle?.legend?.title || 'Lectura';
  const sourceDocument = bundle?.sourceDocument ?? null;
  const renderStatus = sourceDocument?.renderStatus ?? 'not_rendered';
  const renderedPages = bundle?.renderedPages ?? [];
  const legendPages = bundle?.legendPages ?? [];
  const markerAssets = bundle?.markerAssets ?? [];
  const hotspots = (bundle?.hotspots ?? []).map((hotspot) => ({
    ...hotspot,
    markerAsset: hotspot.markerAssetId
      ? markerAssets.find((asset) => String(asset.id) === String(hotspot.markerAssetId)) || null
      : null,
  }));
  const arScenes = bundle?.arScenes ?? [];
  const modelAssets = bundle?.modelAssets ?? [];
  const readerPages = buildReaderPagesFromBundle(bundle);

  const isCreatorOrAdmin =
    roles.includes('admin')
    || roles.includes('super_admin')
    || Boolean(user?.id && bundle?.legend?.creatorId && String(user.id) === String(bundle.legend.creatorId));

  function handleHotspotClick(hotspot) {
    if (hotspot.arSceneId) {
      const arScene = arScenes.find((scene) => String(scene.id) === String(hotspot.arSceneId));
      const scene = buildScene(arScene, modelAssets);
      if (scene) {
        setSceneModal({ scene, pageNumber: hotspot.sourcePageNumber ?? null });
        return;
      }
    }
    setHotspotNotice(true);
  }

  async function handlePrepareBook(force = false) {
    if (!sourceDocument?.id || rendering) return;
    setRendering(true);
    try {
      await startDocumentRender(sourceDocument.id, { force });
      await loadReader();
    } catch {
      // status reflects failure on reload
    } finally {
      setRendering(false);
    }
  }

  function renderReader() {
    return (
      <Suspense fallback={<LoadingState message="Preparando libro..." />}>
        <ConalitegStyleReader pages={readerPages} hotspots={hotspots} onHotspotClick={handleHotspotClick} />
      </Suspense>
    );
  }

  function renderBody() {
    if (locked) {
      return (
        <div className="reader-locked-book">
          <h2>Esta leyenda esta bloqueada</h2>
          <p>Desbloqueala con el codigo de tu libro fisico para leer la historia completa.</p>
          <Button className="reader-glow-button" onClick={() => setActivationOpen(true)}>Activar libro fisico</Button>
        </div>
      );
    }

    // PDF book ready -> unified reader (rendered images).
    if (renderedPages.length > 0) return renderReader();

    // PDF exists but pages are not rendered yet -> clear status (never the old fallback).
    if (sourceDocument) {
      const message = {
        processing: 'El libro se esta preparando. Intenta nuevamente en unos momentos.',
        failed: 'No se pudieron preparar las paginas del libro.',
        not_rendered: 'Las paginas del libro se estan preparando.',
      }[renderStatus] || 'Las paginas del libro aun no estan listas.';

      return (
        <div className="reader-empty-book">
          <h2>{rendering ? 'Preparando libro...' : message}</h2>
          {isCreatorOrAdmin && (renderStatus === 'not_rendered' || renderStatus === 'failed') && (
            <Button onClick={() => handlePrepareBook(renderStatus === 'failed')} disabled={rendering}>
              {rendering ? 'Preparando...' : (renderStatus === 'failed' ? 'Reintentar preparacion' : 'Preparar libro')}
            </Button>
          )}
        </div>
      );
    }

    // No PDF, but manual pages exist -> SAME unified reader (paper pages).
    if (legendPages.length > 0) return renderReader();

    return (
      <div className="reader-empty-book">
        <h2>Esta historia todavia no tiene paginas disponibles.</h2>
        <p>Cuando el autor publique el documento o paginas, aparecera aqui.</p>
      </div>
    );
  }

  return (
    <section className="reader-stage">
      <div className="reader-stage-top">
        <Link className="reader-back-link" to={`/legend/${legend?.slug ?? slug}`}>&larr; Volver</Link>
        <h1>{title}</h1>
        <span className="reader-stage-spacer" aria-hidden="true" />
      </div>

      <div className="reader-stage-body">
        {renderBody()}
      </div>

      {activationOpen && (
        <PhysicalBookActivationModal onClose={() => setActivationOpen(false)} onRedeemed={loadReader} />
      )}

      {sceneModal && (
        <ArSceneModal scene={sceneModal.scene} pageNumber={sceneModal.pageNumber} onClose={() => setSceneModal(null)} />
      )}

      {hotspotNotice && (
        <Modal title="Marcador sin modelo 3D" onClose={() => setHotspotNotice(false)}>
          <div className="hotspot-empty-modal">
            <p>Este marcador todavia no tiene modelo 3D asociado.</p>
            <Button type="button" variant="ghost" onClick={() => setHotspotNotice(false)}>Cerrar</Button>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default ReadingPage;
