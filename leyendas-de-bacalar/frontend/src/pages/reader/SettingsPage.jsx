import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../../components/ui/AppIcon.jsx';
import Button from '../../components/ui/Button.jsx';
import ReaderSectionHeader from '../../components/reader/experience/ReaderSectionHeader.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useRoles } from '../../hooks/useRoles.js';
import { cancelSubscription, getMySubscriptions } from '../../services/subscriptionService.js';
import { formatDate } from '../../utils/formatters.js';

function SettingsPage() {
  const { user } = useAuth();
  const { roles, activeRole } = useRoles();
  const [subs, setSubs] = useState([]);
  const [subsLoading, setSubsLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [membershipMsg, setMembershipMsg] = useState('');
  const [membershipError, setMembershipError] = useState(null);

  async function loadSubs() {
    const { data, error } = await getMySubscriptions();
    setSubs(data ?? []);
    setMembershipError(error ?? null);
    setSubsLoading(false);
  }

  useEffect(() => {
    loadSubs();
  }, []);

  const activeSub = subs.find((sub) => sub.status === 'active') || null;
  // Una suscripción cancelada sigue dando acceso hasta ends_at (fin de periodo).
  const cancelledButValid = subs.find(
    (sub) => sub.status === 'cancelled' && sub.ends_at && new Date(sub.ends_at) > new Date(),
  ) || null;
  const membershipSub = activeSub || cancelledButValid;

  async function handleCancelMembership() {
    if (!activeSub) return;
    setCanceling(true);
    setMembershipError(null);
    setMembershipMsg('');
    const until = activeSub.ends_at ? formatDate(activeSub.ends_at) : null;
    const { error } = await cancelSubscription(activeSub.id);
    setCanceling(false);
    setConfirmCancel(false);
    if (error) {
      setMembershipError(error);
      return;
    }
    setMembershipMsg(until
      ? `Cancelaste la renovacion. Conservas el acceso hasta el ${until}.`
      : 'Cancelaste la renovacion de tu suscripcion.');
    await loadSubs();
  }

  return (
    <div className="rx rx-page">
      <ReaderSectionHeader
        eyebrow="Ajustes"
        title="Configuracion de la cuenta"
        subtitle="Gestiona tu acceso y seguridad. Algunas opciones llegaran pronto."
      />

      <section className="rx-panel">
        <div className="rx-panel-head">
          <div>
            <h2>Cuenta</h2>
            <p>Datos de acceso de tu cuenta.</p>
          </div>
        </div>
        <div className="rx-ledger">
          <div className="rx-ledger-row">
            <div className="rx-ledger-icon" aria-hidden="true"><AppIcon name="mail" size={20} /></div>
            <div className="rx-ledger-main">
              <strong>{user?.email || 'Correo no disponible'}</strong>
              <span>Correo de la cuenta</span>
            </div>
            <div className="rx-ledger-side"><span className="rx-badge rx-badge-ok">Verificado</span></div>
          </div>
          <div className="rx-ledger-row">
            <div className="rx-ledger-icon" aria-hidden="true"><AppIcon name="badge" size={20} /></div>
            <div className="rx-ledger-main">
              <strong>{roles.length ? roles.join(', ') : 'reader'}</strong>
              <span>Roles · activo: {activeRole || 'reader'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rx-panel">
        <div className="rx-panel-head">
          <div>
            <h2>Seguridad</h2>
            <p>Protege el acceso a tu cuenta.</p>
          </div>
        </div>
        <div className="rx-ledger">
          <div className="rx-ledger-row">
            <div className="rx-ledger-icon" aria-hidden="true"><AppIcon name="lock" size={20} /></div>
            <div className="rx-ledger-main">
              <strong>Cambiar contraseña</strong>
              <span>Actualiza la contraseña de tu cuenta.</span>
            </div>
            <div className="rx-ledger-side">
              <span className="rx-badge rx-badge-wait">Proximamente</span>
            </div>
          </div>
        </div>
        <p className="rx-note" style={{ marginTop: 14 }}>
          El cambio de contraseña se habilitara pronto desde esta seccion.
        </p>
      </section>

      <section className="rx-panel">
        <div className="rx-panel-head">
          <div>
            <h2>Membresia</h2>
            <p>Gestiona tu suscripcion cultural. Puedes cancelar cuando quieras.</p>
          </div>
          <Link to="/reader/subscription"><Button variant="ghost">Ver planes</Button></Link>
        </div>

        {membershipError && <div className="rx-alert rx-alert-error">{membershipError.message}</div>}
        {membershipMsg && <div className="rx-alert rx-alert-ok">{membershipMsg}</div>}

        {subsLoading ? (
          <p className="rx-note">Cargando membresia...</p>
        ) : membershipSub ? (
          <div className="rx-ledger">
            <div className="rx-ledger-row">
              <div className="rx-ledger-icon" aria-hidden="true"><AppIcon name="workspace_premium" size={20} /></div>
              <div className="rx-ledger-main">
                <strong>{membershipSub.subscription_plans?.name || 'Plan cultural'}</strong>
                <span>
                  {membershipSub.status === 'active' ? 'Vigente hasta ' : 'Acceso hasta '}
                  {formatDate(membershipSub.ends_at)}
                </span>
              </div>
              <div className="rx-ledger-side">
                {membershipSub.status === 'active'
                  ? <span className="rx-badge rx-badge-ok">Activa</span>
                  : <span className="rx-badge rx-badge-wait">Cancelada · con acceso</span>}
                {membershipSub.status === 'active' && (
                  confirmCancel ? (
                    <div className="rx-cancel-confirm">
                      <span>¿Cancelar la renovacion?</span>
                      <small className="rx-cancel-hint">Conservas el acceso hasta el {formatDate(membershipSub.ends_at)}.</small>
                      <div className="rx-cancel-confirm-actions">
                        <Button variant="danger" onClick={handleCancelMembership} disabled={canceling}>
                          {canceling ? 'Cancelando...' : 'Si, cancelar'}
                        </Button>
                        <Button variant="ghost" onClick={() => setConfirmCancel(false)} disabled={canceling}>
                          No
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="rx-cancel-link"
                      onClick={() => { setMembershipMsg(''); setConfirmCancel(true); }}
                    >
                      Cancelar suscripcion
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="rx-note">No tienes una suscripcion activa. Explora los planes para desbloquear el acceso premium.</p>
        )}
      </section>

      <section className="rx-panel">
        <div className="rx-panel-head">
          <div>
            <h2>Perfil</h2>
            <p>Tu identidad publica (nombre, foto, portada y bio).</p>
          </div>
          <Link to="/reader/profile"><Button variant="ghost">Editar perfil</Button></Link>
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;
