import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import AccessBadge from './AccessBadge.jsx';
import GenreChips from './GenreChips.jsx';
import StatusBadge from './StatusBadge.jsx';

const ACTION_ICONS = {
  view: 'visibility',
  status: 'schedule',
  edit: 'edit',
  duplicate: 'content_copy',
  delete: 'delete',
};

function actionIcon(action) {
  return ACTION_ICONS[action.key] || ACTION_ICONS[action.type] || 'chevron_right';
}

function ActionIcon({ name }) {
  return <span className="material-symbols-rounded" aria-hidden="true">{name}</span>;
}

function renderAction(action, {
  legend,
  deleting,
  duplicating,
  onEdit,
  onDelete,
  onDeleteDraft,
  onDuplicate,
}) {
  const icon = <ActionIcon name={actionIcon(action)} />;

  if (action.type === 'duplicate') {
    return (
      <Button
        key={action.key}
        variant={action.variant || 'ghost'}
        className="creator-card-action creator-card-action--icon"
        onClick={() => onDuplicate?.(legend)}
        disabled={duplicating}
        title={action.label}
        aria-label={action.label}
      >
        {duplicating ? <ActionIcon name="hourglass_top" /> : icon}
      </Button>
    );
  }

  if (action.type === 'delete') {
    return (
      <Button
        key={action.key}
        variant={action.variant || 'ghost'}
        className={`creator-card-action creator-card-action--icon${action.danger ? ' danger-action' : ''}`}
        onClick={() => (onDelete || onDeleteDraft)?.(legend)}
        disabled={deleting}
        title={action.label}
        aria-label={action.label}
      >
        {deleting ? <ActionIcon name="hourglass_top" /> : icon}
      </Button>
    );
  }

  // Primary action (continue / view / status) keeps icon + short label and grows.
  if (action.type === 'link') {
    return (
      <Link
        key={action.key}
        className={`btn btn-${action.variant || 'ghost'} creator-card-action creator-card-action--primary`}
        to={action.to}
      >
        {icon}
        <span>{action.label}</span>
      </Link>
    );
  }

  if (action.type === 'edit') {
    return (
      <Button
        key={action.key}
        variant={action.variant || 'ghost'}
        className="creator-card-action creator-card-action--primary"
        onClick={() => onEdit?.(legend)}
      >
        {icon}
        <span>{action.label}</span>
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
  creationModeLabel = '',
  accessLabel = '',
  genres = [],
  updatedLabel = '',
  onEdit,
  onDelete,
  onDeleteDraft,
  onDuplicate,
  deleting = false,
  duplicating = false,
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
      <div
        className={`creator-legend-cover ${hasMediaWithoutUrl ? 'missing-url' : ''}`}
        style={coverUrl ? { '--cover-image': `url("${coverUrl}")` } : undefined}
      >
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
          {creationModeLabel && <span className="creator-creation-mode-badge">{creationModeLabel}</span>}
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
          duplicating,
          onEdit,
          onDelete,
          onDeleteDraft,
          onDuplicate,
        }))}
      </div>
    </Card>
  );
}

export default CreatorLegendCard;
