import React from 'react';
function Badge({ children, className = '' }) {
  return <span className={`badge ${className}`}>{children}</span>;
}

export default Badge;
