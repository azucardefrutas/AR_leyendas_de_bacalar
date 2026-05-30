import React, { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { getCreatorAccessStatus } from '../../services/creatorAccessService.js';
import { getMyCreatorStatus } from '../../services/creatorApplicationService.js';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import LoadingState from '../ui/LoadingState.jsx';

function CreatorAccessGuard() {
  const [accessStatus, setAccessStatus] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    async function loadCreatorStatus() {
      const { data: access } = await getCreatorAccessStatus();
      setAccessStatus(access);
      if (!access?.hasCreatorRole) {
        const { data: application } = await getMyCreatorStatus();
        setApplicationStatus(application);
      }
      setStatusLoading(false);
    }

    loadCreatorStatus();
  }, []);

  if (statusLoading) {
    return <LoadingState message="Verificando permisos de creador..." />;
  }

  if (!accessStatus?.canAccessCreatorPanel) {
    const pending = applicationStatus?.status === 'pending';
    return (
      <section className="creator-locked-page">
        <Card className="creator-application-card">
          <div>
            <p className="eyebrow">Acceso de creador</p>
            <h1>{pending ? 'Tu solicitud esta en revision.' : 'Necesitas ser creador aprobado para acceder.'}</h1>
            <p>
              {pending
                ? 'Un administrador revisara tu propuesta antes de activar el panel editorial.'
                : 'Envia una solicitud para publicar leyendas y recursos culturales.'}
            </p>
          </div>
          <Link to="/creator/apply"><Button>Solicitar ser creador</Button></Link>
        </Card>
      </section>
    );
  }

  return <Outlet />;
}

export default CreatorAccessGuard;
