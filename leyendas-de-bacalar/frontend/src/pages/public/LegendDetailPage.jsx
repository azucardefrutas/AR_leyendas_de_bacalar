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
  '/assets/portada los duentes del monte.png',
  '/assets/Portada_los guardianes.png',
];

const accessLabels = {
  free: 'Gratis',
  paid: 'Premium',
  subscription: 'Premium',
  code_required: 'Codigo fisico',
  mixed: 'Premium',
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
        setError(legendError ?? new Error('Esta leyenda no esta disponible publicamente.'));
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
  if (error) return <EmptyState title="Leyenda no disponible" message={error.message} />;

  const accessType = legend.access_type ?? 'free';
  const isFree = accessType === 'free';
  const canRead = Boolean(access) || isFree;
  const currentPath = `/legend/${slug}`;
  const loginForLegend = getLoginPathForRedirect(currentPath);
  const previewText = pages.find((page) => page.text_content)?.text_content;
  const coverUrl = legend.coverUrl || legend.cover_url || legend.poster_url || getFallbackCover(slug);
  const bannerUrl = legend.bannerUrl || legend.banner_url || legend.backdropUrl || coverUrl;
  const authorName = legend.authorName || legend.author_name || legend.creator_name || legend.pen_name || 'Autor no disponible';
  const synopsis = legend.synopsis || legend.shortSynopsis || 'Una leyenda de Bacalar lista para descubrir.';
  const genres = Array.isArray(legend.genres) ? legend.genres : [];
  const badge = isFree ? 'Gratis' : (accessLabels[accessType] || 'Premium');
  const chips = [legend.origin_place || 'Bacalar', ...genres.map((genre) => genre.name).filter(Boolean)];
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
    <section className="detail-page">
      <div
        className="detail-hero"
        style={bannerUrl ? { backgroundImage: `url("${bannerUrl}")` } : undefined}
      >
        <div className="detail-hero-overlay" aria-hidden="true" />

        <div className="detail-hero-content">
          <Link className="detail-back" to="/catalog">&larr; Volver al catalogo</Link>

          <div className="detail-grid">
            <div className="detail-poster">
              {coverUrl ? (
                <img src={coverUrl} alt={`Portada de ${legend.title}`} />
              ) : (
                <div className="detail-poster-fallback"><span>{legend.title?.slice(0, 2).toUpperCase()}</span></div>
              )}
            </div>

            <div className="detail-info">
              <span className={`poster-badge ${isFree ? 'free' : 'premium'}`}>{badge}</span>
              <h1>{legend.title}</h1>
              <p className="detail-author">{authorName}</p>

              {chips.length > 0 && (
                <div className="detail-chips">
                  {chips.map((chip) => <span className="legend-chip" key={chip}>{chip}</span>)}
                </div>
              )}

              <p className="detail-synopsis">{synopsis}</p>

              <div className="detail-actions">
                {canRead ? (
                  <Link to={`/legend/${legend.slug}/read`}>
                    <Button className="reader-glow-button">Explorar historia</Button>
                  </Link>
                ) : (
                  <Button className="reader-glow-button" onClick={handleProtectedAction}>{actionLabel}</Button>
                )}
                <Link to="/catalog"><Button variant="ghost">Volver al catalogo</Button></Link>
              </div>

              {!canRead && (
                <p className="legend-locked-note">
                  Esta leyenda esta bloqueada. Desbloqueala para leer la historia completa.
                </p>
              )}
              {actionMessage && <p className="legend-locked-note">{actionMessage}</p>}
              {!canRead && !isAuthenticated && (
                <Link className="reader-soft-link" to={loginForLegend}>
                  Para desbloquear esta leyenda necesitas iniciar sesion.
                </Link>
              )}

              {previewText && !canRead && (
                <div className="detail-preview-strip">
                  <strong>Vista previa</strong>
                  <p>{previewText.slice(0, 220)}{previewText.length > 220 ? '...' : ''}</p>
                </div>
              )}
            </div>
          </div>
        </div>
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
