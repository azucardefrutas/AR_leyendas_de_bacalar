import React from 'react';

/**
 * Canonical icon for the whole project. Renders a single Google Fonts
 * "Material Symbols Rounded" glyph (the family is imported globally in
 * src/styles/index.css), so every icon shares one visual identity.
 *
 * Usage: <AppIcon name="home" /> · <AppIcon name="redeem" filled size={20} />
 */
export default function AppIcon({
  name,
  size = 22,
  weight = 400,
  grade = 0,
  filled = false,
  className = '',
  style,
  title,
  ...rest
}) {
  return (
    <span
      className={`material-symbols-rounded app-icon ${className}`.trim()}
      style={{
        fontSize: size,
        // Matches the axes exposed by the global import (FILL 0..1, wght 400..700,
        // GRAD 0, opsz 20..48). opsz is clamped to keep optical sizing sensible.
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${Math.max(20, Math.min(48, size))}`,
        lineHeight: 1,
        ...style,
      }}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      aria-label={title}
      {...rest}
    >
      {name}
    </span>
  );
}
