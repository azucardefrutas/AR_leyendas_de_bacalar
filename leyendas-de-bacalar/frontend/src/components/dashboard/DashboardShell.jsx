import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

function DashboardShell({ title, items }) {
  return (
    <div className="dashboard-shell">
      <Sidebar title={title} items={items} />
      <section className="dashboard-content">
        <Outlet />
      </section>
    </div>
  );
}

export default DashboardShell;
