import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StatusBadge from '../../components/creator/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { getLegendStatusBadge, getMyLegends } from '../../services/creatorService.js';
import { getLegendResources } from '../../services/assetService.js';

function UploadAssetsPage() {
  const { legendId } = useParams();
  const [legends, setLegends] = useState([]);
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAssetsContext() {
      if (legendId) {
        const result = await getLegendResources(legendId);
        setResources(result.data);
        setError(result.error);
        setLoading(false);
        return;
      }

      const { data, error: legendsError } = await getMyLegends();
      setLegends(data ?? []);
      setError(legendsError);
      setLoading(false);
    }

    loadAssetsContext();
  }, [legendId]);

  if (loading) return <LoadingState message="Cargando recursos..." />;

  if (legendId) {
    return (
      <section className="page-stack creator-panel">
        <div className="page-heading-row">
          <div>
            <p className="creator-kicker">Recursos</p>
            <h1>Recursos de la leyenda</h1>
            <p className="state-message">La carga y registro de archivos se realiza desde el editor de la obra.</p>
          </div>
          <Link to={`/creator/legends/${legendId}/edit`}><Button>Editar recursos</Button></Link>
        </div>
        {error && <p className="error-message">{error.message}</p>}
        <div className="creator-list-grid">
          <Card>
            <h2>Visuales</h2>
            <p>{resources?.media?.length ?? 0} recursos vinculados.</p>
          </Card>
          <Card>
            <h2>Documentos</h2>
            <p>{resources?.documents?.length ?? 0} documentos vinculados.</p>
          </Card>
          <Card>
            <h2>3D / AR</h2>
            <p>{(resources?.arScenes?.length ?? 0) + (resources?.arMarkers?.length ?? 0)} elementos preparados.</p>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack creator-panel">
      <div>
        <p className="creator-kicker">Recursos</p>
        <h1>Subir recursos</h1>
        <p className="state-message">Selecciona una leyenda para administrar portada, banner, PDF, modelo 3D y marcador AR desde su editor.</p>
      </div>

      {error && <p className="error-message">{error.message}</p>}

      <div className="creator-editorial-grid">
        {legends.map((legend) => {
          const statusBadge = getLegendStatusBadge(legend);
          return (
            <Card key={legend.id} className="creator-editorial-card">
              <StatusBadge statusKey={statusBadge.key} label={statusBadge.label} />
              <h2>{legend.title}</h2>
              <p>{legend.short_synopsis || 'Sin sinopsis breve.'}</p>
              <Link to={`/creator/legends/${legend.id}/edit`}><Button variant="ghost">Administrar recursos</Button></Link>
            </Card>
          );
        })}
      </div>

      {!legends.length && (
        <Card className="creator-empty-card">
          <h2>Aun no tienes leyendas</h2>
          <p>Crea una obra para empezar a subir recursos editoriales.</p>
          <Link to="/creator/legends/new"><Button>Nueva leyenda</Button></Link>
        </Card>
      )}
    </section>
  );
}

export default UploadAssetsPage;
