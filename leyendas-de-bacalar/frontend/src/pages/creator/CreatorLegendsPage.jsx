import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { deleteLegendDraft, getMyLegends } from '../../services/creatorService.js';

const DELETE_DRAFT_CONFIRMATION = 'Seguro que quieres eliminar este borrador? Se eliminara la leyenda y su contenido asociado. Esta accion no se puede deshacer.';

const STATUS_LABELS = {
  draft: 'Borrador',
  borrador: 'Borrador',
  in_review: 'En revision',
  review: 'En revision',
  pending_review: 'En revision',
  rejected: 'Requiere cambios',
  published: 'Publicada',
};

const ACCESS_LABELS = {
  free: 'Gratis',
  paid: 'Compra',
  subscription: 'Suscripcion',
  code_required: 'Codigo fisico',
  mixed: 'Mixto',
};

function getStatusKey(legend) {
  return String(legend?.status || 'draft').toLowerCase();
}

function isDraftLegend(legend) {
  return ['draft', 'borrador'].includes(getStatusKey(legend));
}

function getStatusLabel(legend) {
  const status = getStatusKey(legend);
  return STATUS_LABELS[status] || status.replace(/_/g, ' ');
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getLegendDate(legend) {
  return formatDate(legend.updated_at || legend.created_at);
}

function getAccessLabel(legend) {
  const accessType = String(legend?.access_type || '').toLowerCase();
  return ACCESS_LABELS[accessType] || null;
}

function getGenreNames(legend) {
  return (legend?.genres ?? [])
    .map((genre) => (typeof genre === 'string' ? genre : genre?.name))
    .filter(Boolean)
    .slice(0, 3);
}

function LegendCover({ legend }) {
  const coverUrl = legend.coverUrl || legend.cover_url || legend.bannerUrl || legend.backdropUrl;
  return (
    <div className="creator-legend-cover">
      {coverUrl ? (
        <img src={coverUrl} alt={`Portada de ${legend.title || 'leyenda'}`} />
      ) : (
        <span className="material-symbols-rounded" aria-hidden="true">auto_stories</span>
      )}
    </div>
  );
}

function CreatorLegendsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [legends, setLegends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteErrors, setDeleteErrors] = useState({});
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    async function loadLegends() {
      const { data, error: legendsError } = await getMyLegends();
      setLegends(data ?? []);
      setError(legendsError);
      setLoading(false);
    }

    loadLegends();
  }, []);

  if (loading) return <LoadingState message="Cargando tus leyendas..." />;

  const statusFilter = location.pathname === '/creator/drafts' ? 'draft' : searchParams.get('status');
  const visibleLegends = statusFilter
    ? legends.filter((legend) => getStatusKey(legend) === statusFilter)
    : legends;
  const isDraftsView = statusFilter === 'draft';

  function openEditor(legend) {
    if (!legend?.id) {
      setError(new Error('No pudimos abrir este borrador.'));
      return;
    }
    navigate(`/creator/legends/${legend.id}/edit`);
  }

  async function handleDeleteDraft(legend) {
    if (!isDraftLegend(legend)) {
      setDeleteErrors((current) => ({
        ...current,
        [legend.id]: 'Esta obra ya no puede eliminarse porque fue enviada a revision o esta protegida.',
      }));
      return;
    }

    const confirmed = window.confirm(DELETE_DRAFT_CONFIRMATION);
    if (!confirmed) return;

    setDeletingId(legend.id);
    setDeleteErrors((current) => ({ ...current, [legend.id]: '' }));
    setMessage(null);

    const { error: deleteError } = await deleteLegendDraft(legend.id);

    setDeletingId(null);

    if (deleteError) {
      if (import.meta.env.DEV) {
        console.error('[CreatorLegends] Error real:', {
          operation: 'deleteLegendDraft',
          table: 'rpc/delete_legend_draft',
          legendId: legend.id,
          error: deleteError.supabaseError || deleteError,
        });
      }
      setDeleteErrors((current) => ({
        ...current,
        [legend.id]: deleteError.message,
      }));
      return;
    }

    setLegends((current) => current.filter((item) => item.id !== legend.id));
    setDeleteErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[legend.id];
      return nextErrors;
    });
    setMessage('Borrador eliminado correctamente.');
  }

  return (
    <section className="page-stack creator-panel">
      <div className="page-heading-row">
        <div>
          <p className="creator-kicker">Obras</p>
          <h1>{isDraftsView ? 'Borradores' : 'Mis leyendas'}</h1>
        </div>
        <Link to="/creator/legends/new" className="btn btn-primary">Crear leyenda</Link>
      </div>

      {error && <p className="error-message">{error.message}</p>}
      {message && <p className="success-message">{message}</p>}

      {visibleLegends.length === 0 ? (
        <Card className="creator-empty-card">
          <EmptyState
            title={isDraftsView ? 'No hay borradores' : 'Aun no has creado leyendas'}
            message={isDraftsView ? 'Los borradores apareceran aqui.' : 'Crea tu primera historia para empezar el flujo editorial.'}
          />
          <Link to="/creator/legends/new" className="btn btn-primary">Crear primera leyenda</Link>
        </Card>
      ) : (
        <div className="creator-editorial-grid">
          {visibleLegends.map((legend) => {
            const genres = getGenreNames(legend);
            const date = getLegendDate(legend);
            const accessLabel = getAccessLabel(legend);
            const statusKey = getStatusKey(legend);
            const canViewPublic = statusKey === 'published' && legend.slug;

            return (
              <Card key={legend.id} className="creator-editorial-card creator-legend-card">
                <LegendCover legend={legend} />
                <div className="creator-editorial-card-main">
                  <div className="creator-card-topline">
                    <span className={`creator-status-pill status-${statusKey}`}>{getStatusLabel(legend)}</span>
                    {accessLabel && <span className="creator-access-pill">{accessLabel}</span>}
                  </div>
                  <h2 title={legend.title}>{legend.title || 'Leyenda sin titulo'}</h2>
                  <div className="creator-card-meta">
                    <span>{legend.authorName || 'Autor sin alias'}</span>
                    {date && <span>Actualizada {date}</span>}
                  </div>
                  {genres.length > 0 && (
                    <div className="creator-card-genres" aria-label="Generos">
                      {genres.map((genre) => <span key={genre}>{genre}</span>)}
                    </div>
                  )}
                  {statusKey === 'rejected' && (
                    <p className="creator-card-note">Requiere ajustes antes de volver a revision.</p>
                  )}
                  {deleteErrors[legend.id] && (
                    <p className="error-message creator-card-error">{deleteErrors[legend.id]}</p>
                  )}
                </div>
                <div className="creator-card-actions">
                  {canViewPublic ? (
                    <Link className="btn btn-ghost creator-card-action" to={`/legend/${legend.slug}`}>Ver</Link>
                  ) : (
                    <Button variant="ghost" className="creator-card-action" onClick={() => openEditor(legend)}>
                      {statusKey === 'rejected' ? 'Editar cambios' : 'Editar'}
                    </Button>
                  )}
                  {isDraftLegend(legend) && (
                    <Button
                      variant="ghost"
                      className="creator-card-action danger-action"
                      onClick={() => handleDeleteDraft(legend)}
                      disabled={deletingId === legend.id}
                    >
                      {deletingId === legend.id ? 'Eliminando...' : 'Eliminar borrador'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default CreatorLegendsPage;
