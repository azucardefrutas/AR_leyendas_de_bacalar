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

const EDITABLE_STATUSES = ['draft', 'borrador', 'changes_requested', 'rejected'];
const DELETABLE_STATUSES = ['draft', 'borrador', 'changes_requested', 'rejected'];
const DRAFT_STATUSES = ['draft', 'borrador'];
const SUBMITTABLE_STATUSES = ['draft', 'borrador', 'changes_requested', 'rejected'];
const VIEWABLE_STATUSES = ['in_review', 'review', 'pending_review', 'submitted', 'approved', 'published'];

function normalizeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function formatCreatorDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function getCreatorLegendStatusKey(legendOrStatus) {
  const rawStatus = typeof legendOrStatus === 'string'
    ? legendOrStatus
    : legendOrStatus?.status;
  return String(rawStatus || 'draft').toLowerCase();
}

export function isDraftCreatorLegend(legendOrStatus) {
  return DRAFT_STATUSES.includes(getCreatorLegendStatusKey(legendOrStatus));
}

export function canEditCreatorLegend(legendOrStatus) {
  return EDITABLE_STATUSES.includes(getCreatorLegendStatusKey(legendOrStatus));
}

export function canDeleteCreatorLegend(legendOrStatus) {
  return DELETABLE_STATUSES.includes(getCreatorLegendStatusKey(legendOrStatus));
}

export function canSubmitLegend(legendOrStatus) {
  return SUBMITTABLE_STATUSES.includes(getCreatorLegendStatusKey(legendOrStatus));
}

export function canViewLegend(legendOrStatus) {
  return VIEWABLE_STATUSES.includes(getCreatorLegendStatusKey(legendOrStatus));
}

export function getLegendDisplayStatus(legendOrStatus) {
  const statusKey = getCreatorLegendStatusKey(legendOrStatus);
  return {
    key: statusKey,
    label: STATUS_LABELS[statusKey] || statusKey.replace(/_/g, ' '),
  };
}

export function getLegendStatusBadge(legendOrStatus) {
  const status = getLegendDisplayStatus(legendOrStatus);
  return {
    ...status,
    className: `creator-status-pill status-${status.key}`,
  };
}

export function getCreatorLegendDeleteLabel(legendOrStatus) {
  return isDraftCreatorLegend(legendOrStatus) ? 'Eliminar borrador' : 'Eliminar historia';
}

export function getCreatorLegendPrimaryAction(legend = {}) {
  const statusKey = getCreatorLegendStatusKey(legend);

  if (statusKey === 'published' && legend.slug) {
    return {
      key: 'view',
      type: 'link',
      label: 'Ver',
      to: `/legend/${legend.slug}`,
      variant: 'ghost',
    };
  }

  if (canEditCreatorLegend(statusKey)) {
    return {
      key: 'edit',
      type: 'edit',
      label: statusKey === 'rejected' || statusKey === 'changes_requested' ? 'Editar correcciones' : 'Editar',
      variant: 'ghost',
    };
  }

  return {
    key: 'status',
    type: 'link',
    label: statusKey === 'approved' ? 'Lista para publicacion' : 'Ver estado',
    to: '/creator/reviews',
    variant: 'ghost',
  };
}

export function getLegendFeedback(legend = {}) {
  const statusKey = getCreatorLegendStatusKey(legend);
  const feedback = normalizeText(
    legend.feedback
    || legend.reviewFeedback
    || legend.latestReview?.feedback
    || legend.currentVersion?.review_notes
    || '',
  );

  if (feedback) return feedback;
  if (statusKey === 'changes_requested') return 'El administrador solicito cambios antes de volver a revision.';
  if (statusKey === 'rejected') return 'Requiere ajustes antes de volver a revision.';
  return '';
}

export function getLegendDeleteConfirmation(legend = {}) {
  const statusKey = getCreatorLegendStatusKey(legend);
  if (statusKey === 'changes_requested') {
    return 'Seguro que quieres eliminar esta historia devuelta con cambios? Se eliminara la obra y su contenido asociado. Esta accion no se puede deshacer.';
  }
  if (statusKey === 'rejected') {
    return 'Seguro que quieres eliminar esta historia rechazada? Se eliminara la obra y su contenido asociado. Esta accion no se puede deshacer.';
  }
  return 'Seguro que quieres eliminar este borrador? Esta accion no se puede deshacer.';
}

export function getLegendAccessLabel(legend = {}) {
  const accessType = String(legend.access_type || '').toLowerCase();
  return ACCESS_LABELS[accessType] || null;
}

export function getLegendCoverUrl(legend = {}) {
  return legend.coverUrl || legend.cover_url || legend.bannerUrl || legend.backdropUrl || '';
}

export function getLegendGenreNames(legend = {}) {
  return (legend.genres ?? [])
    .map((genre) => (typeof genre === 'string' ? genre : genre?.name))
    .filter(Boolean)
    .slice(0, 3);
}

export function getLegendCardActions(legend = {}, { allowDelete = true } = {}) {
  const actions = [getCreatorLegendPrimaryAction(legend)];

  if (allowDelete && canDeleteCreatorLegend(legend)) {
    actions.push({
      key: 'delete',
      type: 'delete',
      label: getCreatorLegendDeleteLabel(legend),
      loadingLabel: 'Eliminando...',
      variant: 'ghost',
      danger: true,
    });
  }

  return actions.filter(Boolean);
}

export function getCreatorLegendCardData(legend = {}, options = {}) {
  const status = getLegendDisplayStatus(legend);
  const updatedDate = formatCreatorDate(legend.updated_at || legend.created_at);
  const feedback = getLegendFeedback(legend);
  const primaryAction = getCreatorLegendPrimaryAction(legend);
  const deleteActionLabel = canDeleteCreatorLegend(legend) ? getCreatorLegendDeleteLabel(legend) : '';

  return {
    statusKey: status.key,
    statusLabel: status.label,
    accessLabel: getLegendAccessLabel(legend),
    coverUrl: getLegendCoverUrl(legend),
    genres: getLegendGenreNames(legend),
    updatedLabel: updatedDate ? `Actualizada ${updatedDate}` : '',
    feedback,
    canEdit: canEditCreatorLegend(legend),
    canDelete: canDeleteCreatorLegend(legend),
    canSubmit: canSubmitLegend(legend),
    canView: canViewLegend(legend),
    primaryActionLabel: primaryAction?.label || '',
    deleteActionLabel,
    actions: getLegendCardActions(legend, options),
  };
}

export function countCreatorLegendsByStatus(legends = [], statuses = []) {
  return legends.filter((legend) => statuses.includes(getCreatorLegendStatusKey(legend))).length;
}
