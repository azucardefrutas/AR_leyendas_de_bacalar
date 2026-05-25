import { Navigate, Outlet } from 'react-router-dom';
import LoadingState from '../ui/LoadingState.jsx';
import { useRoles } from '../../hooks/useRoles.js';

function RoleGuard({ allowedRoles = [] }) {
  const { roles, loading } = useRoles();

  if (loading) {
    return <LoadingState message="Verificando permisos..." />;
  }

  const canEnter = allowedRoles.some((role) => roles.includes(role));

  if (!canEnter) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}

export default RoleGuard;
