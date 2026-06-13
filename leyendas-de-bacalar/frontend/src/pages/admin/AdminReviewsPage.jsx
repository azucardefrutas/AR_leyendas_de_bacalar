import React, { useEffect, useState } from 'react';
import {
  AdminConfirmModal,
  AdminDataTable,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminToast,
} from '../../components/ui/AdminPrimitives.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  approveReview,
  getContentReviews,
  publishVersion,
  rejectReview,
  requestChanges,
} from '../../services/adminLegendService.js';

function getReviewLegend(review) {
  return review.legend_versions?.legends;
}

function getReviewStatus(review) {
  return String(review?.status || 'pending').toLowerCase();
}

function getVersionStatus(review) {
  return String(review?.legend_versions?.status || '').toLowerCase();
}

function getAllowedActions(review) {
  const reviewStatus = getReviewStatus(review);
  const versionStatus = getVersionStatus(review);
  const legendStatus = String(getReviewLegend(review)?.status || '').toLowerCase();
  if (reviewStatus === 'pending') return ['approve', 'changes', 'reject'];
  if (reviewStatus === 'approved' && versionStatus === 'approved' && legendStatus !== 'published') return ['publish'];
  return [];
}

function logAdminReviewError(operation, review, error) {
  if (!import.meta.env.DEV) return;
  console.error('[AdminReviews] Error real:', {
    operation,
    reviewId: review?.id,
    versionId: review?.legend_versions?.id,
    legendId: review?.legend_versions?.legend_id,
    error,
  });
}

function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  async function loadReviews() {
    setLoading(true);
    setError(null);
    const { data, error: reviewsError } = await getContentReviews();
    if (reviewsError && import.meta.env.DEV) {
      console.error('[AdminReviews] Error real:', {
        operation: 'load content reviews',
        error: reviewsError.supabaseError || reviewsError,
      });
    }
    setReviews(data ?? []);
    setError(reviewsError);
    setLoading(false);
  }

  useEffect(() => {
    loadReviews();
  }, []);

  function openModal(type, review) {
    setModal({ type, review });
    setFeedback('');
    setToast(null);
  }

  async function handleConfirm() {
    if ((modal.type === 'changes' || modal.type === 'reject') && !feedback.trim()) {
      setToast({
        type: 'error',
        message: modal.type === 'changes'
          ? 'Agrega feedback para solicitar cambios.'
          : 'Agrega un motivo para rechazar.',
      });
      return;
    }

    setProcessing(true);
    const review = modal.review;
    const actions = {
      approve: () => approveReview(review.id, feedback),
      reject: () => rejectReview(review.id, feedback),
      changes: () => requestChanges(review.id, feedback),
      publish: () => publishVersion(review.legend_versions?.id),
    };
    const result = await actions[modal.type]();
    setProcessing(false);

    if (result.error) {
      logAdminReviewError(modal.type, review, result.error.supabaseError || result.error);
      setToast({ type: 'error', message: result.error.message });
      return;
    }

    setToast({ type: 'success', message: 'Operacion completada correctamente.' });
    setModal(null);
    loadReviews();
  }

  return (
    <section className="admin-page">
      <AdminSectionHeader eyebrow="Revision manual" title="Revisiones de contenido" description="Aprueba, rechaza, solicita cambios o publica versiones revisadas." />
      <AdminToast type={toast?.type} message={toast?.message} />
      {error && <p className="admin-error">{error.message}</p>}
      <AdminDataTable
        loading={loading}
        rows={reviews}
        emptyTitle="No hay leyendas en revision"
        emptyMessage="Las versiones enviadas por autores apareceran aqui."
        columns={[
          { key: 'legend', header: 'Leyenda', render: (row) => getReviewLegend(row)?.title || 'Sin titulo' },
          { key: 'author', header: 'Autor', render: (row) => getReviewLegend(row)?.creator_profiles?.pen_name || 'Sin autor' },
          { key: 'version', header: 'Version', render: (row) => row.legend_versions?.version_number || '-' },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status || 'pending'} context="content_review" /> },
          { key: 'version_status', header: 'Version', render: (row) => <AdminStatusBadge status={row.legend_versions?.status || 'submitted'} context="legend_version" /> },
          { key: 'feedback', header: 'Feedback', render: (row) => row.feedback || 'Sin feedback' },
          { key: 'created_at', header: 'Enviada', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Sin fecha' },
          {
            key: 'actions',
            header: 'Acciones',
            render: (row) => {
              const actions = getAllowedActions(row);
              if (!actions.length) return <span className="admin-muted">Sin acciones disponibles</span>;
              return (
                <div className="admin-row-actions">
                  {actions.includes('approve') && <Button onClick={() => openModal('approve', row)}>Aprobar</Button>}
                  {actions.includes('changes') && <Button variant="ghost" onClick={() => openModal('changes', row)}>Cambios</Button>}
                  {actions.includes('reject') && <Button variant="ghost" onClick={() => openModal('reject', row)}>Rechazar</Button>}
                  {actions.includes('publish') && <Button variant="ghost" onClick={() => openModal('publish', row)}>Publicar</Button>}
                </div>
              );
            },
          },
        ]}
      />

      <AdminConfirmModal
        open={Boolean(modal)}
        title={{
          approve: 'Aprobar revision',
          reject: 'Rechazar revision',
          changes: 'Solicitar cambios',
          publish: 'Publicar version',
        }[modal?.type]}
        description={modal?.type === 'publish' ? 'Publicara la version aprobada usando la RPC existente.' : 'Agrega feedback para el autor.'}
        confirmLabel={{
          approve: 'Aprobar',
          reject: 'Rechazar',
          changes: 'Solicitar cambios',
          publish: 'Publicar',
        }[modal?.type]}
        onCancel={() => setModal(null)}
        onConfirm={handleConfirm}
        loading={processing}
        confirmDisabled={(modal?.type === 'changes' || modal?.type === 'reject') && !feedback.trim()}
      >
        {modal?.type !== 'publish' && (
          <label className="field" htmlFor="review-feedback">
            <span>Feedback</span>
            <textarea
              id="review-feedback"
              className="textarea admin-feedback-textarea"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              rows={5}
              placeholder="Escribe el comentario que vera el autor..."
            />
          </label>
        )}
      </AdminConfirmModal>
    </section>
  );
}

export default AdminReviewsPage;
