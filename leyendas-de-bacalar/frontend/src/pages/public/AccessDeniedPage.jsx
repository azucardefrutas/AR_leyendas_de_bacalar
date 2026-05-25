import EmptyState from '../../components/ui/EmptyState.jsx';

function AccessDeniedPage() {
  return <EmptyState title="Acceso denegado" message="Tu cuenta no tiene permisos para ver esta seccion." />;
}

export default AccessDeniedPage;
