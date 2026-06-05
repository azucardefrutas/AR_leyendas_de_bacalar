import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CreatorLegendCard from '../../components/creator/CreatorLegendCard.jsx';
import Card from '../../components/ui/Card.jsx';
import { DraftIcon, PublishedIcon, ReviewIcon } from '../../components/ui/CreatorIcons.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useProfile } from '../../hooks/useProfile.js';
import {
  getCreatorLegendCardData,
  getCreatorLegendStatusKey,
  getCreatorLegends,
  getMyCreatorProfile,
} from '../../services/creatorService.js';

function getDisplayName(profile, creatorProfile) {
  return creatorProfile?.pen_name || profile?.full_name || profile?.name || 'creador';
}

function countByStatus(legends, statuses) {
  return legends.filter((legend) => statuses.includes(getCreatorLegendStatusKey(legend))).length;
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
        getCreatorLegends(),
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
  const reviewCount = countByStatus(legends, ['in_review', 'review', 'pending_review', 'submitted', 'changes_requested', 'rejected']);
  const draftCount = countByStatus(legends, ['draft', 'borrador']);

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
        <Link to="/creator/legends/new" className="btn btn-primary">Nueva leyenda</Link>
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
        <Link to="/creator/legends" className="btn btn-ghost">Ver todas</Link>
      </div>

      {legends.length === 0 ? (
        <Card className="creator-empty-card">
          <h2>Aun no has creado leyendas</h2>
          <p>Crea tu primera obra para iniciar el flujo editorial.</p>
          <Link to="/creator/legends/new" className="btn btn-primary">Crear primera leyenda</Link>
        </Card>
      ) : (
        <div className="creator-editorial-grid">
          {legends.slice(0, 6).map((legend) => (
            <CreatorLegendCard
              key={legend.id}
              legend={legend}
              {...getCreatorLegendCardData(legend, { allowDelete: false })}
              onEdit={openEditor}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default CreatorDashboardPage;
