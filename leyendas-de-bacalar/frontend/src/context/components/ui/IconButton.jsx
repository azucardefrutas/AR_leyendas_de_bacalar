import React from 'react';
import AppIcon from './AppIcon.jsx';

/**
 * Round icon-only button with a shared glass aesthetic and an accessible label.
 * Reusable across the navbar, drawer and panels so every icon control matches.
 *
 * variant: "glass" | "solid" | "ghost"
 */
export default function IconButton({
  icon,
  label,
  onClick,
  size = 24,
  variant = 'glass',
  filled = false,
  type = 'button',
  className = '',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`icon-button icon-button--${variant} ${className}`.trim()}
      onClick={onClick}
      aria-label={label}
      title={label}
      {...rest}
    >
      <AppIcon name={icon} size={size} filled={filled} />
    </button>
  );
}
