import React from 'react';
import { Link } from 'react-router-dom';
import AppIcon from './AppIcon.jsx';

/**
 * Reusable "go back" control for the legend detail, reader, editor and inner
 * panels. Renders as a router Link (`to`) or a native button (`onClick`).
 *
 * - variant: "glass" | "solid" | "ghost"
 * - iconOnly: hide the label (kept as aria-label / title for accessibility)
 */
export default function BackButton({
  label = 'Regresar',
  to,
  onClick,
  variant = 'glass',
  icon = 'arrow_back',
  iconOnly = false,
  className = '',
  ...rest
}) {
  const cls = `back-button back-button--${variant} ${iconOnly ? 'back-button--icon' : ''} ${className}`.trim();
  const content = (
    <>
      <AppIcon name={icon} size={20} />
      {!iconOnly && <span className="back-button__label">{label}</span>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cls} aria-label={label} title={label} onClick={onClick} {...rest}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} aria-label={label} title={label} onClick={onClick} {...rest}>
      {content}
    </button>
  );
}
