import React, { useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import AppIcon from '../ui/AppIcon.jsx';
import IconButton from '../ui/IconButton.jsx';

/**
 * Reusable mobile navigation drawer (slides in from the right). Presentational:
 * the navbar passes the nav `items`, `social` links and `auth` block. Handles
 * body scroll-lock, Escape-to-close, backdrop click and close-on-navigate.
 */
export default function MobileNavDrawer({ open, onClose, items = [], social = [], auth }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  return (
    <div className={`mobile-nav-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="mobile-nav-drawer__backdrop" onClick={onClose} aria-hidden="true" />

      <aside className="mobile-nav-drawer__panel" role="dialog" aria-modal="true" aria-label="Menu de navegacion">
        <div className="mobile-nav-drawer__head">
          <span className="mobile-nav-drawer__brand">Leyendas de Bacalar</span>
          <IconButton icon="close" label="Cerrar menu" onClick={onClose} className="mobile-nav-drawer__close" />
        </div>

        <nav className="mobile-nav-drawer__links" aria-label="Navegacion">
          {items.map((item) => (
            <NavLink
              key={item.to + item.label}
              to={item.to}
              end={item.end}
              className="mobile-nav-link"
              onClick={onClose}
            >
              <AppIcon name={item.icon} size={22} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {social.length > 0 && (
          <div className="mobile-nav-drawer__social" aria-label="Redes de la UPB Bacalar">
            {social.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={link.label}
                title={link.label}
                onClick={onClose}
              >
                {link.svg ? link.svg : <AppIcon name={link.icon} size={22} />}
              </a>
            ))}
          </div>
        )}

        <div className="mobile-nav-drawer__session">
          {auth?.isAuthenticated ? (
            <>
              <Link to="/reader/profile" className="mobile-nav-profile" onClick={onClose}>
                <span className="mobile-nav-profile__avatar">{auth.initial}</span>
                <span className="mobile-nav-profile__name">{auth.displayName}</span>
              </Link>
              <button
                type="button"
                className="mobile-nav-signout"
                onClick={() => { onClose(); auth.onSignOut?.(); }}
              >
                <AppIcon name="logout" size={20} />
                <span>Salir</span>
              </button>
            </>
          ) : (
            <div className="mobile-nav-drawer__auth-links">
              <Link to={auth?.loginPath || '/login'} className="mobile-nav-signin" onClick={onClose}>
                Iniciar sesion
              </Link>
              <Link to={auth?.registerPath || '/register'} className="mobile-nav-register" onClick={onClose}>
                Registro
              </Link>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
