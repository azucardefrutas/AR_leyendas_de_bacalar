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
  getCreatorApplications,
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

function getEmail(row) {
  return row?.email || 'No disponible';
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
    application?.authorship_declaration_accepted_at ||
    application?.terms_version ||
    application?.privacy_version ||
    String(application?.reason || '').includes('Declaraciones:'),
  );
}

function getApplicationSummary(applications = []) {
  return applications.reduce((summary, application) => {
    const status = application.status || 'pending';
    summary.total += 1;
    summary[status] = (summary[status] || 0) + 1;
    return summary;
  }, { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0, canceled: 0 });
}

function getEmptyTitle(status) {
  if (status === 'approved') return 'No hay creadores activados';
  if (status === 'rejected') return 'No hay registros rechazados';
  return 'No hay registros editoriales por monitorear';
}

function AdminCreatorApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0, canceled: 0 });
  const [filters, setFilters] = useState({ status: 'all', search: '' });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  async function loadApplications(nextFilters = filters) {
    setLoading(true);
    const { data, error: applicationsError } = await getCreatorApplications(nextFilters);
    const { data: allApplications } = nextFilters.status === 'all' && !nextFilters.search
      ? { data }
      : await getCreatorApplications({ status: 'all', search: '' });
    setApplications(data ?? []);
    setSummary(getApplicationSummary(allApplications ?? data ?? []));
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
    setModal({ type, application });
    setToast(null);
  }

  function closeModal() {
    setModal(null);
  }

  return (
    <section className="admin-page">
      <AdminSectionHeader
        eyebrow="Autores"
        title="Registro y monitoreo de creadores"
        description="Consulta perfiles de usuarios que completaron el alta editorial como creadores. Las obras siguen pasando por revision antes de publicarse."
      />
      <AdminToast type={toast?.type} message={toast?.message} />
      {error && <p className="admin-error">{error.message}</p>}

      <div className="admin-application-summary">
        {[
          ['Total', summary.total, 'Solicitudes recibidas'],
          ['Pendientes', summary.pending, 'Pendientes de confirmacion por correo'],
          ['Activos', summary.approved, 'Con acceso creador'],
          ['Observados', summary.rejected, 'Rechazados u observados'],
          ['Cancelados', summary.cancelled + summary.canceled, 'Procesos cancelados'],
        ].map(([label, value, description]) => (
          <article key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
            <small>{description}</small>
          </article>
        ))}
      </div>

      <div className="admin-filters">
        <input
          type="search"
          placeholder="Buscar creador, motivo o enlace..."
          value={filters.search}
          onChange={(event) => updateFilter('search', event.target.value)}
        />
        <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
          <option value="all">Todas</option>
          <option value="pending">Pendientes</option>
          <option value="approved">Creadores activos</option>
          <option value="rejected">Rechazados / observados</option>
          <option value="cancelled">Cancelados</option>
        </select>
      </div>

      <AdminDataTable
        loading={loading}
        rows={applications}
        emptyTitle={getEmptyTitle(filters.status)}
        emptyMessage="Cuando un usuario complete el alta editorial aparecera aqui."
        columns={[
          {
            key: 'user',
            header: 'Solicitante',
            render: (row) => getApplicantName(row),
          },
          { key: 'email', header: 'Correo', render: (row) => getEmail(row) },
          { key: 'pen_name', header: 'Seudonimo', render: (row) => getDisplayValue(getDetails(row).penName) },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status} context="creator_application" /> },
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
        title="Inspeccionar perfil de creador"
        description="Revisa el alta editorial, aceptaciones legales y estado del creador."
        confirmLabel="Cerrar"
        showCancel={false}
        onCancel={closeModal}
        onConfirm={closeModal}
        loading={false}
        confirmDisabled={false}
        modalClassName="admin-modal-wide"
      >
        {modal?.type === 'inspect' && (
          <div className="admin-creator-review">
            <div className="admin-creator-review-summary">
              <div>
                <p>Registro editorial</p>
                <h3>{getApplicantName(modal.application)}</h3>
                <span>{getDisplayValue(getDetails(modal.application).penName)}</span>
              </div>
              <AdminStatusBadge status={modal.application.status} context="creator_application" />
            </div>

            <section className="admin-review-section">
              <h3>Datos de cuenta</h3>
              <div className="admin-inspection-grid">
                {[
                  ['Usuario relacionado', getApplicantName(modal.application)],
                  ['Correo', getEmail(modal.application)],
                  [
                    'Correo verificado',
                    getProfile(modal.application).email_confirmed_at || getProfile(modal.application).confirmed_at
                      ? 'Verificado'
                      : 'No disponible',
                  ],
                  ['ID de usuario', shortId(modal.application.user_id)],
                  ['Fecha de registro', formatDate(modal.application.onboarding_completed_at || modal.application.created_at)],
                  ['Estado actual', modal.application.status],
                ].map(([label, value]) => (
                  <div key={label}>
                    <strong>{label}</strong>
                    <p>{getDisplayValue(value)}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="admin-review-section">
              <h3>Datos editoriales</h3>
              <div className="admin-inspection-grid">
                {[
                  ['Seudonimo', getDetails(modal.application).penName],
                  ['Institucion o afiliacion', getDetails(modal.application).affiliation],
                  ['Ciudad', getDetails(modal.application).city],
                  ['Estado', getDetails(modal.application).stateRegion],
                  ['Pais', getDetails(modal.application).country],
                  ['Biografia', getDetails(modal.application).biography],
                  ['Motivo para ser creador', getDetails(modal.application).motivation],
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
                    ? 'El formulario editorial incluye declaracion de veracidad, autoria/derechos y aceptacion de terminos y privacidad para creadores.'
                    : 'Aceptaciones legales: pendiente de integracion completa.'}
                </p>
                {hasCreatorLegalAcceptance(modal.application) && (
                  <p>
                    Terminos: {modal.application.terms_version || 'No disponible'} · Privacidad: {modal.application.privacy_version || 'No disponible'}
                  </p>
                )}
              </div>
            </section>

            <section className="admin-review-section">
              <h3>Monitoreo administrativo</h3>
              <p className="admin-muted">
                El alta como creador se gestiona con correo verificado, formulario editorial y activacion segura.
                Las obras siguen pasando por revision administrativa antes de publicarse.
              </p>
              <div className="admin-review-choice">
                <a className="admin-link-button" href="/admin/legends">Ver obras del creador</a>
                <Button variant="ghost" disabled title="Pendiente de RPC segura para suspension de creadores">Suspender creador</Button>
              </div>
              {(modal.application.admin_feedback || modal.application.feedback) && (
                <div className="admin-legal-note">
                  <strong>Notas administrativas</strong>
                  <p>{modal.application.admin_feedback || modal.application.feedback}</p>
                </div>
              )}
            </section>
          </div>
        )}
      </AdminConfirmModal>
    </section>
  );
}

export default AdminCreatorApplicationsPage;
