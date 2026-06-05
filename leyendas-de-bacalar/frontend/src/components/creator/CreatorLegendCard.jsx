import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import AccessBadge from './AccessBadge.jsx';
import GenreChips from './GenreChips.jsx';
import StatusBadge from './StatusBadge.jsx';

function renderAction(action, {
  legend,
  deleting,
  onEdit,
  onDelete,
  onDeleteDraft,
}) {
  const label = deleting && action.type === 'delete'
    ? action.loadingLabel || 'Eliminando...'
    : action.label;
  const className = `creator-card-action${action.danger ? ' danger-action' : ''}`;

  if (action.type === 'link') {
    return (
      <Link key={action.key} className={`btn btn-${action.variant || 'ghost'} ${className}`} to={action.to}>
        {label}
      </Link>
    );
  }

  if (action.type === 'edit') {
    return (
      <Button key={action.key} variant={action.variant || 'ghost'} className={className} onClick={() => onEdit?.(legend)}>
        {label}
      </Button>
    );
  }

  if (action.type === 'delete') {
    return (
      <Button
        key={action.key}
        variant={action.variant || 'ghost'}
        className={className}
        onClick={() => (onDelete || onDeleteDraft)?.(legend)}
        disabled={deleting}
      >
        {label}
      </Button>
    );
  }

  return null;
}

function CreatorLegendCard({
  legend,
  actions = [],
  feedback = '',
  coverUrl = '',
  statusKey = 'draft',
  statusLabel = 'Borrador',
  accessLabel = '',
  genres = [],
  updatedLabel = '',
  onEdit,
  onDelete,
  onDeleteDraft,
  deleting = false,
  deleteError = '',
}) {
  const hasMediaWithoutUrl = Boolean(legend?.media?.length && !coverUrl);

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
          <StatusBadge statusKey={statusKey} label={statusLabel} />
          <AccessBadge label={accessLabel} />
        </div>

        <h2 title={legend.title}>{legend.title || 'Leyenda sin titulo'}</h2>

        <div className="creator-card-meta">
          <span>{legend.authorName || 'Autor no disponible'}</span>
          {updatedLabel && <span>{updatedLabel}</span>}
          {Number(legend.pagesCount || 0) > 0 && <span>{legend.pagesCount} paginas</span>}
        </div>

        <GenreChips genres={genres} />

        {feedback && <p className="creator-card-note">{feedback}</p>}

        {deleteError && <p className="error-message creator-card-error">{deleteError}</p>}
      </div>

      <div className="creator-card-actions">
        {actions.map((action) => renderAction(action, {
          legend,
          deleting,
          onEdit,
          onDelete,
          onDeleteDraft,
        }))}
      </div>
    </Card>
  );
}

export default CreatorLegendCard;
