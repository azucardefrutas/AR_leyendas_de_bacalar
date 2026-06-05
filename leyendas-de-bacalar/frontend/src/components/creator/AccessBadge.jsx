import React from 'react';

function AccessBadge({ label = '' }) {
  if (!label) return null;
  return <span className="creator-access-pill">{label}</span>;
}

export default AccessBadge;
