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

function shortId(value) {
  return value ? String(value).slice(0, 8) : '-';
}

function getProfile(row) {
  return row.users_profile || {};
}

function AdminCreatorApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [filters, setFilters] = useState({ status: 'all', search: '' });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ penName: '', feedback: '' });
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);

  async function loadApplications(nextFilters = filters) {
    setLoading(true);
    const { data, error: applicationsError } = await getCreatorApplications(nextFilters);
    setApplications(data ?? []);
    setError(applicationsError);
    setLoading(false);
  }

  useEffect(() => {
    loadApplications(filters);
  }, []);

  function updateFilter(field, value) {
    const nextFilters = { ...filters, [field]: value };
    setFilters(nextFilters);
    loadApplications(nextFilters);
  }

  function openModal(type, application) {
    const profile = getProfile(application);
    setModal({ type, application });
    setModalError(null);
    setToast(null);
    setForm({
      penName: profile.username || profile.full_name || '',
      feedback: '',
    });
  }

  function closeModal() {
    if (processing) return;
    setModal(null);
    setModalError(null);
    setForm({ penName: '', feedback: '' });
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setModalError(null);
  }

  async function handleConfirm() {
    if (!modal?.application?.id) {
      setModalError('No pudimos completar la accion. Falta la solicitud.');
      return;
    }

    if (modal.type === 'approve' && !form.penName.trim()) {
      setModalError('Escribe el nombre de autor para continuar.');
      return;
    }

    setProcessing(true);
    setModalError(null);

    try {
      const result = modal.type === 'approve'
        ? await approveCreatorApplication({
          applicationId: modal.application.id,
          penName: form.penName,
          feedback: form.feedback,
        })
        : await rejectCreatorApplication({
          applicationId: modal.application.id,
          feedback: form.feedback,
        });

      if (result.error) {
        setModalError(result.error.message);
        return;
      }

      setToast({
        type: modal.type === 'approve' ? 'success' : 'warning',
        message: modal.type === 'approve'
          ? 'Solicitud aprobada. El usuario ya puede acceder al panel de creador.'
          : 'Solicitud rechazada correctamente.',
      });
      setModal(null);
      setForm({ penName: '', feedback: '' });
      await loadApplications();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="admin-page">
      <AdminSectionHeader
        eyebrow="Autores"
        title="Solicitudes de autor"
        description="Revisa propuestas y activa el acceso al panel de creador usando las funciones RPC existentes."
      />
      <AdminToast type={toast?.type} message={toast?.message} />
      {error && <p className="admin-error">{error.message}</p>}

      <div className="admin-filters">
        <input
          type="search"
          placeholder="Buscar solicitante, motivo o enlace..."
          value={filters.search}
          onChange={(event) => updateFilter('search', event.target.value)}
        />
        <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
          <option value="all">Todas</option>
          <option value="pending">Pendientes</option>
          <option value="approved">Aprobadas</option>
          <option value="rejected">Rechazadas</option>
        </select>
      </div>

      <AdminDataTable
        loading={loading}
        rows={applications}
        emptyTitle="No hay solicitudes"
        emptyMessage="Las solicitudes de creador apareceran aqui."
        columns={[
          {
            key: 'user',
            header: 'Solicitante',
            render: (row) => getProfile(row).full_name || getProfile(row).username || shortId(row.user_id),
          },
          { key: 'username', header: 'Usuario', render: (row) => getProfile(row).username || shortId(row.user_id) },
          { key: 'email', header: 'Correo', render: (row) => getProfile(row).email || 'No disponible' },
          { key: 'reason', header: 'Motivo', render: (row) => row.reason || '-' },
          {
            key: 'portfolio_url',
            header: 'Portfolio',
            render: (row) => row.portfolio_url ? <a className="admin-link-button" href={row.portfolio_url} target="_blank" rel="noreferrer">Abrir</a> : 'Sin enlace',
          },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status} /> },
          { key: 'created_at', header: 'Fecha', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString('es-MX') : 'Sin fecha' },
          { key: 'feedback', header: 'Feedback', render: (row) => row.admin_feedback || row.feedback || '-' },
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
        description={modal?.type === 'approve'
          ? 'Al aprobar esta solicitud, el usuario recibira acceso al panel de autor.'
          : 'Indica el motivo para que el usuario pueda mejorar su propuesta.'}
        confirmLabel={modal?.type === 'approve' ? 'Confirmar aprobacion' : 'Confirmar rechazo'}
        onCancel={closeModal}
        onConfirm={handleConfirm}
        loading={processing}
        confirmDisabled={modal?.type === 'approve' && !form.penName.trim()}
      >
        {modal?.type === 'approve' && (
          <label className="field" htmlFor="admin-pen-name">
            <span>Nombre de autor / seudonimo</span>
            <input
              id="admin-pen-name"
              name="penName"
              className="standalone-input"
              value={form.penName}
              onChange={(event) => updateForm('penName', event.target.value)}
              required
            />
          </label>
        )}
        <label className="field" htmlFor="admin-feedback">
          <span>Comentarios del administrador</span>
          <textarea
            id="admin-feedback"
            name="feedback"
            className="textarea"
            value={form.feedback}
            onChange={(event) => updateForm('feedback', event.target.value)}
            rows={4}
          />
        </label>
        {modalError && <p className="admin-error">{modalError}</p>}
      </AdminConfirmModal>
    </section>
  );
}

export default AdminCreatorApplicationsPage;
