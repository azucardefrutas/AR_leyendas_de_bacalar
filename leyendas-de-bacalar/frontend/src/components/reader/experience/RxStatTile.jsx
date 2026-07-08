import React from 'react';

// Compact metric tile used on the library dashboard and profile.
function RxStatTile({ icon, value, label }) {
  return (
    <div className="rx-stat">
      {icon && <div className="rx-stat-icon" aria-hidden="true">{icon}</div>}
      <div className="rx-stat-value">{value}</div>
      <div className="rx-stat-label">{label}</div>
    </div>
  );
}

export default RxStatTile;
