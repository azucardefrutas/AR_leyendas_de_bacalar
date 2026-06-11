import React from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import PhysicalBookActivationModal from '../../components/reader/PhysicalBookActivationModal.jsx';
import ArSceneModal from '../../components/3d/ArSceneModal.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getLegendBySlug, getLegendPages, getUserLegendAccess } from '../../services/legendService.js';
import { getLegendResources } from '../../services/assetService.js';

const fallbackCover = '/assets/portada carin hall.png';

function ReaderPageSpread({ leftPage, rightPage, leftScene, rightScene, onViewModel }) {
  return (
    <div className="reader-page-spread">
      <article className="reader-book-page reader-book-page-left">
        {leftPage ? (
          <>
            <span>Pagina {leftPage.page_number}</span>
            {leftPage.title && <h2>{leftPage.title}</h2>}
            <p>{leftPage.text_content}</p>
            {leftScene && (
              <button type="button" className="reader-3d-button" onClick={() => onViewModel(leftScene)}>
                Ver modelo 3D
              </button>
            )}
          </>
        ) : (
          <p>Esta leyenda aun no tiene paginas publicadas.</p>
        )}
      </article>
      <article className="reader-book-page reader-book-page-right">
        {rightPage ? (
          <>
            <span>Pagina {rightPage.page_number}</span>
            {rightPage.title && <h2>{rightPage.title}</h2>}
            <p>{rightPage.text_content}</p>
            {rightScene && (
              <button type="button" className="reader-3d-button" onClick={() => onViewModel(rightScene)}>
                Ver modelo 3D
              </button>
            )}
          </>
        ) : (
          <div className="reader-page-mark">Leyendas de Bacalar</div>
        )}
      </article>
    </div>
  );
}

function ReadingPage() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const [legend, setLegend] = useState(null);
  const [pages, setPages] = useState([]);
  const [arResources, setArResources] = useState({ scenes: [], markers: [] });
  const [activeScene, setActiveScene] = useState(null);
  const [access, setAccess] = useState(null);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [activationOpen, setActivationOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadReader() {
      setLoading(true);
      setError(null);
      const { data, error: legendError } = await getLegendBySlug(slug);
      if (legendError || !data) {
        setError(legendError ?? new Error('Leyenda no encontrada.'));
        setLoading(false);
        return;
      }

      const { data: pageData } = await getLegendPages(data.id);
      const { data: accessData } = isAuthenticated
        ? await getUserLegendAccess(data.id)
        : { data: null };

      // Best-effort: load 3D/AR scenes for pages. RLS or missing data must not
      // break the reader; getLegendResources returns empty sets on failure.
      let scenes = [];
      let markers = [];
      try {
        const resources = await getLegendResources(data.id);
        scenes = (resources.data?.arScenes ?? []).filter(
          (scene) => scene.page_id && String(scene.status || '').toLowerCase() !== 'archived',
        );
        markers = resources.data?.arMarkers ?? [];
      } catch (resourceError) {
        if (import.meta.env.DEV) console.error('reader ar resources error', resourceError);
      }

      setLegend(data);
      setPages(pageData ?? []);
      setArResources({ scenes, markers });
      setAccess(accessData);
      setLoading(false);
    }

    loadReader();
  }, [isAuthenticated, slug]);

  if (loading) return <LoadingState message="Abriendo libro..." />;
  if (error) return <EmptyState title="No se pudo abrir la lectura" message={error.message} />;

  const isFree = (legend.access_type ?? 'free') === 'free';
  const canRead = Boolean(access) || isFree;
  const leftPage = pages[spreadIndex] ?? null;
  const rightPage = pages[spreadIndex + 1] ?? null;
  const sceneForPage = (page) => (page ? arResources.scenes.find((scene) => String(scene.page_id) === String(page.id)) ?? null : null);
  const markerForScene = (scene) => (scene ? arResources.markers.find((marker) => String(marker.ar_scene_id) === String(scene.id)) ?? null : null);
  const leftScene = sceneForPage(leftPage);
  const rightScene = sceneForPage(rightPage);
  const maxSpreadStart = Math.max(0, pages.length - (pages.length % 2 === 0 ? 2 : 1));
  const coverUrl = legend.cover_url || legend.coverUrl || legend.poster_url || fallbackCover;

  async function refreshAccess() {
    if (!legend?.id || !isAuthenticated) return;
    const { data } = await getUserLegendAccess(legend.id);
    setAccess(data);
  }

  function goPrevious() {
    setSpreadIndex((current) => Math.max(0, current - 2));
  }

  function goNext() {
    setSpreadIndex((current) => Math.min(maxSpreadStart, current + 2));
  }

  return (
    <section className="legend-reader-shell">
      <div className="legend-reader-panel">
        <div className="legend-reader-topbar">
          <Link className="reader-back-link" to={`/legend/${legend.slug}`}>Volver</Link>
          <h1>{legend.title}</h1>
          <img src={coverUrl} alt="" />
        </div>

        {canRead ? (
          <>
            {pages.length > 0 ? (
              <div className="reader-book-stage">
                <button className="reader-page-arrow reader-page-arrow-left" type="button" onClick={goPrevious} disabled={spreadIndex === 0} aria-label="Pagina anterior">
                  ←
                </button>
                <div className="reader-open-book" aria-label="Libro abierto">
                  <img className="reader-open-book-art" src="/assets/Libro abierto.png" alt="" />
                  <ReaderPageSpread
                    leftPage={leftPage}
                    rightPage={rightPage}
                    leftScene={leftScene}
                    rightScene={rightScene}
                    onViewModel={setActiveScene}
                  />
                </div>
                <button className="reader-page-arrow reader-page-arrow-right" type="button" onClick={goNext} disabled={spreadIndex >= maxSpreadStart} aria-label="Pagina siguiente">
                  →
                </button>
              </div>
            ) : (
              <div className="reader-empty-book">
                <h2>Esta leyenda aun no tiene paginas publicadas.</h2>
                <p>Cuando el autor publique contenido, aparecera aqui como lectura editorial.</p>
              </div>
            )}
          </>
        ) : (
          <div className="reader-locked-book">
            <h2>Esta leyenda esta bloqueada</h2>
            <p>Desbloqueala con el codigo de tu libro fisico para leer la historia completa.</p>
            <Button className="reader-glow-button" onClick={() => setActivationOpen(true)}>Activar libro fisico</Button>
          </div>
        )}
      </div>

      {activationOpen && (
        <PhysicalBookActivationModal
          onClose={() => setActivationOpen(false)}
          onRedeemed={refreshAccess}
        />
      )}

      {activeScene && (
        <ArSceneModal
          scene={activeScene}
          marker={markerForScene(activeScene)}
          pageNumber={pages.find((page) => String(page.id) === String(activeScene.page_id))?.page_number ?? null}
          onClose={() => setActiveScene(null)}
        />
      )}
    </section>
  );
}

export default ReadingPage;
