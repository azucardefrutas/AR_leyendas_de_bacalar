import React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useRoles } from '../../hooks/useRoles.js';
import { getLoginPathForRedirect } from '../../utils/authRedirect.js';
import Button from './Button.jsx';

function SiteNavbar() {
  const { isAuthenticated, signOut, user } = useAuth();
  const { roles } = useRoles();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isAdmin = roles.includes('admin');
  const isCreator = roles.includes('creator');
  const emailAlias = user?.email?.split('@')?.[0];
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || emailAlias || 'Usuario';
  const initial = displayName.slice(0, 1).toUpperCase();
  const creatorPath = isAuthenticated && isCreator ? '/creator' : '/creator/apply';

  return (
    <header className="site-header site-header-centered">
      <nav className="nav-left" aria-label="Navegacion principal">
        <NavLink to="/">Inicio</NavLink>
        <NavLink to="/reader/library">Biblioteca</NavLink>
      </nav>

      {/* Logo temporarily hidden on the home page only; placeholder keeps the
          3-column navbar layout stable. Remove this conditional to restore it. */}
      {isHome ? (
        <span className="brand-center" aria-hidden="true" />
      ) : (
        <Link className="brand-center" to="/" aria-label="Leyendas de Bacalar - Inicio">
          <img src="/upb-logo_2025.webp" alt="Leyendas de Bacalar" />
        </Link>
      )}

      <div className="nav-right">
        <nav className="nav-right-links" aria-label="Mas navegacion">
          <Link to="/#acerca">Acerca de</Link>
          <NavLink to={creatorPath}>Creador</NavLink>
          {isAuthenticated && <NavLink to="/reader/redeem">Canjear codigo</NavLink>}
          {isAdmin && <NavLink to="/admin">Admin</NavLink>}
        </nav>

        <div className="header-extras">
          <div className="site-social" aria-label="Redes de la UPB Bacalar">
            <a href="https://www.upb.edu.mx/" target="_blank" rel="noreferrer noopener" aria-label="Sitio web UPB" title="Sitio web UPB">
              <span className="material-symbols-rounded" aria-hidden="true">public</span>
            </a>
            <a href="https://www.facebook.com/Upbacalar/" target="_blank" rel="noreferrer noopener" aria-label="Facebook UPB Bacalar" title="Facebook">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
              </svg>
            </a>
            <a href="https://www.tiktok.com/@upbacalar" target="_blank" rel="noreferrer noopener" aria-label="TikTok UPB Bacalar" title="TikTok">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M16.6 5.82A4.28 4.28 0 0 1 15.55 3h-3.2v12.94a2.6 2.6 0 1 1-2.6-2.6c.27 0 .53.04.78.12v-3.3a5.9 5.9 0 1 0 5.02 5.83V9.01a7.3 7.3 0 0 0 4.2 1.34V7.15a4.3 4.3 0 0 1-3.15-1.33z" />
              </svg>
            </a>
          </div>

          {isAuthenticated ? (
            <>
              <Link className="user-bubble" to="/reader/profile" aria-label="Perfil de usuario">{initial}</Link>
              <Button variant="ghost" onClick={signOut}>Salir</Button>
            </>
          ) : (
            <>
              <Link className="login-link" to={location.pathname === '/' ? '/login' : getLoginPathForRedirect(location)}>Iniciar sesion</Link>
              <Link to={location.pathname === '/' ? '/register' : `/register?redirect=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)}`}>Registro</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default SiteNavbar;
