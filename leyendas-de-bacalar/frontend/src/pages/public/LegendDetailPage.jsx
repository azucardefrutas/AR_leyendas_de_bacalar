import React from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import PhysicalBookActivationModal from '../../components/reader/PhysicalBookActivationModal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getLegendPages, getPublishedLegendBySlug, getUserLegendAccess } from '../../services/legendService.js';
import { getLoginPathForRedirect } from '../../utils/authRedirect.js';

const fallbackCovers = [
  '/assets/portada carin hall.png',
  '/assets/portada la bruja.png',
  '/assets/portada el sismite.png',
  '/assets/portada los duentes del monte.png',
  '/assets/Portada_los guardianes.png',
];

const accessLabels = {
  free: 'Gratis',
  paid: 'Compra',
  subscription: 'Suscripcion',
  code_required: 'Codigo fisico',
  mixed: 'Mixto',
};

const actionLabels = {
  free: 'Explorar historia',
  paid: 'Desbloquear historia',
  subscription: 'Ver opciones de acceso',
  code_required: 'Activar libro fisico',
  mixed: 'Ver formas de acceso',
};

function getFallbackCover(slug = '') {
  const total = fallbackCovers.length;
  const index = Math.abs(slug.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % total;
  return fallbackCovers[index];
}

function LegendDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [legend, setLegend] = useState(null);
  const [pages, setPages] = useState([]);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activationOpen, setActivationOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    async function loadLegend() {
      setLoading(true);
      setError(null);
      const { data, error: legendError } = await getPublishedLegendBySlug(slug);
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

    loadLegend();
  }, [isAuthenticated, slug]);

  if (loading) return <LoadingState message="Cargando detalle..." />;
  if (error) return <EmptyState title="No se pudo cargar la leyenda" message={error.message} />;

  const accessType = legend.access_type ?? 'free';
  const isFree = accessType === 'free';
  const canRead = Boolean(access) || isFree;
  const currentPath = `/legend/${slug}`;
  const loginForLegend = getLoginPathForRedirect(currentPath);
  const previewText = pages.find((page) => page.text_content)?.text_content;
  const coverUrl = legend.coverUrl || legend.cover_url || legend.poster_url || getFallbackCover(slug);
  const authorName = legend.authorName || legend.author_name || legend.creator_name || legend.pen_name || 'Autor no disponible';
  const synopsis = legend.synopsis || legend.shortSynopsis || 'Una leyenda de Bacalar lista para descubrir.';
  const genres = Array.isArray(legend.genres) ? legend.genres : [];
  const chips = [
    legend.origin_place || 'Bacalar',
    accessLabels[legend.access_type] || legend.access_type || 'Gratis',
    ...genres.map((genre) => genre.name).filter(Boolean),
  ].filter(Boolean);
  const actionLabel = actionLabels[accessType] || 'Explorar historia';

  async function refreshAccess() {
    if (!legend?.id || !isAuthenticated) return;
    const { data } = await getUserLegendAccess(legend.id);
    setAccess(data);
  }

  function handleProtectedAction() {
    setActionMessage(null);
    if (!isAuthenticated) {
      navigate(loginForLegend);
      return;
    }
    if (accessType === 'code_required' || accessType === 'mixed') {
      setActivationOpen(true);
      return;
    }
    setActionMessage('Para desbloquear esta leyenda se habilitaran opciones de acceso desde tu cuenta.');
  }

  return (
    <section className="legend-experience-shell">
      <div className="legend-night-panel">
        <Link className="reader-back-link" to="/reader/library">Volver</Link>
        <div className="legend-detail-stage">
          <article className="legend-detail-copy">
            <p className="reader-kicker">{canRead ? 'Disponible para lectura' : 'Contenido protegido'}</p>
            <h1>{legend.title}</h1>
            <div className="legend-meta-row">
              <span className="legend-author-pill">{authorName}</span>
              {chips.map((chip) => <span className="legend-chip" key={chip}>{chip}</span>)}
            </div>
            <p className="legend-detail-synopsis">{synopsis}</p>

            {canRead ? (
              <Link to={`/legend/${legend.slug}/read`}>
                <Button className="reader-glow-button">Explorar historia</Button>
              </Link>
            ) : (
              <>
                <Button className="reader-glow-button" onClick={handleProtectedAction}>{actionLabel}</Button>
                <p className="legend-locked-note">
                  Esta leyenda esta bloqueada. Desbloqueala para leer la historia completa.
                </p>
                {actionMessage && <p className="legend-locked-note">{actionMessage}</p>}
                {!isAuthenticated && (
                  <Link className="reader-soft-link" to={loginForLegend}>Para desbloquear esta leyenda necesitas iniciar sesion.</Link>
                )}
              </>
            )}
          </article>

          <aside className="legend-cover-showcase">
            <img src={coverUrl} alt={`Portada de ${legend.title}`} />
            <span aria-hidden="true" />
          </aside>
        </div>
        {previewText && !canRead && (
          <div className="legend-preview-strip">
            <strong>Vista previa</strong>
            <p>{previewText.slice(0, 220)}{previewText.length > 220 ? '...' : ''}</p>
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

export default LegendDetailPage;
