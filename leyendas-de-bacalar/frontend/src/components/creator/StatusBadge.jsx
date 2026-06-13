import React from 'react';
import SharedStatusBadge from '../../shared/status/StatusBadge.jsx';

function StatusBadge({ statusKey = 'draft', label = 'Borrador' }) {
  return (
    <SharedStatusBadge
      status={statusKey}
      context="legend"
      label={label}
      className={`creator-status-pill status-${statusKey}`}
    />
  );
}

export default StatusBadge;
