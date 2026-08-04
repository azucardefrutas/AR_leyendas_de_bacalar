import { useEffect, useState } from 'react';
import { AdminSectionHeader } from '../../components/ui/AdminPrimitives.jsx';
import Button from '../../components/ui/Button.jsx';
import { getAdminSettings, updateAdminSettings } from '../../services/backendApiService.js';

// Defaults mirror the backend whitelist so the form is always fully controlled even
// before the first load resolves (or if a key is missing from the response).
const DEFAULTS = {
  announcement: { enabled: false, message: '', type: 'info' },
  maintenance: { enabled: false, message: '' },
  site_access: { mode: 'open', message: '' },
  creator_registration: { open: true },
  upload_limit_mb: { value: 50 },
};

const ANNOUNCEMENT_TYPES = [
  { value: 'info', label: 'Informacion' },
  { value: 'warning', label: 'Advertencia' },
  { value: 'success', label: 'Exito' },
];

const ACCESS_MODES = [
  { value: 'open', label: 'Abierto', detail: 'Toda la plataforma funciona normalmente.' },
  { value: 'catalog_only', label: 'Solo catalogo', detail: 'Muestra portadas, pero bloquea detalle, lector, AR, descargas y autores.' },
  { value: 'closed', label: 'Cerrado', detail: 'Bloquea toda la experiencia publica y los paneles de lector y autor.' },
];

const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || 'https://admin.bacalarlegends-ar.com';

function AdminSettingsPage() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [restrictionConfirmed, setRestrictionConfirmed] = useState(false);

  useEffect(() => {
    let active = true;
    getAdminSettings()
      .then((res) => {
        if (active) setSettings({ ...DEFAULTS, ...(res?.settings ?? {}) });
      })
      .catch((err) => {
        if (active) setError(err?.message || 'No pudimos cargar la configuracion.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  function patch(key, partial) {
    setSettings((current) => ({ ...current, [key]: { ...current[key], ...partial } }));
    if (key === 'site_access') setRestrictionConfirmed(false);
    setMessage('');
  }

  async function handleSave() {
    if (settings.site_access.mode !== 'open' && !restrictionConfirmed) {
      setError('Confirma el bloqueo antes de guardar este modo de acceso.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await updateAdminSettings(settings);
      setSettings({ ...DEFAULTS, ...(res?.settings ?? {}) });
      setRestrictionConfirmed(false);
      setMessage('Configuracion guardada.');
    } catch (err) {
      setError(err?.message || 'No pudimos guardar la configuracion.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="admin-page">
        <AdminSectionHeader eyebrow="Sistema" title="Configuracion" description="Ajustes globales de la plataforma." />
        <p className="creator-muted">Cargando configuracion...</p>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <AdminSectionHeader
        eyebrow="Sistema"
        title="Configuracion"
        description="Ajustes globales de la plataforma. Los cambios aplican para todos los usuarios."
      />

      {error && <p className="error-message">{error}</p>}
      {message && <p className="success-message">{message}</p>}

      <div className="admin-settings-grid">
        <article className={`admin-setting-card admin-setting-card--access admin-setting-card--${settings.site_access.mode}`}>
          <div className="admin-setting-card-heading">
            <div>
              <h3>Acceso a la plataforma</h3>
              <p>Control operativo para lectores, autores, visor, AR y descarga de la aplicacion.</p>
            </div>
            <span className="admin-access-status">{ACCESS_MODES.find((mode) => mode.value === settings.site_access.mode)?.label}</span>
          </div>

          <fieldset className="admin-access-modes">
            <legend>Estado</legend>
            {ACCESS_MODES.map((mode) => (
              <label key={mode.value} className={settings.site_access.mode === mode.value ? 'is-selected' : ''}>
                <input
                  type="radio"
                  name="site-access-mode"
                  value={mode.value}
                  checked={settings.site_access.mode === mode.value}
                  onChange={(event) => patch('site_access', { mode: event.target.value })}
                />
                <span>
                  <strong>{mode.label}</strong>
                  <small>{mode.detail}</small>
                </span>
              </label>
            ))}
          </fieldset>

          <label className="field">
            <span>Mensaje mostrado al bloquear</span>
            <textarea
              className="textarea"
              rows={2}
              maxLength={500}
              value={settings.site_access.message}
              onChange={(event) => patch('site_access', { message: event.target.value })}
              placeholder="Ej. El acceso digital se encuentra temporalmente suspendido."
            />
          </label>

          <div className="admin-recovery-access">
            <strong>Acceso administrativo de emergencia</strong>
            <a href={`${ADMIN_URL.replace(/\/$/, '')}/admin/settings`} target="_blank" rel="noreferrer">
              {ADMIN_URL.replace(/\/$/, '')}/admin/settings
            </a>
            <span>Respaldo: {window.location.origin}/admin/settings</span>
          </div>

          {settings.site_access.mode !== 'open' && (
            <label className="admin-access-confirmation">
              <input
                type="checkbox"
                checked={restrictionConfirmed}
                onChange={(event) => setRestrictionConfirmed(event.target.checked)}
              />
              <span>Confirmo que lectores y autores perderan acceso al guardar.</span>
            </label>
          )}
        </article>

        <article className="admin-setting-card">
          <h3>Aviso del sistema</h3>
          <p>Banner visible para lectores y autores en toda la plataforma.</p>
          <label className="admin-setting-toggle">
            <input
              type="checkbox"
              checked={settings.announcement.enabled}
              onChange={(event) => patch('announcement', { enabled: event.target.checked })}
            />
            Mostrar aviso
          </label>
          <label className="field">
            <span>Mensaje</span>
            <textarea
              className="textarea"
              rows={2}
              maxLength={500}
              value={settings.announcement.message}
              onChange={(event) => patch('announcement', { message: event.target.value })}
              placeholder="Ej. Nuevo contenido disponible esta semana."
            />
          </label>
          <label className="field">
            <span>Tipo</span>
            <select
              className="select"
              value={settings.announcement.type}
              onChange={(event) => patch('announcement', { type: event.target.value })}
            >
              {ANNOUNCEMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </label>
        </article>

        <article className="admin-setting-card">
          <h3>Modo mantenimiento</h3>
          <p>Muestra un banner de mantenimiento a lectores y autores. El administrador sigue navegando normal.</p>
          <label className="admin-setting-toggle">
            <input
              type="checkbox"
              checked={settings.maintenance.enabled}
              onChange={(event) => patch('maintenance', { enabled: event.target.checked })}
            />
            Activar mantenimiento
          </label>
          <label className="field">
            <span>Mensaje</span>
            <textarea
              className="textarea"
              rows={2}
              maxLength={500}
              value={settings.maintenance.message}
              onChange={(event) => patch('maintenance', { message: event.target.value })}
              placeholder="Ej. Estamos mejorando la plataforma. Volvemos pronto."
            />
          </label>
        </article>

        <article className="admin-setting-card">
          <h3>Registro de creadores</h3>
          <p>Controla si se aceptan nuevas solicitudes para convertirse en autor.</p>
          <label className="admin-setting-toggle">
            <input
              type="checkbox"
              checked={settings.creator_registration.open}
              onChange={(event) => patch('creator_registration', { open: event.target.checked })}
            />
            {settings.creator_registration.open ? 'Abierto' : 'Cerrado'}
          </label>
        </article>

        <article className="admin-setting-card">
          <h3>Limite de subida</h3>
          <p>Tamano maximo de documento (PDF/DOCX) que un autor puede subir. Maximo permitido: 50 MB.</p>
          <label className="field">
            <span>Limite en MB</span>
            <input
              type="number"
              className="standalone-input"
              min={1}
              max={50}
              value={settings.upload_limit_mb.value}
              onChange={(event) => patch('upload_limit_mb', { value: Number(event.target.value) })}
            />
          </label>
        </article>
      </div>

      <div className="admin-settings-actions">
        <Button
          type="button"
          onClick={handleSave}
          disabled={saving || (settings.site_access.mode !== 'open' && !restrictionConfirmed)}
        >
          {saving ? 'Guardando...' : 'Guardar configuracion'}
        </Button>
      </div>
    </section>
  );
}

export default AdminSettingsPage;
