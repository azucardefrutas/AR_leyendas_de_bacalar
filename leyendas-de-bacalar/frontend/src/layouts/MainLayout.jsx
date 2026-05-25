import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { appNavItems } from '../data/navigation.js';
import { useAuth } from '../hooks/useAuth.js';

function MainLayout() {
  const { isAuthenticated, role, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <nav className="app-nav" aria-label="Navegacion principal">
          {appNavItems.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="auth-status">
          <span>Rol actual: {role}</span>
          {isAuthenticated && (
            <button type="button" onClick={logout}>
              Salir
            </button>
          )}
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">Leyendas de Bacalar</footer>
    </div>
  );
}

export default MainLayout;
