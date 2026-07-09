import React from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../../components/ui/AppIcon.jsx';
import Button from '../../components/ui/Button.jsx';
import ReaderSectionHeader from '../../components/reader/experience/ReaderSectionHeader.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useRoles } from '../../hooks/useRoles.js';

function SettingsPage() {
  const { user } = useAuth();
  const { roles, activeRole } = useRoles();

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
