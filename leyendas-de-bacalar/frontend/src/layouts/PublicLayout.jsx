import React from 'react';
import { Outlet } from 'react-router-dom';
import SiteNavbar from '../components/ui/SiteNavbar.jsx';

function PublicLayout() {
  return (
    <div className="app-shell">
      <SiteNavbar />
      <main className="page-container">
        <Outlet />
      </main>
    </div>
  );
}

export default PublicLayout;
