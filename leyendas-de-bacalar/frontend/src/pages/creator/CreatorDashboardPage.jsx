import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CreatorLegendCard from '../../components/creator/CreatorLegendCard.jsx';
import CreatorLegendCardSkeleton from '../../components/creator/CreatorLegendCardSkeleton.jsx';
import Card from '../../components/ui/Card.jsx';
import { DraftIcon, PublishedIcon, ReviewIcon } from '../../components/ui/CreatorIcons.jsx';
import { useProfile } from '../../hooks/useProfile.js';
import {
  countCreatorLegendsByStatus,
  getCreatorLegendCardData,
  getCreatorLegends,
  getMyCreatorProfile,
} from '../../services/creatorService.js';
import { getStatusCounterTone } from '../../shared/status/statusMeta.js';

function getDisplayName(profile, creatorProfile) {
  return creatorProfile?.pen_name || profile?.full_name || profile?.name || 'creador';
}

function CreatorDashboardPage() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [legends, setLegends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      if (import.meta.env.DEV) console.time('[CreatorModule] load');
      try {
        const [creatorResult, legendsResult] = await Promise.all([
          getMyCreatorProfile(),
          getCreatorLegends(),
        ]);

        if (!isMounted) return;
        setCreatorProfile(creatorResult.data);
        setLegends(legendsResult.data ?? []);
        setError(creatorResult.error || legendsResult.error);
      } catch (loadError) {
        if (isMounted) setError(loadError);
        if (import.meta.env.DEV) {
          console.error('[CreatorModule] Error real:', {
            operation: 'loadCreatorDashboard',
            table: 'creator_profiles/legends',
            error: loadError,
          });
        }
      } finally {
        if (isMounted) setLoading(false);
        if (import.meta.env.DEV) console.timeEnd('[CreatorModule] load');
      }
    }

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  const publishedCount = countCreatorLegendsByStatus(legends, ['published']);
  const reviewCount = countCreatorLegendsByStatus(legends, ['in_review', 'review', 'pending_review', 'submitted', 'changes_requested']);
  const draftCount = countCreatorLegendsByStatus(legends, ['draft', 'borrador']);
  const rejectedCount = countCreatorLegendsByStatus(legends, ['rejected']);
  const stats = [
    { label: 'Publicadas', value: publishedCount, icon: <PublishedIcon />, tone: getStatusCounterTone('published') },
    { label: 'En revision', value: reviewCount, icon: <ReviewIcon />, tone: getStatusCounterTone('in_review') },
    { label: 'Borradores', value: draftCount, icon: <DraftIcon />, tone: getStatusCounterTone('draft') },
    { label: 'Rechazadas', value: rejectedCount, icon: <ReviewIcon />, tone: getStatusCounterTone('rejected') },
  ];

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
        {stats.map((item) => (
          <Card className={`stat-card stat-card-${item.tone}`} key={item.label}>
            <div className={`creator-stat-icon creator-stat-icon-${item.tone}`}>{item.icon}</div>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </Card>
        ))}
      </div>

      <div className="page-heading-row">
        <div>
          <p className="creator-kicker">Biblioteca editorial</p>
          <h2>Leyendas creadas</h2>
        </div>
        <Link to="/creator/legends" className="btn btn-ghost">Ver todas</Link>
      </div>

      {legends.length === 0 ? (
        loading ? (
          <CreatorLegendCardSkeleton count={3} />
        ) : (
        <Card className="creator-empty-card">
          <h2>Aun no has creado leyendas</h2>
          <p>Crea tu primera obra para iniciar el flujo editorial.</p>
          <Link to="/creator/legends/new" className="btn btn-primary">Crear primera leyenda</Link>
        </Card>
        )
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
