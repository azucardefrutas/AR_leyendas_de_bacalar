import React, { useEffect, useState } from 'react';
import { AdminSectionHeader } from '../../components/ui/AdminPrimitives.jsx';
import Button from '../../components/ui/Button.jsx';
import { getAdminSettings, updateAdminSettings } from '../../services/backendApiService.js';

// Defaults mirror the backend whitelist so the form is always fully controlled even
// before the first load resolves (or if a key is missing from the response).
const DEFAULTS = {
  announcement: { enabled: false, message: '', type: 'info' },
  maintenance: { enabled: false, message: '' },
  creator_registration: { open: true },
  upload_limit_mb: { value: 50 },
};

const ANNOUNCEMENT_TYPES = [
  { value: 'info', label: 'Informacion' },
  { value: 'warning', label: 'Advertencia' },
  { value: 'success', label: 'Exito' },
];

function AdminSettingsPage() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
    setMessage('');
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await updateAdminSettings(settings);
      setSettings({ ...DEFAULTS, ...(res?.settings ?? {}) });
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
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar configuracion'}
        </Button>
      </div>
    </section>
  );
}

export default AdminSettingsPage;
