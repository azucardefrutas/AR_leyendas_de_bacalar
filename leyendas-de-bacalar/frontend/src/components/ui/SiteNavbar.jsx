import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useRoles } from '../../hooks/useRoles.js';
import { getLoginPathForRedirect } from '../../utils/authRedirect.js';
import Button from './Button.jsx';
import IconButton from './IconButton.jsx';
import MobileNavDrawer from '../layout/MobileNavDrawer.jsx';

const FacebookGlyph = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
  </svg>
);

const TiktokGlyph = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
    <path d="M16.6 5.82A4.28 4.28 0 0 1 15.55 3h-3.2v12.94a2.6 2.6 0 1 1-2.6-2.6c.27 0 .53.04.78.12v-3.3a5.9 5.9 0 1 0 5.02 5.83V9.01a7.3 7.3 0 0 0 4.2 1.34V7.15a4.3 4.3 0 0 1-3.15-1.33z" />
  </svg>
);

function SiteNavbar() {
  const { isAuthenticated, signOut, user } = useAuth();
  const { roles } = useRoles();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isHome = location.pathname === '/';
  const isAdmin = roles.includes('admin');
  const isCreator = roles.includes('creator');
  const emailAlias = user?.email?.split('@')?.[0];
  const displayName = user?.user_metadata?.display_name || user?.user_metadata?.full_name || emailAlias || 'Usuario';
  const initial = displayName.slice(0, 1).toUpperCase();
  const creatorPath = isAuthenticated && isCreator ? '/creator' : '/creator/apply';
  const loginPath = location.pathname === '/' ? '/login' : getLoginPathForRedirect(location);
  const registerPath = location.pathname === '/'
    ? '/register'
    : `/register?redirect=${encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)}`;

  // Close the drawer on route changes so navigating never leaves it open.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const closeMenu = () => setMenuOpen(false);

  // Shared nav model — drives both the desktop bar and the mobile drawer (no duplication).
  const drawerItems = [
    { to: '/', label: 'Inicio', icon: 'home', end: true },
    { to: '/reader/library', label: 'Biblioteca', icon: 'local_library' },
    { to: '/#acerca', label: 'Acerca de', icon: 'info' },
    { to: creatorPath, label: 'Creador', icon: 'edit_square' },
    ...(isAuthenticated ? [{ to: '/reader/redeem', label: 'Canjear codigo', icon: 'redeem' }] : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: 'admin_panel_settings' }] : []),
  ];

  const social = [
    { href: 'https://www.upb.edu.mx/', label: 'Sitio web UPB', icon: 'language' },
    { href: 'https://www.facebook.com/Upbacalar/', label: 'Facebook UPB Bacalar', svg: FacebookGlyph },
    { href: 'https://www.tiktok.com/@upbacalar', label: 'TikTok UPB Bacalar', svg: TiktokGlyph },
  ];

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
              <span className="material-symbols-rounded" aria-hidden="true">language</span>
            </a>
            <a href="https://www.facebook.com/Upbacalar/" target="_blank" rel="noreferrer noopener" aria-label="Facebook UPB Bacalar" title="Facebook">
              {FacebookGlyph}
            </a>
            <a href="https://www.tiktok.com/@upbacalar" target="_blank" rel="noreferrer noopener" aria-label="TikTok UPB Bacalar" title="TikTok">
              {TiktokGlyph}
            </a>
          </div>

          {isAuthenticated ? (
            <>
              <Link className="user-bubble" to="/reader/profile" aria-label="Perfil de usuario">{initial}</Link>
              <Button variant="ghost" onClick={signOut}>Salir</Button>
            </>
          ) : (
            <>
              <Link className="login-link" to={loginPath}>Iniciar sesion</Link>
              <Link to={registerPath}>Registro</Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile: avatar (when signed in) + hamburger. Desktop hides these via CSS. */}
      <div className="nav-mobile-cluster">
        {isAuthenticated && (
          <Link className="user-bubble user-bubble--mobile" to="/reader/profile" aria-label="Perfil de usuario">{initial}</Link>
        )}
        <IconButton
          icon={menuOpen ? 'close' : 'menu'}
          label={menuOpen ? 'Cerrar menu' : 'Abrir menu'}
          className="site-nav-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-drawer"
        />
      </div>

      <MobileNavDrawer
        open={menuOpen}
        onClose={closeMenu}
        items={drawerItems}
        social={social}
        auth={{ isAuthenticated, initial, displayName, onSignOut: signOut, loginPath, registerPath }}
      />
    </header>
  );
}

export default SiteNavbar;
