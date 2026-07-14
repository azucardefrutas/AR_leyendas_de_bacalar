import React, { useState } from 'react';
import { changePassword } from '../../services/authService.js';

// Reusable "change password" form for both reader and creator settings. Frontend-only
// via Supabase Auth (updateUser) — no backend needed. Verifies the current password
// and validates the new one before submitting.
const MIN_LEN = 8;

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ ok: '', err: '' });

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ ok: '', err: '' });
    if (next.length < MIN_LEN) {
      setStatus({ ok: '', err: `La nueva contraseña debe tener al menos ${MIN_LEN} caracteres.` });
      return;
    }
    if (next !== confirm) {
      setStatus({ ok: '', err: 'La confirmación no coincide con la nueva contraseña.' });
      return;
    }
    if (next === current) {
      setStatus({ ok: '', err: 'La nueva contraseña debe ser distinta a la actual.' });
      return;
    }
    setSaving(true);
    const { error } = await changePassword({ currentPassword: current, newPassword: next });
    setSaving(false);
    if (error) {
      setStatus({ ok: '', err: error.message || 'No se pudo cambiar la contraseña.' });
      return;
    }
    setStatus({ ok: 'Contraseña actualizada correctamente.', err: '' });
    setCurrent('');
    setNext('');
    setConfirm('');
  }

  const type = show ? 'text' : 'password';

  return (
    <form className="change-password" onSubmit={handleSubmit}>
      <label className="change-password__field">
        <span>Contraseña actual</span>
        <input type={type} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />
      </label>
      <div className="change-password__row">
        <label className="change-password__field">
          <span>Nueva contraseña</span>
          <input type={type} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required minLength={MIN_LEN} />
        </label>
        <label className="change-password__field">
          <span>Confirmar nueva</span>
          <input type={type} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        </label>
      </div>
      <label className="change-password__show">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
        Mostrar contraseñas
      </label>

      {status.err && <p className="change-password__msg change-password__msg--err" role="alert">{status.err}</p>}
      {status.ok && <p className="change-password__msg change-password__msg--ok" role="status">{status.ok}</p>}

      <button type="submit" className="change-password__submit" disabled={saving}>
        {saving ? 'Guardando…' : 'Actualizar contraseña'}
      </button>
    </form>
  );
}
