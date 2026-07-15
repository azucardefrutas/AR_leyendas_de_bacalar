import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import CreatorLegendCard from '../../components/creator/CreatorLegendCard.jsx';
import CreatorLegendCardSkeleton from '../../components/creator/CreatorLegendCardSkeleton.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import {
  canDeleteCreatorLegend,
  deleteCreatorLegend,
  duplicateLegend,
  getCreatorLegendCardData,
  getCreatorLegendStatusKey,
  getCreatorLegends,
  getLegendDeleteConfirmation,
} from '../../services/creatorService.js';
import { deleteLegendPhysicalEditions } from '../../services/backendApiService.js';

// The RPC blocks deleting a legend that still has a physical edition attached, with this
// exact wording. We detect it to offer an in-place "remove the physical edition" flow.
function isPhysicalEditionBlock(error) {
  return /ediciones\s+f[ií]sicas/i.test(error?.message || '');
}

function CreatorLegendsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [legends, setLegends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [deleteErrors, setDeleteErrors] = useState({});
  const [physicalBlock, setPhysicalBlock] = useState(null); // { legend, statusKey }
  const [resolvingPhysical, setResolvingPhysical] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadLegends() {
      if (import.meta.env.DEV) console.time('[CreatorModule] load');
      try {
        const { data, error: legendsError } = await getCreatorLegends();
        if (!isMounted) return;
        setLegends(data ?? []);
        setError(legendsError);
      } catch (loadError) {
        if (isMounted) setError(loadError);
        if (import.meta.env.DEV) {
          console.error('[CreatorModule] Error real:', {
            operation: 'loadCreatorLegendsPage',
            table: 'legends',
            error: loadError,
          });
        }
      } finally {
        if (isMounted) setLoading(false);
        if (import.meta.env.DEV) console.timeEnd('[CreatorModule] load');
      }
    }

    loadLegends();
    return () => {
      isMounted = false;
    };
  }, []);

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

  async function handleDuplicateLegend(legend) {
    if (!legend?.id) return;
    setDuplicatingId(legend.id);
    setMessage(null);
    setError(null);
    const { data, error: duplicateError } = await duplicateLegend(legend.id);
    setDuplicatingId(null);
    if (duplicateError) {
      setError(duplicateError);
      return;
    }
    // Refresh the list so the new draft appears in "Mis leyendas".
    const { data: refreshed, error: refreshError } = await getCreatorLegends();
    if (!refreshError) setLegends(refreshed ?? []);
    setMessage(data?.legend?.title ? `Copia creada: "${data.legend.title}".` : 'Copia creada como borrador.');
  }

  // Runs the actual RPC delete and updates the list on success. Returns the error (if
  // any) so callers can decide whether to surface it or handle it (e.g. physical block).
  async function runLegendDelete(legend, statusKey) {
    const { error: deleteError } = await deleteCreatorLegend(legend.id, { status: statusKey });

    if (deleteError) {
      if (import.meta.env.DEV) {
        console.error('[CreatorLegends] Error real:', {
          operation: 'deleteCreatorLegend',
          table: 'rpc/delete_creator_legend',
          legendId: legend.id,
          status: statusKey,
          error: deleteError.supabaseError || deleteError,
        });
      }
      return deleteError;
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
    return null;
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

    const deleteError = await runLegendDelete(legend, statusKey);

    setDeletingId(null);

    if (!deleteError) return;

    // Blocked by an attached physical edition -> offer to remove it and retry, instead
    // of leaving the author with a dead-end error.
    if (isPhysicalEditionBlock(deleteError)) {
      setPhysicalBlock({ legend, statusKey });
      return;
    }

    setDeleteErrors((current) => ({ ...current, [legend.id]: deleteError.message }));
  }

  // Confirmed from the modal: delete the legend's physical edition(s) through the backend
  // (service role), then retry deleting the legend itself.
  async function handleConfirmDeletePhysical() {
    if (!physicalBlock || resolvingPhysical) return;
    const { legend, statusKey } = physicalBlock;

    setResolvingPhysical(true);
    setMessage(null);
    setDeleteErrors((current) => ({ ...current, [legend.id]: '' }));

    try {
      await deleteLegendPhysicalEditions(legend.id);
    } catch (physicalError) {
      setResolvingPhysical(false);
      setPhysicalBlock(null);
      setDeleteErrors((current) => ({
        ...current,
        [legend.id]: physicalError?.message || 'No se pudo eliminar la edicion fisica.',
      }));
      return;
    }

    setDeletingId(legend.id);
    const deleteError = await runLegendDelete(legend, statusKey);
    setDeletingId(null);
    setResolvingPhysical(false);
    setPhysicalBlock(null);

    if (deleteError) {
      setDeleteErrors((current) => ({ ...current, [legend.id]: deleteError.message }));
    }
  }

  return (
    <section className="page-stack creator-panel creator-legends-page">
      <div className="page-heading-row creator-legends-header">
        <div>
          <p className="creator-kicker">Obras</p>
          <h1>{isDraftsView ? 'Borradores' : 'Mis leyendas'}</h1>
          {!loading && (
            <p className="creator-legends-count">
              {visibleLegends.length === 0
                ? (isDraftsView ? 'Sin borradores' : 'Sin leyendas todavia')
                : `${visibleLegends.length} ${visibleLegends.length === 1 ? 'historia' : 'historias'}`}
            </p>
          )}
        </div>
        <Link to="/creator/legends/new" className="btn btn-primary creator-legends-new">
          <span className="material-symbols-rounded" aria-hidden="true">add</span>
          <span>Nueva leyenda</span>
        </Link>
      </div>

      {error && <p className="error-message">{error.message}</p>}
      {message && <p className="success-message">{message}</p>}

      {loading ? (
        <CreatorLegendCardSkeleton count={6} />
      ) : visibleLegends.length === 0 ? (
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
              {...getCreatorLegendCardData(legend, { allowDelete: true, allowDuplicate: true })}
              onEdit={openEditor}
              onDelete={handleDeleteLegend}
              onDuplicate={handleDuplicateLegend}
              deleting={deletingId === legend.id}
              duplicating={duplicatingId === legend.id}
              deleteError={deleteErrors[legend.id]}
            />
          ))}
        </div>
      )}

      {physicalBlock && (
        <Modal
          title="Eliminar edicion fisica"
          onClose={() => (resolvingPhysical ? null : setPhysicalBlock(null))}
        >
          <div className="creator-delete-physical">
            <p>
              <strong>“{physicalBlock.legend.title || 'Esta historia'}”</strong> tiene una edicion
              fisica asociada, por eso no se puede eliminar directamente.
            </p>
            <p>
              Para borrar la historia primero hay que eliminar su relacion con la edicion fisica.
              ¿Seguro que quieres eliminar la relacion fisica y la historia? Esta accion no se puede
              deshacer.
            </p>
            <p className="creator-muted">
              Si la edicion tuviera codigos generados, lotes o productos vendidos, no se eliminara y
              te avisaremos.
            </p>
            <div className="creator-delete-physical-actions">
              <Button variant="ghost" onClick={() => setPhysicalBlock(null)} disabled={resolvingPhysical}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleConfirmDeletePhysical} disabled={resolvingPhysical}>
                {resolvingPhysical ? 'Eliminando...' : 'Si, eliminar edicion fisica y la historia'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

export default CreatorLegendsPage;
