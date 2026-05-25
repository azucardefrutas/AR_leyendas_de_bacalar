import React from 'react';
import { Outlet } from 'react-router-dom';

function DashboardLayout() {
  return (
    <div className="app-shell">
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;
