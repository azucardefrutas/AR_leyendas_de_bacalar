import React from 'react';

// Reader empty state: icon + title + message + optional actions.
function RxEmptyState({ icon = '✦', title, message, children }) {
  return (
    <div className="rx-empty">
      <div className="rx-empty-icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {children && <div className="rx-empty-actions">{children}</div>}
    </div>
  );
}

export default RxEmptyState;
