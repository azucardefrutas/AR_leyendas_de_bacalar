import React from 'react';
import AppIcon from '../../ui/AppIcon.jsx';

// Reader empty state: icon + title + message + optional actions.
// `icon` may be a Material Symbols name (e.g. "lock_open") → rendered as an SVG
// glyph, or any other string (legacy emoji) → rendered as-is.
function RxEmptyState({ icon = 'auto_awesome', title, message, children }) {
  const isMaterial = typeof icon === 'string' && /^[a-z0-9_]+$/.test(icon);
  return (
    <div className="rx-empty">
      <div className="rx-empty-icon" aria-hidden="true">
        {isMaterial ? <AppIcon name={icon} size={26} filled /> : icon}
      </div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {children && <div className="rx-empty-actions">{children}</div>}
    </div>
  );
}

export default RxEmptyState;
