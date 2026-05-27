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
  approveCreatorApplication,
  getCreatorApplications,
  rejectCreatorApplication,
} from '../../services/adminCreatorService.js';

function AdminCreatorApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ penName: '', feedback: '' });
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  async function loadApplications() {
    setLoading(true);
    const { data, error: applicationsError } = await getCreatorApplications();
    setApplications(data ?? []);
    setError(applicationsError);
    setLoading(false);
  }

  useEffect(() => {
    loadApplications();
  }, []);

  function openModal(type, application) {
    setModal({ type, application });
    setForm({ penName: application.users_profile?.username || '', feedback: '' });
  }

  async function handleConfirm() {
    setProcessing(true);
    const result = modal.type === 'approve'
      ? await approveCreatorApplication(modal.application.id, form.penName, form.feedback)
      : await rejectCreatorApplication(modal.application.id, form.feedback);
    setProcessing(false);

    if (result.error) {
      setToast({ type: 'error', message: result.error.message });
      return;
    }

    setToast({ type: modal.type === 'approve' ? 'success' : 'warning', message: 'Operacion completada correctamente.' });
    setModal(null);
    loadApplications();
  }

  return (
    <section className="admin-page">
      <AdminSectionHeader eyebrow="Autores" title="Solicitudes de autor" description="Aprueba o rechaza solicitudes usando las funciones RPC existentes." />
      <AdminToast type={toast?.type} message={toast?.message} />
      {error && <p className="admin-error">{error.message}</p>}
      <AdminDataTable
        loading={loading}
        rows={applications}
        emptyTitle="No hay solicitudes pendientes"
        emptyMessage="Las solicitudes de creador apareceran aqui."
        columns={[
          { key: 'user', header: 'Usuario', render: (row) => row.users_profile?.full_name || row.users_profile?.username || row.user_id },
          { key: 'reason', header: 'Motivo' },
          { key: 'portfolio_url', header: 'Portfolio', render: (row) => row.portfolio_url ? <a href={row.portfolio_url} target="_blank" rel="noreferrer">Abrir</a> : 'Sin enlace' },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status} /> },
          { key: 'created_at', header: 'Fecha', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Sin fecha' },
          {
            key: 'actions',
            header: 'Acciones',
            render: (row) => row.status === 'pending' ? (
              <div className="admin-row-actions">
                <Button onClick={() => openModal('approve', row)}>Aprobar</Button>
                <Button variant="ghost" onClick={() => openModal('reject', row)}>Rechazar</Button>
              </div>
            ) : 'Sin acciones',
          },
        ]}
      />

      <AdminConfirmModal
        open={Boolean(modal)}
        title={modal?.type === 'approve' ? 'Aprobar creador' : 'Rechazar solicitud'}
        description={modal?.type === 'approve' ? 'Se creara el perfil de creador usando la RPC existente.' : 'Indica el motivo para que el usuario pueda corregir su solicitud.'}
        confirmLabel={modal?.type === 'approve' ? 'Aprobar' : 'Rechazar'}
        onCancel={() => setModal(null)}
        onConfirm={handleConfirm}
        loading={processing}
      >
        {modal?.type === 'approve' && (
          <label className="field" htmlFor="admin-pen-name">
            <span>Nombre de autor</span>
            <input id="admin-pen-name" className="standalone-input" value={form.penName} onChange={(event) => setForm((current) => ({ ...current, penName: event.target.value }))} />
          </label>
        )}
        <label className="field" htmlFor="admin-feedback">
          <span>Feedback</span>
          <textarea id="admin-feedback" className="textarea" value={form.feedback} onChange={(event) => setForm((current) => ({ ...current, feedback: event.target.value }))} rows={4} />
        </label>
      </AdminConfirmModal>
    </section>
  );
}

export default AdminCreatorApplicationsPage;
