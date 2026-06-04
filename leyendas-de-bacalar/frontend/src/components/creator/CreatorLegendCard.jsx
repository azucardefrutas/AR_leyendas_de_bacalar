import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';

const STATUS_LABELS = {
  draft: 'Borrador',
  borrador: 'Borrador',
  in_review: 'En revision',
  review: 'En revision',
  pending_review: 'En revision',
  submitted: 'En revision',
  changes_requested: 'Cambios solicitados',
  rejected: 'Requiere cambios',
  approved: 'Aprobada',
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

function isEditableLegend(legend) {
  return ['draft', 'borrador', 'changes_requested', 'rejected'].includes(getStatusKey(legend));
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

function getCoverUrl(legend) {
  return legend.coverUrl || legend.cover_url || legend.bannerUrl || legend.backdropUrl || '';
}

function CreatorLegendCard({
  legend,
  onEdit,
  onDeleteDraft,
  deleting = false,
  deleteError = '',
  showDeleteDraft = true,
}) {
  const statusKey = getStatusKey(legend);
  const accessLabel = getAccessLabel(legend);
  const genres = getGenreNames(legend);
  const updatedDate = formatDate(legend.updated_at || legend.created_at);
  const coverUrl = getCoverUrl(legend);
  const hasMediaWithoutUrl = Boolean(legend?.media?.length && !coverUrl);
  const canEdit = isEditableLegend(legend);
  const canDelete = showDeleteDraft && isDraftLegend(legend);
  const canViewPublic = statusKey === 'published' && legend.slug;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!legend?.media?.length || coverUrl) return;

    const preferredMedia = legend.coverMedia || legend.bannerMedia || legend.backdropMedia || legend.media[0];
    console.warn('[CreatorLegendCard] La leyenda tiene media, pero no se pudo resolver URL de portada:', {
      legendId: legend.id,
      media: legend.media,
      asset: legend.coverAsset || legend.bannerAsset || preferredMedia?.assets || preferredMedia?.asset || null,
    });
  }, [coverUrl, legend]);

  return (
    <Card className="creator-editorial-card creator-legend-card">
      <div className={`creator-legend-cover ${hasMediaWithoutUrl ? 'missing-url' : ''}`}>
        {coverUrl ? (
          <img src={coverUrl} alt={`Portada de ${legend.title || 'leyenda'}`} />
        ) : hasMediaWithoutUrl ? (
          <span>
            <span className="material-symbols-rounded" aria-hidden="true">broken_image</span>
            Portada sin URL
          </span>
        ) : (
          <span className="material-symbols-rounded" aria-hidden="true">auto_stories</span>
        )}
      </div>

      <div className="creator-editorial-card-main">
        <div className="creator-card-topline">
          <span className={`creator-status-pill status-${statusKey}`}>{getStatusLabel(legend)}</span>
          {accessLabel && <span className="creator-access-pill">{accessLabel}</span>}
        </div>

        <h2 title={legend.title}>{legend.title || 'Leyenda sin titulo'}</h2>

        <div className="creator-card-meta">
          <span>{legend.authorName || 'Autor no disponible'}</span>
          {updatedDate && <span>Actualizada {updatedDate}</span>}
          {Number(legend.pagesCount || 0) > 0 && <span>{legend.pagesCount} paginas</span>}
        </div>

        {genres.length > 0 && (
          <div className="creator-card-genres" aria-label="Generos">
            {genres.map((genre) => <span key={genre}>{genre}</span>)}
          </div>
        )}

        {(statusKey === 'changes_requested' || statusKey === 'rejected') && (
          <p className="creator-card-note">
            {legend.reviewFeedback || (statusKey === 'changes_requested'
              ? 'El administrador solicito cambios antes de volver a revision.'
              : 'Requiere ajustes antes de volver a revision.')}
          </p>
        )}

        {deleteError && <p className="error-message creator-card-error">{deleteError}</p>}
      </div>

      <div className="creator-card-actions">
        {canViewPublic && (
          <Link className="btn btn-ghost creator-card-action" to={`/legend/${legend.slug}`}>Ver</Link>
        )}

        {canEdit && (
          <Button variant="ghost" className="creator-card-action" onClick={() => onEdit?.(legend)}>
            {statusKey === 'rejected' || statusKey === 'changes_requested' ? 'Editar correcciones' : 'Editar'}
          </Button>
        )}

        {!canEdit && !canViewPublic && (
          <Link className="btn btn-ghost creator-card-action" to="/creator/reviews">Ver estado</Link>
        )}

        {canDelete && (
          <Button
            variant="ghost"
            className="creator-card-action danger-action"
            onClick={() => onDeleteDraft?.(legend)}
            disabled={deleting}
          >
            {deleting ? 'Eliminando...' : 'Eliminar borrador'}
          </Button>
        )}
      </div>
    </Card>
  );
}

export default CreatorLegendCard;
