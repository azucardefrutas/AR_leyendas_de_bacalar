import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { UserIcon } from '../ui/CreatorIcons.jsx';
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
  const current = items.find((item) => {
    if (item.end) return location.pathname === item.to;
    return location.pathname.startsWith(item.to.split('?')[0]);
  });

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  const displayName = user?.user_metadata?.full_name || user?.email || 'Autor';
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="creator-shell">
      <header className="creator-header">
        <Link className="creator-header-logo" to="/creator">
          <img src="/assets/Logo de la Upb sin fondo.png" alt="Universidad Politecnica de Bacalar" />
        </Link>
        <div className="creator-header-body">
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

      <aside className="creator-sidebar">
        <div className="creator-sidebar-brand">
          <span className="creator-sidebar-mark" aria-hidden="true">LB</span>
          <span className="creator-sidebar-brand-copy">
            <strong>Leyendas de Bacalar</strong>
            <span>Estudio de publicacion</span>
          </span>
        </div>

        <nav aria-label="Navegacion de creador">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} aria-label={item.label} title={item.label}>
              <span className="creator-nav-icon" aria-hidden="true">{item.icon}</span>
              <span className="creator-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="creator-main">
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

export default CreatorShell;
