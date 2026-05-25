import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useRoles } from '../hooks/useRoles.js';

function PublicLayout() {
  const { isAuthenticated, signOut } = useAuth();
  const { roles } = useRoles();

  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">Leyendas de Bacalar</Link>
        <nav className="site-nav" aria-label="Navegacion principal">
          <NavLink to="/catalog">Catalogo</NavLink>
          {isAuthenticated && <NavLink to="/reader/library">Mi biblioteca</NavLink>}
          {roles.includes('creator') && <NavLink to="/creator">Creador</NavLink>}
          {(roles.includes('admin') || roles.includes('super_admin')) && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="header-actions">
          {isAuthenticated ? (
            <Button variant="ghost" onClick={signOut}>Salir</Button>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Registro</Link>
            </>
          )}
        </div>
      </header>
      <main className="page-container">
        <Outlet />
      </main>
    </div>
  );
}

export default PublicLayout;
