import React from 'react';
import DashboardShell from '../components/dashboard/DashboardShell.jsx';

const readerItems = [
  { label: 'Biblioteca', to: '/reader/library', icon: 'local_library' },
  { label: 'Canjear codigo', to: '/reader/redeem', icon: 'confirmation_number' },
  { label: 'Compras', to: '/reader/purchases', icon: 'shopping_bag' },
  { label: 'Suscripcion', to: '/reader/subscription', icon: 'workspace_premium' },
  { label: 'Perfil', to: '/reader/profile', icon: 'person' },
  { label: 'Ajustes', to: '/reader/settings', icon: 'settings' },
];

function ReaderLayout() {
  return <DashboardShell title="Lector" items={readerItems} />;
}

export default ReaderLayout;
