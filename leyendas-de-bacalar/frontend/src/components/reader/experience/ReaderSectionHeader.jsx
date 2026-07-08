import React from 'react';

// Shared reader header: eyebrow + serif title + subtitle, with optional
// right-aligned actions passed as children.
function ReaderSectionHeader({ eyebrow, title, subtitle, children }) {
  return (
    <header className="rx-head">
      <div className="rx-head-text">
        {eyebrow && <p className="rx-eyebrow">{eyebrow}</p>}
        <h1 className="rx-title">{title}</h1>
        {subtitle && <p className="rx-sub">{subtitle}</p>}
      </div>
      {children && <div className="rx-head-actions">{children}</div>}
    </header>
  );
}

export default ReaderSectionHeader;
