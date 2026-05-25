import React from 'react';
import DashboardShell from '../components/dashboard/DashboardShell.jsx';

const adminItems = [
  { label: 'Resumen', to: '/admin' },
  { label: 'Usuarios', to: '/admin/users' },
  { label: 'Solicitudes', to: '/admin/creator-applications' },
  { label: 'Revision', to: '/admin/legends-review' },
  { label: 'Codigos', to: '/admin/codes' },
  { label: 'Ediciones fisicas', to: '/admin/physical-editions' },
  { label: 'Productos', to: '/admin/products' },
  { label: 'Auditoria', to: '/admin/audit' },
];

function AdminLayout() {
  return <DashboardShell title="Admin" items={adminItems} />;
}

export default AdminLayout;
