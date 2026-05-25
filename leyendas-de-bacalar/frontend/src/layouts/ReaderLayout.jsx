import DashboardShell from '../components/dashboard/DashboardShell.jsx';

const readerItems = [
  { label: 'Biblioteca', to: '/reader/library' },
  { label: 'Canjear codigo', to: '/reader/redeem' },
  { label: 'Compras', to: '/reader/purchases' },
  { label: 'Suscripcion', to: '/reader/subscription' },
  { label: 'Perfil', to: '/reader/profile' },
];

function ReaderLayout() {
  return <DashboardShell title="Lector" items={readerItems} />;
}

export default ReaderLayout;
