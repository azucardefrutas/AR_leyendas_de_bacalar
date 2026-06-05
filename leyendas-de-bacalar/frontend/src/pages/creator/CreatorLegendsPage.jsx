import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import CreatorLegendCard from '../../components/creator/CreatorLegendCard.jsx';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import {
  canDeleteCreatorLegend,
  deleteCreatorLegend,
  getCreatorLegendCardData,
  getCreatorLegendStatusKey,
  getLegendDeleteConfirmation,
} from '../../services/creatorService.js';

function CreatorLegendsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [legends, setLegends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteErrors, setDeleteErrors] = useState({});
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    async function loadLegends() {
      const { data, error: legendsError } = await getCreatorLegends();
      setLegends(data ?? []);
      setError(legendsError);
      setLoading(false);
    }

    loadLegends();
  }, []);

  if (loading) return <LoadingState message="Cargando tus leyendas..." />;

  const statusFilter = location.pathname === '/creator/drafts' ? 'draft' : searchParams.get('status');
  const visibleLegends = statusFilter
    ? legends.filter((legend) => getCreatorLegendStatusKey(legend) === statusFilter)
    : legends;
  const isDraftsView = statusFilter === 'draft';

  function openEditor(legend) {
    if (!legend?.id) {
      setError(new Error('No pudimos abrir este borrador.'));
      return;
    }
    navigate(`/creator/legends/${legend.id}/edit`);
  }

  async function handleDeleteLegend(legend) {
    const statusKey = getCreatorLegendStatusKey(legend);
    if (!canDeleteCreatorLegend(statusKey)) {
      setDeleteErrors((current) => ({
        ...current,
        [legend.id]: 'Esta obra ya no puede eliminarse porque fue enviada a revision o esta protegida.',
      }));
      return;
    }

    const confirmed = window.confirm(getLegendDeleteConfirmation(legend));
    if (!confirmed) return;

    setDeletingId(legend.id);
    setDeleteErrors((current) => ({ ...current, [legend.id]: '' }));
    setMessage(null);

    const { error: deleteError } = await deleteCreatorLegend(legend.id, { status: statusKey });

    setDeletingId(null);

    if (deleteError) {
      if (import.meta.env.DEV) {
        console.error('[CreatorLegends] Error real:', {
          operation: 'deleteCreatorLegend',
          table: statusKey === 'draft' || statusKey === 'borrador'
            ? 'rpc/delete_legend_draft'
            : 'rpc/delete_creator_legend',
          legendId: legend.id,
          status: statusKey,
          error: deleteError.supabaseError || deleteError,
        });
      }
      setDeleteErrors((current) => ({
        ...current,
        [legend.id]: deleteError.message,
      }));
      return;
    }

    setLegends((current) => current.filter((item) => item.id !== legend.id));
    setDeleteErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[legend.id];
      return nextErrors;
    });
    setMessage(statusKey === 'draft' || statusKey === 'borrador'
      ? 'Borrador eliminado correctamente.'
      : 'Historia eliminada correctamente.');
  }

  return (
    <section className="page-stack creator-panel">
      <div className="page-heading-row">
        <div>
          <p className="creator-kicker">Obras</p>
          <h1>{isDraftsView ? 'Borradores' : 'Mis leyendas'}</h1>
        </div>
        <Link to="/creator/legends/new" className="btn btn-primary">Crear leyenda</Link>
      </div>

      {error && <p className="error-message">{error.message}</p>}
      {message && <p className="success-message">{message}</p>}

      {visibleLegends.length === 0 ? (
        <Card className="creator-empty-card">
          <EmptyState
            title={isDraftsView ? 'No hay borradores' : 'Aun no has creado leyendas'}
            message={isDraftsView ? 'Los borradores apareceran aqui.' : 'Crea tu primera historia para empezar el flujo editorial.'}
          />
          <Link to="/creator/legends/new" className="btn btn-primary">Crear primera leyenda</Link>
        </Card>
      ) : (
        <div className="creator-editorial-grid">
          {visibleLegends.map((legend) => (
            <CreatorLegendCard
              key={legend.id}
              legend={legend}
              {...getCreatorLegendCardData(legend, { allowDelete: true })}
              onEdit={openEditor}
              onDelete={handleDeleteLegend}
              deleting={deletingId === legend.id}
              deleteError={deleteErrors[legend.id]}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default CreatorLegendsPage;
