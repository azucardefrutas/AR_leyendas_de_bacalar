import React from 'react';
import DashboardShell from '../components/dashboard/DashboardShell.jsx';

const adminItems = [
  { label: 'Dashboard', to: '/admin', icon: 'dashboard', end: true },
  { label: 'Usuarios', to: '/admin/users', icon: 'group' },
  { label: 'Registro creador', to: '/admin/creator-applications', icon: 'how_to_reg' },
  { label: 'Autores', to: '/admin/authors', icon: 'draw' },
  { label: 'Leyendas', to: '/admin/legends', icon: 'auto_stories' },
  { label: 'Revisiones', to: '/admin/reviews', icon: 'rate_review' },
  { label: 'Recursos', to: '/admin/assets', icon: 'perm_media' },
  { label: 'Codigos', to: '/admin/codes', icon: 'confirmation_number' },
  { label: 'Lotes de codigos', to: '/admin/code-batches', icon: 'qr_code_2' },
  { label: 'Compras', to: '/admin/purchases', icon: 'shopping_bag' },
  { label: 'Suscripciones', to: '/admin/subscriptions', icon: 'workspace_premium' },
  { label: 'Actividad', to: '/admin/activity', icon: 'monitoring' },
  { label: 'Configuracion', to: '/admin/settings', icon: 'settings' },
];

function AdminLayout() {
  return <DashboardShell title="Admin" titleIcon="shield_person" items={adminItems} />;
}

export default AdminLayout;
