import React from 'react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import PhysicalBookActivationModal from '../../components/reader/PhysicalBookActivationModal.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getLegendBySlug, getLegendPages, getUserLegendAccess } from '../../services/legendService.js';

const fallbackCover = '/assets/portada carin hall.png';

function ReaderPageSpread({ leftPage, rightPage }) {
  return (
    <div className="reader-page-spread">
      <article className="reader-book-page reader-book-page-left">
        {leftPage ? (
          <>
            <span>Pagina {leftPage.page_number}</span>
            {leftPage.title && <h2>{leftPage.title}</h2>}
            <p>{leftPage.text_content}</p>
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

      setLegend(data);
      setPages(pageData ?? []);
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
                  <ReaderPageSpread leftPage={leftPage} rightPage={rightPage} />
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
    </section>
  );
}

export default ReadingPage;
