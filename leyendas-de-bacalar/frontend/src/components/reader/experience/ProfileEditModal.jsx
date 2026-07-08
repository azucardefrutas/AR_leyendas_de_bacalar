import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../ui/Button.jsx';
import { uploadReaderAvatar, uploadReaderCover } from '../../../services/profileService.js';

// Edit-profile modal (Facebook-style): identity fields plus avatar and cover
// image uploads. Images are uploaded to Storage on selection and the resolved
// public URL is passed up on save via onSubmit(payload).
function ProfileEditModal({ open, profile, onClose, onSubmit }) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [uploading, setUploading] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const avatarInput = useRef(null);
  const coverInput = useRef(null);

  useEffect(() => {
    if (!open) return;
    setFullName(profile?.full_name || '');
    setUsername(profile?.username || '');
    setBio(profile?.bio || '');
    setAvatarUrl(profile?.avatar_url || '');
    setCoverUrl(profile?.cover_url || '');
    setError(null);
    setSaving(false);
    setUploading(null);
  }, [open, profile]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === 'Escape' && !saving && !uploading) onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, saving, uploading, onClose]);

  if (!open) return null;

  async function handleUpload(kind, file) {
    if (!file) return;
    setUploading(kind);
    setError(null);
    const uploader = kind === 'avatar' ? uploadReaderAvatar : uploadReaderCover;
    const { data, error: uploadError } = await uploader(file);
    setUploading(null);
    if (uploadError) {
      setError(uploadError.message || 'No se pudo subir la imagen.');
      return;
    }
    if (kind === 'avatar') setAvatarUrl(data.publicUrl);
    else setCoverUrl(data.publicUrl);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const payload = {
      full_name: fullName.trim() || null,
      username: username.trim() || null,
      bio: bio.trim() || null,
      avatar_url: avatarUrl || null,
      cover_url: coverUrl || null,
    };
    const { error: saveError } = await onSubmit(payload);
    setSaving(false);
    if (saveError) {
      setError(saveError.message || 'No se pudieron guardar los cambios.');
      return;
    }
    onClose?.();
  }

  const busy = saving || Boolean(uploading);

  return createPortal(
    <div
      className="rx-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Editar perfil"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose?.();
      }}
    >
      <div className="rx-modal">
        <div className="rx-modal-head">
          <div>
            <h3>Editar perfil</h3>
            <p>Actualiza tu identidad publica en Leyendas de Bacalar.</p>
          </div>
          <button className="rx-modal-close" type="button" onClick={onClose} disabled={busy} aria-label="Cerrar">✕</button>
        </div>

        <div className="rx-form">
          <div
            className="rx-cover"
            style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : undefined}
          >
            <button
              className="rx-cover-edit"
              type="button"
              onClick={() => coverInput.current?.click()}
              disabled={busy}
            >
              📷 {uploading === 'cover' ? 'Subiendo...' : 'Cambiar portada'}
            </button>
          </div>

          <div className="rx-field" style={{ justifyItems: 'center', marginTop: '-46px', zIndex: 2 }}>
            <div className="rx-avatar" style={{ width: 92, height: 92, fontSize: '2rem' }}>
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" /> : (fullName || 'L').slice(0, 1).toUpperCase()}
            </div>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => avatarInput.current?.click()}
              disabled={busy}
              style={{ marginTop: 8 }}
            >
              {uploading === 'avatar' ? 'Subiendo...' : 'Cambiar foto'}
            </button>
          </div>

          <input
            ref={avatarInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(event) => handleUpload('avatar', event.target.files?.[0])}
          />
          <input
            ref={coverInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(event) => handleUpload('cover', event.target.files?.[0])}
          />

          <label className="rx-field">
            <span>Nombre</span>
            <input className="rx-input" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Tu nombre" />
          </label>
          <label className="rx-field">
            <span>Nombre de usuario</span>
            <input className="rx-input" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="usuario" />
          </label>
          <label className="rx-field">
            <span>Biografia</span>
            <textarea
              className="rx-textarea"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Cuentanos algo sobre ti y las leyendas que te gustan..."
              maxLength={280}
            />
          </label>

          {error && <div className="rx-alert rx-alert-error">{error}</div>}

          <div className="rx-modal-actions">
            <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
            <Button onClick={handleSave} disabled={busy}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ProfileEditModal;
