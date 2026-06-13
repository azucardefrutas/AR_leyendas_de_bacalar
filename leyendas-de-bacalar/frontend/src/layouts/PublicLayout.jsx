import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SiteNavbar from '../components/ui/SiteNavbar.jsx';

function PublicLayout() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const Container = isHome ? 'div' : 'main';

  return (
    <div className="app-shell">
      <SiteNavbar />
      <Container className="page-container">
        <Outlet />
      </Container>
    </div>
  );
}

export default PublicLayout;
