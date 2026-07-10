import React, { useEffect, useState } from 'react';
import {
  AdminConfirmModal,
  AdminDataTable,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminToast,
} from '../../components/ui/AdminPrimitives.jsx';
import Button from '../../components/ui/Button.jsx';
import { createCodeBatch, getCodeRequests, getPhysicalEditions, reviewCodeRequest, setEditionQuota } from '../../services/adminCodeService.js';

function AdminCodeRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [quotaModal, setQuotaModal] = useState(null);
  const [quotaValue, setQuotaValue] = useState(0);
  const [form, setForm] = useState({ editionId: '', quantity: 25, prefix: '', notes: '' });
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  async function loadData() {
    setLoading(true);
    const [requestsResult, editionsResult] = await Promise.all([getCodeRequests(), getPhysicalEditions()]);
    setRequests(requestsResult.data ?? []);
    setEditions(editionsResult.data ?? []);
    setError(requestsResult.error || editionsResult.error);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openGenerateModal(request) {
    setModal(request);
    // La edicion debe pertenecer a la leyenda de la solicitud (evita emitir
    // codigos que desbloquean otra leyenda).
    const legendEditions = editions.filter((edition) => edition.legend_id === request.legend_id);
    setForm({
      editionId: request.edition_id || legendEditions[0]?.id || '',
      quantity: request.quantity_requested || 25,
      prefix: '',
      notes: '',
    });
  }

  async function handleGenerate() {
    setProcessing(true);
    const result = await createCodeBatch({ ...form, codeRequestId: modal?.id });
    setProcessing(false);

    if (result.error) {
      setToast({ type: 'error', message: result.error.message });
      return;
    }

    setToast({ type: 'success', message: 'Lote generado correctamente.' });
    setModal(null);
    loadData();
  }

  async function handleApprove(request) {
    setProcessing(true);
    const result = await reviewCodeRequest(request.id, 'approved');
    setProcessing(false);
    if (result.error) {
      setToast({ type: 'error', message: result.error.message });
      return;
    }
    setToast({ type: 'success', message: 'Solicitud aprobada. Ya puedes generar el lote.' });
    loadData();
  }

  async function handleReject() {
    if (!rejectFeedback.trim()) {
      setToast({ type: 'error', message: 'Escribe un motivo para el rechazo.' });
      return;
    }
    setProcessing(true);
    const result = await reviewCodeRequest(rejectModal.id, 'rejected', rejectFeedback.trim());
    setProcessing(false);
    if (result.error) {
      setToast({ type: 'error', message: result.error.message });
      return;
    }
    setToast({ type: 'success', message: 'Solicitud rechazada.' });
    setRejectModal(null);
    setRejectFeedback('');
    loadData();
  }

  function openRejectModal(request) {
    setRejectModal(request);
    setRejectFeedback('');
  }

  function openQuotaModal(request) {
    setQuotaModal(request);
    setQuotaValue(request.physical_editions?.code_quota ?? 0);
  }

  async function handleSetQuota() {
    const editionId = quotaModal?.physical_editions?.id || quotaModal?.edition_id;
    if (!editionId) {
      setToast({ type: 'error', message: 'Esta solicitud no tiene edicion asociada.' });
      return;
    }
    setProcessing(true);
    const result = await setEditionQuota(editionId, quotaValue);
    setProcessing(false);
    if (result.error) {
      setToast({ type: 'error', message: result.error.message });
      return;
    }
    setToast({ type: 'success', message: `Cupo del autor actualizado a ${result.data?.code_quota ?? quotaValue}.` });
    setQuotaModal(null);
    loadData();
  }

  const modalEditions = modal
    ? editions.filter((edition) => edition.legend_id === modal.legend_id)
    : [];

  return (
    <section className="admin-page">
      <AdminSectionHeader eyebrow="Codigos fisicos" title="Solicitudes de codigos" description="Los autores solicitan codigos; el admin genera los lotes." />
      <AdminToast type={toast?.type} message={toast?.message} />
      {error && <p className="admin-error">{error.message}</p>}
      <AdminDataTable
        loading={loading}
        rows={requests}
        emptyTitle="No hay solicitudes de codigos"
        emptyMessage="Las solicitudes de autores apareceran aqui."
        columns={[
          { key: 'author', header: 'Autor', render: (row) => row.creator_profiles?.pen_name || 'Sin autor' },
          { key: 'legend', header: 'Leyenda', render: (row) => row.legends?.title || 'Sin leyenda' },
          { key: 'edition', header: 'Edicion', render: (row) => row.physical_editions?.edition_name || row.edition_id || 'Sin edicion' },
          { key: 'quota', header: 'Cupo autor', render: (row) => row.physical_editions?.code_quota ?? 0 },
          { key: 'quantity_requested', header: 'Cantidad' },
          { key: 'reason', header: 'Motivo' },
          { key: 'status', header: 'Estado', render: (row) => (
            <div className="admin-stack-xs">
              <AdminStatusBadge status={row.status || 'pending'} context="code" />
              {row.status === 'rejected' && row.admin_feedback && (
                <small className="admin-muted">Motivo: {row.admin_feedback}</small>
              )}
            </div>
          ) },
          { key: 'created_at', header: 'Fecha', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Sin fecha' },
          { key: 'actions', header: 'Acciones', render: (row) => {
            const status = row.status || 'pending';
            if (status === 'generated') return <span className="admin-muted">Codigos generados</span>;
            if (status === 'rejected') return <span className="admin-muted">Rechazada</span>;
            if (status === 'cancelled') return <span className="admin-muted">Cancelada</span>;
            return (
              <div className="admin-actions-row">
                {status === 'pending' && (
                  <Button variant="ghost" onClick={() => handleApprove(row)} disabled={processing}>Aprobar</Button>
                )}
                <Button onClick={() => openGenerateModal(row)} disabled={processing}>Generar lote</Button>
                <Button variant="ghost" onClick={() => openQuotaModal(row)} disabled={processing}>Cupo</Button>
                <Button variant="danger" onClick={() => openRejectModal(row)} disabled={processing}>Rechazar</Button>
              </div>
            );
          } },
        ]}
      />

      <AdminConfirmModal
        open={Boolean(modal)}
        title="Generar lote de codigos"
        description={modal ? `Leyenda: ${modal.legends?.title || 'Sin leyenda'} · los codigos desbloquearan esta leyenda.` : 'Se usara la funcion RPC create_code_batch.'}
        confirmLabel="Generar lote"
        onCancel={() => setModal(null)}
        onConfirm={handleGenerate}
        loading={processing}
        confirmDisabled={!form.editionId}
      >
        <label className="field">
          <span>Edicion fisica (de esta leyenda)</span>
          <select className="select" value={form.editionId} onChange={(event) => setForm((current) => ({ ...current, editionId: event.target.value }))}>
            {modalEditions.length === 0 && <option value="">Sin ediciones para esta leyenda</option>}
            {modalEditions.map((edition) => (
              <option key={edition.id} value={edition.id}>
                {edition.edition_name || edition.legends?.title || edition.id}
              </option>
            ))}
          </select>
          {modalEditions.length === 0 && (
            <small className="admin-muted">
              Esta leyenda no tiene edicion fisica. El autor debe volver a solicitar codigos
              (se crea automaticamente) o crea la edicion antes de generar.
            </small>
          )}
        </label>
        <label className="field">
          <span>Cantidad</span>
          <input className="standalone-input" type="number" min="1" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} />
        </label>
        <label className="field">
          <span>Prefijo</span>
          <input className="standalone-input" value={form.prefix} onChange={(event) => setForm((current) => ({ ...current, prefix: event.target.value }))} />
        </label>
        <label className="field">
          <span>Notas</span>
          <textarea className="textarea" rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </label>
      </AdminConfirmModal>

      <AdminConfirmModal
        open={Boolean(rejectModal)}
        title="Rechazar solicitud"
        description={rejectModal ? `Solicitud de "${rejectModal.legends?.title || 'leyenda'}". El autor vera este motivo.` : ''}
        confirmLabel="Rechazar solicitud"
        onCancel={() => { setRejectModal(null); setRejectFeedback(''); }}
        onConfirm={handleReject}
        loading={processing}
        confirmDisabled={!rejectFeedback.trim()}
      >
        <label className="field">
          <span>Motivo del rechazo</span>
          <textarea
            className="textarea"
            rows={4}
            value={rejectFeedback}
            onChange={(event) => setRejectFeedback(event.target.value)}
            placeholder="Explica por que se rechaza (el autor lo vera)."
          />
        </label>
      </AdminConfirmModal>

      <AdminConfirmModal
        open={Boolean(quotaModal)}
        title="Cupo self-service del autor"
        description={quotaModal ? `Leyenda "${quotaModal.legends?.title || 'leyenda'}": cuantos codigos puede generar el autor por su cuenta (sin aprobacion). 0 = siempre requiere aprobacion.` : ''}
        confirmLabel="Guardar cupo"
        onCancel={() => setQuotaModal(null)}
        onConfirm={handleSetQuota}
        loading={processing}
      >
        <label className="field">
          <span>Cupo de codigos (por edicion)</span>
          <input
            className="standalone-input"
            type="number"
            min="0"
            value={quotaValue}
            onChange={(event) => setQuotaValue(event.target.value)}
          />
        </label>
      </AdminConfirmModal>
    </section>
  );
}

export default AdminCodeRequestsPage;
