import React, { useEffect, useState } from 'react';
import {
  AdminConfirmModal,
  AdminDataTable,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminToast,
} from '../../components/ui/AdminPrimitives.jsx';
import Button from '../../components/ui/Button.jsx';
import { createCodeBatch, getCodeRequests, getPhysicalEditions, reviewCodeRequest } from '../../services/adminCodeService.js';

function AdminCodeRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectFeedback, setRejectFeedback] = useState('');
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
    // La edicion debe pertenecer a la leyenda de la entrega (evita emitir codigos que
    // desbloquean otra leyenda).
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
    setToast({ type: 'success', message: 'Lote adicional generado correctamente.' });
    setModal(null);
    loadData();
  }

  // Acuse informativo (no bloquea): "Recibido" = codigos recibidos y legibles.
  async function handleAcknowledge(request) {
    setProcessing(true);
    const result = await reviewCodeRequest(request.id, 'approved');
    setProcessing(false);
    if (result.error) {
      setToast({ type: 'error', message: result.error.message });
      return;
    }
    setToast({ type: 'success', message: 'Marcado como recibido.' });
    loadData();
  }

  // "Reportar problema" = algo anda mal con los codigos (el autor vera el motivo).
  async function handleReport() {
    if (!rejectFeedback.trim()) {
      setToast({ type: 'error', message: 'Describe el problema.' });
      return;
    }
    setProcessing(true);
    const result = await reviewCodeRequest(rejectModal.id, 'rejected', rejectFeedback.trim());
    setProcessing(false);
    if (result.error) {
      setToast({ type: 'error', message: result.error.message });
      return;
    }
    setToast({ type: 'success', message: 'Problema reportado al autor.' });
    setRejectModal(null);
    setRejectFeedback('');
    loadData();
  }

  function openReportModal(request) {
    setRejectModal(request);
    setRejectFeedback('');
  }

  const modalEditions = modal
    ? editions.filter((edition) => edition.legend_id === modal.legend_id)
    : [];

  return (
    <section className="admin-page">
      <AdminSectionHeader
        eyebrow="Codigos fisicos"
        title="Entregas de codigos"
        description="Los autores generan sus codigos; aqui recibes una copia. Puedes acusar recibido, reportar un problema o generar mas."
      />
      <AdminToast type={toast?.type} message={toast?.message} />
      {error && <p className="admin-error">{error.message}</p>}
      <AdminDataTable
        loading={loading}
        rows={requests}
        emptyTitle="No hay entregas de codigos"
        emptyMessage="Cuando un autor genere codigos, la copia aparecera aqui."
        columns={[
          { key: 'author', header: 'Autor', render: (row) => row.creator_profiles?.pen_name || 'Sin autor' },
          { key: 'legend', header: 'Leyenda', render: (row) => row.legends?.title || 'Sin leyenda' },
          { key: 'edition', header: 'Edicion', render: (row) => row.physical_editions?.edition_name || row.edition_id || 'Sin edicion' },
          { key: 'quantity_requested', header: 'Cantidad' },
          { key: 'status', header: 'Estado', render: (row) => (
            <div className="admin-stack-xs">
              <AdminStatusBadge status={row.status || 'generated'} context="code" />
              {row.status === 'rejected' && row.admin_feedback && (
                <small className="admin-muted">Problema: {row.admin_feedback}</small>
              )}
            </div>
          ) },
          { key: 'created_at', header: 'Fecha', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Sin fecha' },
          { key: 'actions', header: 'Acciones', render: (row) => {
            const status = row.status || 'generated';
            return (
              <div className="admin-actions-row">
                {status !== 'approved' && (
                  <Button variant="ghost" onClick={() => handleAcknowledge(row)} disabled={processing}>Recibido</Button>
                )}
                {status !== 'rejected' && (
                  <Button variant="danger" onClick={() => openReportModal(row)} disabled={processing}>Reportar problema</Button>
                )}
                <Button onClick={() => openGenerateModal(row)} disabled={processing}>Generar mas</Button>
              </div>
            );
          } },
        ]}
      />

      <AdminConfirmModal
        open={Boolean(modal)}
        title="Generar mas codigos"
        description={modal ? `Leyenda: ${modal.legends?.title || 'Sin leyenda'} · los codigos desbloquearan esta leyenda.` : ''}
        confirmLabel="Generar"
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
        title="Reportar problema"
        description={rejectModal ? `Entrega de "${rejectModal.legends?.title || 'leyenda'}". El autor vera este mensaje.` : ''}
        confirmLabel="Reportar"
        onCancel={() => { setRejectModal(null); setRejectFeedback(''); }}
        onConfirm={handleReport}
        loading={processing}
        confirmDisabled={!rejectFeedback.trim()}
      >
        <label className="field">
          <span>Que problema tiene?</span>
          <textarea
            className="textarea"
            rows={4}
            value={rejectFeedback}
            onChange={(event) => setRejectFeedback(event.target.value)}
            placeholder="Ej. los codigos no se ven bien / el prefijo esta mal / reenvia el lote."
          />
        </label>
      </AdminConfirmModal>
    </section>
  );
}

export default AdminCodeRequestsPage;
