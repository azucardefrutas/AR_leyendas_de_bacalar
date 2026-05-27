import React from 'react';
import EmptyState from '../../components/ui/EmptyState.jsx';

function AccessDeniedPage() {
  return (
    <EmptyState
      title="Acceso denegado"
      message="Esta seccion es solo para administradores o usuarios con permisos autorizados."
    />
  );
}

export default AccessDeniedPage;
