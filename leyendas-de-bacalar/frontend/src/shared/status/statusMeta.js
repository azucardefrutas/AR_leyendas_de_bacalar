const NORMALIZED_ALIASES = {
  'en revision': 'in_review',
  'en revisión': 'in_review',
  borrador: 'draft',
  borradores: 'draft',
  publicada: 'published',
  publicadas: 'published',
  rechazada: 'rejected',
  rechazadas: 'rejected',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  disabled: 'inactive',
  suspended: 'banned',
};

const TONE_BY_STATUS = {
  active: 'success',
  approved: 'success',
  completed: 'success',
  paid: 'success',
  published: 'success',
  redeemed: 'success',

  changes_requested: 'warning',
  in_review: 'warning',
  pending: 'warning',
  pending_review: 'warning',
  review: 'warning',
  submitted: 'warning',

  draft: 'info',
  generated: 'info',
  assigned: 'info',
  exported: 'info',
  unused: 'info',

  banned: 'danger',
  expired: 'danger',
  rejected: 'danger',

  archived: 'neutral',
  cancelled: 'neutral',
  inactive: 'neutral',
  paused: 'neutral',
  partially_used: 'neutral',
};

const GENERIC_LABELS = {
  active: 'Activo',
  approved: 'Aprobada',
  archived: 'Archivada',
  assigned: 'Asignado',
  banned: 'Bloqueado',
  cancelled: 'Cancelada',
  changes_requested: 'Cambios solicitados',
  completed: 'Completado',
  draft: 'Borrador',
  expired: 'Expirado',
  exported: 'Exportado',
  generated: 'Generado',
  inactive: 'Inactivo',
  in_review: 'En revision',
  paid: 'Pagado',
  partially_used: 'Uso parcial',
  paused: 'Pausado',
  pending: 'En revision',
  published: 'Publicada',
  redeemed: 'Canjeado',
  rejected: 'Rechazada',
  review: 'En revision',
  submitted: 'En revision',
  unused: 'Disponible',
};

const CONTEXT_LABELS = {
  legend: {
    draft: 'Borrador',
    in_review: 'En revision',
    published: 'Publicada',
    rejected: 'Rechazada',
    archived: 'Archivada',
  },
  legend_version: {
    draft: 'Borrador',
    submitted: 'En revision',
    approved: 'Aprobada',
    rejected: 'Rechazada',
    published: 'Publicada',
    archived: 'Archivada',
  },
  content_review: {
    pending: 'En revision',
    approved: 'Aprobada',
    rejected: 'Rechazada',
    changes_requested: 'Cambios solicitados',
    cancelled: 'Cancelada',
  },
  creator_application: {
    pending: 'Pendiente',
    approved: 'Aprobada',
    rejected: 'Rechazada',
    cancelled: 'Cancelada',
  },
  creator_profile: {
    active: 'Activo',
    approved: 'Aprobado',
    pending: 'Pendiente',
    inactive: 'Inactivo',
    banned: 'Bloqueado',
  },
  order: {
    pending: 'Pendiente',
    paid: 'Pagado',
    completed: 'Completado',
    cancelled: 'Cancelado',
  },
  code: {
    pending: 'Pendiente',
    generated: 'Generado',
    exported: 'Exportado',
    assigned: 'Asignado',
    redeemed: 'Canjeado',
    unused: 'Disponible',
    expired: 'Expirado',
    partially_used: 'Uso parcial',
  },
};

export const STATUS_TONE_CLASS = {
  success: 'status-success',
  warning: 'status-warning',
  info: 'status-info',
  danger: 'status-danger',
  neutral: 'status-neutral',
};

export function normalizeStatus(status, fallback = 'draft') {
  const normalized = String(status || fallback)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
  return NORMALIZED_ALIASES[normalized] || normalized;
}

function humanizeStatus(key) {
  return String(key || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getStatusTone(status) {
  return TONE_BY_STATUS[normalizeStatus(status)] || 'info';
}

export function getStatusLabel(status, context = 'generic') {
  const key = normalizeStatus(status);
  return CONTEXT_LABELS[context]?.[key] || GENERIC_LABELS[key] || humanizeStatus(key);
}

export function getStatusMeta(status, { context = 'generic', label } = {}) {
  const key = normalizeStatus(status);
  const tone = getStatusTone(key);
  return {
    key,
    tone,
    label: label || getStatusLabel(key, context),
    className: STATUS_TONE_CLASS[tone] || STATUS_TONE_CLASS.info,
  };
}

export function getStatusCounterTone(status) {
  return getStatusTone(status);
}
