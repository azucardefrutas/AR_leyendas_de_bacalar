import React from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LegendHero from '../../components/legend/LegendHero.jsx';
import GlassButton from '../../components/ui/GlassButton.jsx';
import StoryActions from '../../components/ui/StoryActions.jsx';
import PhysicalBookActivationModal from '../../components/reader/PhysicalBookActivationModal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getLegendPages, getPublishedLegendBySlug, getUserLegendAccess } from '../../services/legendService.js';
import { getReaderBundle } from '../../services/backendApiService.js';
import { buildBookModelsFromBundle } from '../../utils/bookModels.js';
import ArModelsLauncher from '../../components/ar/ArModelsLauncher.jsx';
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
  const [bookModels, setBookModels] = useState([]);

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

  // Modelos 3D del libro para el botón "Ver en AR". Se pide aparte (no bloquea el
  // render del detalle). Para libros bloqueados el bundle da 403 -> sin modelos.
  useEffect(() => {
    if (!legend?.id) {
      setBookModels([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const bundle = await getReaderBundle(legend.id);
        if (!cancelled) setBookModels(buildBookModelsFromBundle(bundle));
      } catch {
        if (!cancelled) setBookModels([]);
      }
    })();
    return () => { cancelled = true; };
  }, [legend?.id]);

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
  const location = legend.origin_place || 'Bacalar, Quintana Roo';
  const chips = genres.map((genre) => genre.name).filter(Boolean);
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

  const heroActions = (
    <>
      {canRead ? (
        <GlassButton
          to={`/legend/${legend.slug}/read`}
          variant="solid"
          icon="auto_stories"
          iconFilled
          className="legend-hero__cta"
        >
          Explorar historia
        </GlassButton>
      ) : (
        <GlassButton
          onClick={handleProtectedAction}
          variant="solid"
          icon={accessType === 'code_required' || accessType === 'mixed' ? 'redeem' : 'lock_open'}
          className="legend-hero__cta"
        >
          {actionLabel}
        </GlassButton>
      )}
      <ArModelsLauncher models={bookModels} variant="inline" />
      <GlassButton to="/catalog" variant="glass" icon="keyboard_return">
        Regresar
      </GlassButton>
      <StoryActions
        legend={{ id: legend.id, title: legend.title, slug: legend.slug, coverUrl }}
        className="legend-hero-actions-icons"
      />
    </>
  );

  return (
    <section className="detail-page">
      <LegendHero
        title={legend.title}
        author={authorName}
        location={location}
        description={synopsis}
        coverImage={coverUrl}
        bannerImage={bannerUrl}
        badgeLabel={badge}
        isFree={isFree}
        chips={chips}
        backTo="/catalog"
        backLabel="Regresar"
        actions={heroActions}
      >
        {!canRead && (
          <p className="legend-locked-note">
            Esta leyenda esta bloqueada. Desbloqueala para leer la historia completa.
          </p>
        )}
        {actionMessage && <p className="legend-locked-note">{actionMessage}</p>}
        {!canRead && !isAuthenticated && (
          <Link className="reader-soft-link legend-hero__soft" to={loginForLegend}>
            Para desbloquear esta leyenda necesitas iniciar sesion.
          </Link>
        )}

        {previewText && !canRead && (
          <div className="detail-preview-strip">
            <strong>Vista previa</strong>
            <p>{previewText.slice(0, 220)}{previewText.length > 220 ? '...' : ''}</p>
          </div>
        )}
      </LegendHero>

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
