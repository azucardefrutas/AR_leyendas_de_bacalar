import React from 'react';
import { getStatusMeta } from './statusMeta.js';

function StatusBadge({
  status = 'draft',
  context = 'generic',
  label,
  className = '',
  size = 'default',
}) {
  const meta = getStatusMeta(status, { context, label });
  const classes = [
    'status-badge',
    `status-badge-${meta.tone}`,
    meta.className,
    size === 'small' ? 'status-badge-small' : '',
    className,
  ].filter(Boolean).join(' ');

  return <span className={classes}>{meta.label}</span>;
}

export default StatusBadge;
