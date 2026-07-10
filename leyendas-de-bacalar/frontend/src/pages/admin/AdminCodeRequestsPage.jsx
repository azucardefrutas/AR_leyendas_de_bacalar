import React, { useEffect, useState } from 'react';
import {
  AdminConfirmModal,
  AdminDataTable,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminToast,
} from '../../components/ui/AdminPrimitives.jsx';
import Button from '../../components/ui/Button.jsx';
import { createCodeBatch, getCodeRequests, getPhysicalEditions } from '../../services/adminCodeService.js';

function AdminCodeRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
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
          { key: 'quantity_requested', header: 'Cantidad' },
          { key: 'reason', header: 'Motivo' },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status || 'pending'} context="code" /> },
          { key: 'created_at', header: 'Fecha', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Sin fecha' },
          { key: 'actions', header: 'Acciones', render: (row) => <Button onClick={() => openGenerateModal(row)}>Generar lote</Button> },
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
    </section>
  );
}

export default AdminCodeRequestsPage;
