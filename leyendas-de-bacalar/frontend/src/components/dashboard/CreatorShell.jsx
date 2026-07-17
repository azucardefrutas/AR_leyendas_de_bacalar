import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useRoles } from '../../hooks/useRoles.js';
import { UserIcon } from '../ui/CreatorIcons.jsx';
import AppIcon from '../ui/AppIcon.jsx';
import Picture from '../ui/Picture.jsx';
import LoadingState from '../ui/LoadingState.jsx';

function useCreatorClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => ({
    date: now.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }),
    time: now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
  }), [now]);
}

function CreatorShellIcon({ name }) {
  return (
    <span className="material-symbols-rounded creator-shell-icon" aria-hidden="true">
      {name}
    </span>
  );
}

function CreatorShell({ items }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const clock = useCreatorClock();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const current = items.find((item) => {
    if (item.end) return location.pathname === item.to;
    return location.pathname.startsWith(item.to.split('?')[0]);
  });

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  // While the drawer is open, lock body scroll and allow Escape-to-close.
  useEffect(() => {
    if (!navOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => { if (event.key === 'Escape') setNavOpen(false); };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [navOpen]);

  const { displayName: profileName } = useRoles();
  // Show the personalized name (pen name / full name) rather than the raw email.
  const displayName = profileName || user?.user_metadata?.full_name || 'Autor';
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className={`creator-shell ${navOpen ? 'is-nav-open' : ''}`}>
      <header className="creator-header">
        <Link className="creator-header-logo" to="/creator">
          <Picture src="/assets/Logo de la Upb sin fondo.png" alt="Universidad Politecnica de Bacalar" decoding="async" />
        </Link>
        <div className="creator-header-body">
          <button
            type="button"
            className="shell-nav-toggle"
            onClick={() => setNavOpen((open) => !open)}
            aria-label={navOpen ? 'Cerrar menu' : 'Abrir menu'}
            aria-expanded={navOpen}
            aria-controls="creator-sidebar-nav"
          >
            <CreatorShellIcon name={navOpen ? 'close' : 'menu'} />
          </button>
          <div className="creator-header-context">
            <strong>{current?.label || 'Dashboard'}</strong>
            <span>Panel editorial</span>
          </div>
          <div className="creator-header-tools">
            <div className="creator-header-chip">
              <CreatorShellIcon name="calendar_month" />
              <strong>{clock.date}</strong>
              <span>{clock.time}</span>
            </div>
            <div className="creator-header-chip">
              <CreatorShellIcon name="edit_document" />
              <strong>Modo autor</strong>
              <span>Creacion y revision</span>
            </div>
            <button className="creator-header-button" type="button" title="Notificaciones">
              <CreatorShellIcon name="notifications" />
            </button>
            <div className="creator-user-menu">
              <button
                className="creator-user-chip"
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
              >
                <div>
                  <strong>{displayName}</strong>
                  <small><i /> Creador</small>
                </div>
                <span>{initial}</span>
              </button>
              {menuOpen && (
                <div className="creator-user-dropdown">
                  <Link to="/creator/profile" onClick={() => setMenuOpen(false)}>
                    <UserIcon /> Mi perfil
                  </Link>
                  <button type="button" onClick={handleSignOut}>
                    <CreatorShellIcon name="logout" /> Cerrar sesion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <aside className="creator-sidebar" id="creator-sidebar-nav">
        <button
          type="button"
          className="shell-nav-close"
          onClick={() => setNavOpen(false)}
          aria-label="Cerrar menu"
        >
          <CreatorShellIcon name="close" />
        </button>
        <div className="creator-sidebar-brand">
          <span className="creator-sidebar-mark" aria-hidden="true"><AppIcon name="draw" size={22} /></span>
          <span className="creator-sidebar-brand-copy">
            <strong>Leyendas de Bacalar</strong>
            <span>Estudio de publicacion</span>
          </span>
        </div>

        <nav aria-label="Navegacion de creador">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} aria-label={item.label} title={item.label} onClick={() => setNavOpen(false)}>
              <span className="creator-nav-icon" aria-hidden="true"><AppIcon name={item.icon} size={22} /></span>
              <span className="creator-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="shell-nav-footer">
          <div className="shell-nav-user">
            <span className="shell-nav-user__avatar" aria-hidden="true">{initial}</span>
            <span className="shell-nav-user__meta">
              <strong>{displayName}</strong>
              <span>Creador</span>
            </span>
          </div>
          <button type="button" className="shell-nav-signout" onClick={handleSignOut}>
            <CreatorShellIcon name="logout" />
            <span>Cerrar sesion</span>
          </button>
        </div>
      </aside>

      <button
        type="button"
        className="shell-nav-backdrop"
        aria-hidden="true"
        tabIndex={-1}
        onClick={() => setNavOpen(false)}
      />

      <main className="creator-main">
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

export default CreatorShell;
