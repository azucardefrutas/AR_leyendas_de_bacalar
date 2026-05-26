import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useRoles } from '../../hooks/useRoles.js';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import LoadingState from '../ui/LoadingState.jsx';

function CreatorAccessGuard() {
  const { roles, loading } = useRoles();

  if (loading) {
    return <LoadingState message="Verificando permisos de creador..." />;
  }

  if (!roles.includes('creator')) {
    return (
      <section className="creator-locked-page">
        <Card className="creator-application-card">
          <div>
            <p className="eyebrow">Acceso de creador</p>
            <h1>Necesitas ser creador para acceder</h1>
            <p>Envia una solicitud desde tu perfil de lector. Un administrador revisara tu propuesta.</p>
          </div>
          <Link to="/reader/profile"><Button>Solicitar ser creador</Button></Link>
        </Card>
      </section>
    );
  }

  return <Outlet />;
}

export default CreatorAccessGuard;
