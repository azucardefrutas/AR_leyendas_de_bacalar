import React, { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import SiteNavbar from '../ui/SiteNavbar.jsx';
import Sidebar from './Sidebar.jsx';
import LoadingState from '../ui/LoadingState.jsx';

const STORAGE_KEY = 'rx-sidebar-collapsed';

function DashboardShell({ title, titleIcon, items }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
  });

  function toggle() {
    setCollapsed((value) => {
      const next = !value;
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <div className="dashboard-frame">
      <SiteNavbar />
      <div className={`dashboard-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar title={title} titleIcon={titleIcon} items={items} collapsed={collapsed} onToggle={toggle} />
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
