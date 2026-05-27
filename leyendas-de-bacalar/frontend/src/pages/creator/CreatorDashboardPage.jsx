import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { DraftIcon, PublishedIcon, ReviewIcon } from '../../components/ui/CreatorIcons.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useProfile } from '../../hooks/useProfile.js';
import { getMyCreatorProfile, getMyLegends } from '../../services/creatorService.js';

function getDisplayName(profile, creatorProfile) {
  return creatorProfile?.pen_name || profile?.full_name || profile?.name || 'creador';
}

function countByStatus(legends, statuses) {
  return legends.filter((legend) => statuses.includes(legend.status || 'draft')).length;
}

function CreatorDashboardPage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [legends, setLegends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      const [creatorResult, legendsResult] = await Promise.all([
        getMyCreatorProfile(),
        getMyLegends(),
      ]);

      setCreatorProfile(creatorResult.data);
      setLegends(legendsResult.data ?? []);
      setError(creatorResult.error || legendsResult.error);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  if (loading) return <LoadingState message="Cargando panel de creador..." />;

  const publishedCount = countByStatus(legends, ['published']);
  const reviewCount = countByStatus(legends, ['in_review', 'review', 'pending_review']);
  const draftCount = countByStatus(legends, ['draft', 'rejected']);

  function openEditor(legend) {
    if (!legend?.id) {
      setError(new Error('No pudimos abrir esta leyenda.'));
      return;
    }
    navigate(`/creator/legends/${legend.id}/edit`);
  }

  return (
    <section className="page-stack creator-panel">
      <div className="creator-hero">
        <div>
          <p className="creator-kicker">Panel de autor</p>
          <h1>Hola, {getDisplayName(profile, creatorProfile)}</h1>
          <p>Administra tus leyendas, prepara borradores y da seguimiento a revisiones editoriales.</p>
        </div>
        <Link to="/creator/legends/new"><Button>Nueva leyenda</Button></Link>
      </div>

      {error && <p className="error-message">{error.message}</p>}

      <div className="stat-grid">
        <Card className="stat-card">
          <div className="creator-stat-icon"><PublishedIcon /></div>
          <span>Publicadas</span>
          <strong>{publishedCount}</strong>
        </Card>
        <Card className="stat-card">
          <div className="creator-stat-icon"><ReviewIcon /></div>
          <span>En revision</span>
          <strong>{reviewCount}</strong>
        </Card>
        <Card className="stat-card">
          <div className="creator-stat-icon"><DraftIcon /></div>
          <span>Borradores</span>
          <strong>{draftCount}</strong>
        </Card>
      </div>

      <div className="page-heading-row">
        <div>
          <p className="creator-kicker">Biblioteca editorial</p>
          <h2>Leyendas creadas</h2>
        </div>
        <Link to="/creator/legends"><Button variant="ghost">Ver todas</Button></Link>
      </div>

      {legends.length === 0 ? (
        <Card className="creator-empty-card">
          <h2>Aun no has creado leyendas</h2>
          <p>Crea tu primera obra para iniciar el flujo editorial.</p>
          <Link to="/creator/legends/new"><Button>Crear primera leyenda</Button></Link>
        </Card>
      ) : (
        <div className="creator-editorial-grid">
          {legends.slice(0, 6).map((legend) => (
            <Card key={legend.id} className="creator-editorial-card">
              <span className="creator-status-pill">{legend.status || 'draft'}</span>
              <h3>{legend.title}</h3>
              <p>{legend.short_synopsis || legend.synopsis || 'Sin sinopsis breve.'}</p>
              <Button type="button" variant="ghost" onClick={() => openEditor(legend)}>Editar leyenda</Button>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export default CreatorDashboardPage;
