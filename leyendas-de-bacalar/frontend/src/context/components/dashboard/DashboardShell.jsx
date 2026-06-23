import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import SiteNavbar from '../ui/SiteNavbar.jsx';
import Sidebar from './Sidebar.jsx';
import LoadingState from '../ui/LoadingState.jsx';

function DashboardShell({ title, items }) {
  return (
    <div className="dashboard-frame">
      <SiteNavbar />
      <div className="dashboard-shell">
        <Sidebar title={title} items={items} />
        <section className="dashboard-content">
          <Suspense fallback={<LoadingState />}>
            <Outlet />
          </Suspense>
        </section>
      </div>
    </div>
  );
}

export default DashboardShell;
