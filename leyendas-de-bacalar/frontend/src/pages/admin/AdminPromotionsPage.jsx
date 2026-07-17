import React, { useEffect, useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import AppIcon from '../../components/ui/AppIcon.jsx';
import { getUsers } from '../../services/adminUserService.js';
import {
  getAdminLegendsForGrant,
  getLegendGrants,
  grantLegendAccess,
  revokeLegendGrant,
} from '../../services/adminPromotionService.js';

// users_profile no tiene email (ver CLAUDE.md §17): identificamos por nombre/usuario.
const userLabel = (user) => user?.full_name || user?.username || 'Usuario sin nombre';

const STATUS_LABEL = { active: 'Activa', expired: 'Vencida', revoked: 'Revocada' };

function AdminPromotionsPage() {
  const [users, setUsers] = useState([]);
  const [legends, setLegends] = useState([]);
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ userId: '', legendId: '', expiresAt: '' });
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

  async function handleGrant(event) {
    event.preventDefault();
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
    setForm({ userId: '', legendId: '', expiresAt: '' });
    setNotice('Acceso otorgado. El lector ya puede abrir la leyenda.');
    await reloadGrants();
  }

  async function handleRevoke(accessId) {
    setError(null);
    setNotice(null);
    const { error: revokeError } = await revokeLegendGrant(accessId);
    if (revokeError) { setError(revokeError.message || 'No se pudo revocar la promocion.'); return; }
    setNotice('Promoción revocada.');
    await reloadGrants();
  }

  if (loading) return <LoadingState message="Cargando promociones..." />;

  return (
    <section className="page-stack creator-panel">
      <header className="pm-head">
        <p className="creator-kicker">Admin · Accesos</p>
        <h1>Promociones</h1>
        <p className="state-message">
          Regala acceso a una leyenda <strong>sin compra ni código</strong> — para prensa, escuelas,
          jurados o cortesías. El lector la abre al instante. Puedes ponerle vencimiento o dejarla permanente.
        </p>
      </header>

      <Card>
        <h2>Otorgar acceso</h2>
        <form className="pm-form" onSubmit={handleGrant}>
          <label className="field" htmlFor="promo-user">
            <span>Usuario</span>
            <select
              id="promo-user"
              className="select"
              value={form.userId}
              onChange={(event) => setForm((prev) => ({ ...prev, userId: event.target.value }))}
            >
              <option value="">— Elige un usuario —</option>
              {users.map((user) => <option key={user.id} value={user.id}>{userLabel(user)}</option>)}
            </select>
          </label>

          <label className="field" htmlFor="promo-legend">
            <span>Leyenda</span>
            <select
              id="promo-legend"
              className="select"
              value={form.legendId}
              onChange={(event) => setForm((prev) => ({ ...prev, legendId: event.target.value }))}
            >
              <option value="">— Elige una leyenda —</option>
              {legends.map((legend) => <option key={legend.id} value={legend.id}>{legend.title}</option>)}
            </select>
          </label>

          <label className="field" htmlFor="promo-expires">
            <span>Vence (opcional)</span>
            <input
              id="promo-expires"
              className="input standalone-input"
              type="date"
              value={form.expiresAt}
              onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
            />
            <small className="creator-muted">Déjalo vacío para un acceso permanente.</small>
          </label>

          <div className="pm-submit-row">
            <Button type="submit" disabled={saving || !form.userId || !form.legendId}>
              {saving ? 'Otorgando…' : 'Otorgar acceso'}
            </Button>
          </div>
        </form>
      </Card>

      {error && <p className="error-message pm-error" role="alert"><AppIcon name="error" size={18} /> {error}</p>}
      {notice && <p className="pm-notice" role="status"><AppIcon name="check_circle" size={18} /> {notice}</p>}

      <Card>
        <h2>Promociones otorgadas</h2>
        {!grants.length ? (
          <div className="pm-empty">
            <AppIcon name="card_giftcard" size={34} />
            <p>Aún no has regalado ningún acceso.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Leyenda</th>
                  <th>Estado</th>
                  <th>Vence</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((grant) => (
                  <tr key={grant.id}>
                    <td>{userLabel(grant.user)}</td>
                    <td>{grant.legend?.title || '—'}</td>
                    <td>{STATUS_LABEL[grant.status] || grant.status}</td>
                    <td>{grant.expires_at ? new Date(grant.expires_at).toLocaleDateString() : 'Permanente'}</td>
                    <td>
                      {grant.status === 'active' ? (
                        <Button variant="ghost" onClick={() => handleRevoke(grant.id)}>Revocar</Button>
                      ) : (
                        <span className="creator-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}

export default AdminPromotionsPage;
