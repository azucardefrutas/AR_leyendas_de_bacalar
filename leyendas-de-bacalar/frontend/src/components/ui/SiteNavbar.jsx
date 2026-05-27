import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useRoles } from '../../hooks/useRoles.js';
import Button from './Button.jsx';

function SiteNavbar() {
  const { isAuthenticated, signOut, user } = useAuth();
  const { roles } = useRoles();
  const isAdmin = roles.includes('admin');
  const isCreator = roles.includes('creator');
  const displayName = user?.user_metadata?.full_name || user?.email || 'Usuario';
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="Leyendas de Bacalar">
        <img src="/assets/Logo de la Upb.png" alt="" />
        <span>Leyendas<br />de Bacalar</span>
      </Link>
      <nav className="site-nav" aria-label="Navegacion principal">
        <NavLink to="/">Inicio</NavLink>
        <NavLink to="/catalog">Biblioteca</NavLink>
        {isAuthenticated && <NavLink to="/reader/redeem">Canjear codigo</NavLink>}
        <Link to="/#acerca">Acerca de</Link>
        {isCreator && <NavLink to="/creator">Creador</NavLink>}
        {isAdmin && <NavLink to="/admin">Admin</NavLink>}
      </nav>
      <div className="header-actions">
        <label className="site-search">
          <span aria-hidden="true">?</span>
          <input type="search" placeholder="Buscar leyenda..." />
        </label>
        {isAuthenticated ? (
          <>
            <Link className="user-bubble" to="/reader/profile" aria-label="Perfil de usuario">{initial}</Link>
            <Button variant="ghost" onClick={signOut}>Salir</Button>
          </>
        ) : (
          <>
            <Link className="login-link" to="/login">Iniciar sesion</Link>
            <Link to="/register">Registro</Link>
          </>
        )}
      </div>
    </header>
  );
}

export default SiteNavbar;
