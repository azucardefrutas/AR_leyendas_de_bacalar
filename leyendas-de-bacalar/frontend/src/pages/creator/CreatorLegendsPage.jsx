import React from 'react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { deleteLegendDraft, getMyLegends } from '../../services/creatorService.js';

const DELETE_DRAFT_CONFIRMATION = '¿Seguro que quieres eliminar este borrador? Se eliminara la leyenda y su contenido asociado. Esta accion no se puede deshacer.';

function isDraftLegend(legend) {
  return ['draft', 'borrador'].includes(String(legend?.status || 'draft').toLowerCase());
}

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
      const { data, error: legendsError } = await getMyLegends();
      setLegends(data ?? []);
      setError(legendsError);
      setLoading(false);
    }

    loadLegends();
  }, []);

  if (loading) return <LoadingState message="Cargando tus leyendas..." />;

  const statusFilter = location.pathname === '/creator/drafts' ? 'draft' : searchParams.get('status');
  const visibleLegends = statusFilter
    ? legends.filter((legend) => (legend.status || 'draft') === statusFilter || (statusFilter === 'draft' && (legend.status || 'draft') === 'rejected'))
    : legends;
  const isDraftsView = statusFilter === 'draft';

  function openEditor(legend) {
    if (!legend?.id) {
      setError(new Error('No pudimos abrir este borrador.'));
      return;
    }
    navigate(`/creator/legends/${legend.id}/edit`);
  }

  async function handleDeleteDraft(legend) {
    if (!isDraftLegend(legend)) {
      setDeleteErrors((current) => ({
        ...current,
        [legend.id]: 'Esta obra ya no puede eliminarse porque fue enviada a revision o esta protegida.',
      }));
      return;
    }

    const confirmed = window.confirm(DELETE_DRAFT_CONFIRMATION);
    if (!confirmed) return;

    setDeletingId(legend.id);
    setDeleteErrors((current) => ({ ...current, [legend.id]: '' }));
    setMessage(null);

    const { error: deleteError } = await deleteLegendDraft(legend.id);

    setDeletingId(null);

    if (deleteError) {
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
    setMessage('Borrador eliminado correctamente.');
  }

  return (
    <section className="page-stack creator-panel">
      <div className="page-heading-row">
        <div>
          <p className="creator-kicker">Obras</p>
          <h1>{isDraftsView ? 'Borradores' : 'Mis leyendas'}</h1>
        </div>
        <Link to="/creator/legends/new"><Button>Crear leyenda</Button></Link>
      </div>

      {error && <p className="error-message">{error.message}</p>}
      {message && <p className="success-message">{message}</p>}

      {visibleLegends.length === 0 ? (
        <Card>
          <EmptyState
            title={isDraftsView ? 'No hay borradores' : 'Aun no has creado leyendas'}
            message={isDraftsView ? 'Los borradores y obras rechazadas apareceran aqui.' : 'Crea tu primera historia para empezar el flujo editorial.'}
          />
          <Link to="/creator/legends/new"><Button>Crear primera leyenda</Button></Link>
        </Card>
      ) : (
        <div className="creator-editorial-grid">
          {visibleLegends.map((legend) => (
            <Card key={legend.id} className="creator-editorial-card">
              <div className="creator-editorial-card-main">
                <span className="creator-status-pill">{legend.status || 'draft'}</span>
                <h2>{legend.title}</h2>
                {deleteErrors[legend.id] && (
                  <p className="error-message creator-card-error">{deleteErrors[legend.id]}</p>
                )}
              </div>
              <div className="creator-card-actions">
                <Button variant="ghost" className="creator-card-action" onClick={() => openEditor(legend)}>Editar</Button>
                {isDraftLegend(legend) && (
                  <Button
                    variant="ghost"
                    className="creator-card-action danger-action"
                    onClick={() => handleDeleteDraft(legend)}
                    disabled={deletingId === legend.id}
                  >
                    {deletingId === legend.id ? 'Eliminando...' : 'Eliminar borrador'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export default CreatorLegendsPage;
