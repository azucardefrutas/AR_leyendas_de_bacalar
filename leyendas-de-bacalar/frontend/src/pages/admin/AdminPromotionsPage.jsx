import React, { useEffect, useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import {
  AdminConfirmModal,
  AdminDataTable,
  AdminSectionHeader,
  AdminToast,
} from '../../components/ui/AdminPrimitives.jsx';
import { getUsers } from '../../services/adminUserService.js';
import {
  getAdminLegendsForGrant,
  getLegendGrants,
  grantLegendAccess,
  revokeLegendGrant,
} from '../../services/adminPromotionService.js';

// users_profile no tiene email (CLAUDE.md §17): identificamos por nombre / usuario.
const userLabel = (user) => user?.full_name || user?.username || 'Usuario sin nombre';
const STATUS_LABEL = { active: 'Activa', expired: 'Vencida', revoked: 'Revocada' };
const EMPTY_FORM = { userId: '', legendId: '', expiresAt: '' };

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('es-MX') : 'Permanente');

function AdminPromotionsPage() {
  const [users, setUsers] = useState([]);
  const [legends, setLegends] = useState([]);
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  async function reloadGrants() {
    const { data } = await getLegendGrants();
    setGrants(data ?? []);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      const [usersResult, legendsResult, grantsResult] = await Promise.all([
        getUsers(),
        getAdminLegendsForGrant(),
        getLegendGrants(),
      ]);
      if (!active) return;
      setUsers(usersResult.data ?? []);
      setLegends(legendsResult.data ?? []);
      setGrants(grantsResult.data ?? []);
      if (grantsResult.error) {
        setError('No se pudieron cargar las promociones. Si acabas de actualizar el servidor, espera un momento y recarga.');
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  function openModal() {
    setForm(EMPTY_FORM);
    setError(null);
    setNotice(null);
    setModalOpen(true);
  }

  async function handleGrant() {
    setError(null);
    setNotice(null);
    if (!form.userId || !form.legendId) { setError('Elige el usuario y la leyenda.'); return; }

    setSaving(true);
    const { error: grantError } = await grantLegendAccess({
      userId: form.userId,
      legendId: form.legendId,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    });
    setSaving(false);

    if (grantError) { setError(grantError.message || 'No se pudo otorgar el acceso.'); return; }
    setModalOpen(false);
    setForm(EMPTY_FORM);
    setNotice('Acceso otorgado. El lector ya puede abrir la leyenda.');
    await reloadGrants();
  }

  async function handleRevoke(accessId) {
    setError(null);
    setNotice(null);
    const { error: revokeError } = await revokeLegendGrant(accessId);
    if (revokeError) { setError(revokeError.message || 'No se pudo revocar la promocion.'); return; }
    setNotice('Promocion revocada. El lector pierde el acceso de cortesia.');
    await reloadGrants();
  }

  const activeCount = grants.filter((grant) => grant.status === 'active').length;

  return (
    <section className="admin-page">
      <AdminSectionHeader
        eyebrow="Accesos"
        title="Promociones"
        description={`Cortesias de acceso a leyendas. ${activeCount} activa${activeCount === 1 ? '' : 's'} de ${grants.length} otorgada${grants.length === 1 ? '' : 's'}.`}
        action={<Button onClick={openModal}>Otorgar acceso</Button>}
      />

      <AdminToast
        type="info"
        message={'Una promocion abre una leyenda para un lector sin que pague ni canjee codigo — util para prensa, escuelas, jurados o cortesias. Puedes darla permanente o con vencimiento, y revocarla cuando quieras. Revocar solo afecta cortesias: nunca toca una compra ni un codigo ya canjeado.'}
      />

      {error && <p className="admin-error">{error}</p>}
      <AdminToast type="success" message={notice} />

      <AdminDataTable
        loading={loading}
        rows={grants}
        emptyTitle="Sin promociones"
        emptyMessage="Aun no has regalado ningun acceso. Usa el boton 'Otorgar acceso' para dar una cortesia."
        columns={[
          { key: 'user', header: 'Lector', render: (row) => userLabel(row.user) },
          { key: 'legend', header: 'Leyenda', render: (row) => row.legend?.title || '—' },
          { key: 'status', header: 'Estado', render: (row) => STATUS_LABEL[row.status] || row.status },
          { key: 'expires', header: 'Vence', render: (row) => formatDate(row.expires_at) },
          { key: 'created', header: 'Otorgada', render: (row) => formatDate(row.created_at) },
          {
            key: 'actions',
            header: 'Accion',
            render: (row) => (row.status === 'active'
              ? <button type="button" className="admin-link-button" onClick={() => handleRevoke(row.id)}>Revocar</button>
              : <span className="admin-muted">—</span>),
          },
        ]}
      />

      <AdminConfirmModal
        open={modalOpen}
        title="Otorgar acceso"
        description="El lector podra abrir la leyenda de inmediato, sin pagar ni canjear codigo."
        confirmLabel="Otorgar"
        onCancel={() => setModalOpen(false)}
        onConfirm={handleGrant}
        loading={saving}
        confirmDisabled={!form.userId || !form.legendId}
      >
        <label className="field">
          <span>Lector</span>
          <select
            className="select"
            value={form.userId}
            onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))}
          >
            <option value="">— Elige un lector —</option>
            {users.map((user) => <option key={user.id} value={user.id}>{userLabel(user)}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Leyenda</span>
          <select
            className="select"
            value={form.legendId}
            onChange={(event) => setForm((current) => ({ ...current, legendId: event.target.value }))}
          >
            <option value="">— Elige una leyenda —</option>
            {legends.map((legend) => <option key={legend.id} value={legend.id}>{legend.title}</option>)}
          </select>
        </label>

        <label className="field">
          <span>Vence (opcional)</span>
          <input
            className="standalone-input"
            type="date"
            value={form.expiresAt}
            onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
          />
          <small className="admin-muted">Dejalo vacio para un acceso permanente.</small>
        </label>

        {error && <p className="admin-error">{error}</p>}
      </AdminConfirmModal>
    </section>
  );
}

export default AdminPromotionsPage;
