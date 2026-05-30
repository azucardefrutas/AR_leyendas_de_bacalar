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
  return value ? String(value).slice(0, 8) : 'No disponible';
}

function getProfile(row) {
  return row?.users_profile || {};
}

function getDetails(row) {
  return row?.application_details || {};
}

function getDisplayValue(value) {
  return value && value !== 'No especificado' ? value : 'No disponible';
}

function getApplicantName(row) {
  const profile = getProfile(row);
  const details = getDetails(row);
  return profile.full_name || profile.username || details.legalFirstName || shortId(row?.user_id);
}

function formatDate(value) {
  return value
    ? new Date(value).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
    : 'No disponible';
}

function hasCreatorLegalAcceptance(application) {
  return Boolean(
    application?.creator_terms_accepted_at ||
    application?.creator_privacy_accepted_at ||
    application?.authorship_declared ||
    application?.creator_terms_version ||
    application?.creator_privacy_version ||
    String(application?.reason || '').includes('Declaraciones:'),
  );
}

function AdminCreatorApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [filters, setFilters] = useState({ status: 'all', search: '' });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [reviewAction, setReviewAction] = useState(null);
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

  function getDefaultPenName(application) {
    const profile = getProfile(application);
    const details = getDetails(application);
    return details.penName !== 'No especificado'
      ? details.penName || profile.username || profile.full_name || ''
      : profile.username || profile.full_name || '';
  }

  function openModal(type, application) {
    setModal({ type, application });
    setReviewAction(null);
    setModalError(null);
    setToast(null);
    setForm({
      penName: getDefaultPenName(application),
      feedback: '',
    });
  }

  function closeModal() {
    if (processing) return;
    setModal(null);
    setReviewAction(null);
    setModalError(null);
    setForm({ penName: '', feedback: '' });
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setModalError(null);
  }

  function startReviewAction(action) {
    setReviewAction(action);
    setModalError(null);
    setForm((current) => ({
      ...current,
      penName: current.penName || getDefaultPenName(modal?.application),
    }));
  }

  async function handleReviewAction(action = reviewAction) {
    if (!modal?.application?.id) {
      setModalError('No pudimos completar la accion. Falta la solicitud.');
      return;
    }

    if (modal.application.status === 'approved') {
      setModalError('Esta solicitud ya fue aprobada.');
      return;
    }

    if (action === 'approve' && !form.penName.trim()) {
      setModalError('Escribe el nombre de autor para continuar.');
      return;
    }

    setProcessing(true);
    setModalError(null);

    try {
      const result = action === 'approve'
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
        type: action === 'approve' ? 'success' : 'warning',
        message: action === 'approve'
          ? 'Solicitud aprobada. El usuario ya puede acceder al panel de creador.'
          : 'Solicitud rechazada.',
      });
      setModal(null);
      setReviewAction(null);
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
        title="Solicitudes de creador"
        description="Revisa los perfiles de usuarios que desean publicar leyendas y recursos culturales."
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
        emptyTitle="No hay solicitudes pendientes por revisar"
        emptyMessage="Cuando un usuario envie su solicitud editorial aparecera aqui."
        columns={[
          {
            key: 'user',
            header: 'Solicitante',
            render: (row) => getApplicantName(row),
          },
          { key: 'pen_name', header: 'Seudonimo', render: (row) => getDisplayValue(getDetails(row).penName) },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status} /> },
          { key: 'created_at', header: 'Fecha', render: (row) => formatDate(row.created_at) },
          { key: 'reason', header: 'Motivo breve', render: (row) => getDisplayValue(getDetails(row).motivation || row.reason) },
          {
            key: 'portfolio_url',
            header: 'Portafolio',
            render: (row) => row.portfolio_url
              ? <a className="admin-link-button" href={row.portfolio_url} target="_blank" rel="noreferrer">Abrir</a>
              : 'No disponible',
          },
          {
            key: 'actions',
            header: 'Acciones',
            render: (row) => <Button variant="ghost" onClick={() => openModal('inspect', row)}>Inspeccionar perfil</Button>,
          },
        ]}
      />

      <AdminConfirmModal
        open={Boolean(modal)}
        title="Inspeccionar perfil de solicitud"
        description="Nuevo usuario solicito convertirse en creador. Revisa sus datos antes de aprobar o rechazar."
        confirmLabel="Cerrar"
        showCancel={false}
        onCancel={closeModal}
        onConfirm={closeModal}
        loading={false}
        confirmDisabled={processing}
        modalClassName="admin-modal-wide"
      >
        {modal?.type === 'inspect' && (
          <div className="admin-creator-review">
            <div className="admin-creator-review-summary">
              <div>
                <p>Solicitud editorial</p>
                <h3>{getApplicantName(modal.application)}</h3>
                <span>{getDisplayValue(getDetails(modal.application).penName)}</span>
              </div>
              <AdminStatusBadge status={modal.application.status} />
            </div>

            <section className="admin-review-section">
              <h3>Datos de solicitud</h3>
              <div className="admin-inspection-grid">
                {[
                  ['Correo', getProfile(modal.application).email],
                  ['Seudonimo', getDetails(modal.application).penName],
                  ['Institucion o afiliacion', getDetails(modal.application).affiliation],
                  ['Ciudad', getDetails(modal.application).city],
                  ['Estado', getDetails(modal.application).stateRegion],
                  ['Pais', getDetails(modal.application).country],
                  ['Biografia', getDetails(modal.application).biography],
                  ['Motivo para ser creador', getDetails(modal.application).motivation],
                  ['Fecha de solicitud', formatDate(modal.application.created_at)],
                  ['Estado actual', modal.application.status],
                ].map(([label, value]) => (
                  <div key={label}>
                    <strong>{label}</strong>
                    <p>{getDisplayValue(value)}</p>
                  </div>
                ))}
                <div>
                  <strong>Portafolio</strong>
                  <p>
                    {modal.application?.portfolio_url
                      ? <a className="admin-link-button" href={modal.application.portfolio_url} target="_blank" rel="noreferrer">Abrir enlace</a>
                      : 'No disponible'}
                  </p>
                </div>
              </div>
            </section>

            <section className="admin-review-section">
              <h3>Declaraciones</h3>
              <div className="admin-legal-note">
                <strong>Aceptaciones legales</strong>
                <p>
                  {hasCreatorLegalAcceptance(modal.application)
                    ? 'El formulario de solicitud incluye declaracion de veracidad, autoria/derechos y aceptacion de terminos y privacidad para creadores.'
                    : 'Aceptaciones legales: pendiente de integracion completa.'}
                </p>
              </div>
            </section>

            {modal.application.status === 'pending' ? (
              <section className="admin-review-section">
                <h3>Decision administrativa</h3>
                <div className="admin-review-choice">
                  <Button onClick={() => startReviewAction('approve')} variant={reviewAction === 'approve' ? 'primary' : 'ghost'}>Aprobar</Button>
                  <Button onClick={() => startReviewAction('reject')} variant={reviewAction === 'reject' ? 'primary' : 'ghost'}>Rechazar</Button>
                </div>

                {reviewAction === 'approve' && (
                  <div className="admin-review-form">
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
                    <label className="field" htmlFor="admin-feedback-approve">
                      <span>Feedback opcional</span>
                      <textarea
                        id="admin-feedback-approve"
                        name="feedback"
                        className="textarea"
                        value={form.feedback}
                        onChange={(event) => updateForm('feedback', event.target.value)}
                        rows={4}
                      />
                    </label>
                    <Button onClick={() => handleReviewAction('approve')} disabled={processing || !form.penName.trim()}>
                      {processing ? 'Aprobando...' : 'Confirmar aprobacion'}
                    </Button>
                  </div>
                )}

                {reviewAction === 'reject' && (
                  <div className="admin-review-form">
                    <label className="field" htmlFor="admin-feedback-reject">
                      <span>Motivo o feedback recomendado</span>
                      <textarea
                        id="admin-feedback-reject"
                        name="feedback"
                        className="textarea"
                        value={form.feedback}
                        onChange={(event) => updateForm('feedback', event.target.value)}
                        rows={4}
                        placeholder="Explica brevemente por que se rechaza o que debe mejorar."
                      />
                    </label>
                    <Button onClick={() => handleReviewAction('reject')} disabled={processing} variant="ghost">
                      {processing ? 'Rechazando...' : 'Confirmar rechazo'}
                    </Button>
                  </div>
                )}
              </section>
            ) : (
              <section className="admin-review-section">
                <h3>Decision registrada</h3>
                <p className="admin-muted">Esta solicitud ya no esta pendiente. No hay acciones disponibles.</p>
                {(modal.application.admin_feedback || modal.application.feedback) && (
                  <div className="admin-legal-note">
                    <strong>Feedback administrativo</strong>
                    <p>{modal.application.admin_feedback || modal.application.feedback}</p>
                  </div>
                )}
              </section>
            )}

            {modalError && <p className="admin-error">{modalError}</p>}
          </div>
        )}
      </AdminConfirmModal>
    </section>
  );
}

export default AdminCreatorApplicationsPage;
