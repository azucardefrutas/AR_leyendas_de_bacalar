import React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { getMyLegends } from '../../services/creatorService.js';

function CreatorLegendsPage() {
  const [legends, setLegends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadLegends() {
      const { data, error: legendsError } = await getMyLegends();
      setLegends(data ?? []);
      setError(legendsError);
      setLoading(false);
    }

    loadLegends();
  }, []);

  if (loading) return <LoadingState message="Cargando tus leyendas..." />;

  return (
    <section className="page-stack creator-panel">
      <div className="page-heading-row">
        <div>
          <p className="creator-kicker">Obras</p>
          <h1>Mis leyendas</h1>
        </div>
        <Link to="/creator/legends/new"><Button>Crear leyenda</Button></Link>
      </div>

      {error && <p className="error-message">{error.message}</p>}

      {legends.length === 0 ? (
        <Card>
          <EmptyState
            title="Aun no has creado leyendas"
            message="Crea tu primera historia para empezar el flujo editorial."
          />
          <Link to="/creator/legends/new"><Button>Crear primera leyenda</Button></Link>
        </Card>
      ) : (
        <div className="creator-editorial-grid">
          {legends.map((legend) => (
            <Card key={legend.id} className="creator-editorial-card">
              <div>
                <span className="creator-status-pill">{legend.status || 'draft'}</span>
                <h2>{legend.title}</h2>
                <p>{legend.short_synopsis || legend.synopsis || 'Sin sinopsis breve.'}</p>
              </div>
              <div className="actions-row">
                <Link to={`/creator/legends/${legend.id}/edit`}><Button variant="ghost">Editar</Button></Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export default CreatorLegendsPage;
