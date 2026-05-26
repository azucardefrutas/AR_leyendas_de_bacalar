import React from 'react';
import { Outlet } from 'react-router-dom';
import SiteNavbar from '../ui/SiteNavbar.jsx';
import Sidebar from './Sidebar.jsx';

function DashboardShell({ title, items }) {
  return (
    <div className="dashboard-frame">
      <SiteNavbar />
      <div className="dashboard-shell">
        <Sidebar title={title} items={items} />
        <section className="dashboard-content">
          <Outlet />
        </section>
      </div>
    </div>
  );
}

export default DashboardShell;
