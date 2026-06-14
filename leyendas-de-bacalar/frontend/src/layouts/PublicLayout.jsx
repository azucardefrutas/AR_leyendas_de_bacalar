import React, { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SiteNavbar from '../components/ui/SiteNavbar.jsx';
import LoadingState from '../components/ui/LoadingState.jsx';

function PublicLayout() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  const Container = isHome ? 'div' : 'main';

  return (
    <div className="app-shell">
      <SiteNavbar />
      <Container className="page-container">
        <Suspense fallback={<LoadingState message="Cargando..." />}>
          <Outlet />
        </Suspense>
      </Container>
    </div>
  );
}

export default PublicLayout;
