import React from 'react';
import { Link } from 'react-router-dom';
import AppIcon from './AppIcon.jsx';

/**
 * Shared pill button with a consistent radius / glass aesthetic and an optional
 * leading Material Symbols icon. Renders as a router Link (`to`), an anchor
 * (`href`) or a native button (default). Reuse this instead of hand-rolling
 * button markup so hover/focus states stay uniform across the app.
 *
 * variant: "glass" | "solid" | "ghost"
 */
export default function GlassButton({
  children,
  icon,
  iconFilled = false,
  iconSize = 20,
  to,
  href,
  onClick,
  type = 'button',
  variant = 'glass',
  className = '',
  ...rest
}) {
  const cls = `glass-button glass-button--${variant} ${className}`.trim();
  const inner = (
    <>
      {icon && <AppIcon name={icon} size={iconSize} filled={iconFilled} />}
      {children != null && <span className="glass-button__label">{children}</span>}
    </>
  );

  if (to) {
    return <Link to={to} className={cls} onClick={onClick} {...rest}>{inner}</Link>;
  }
  if (href) {
    return <a href={href} className={cls} onClick={onClick} {...rest}>{inner}</a>;
  }
  return <button type={type} className={cls} onClick={onClick} {...rest}>{inner}</button>;
}
