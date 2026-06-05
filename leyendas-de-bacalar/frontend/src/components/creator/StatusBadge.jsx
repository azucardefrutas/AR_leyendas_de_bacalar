import React from 'react';

function StatusBadge({ statusKey = 'draft', label = 'Borrador' }) {
  return <span className={`creator-status-pill status-${statusKey}`}>{label}</span>;
}

export default StatusBadge;
