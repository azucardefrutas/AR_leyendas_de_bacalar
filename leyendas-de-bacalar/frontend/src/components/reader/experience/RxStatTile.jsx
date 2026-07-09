import React from 'react';
import AppIcon from '../../ui/AppIcon.jsx';

// Compact metric tile: icon + value + label in a soft clay card.
// `icon` is a Material Symbols name (never an emoji).
function RxStatTile({ icon, value, label }) {
  return (
    <div className="rx-stat">
      <div className="rx-stat-icon" aria-hidden="true"><AppIcon name={icon} size={20} filled /></div>
      <div className="rx-stat-text">
        <div className="rx-stat-value">{value}</div>
        <div className="rx-stat-label">{label}</div>
      </div>
    </div>
  );
}

export default RxStatTile;
