import DashboardShell from '../components/dashboard/DashboardShell.jsx';

const creatorItems = [
  { label: 'Resumen', to: '/creator' },
  { label: 'Leyendas', to: '/creator/legends' },
  { label: 'Crear leyenda', to: '/creator/legends/new' },
  { label: 'Revisiones', to: '/creator/reviews' },
  { label: 'Codigos fisicos', to: '/creator/code-requests' },
];

function CreatorLayout() {
  return <DashboardShell title="Creador" items={creatorItems} />;
}

export default CreatorLayout;
