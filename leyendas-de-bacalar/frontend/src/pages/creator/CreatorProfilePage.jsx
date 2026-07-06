import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import StatusBadge from '../../shared/status/StatusBadge.jsx';
import { getStatusCounterTone } from '../../shared/status/statusMeta.js';
import { useProfile } from '../../hooks/useProfile.js';
import {
  countCreatorLegendsByStatus,
  getCreatorLegends,
} from '../../services/creatorService.js';
import {
  getCurrentCreatorProfileBundle,
  updateCreatorProfile,
  uploadCreatorAvatar,
  uploadCreatorCover,
} from '../../services/profileService.js';

function getDisplayName(profile, creatorProfile) {
  return creatorProfile?.pen_name || profile?.full_name || profile?.username || 'Creador';
}

function getBiography(profile, creatorProfile) {
  return creatorProfile?.biography || profile?.bio || 'Aun no hay biografia editorial registrada.';
}

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return (parts.map((part) => part[0]).join('') || 'C').toUpperCase();
}

function formatDate(value) {
  if (!value) return 'No disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No disponible';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatWebsite(url = '') {
  if (!url) return '';
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

function CreatorProfilePage() {
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    refreshProfile,
  } = useProfile();
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [accountProfile, setAccountProfile] = useState(null);
  const [legends, setLegends] = useState([]);
  const [creatorLoading, setCreatorLoading] = useState(true);
  const [creatorError, setCreatorError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('works');
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    avatar_url: '',
    pen_name: '',
    biography: '',
    headline: '',
    location_label: '',
    website_url: '',
    profile_visibility: 'public',
    cover_asset_id: '',
    cover_url: '',
  });

  async function loadCreatorProfile() {
    setCreatorLoading(true);
    setMessage('');
    const [creatorSettled, legendsSettled] = await Promise.allSettled([
      getCurrentCreatorProfileBundle(),
      getCreatorLegends(),
    ]);
    const creatorResult = creatorSettled.status === 'fulfilled'
      ? creatorSettled.value
      : { data: null, error: creatorSettled.reason };
    const legendsResult = legendsSettled.status === 'fulfilled'
      ? legendsSettled.value
      : { data: [], error: legendsSettled.reason };

    if (import.meta.env.DEV && (creatorSettled.status === 'rejected' || legendsSettled.status === 'rejected')) {
      console.error('[CreatorModule] Error real:', {
        operation: 'loadCreatorProfile',
        table: 'creator_profiles/legends',
        error: creatorSettled.reason || legendsSettled.reason,
      });
    }

    setAccountProfile(creatorResult.data?.profile ?? null);
    setCreatorProfile(creatorResult.data?.creatorProfile ?? null);
    setLegends(legendsResult.data ?? []);
    setCreatorError(creatorResult.error || legendsResult.error);
    setCreatorLoading(false);
  }

  useEffect(() => {
    loadCreatorProfile();
  }, []);

  useEffect(() => {
    setForm({
      full_name: (profile || accountProfile)?.full_name || '',
      username: (profile || accountProfile)?.username || '',
      avatar_url: (profile || accountProfile)?.avatar_url || '',
      pen_name: creatorProfile?.pen_name || '',
      biography: creatorProfile?.biography || (profile || accountProfile)?.bio || '',
      headline: creatorProfile?.headline || '',
      location_label: creatorProfile?.location_label || '',
      website_url: creatorProfile?.website_url || '',
      profile_visibility: creatorProfile?.profile_visibility || 'public',
      cover_asset_id: creatorProfile?.cover_asset_id || '',
      cover_url: creatorProfile?.coverAsset?.file_url || creatorProfile?.cover_url || '',
    });
  }, [profile, accountProfile, creatorProfile]);

  const stats = useMemo(() => ([
    { key: 'total', label: 'Total de leyendas', value: legends.length, tone: 'neutral' },
    { key: 'published', label: 'Publicadas', value: countCreatorLegendsByStatus(legends, ['published']), tone: getStatusCounterTone('published') },
    { key: 'review', label: 'En revision', value: countCreatorLegendsByStatus(legends, ['in_review', 'review', 'pending_review', 'submitted', 'changes_requested']), tone: getStatusCounterTone('in_review') },
    { key: 'draft', label: 'Borradores', value: countCreatorLegendsByStatus(legends, ['draft', 'borrador']), tone: getStatusCounterTone('draft') },
    { key: 'rejected', label: 'Rechazadas', value: countCreatorLegendsByStatus(legends, ['rejected']), tone: getStatusCounterTone('rejected') },
  ]), [legends]);

  if (profileLoading || creatorLoading) {
    return <LoadingState message="Cargando perfil editorial..." />;
  }

  const activeProfile = profile || accountProfile;
  const displayName = getDisplayName(activeProfile, creatorProfile);
  const biography = getBiography(activeProfile, creatorProfile);
  const avatarUrl = form.avatar_url || activeProfile?.avatar_url || '';
  const coverUrl = form.cover_url || creatorProfile?.cover_url || '';
  const profileStatus = creatorProfile?.profile_status || activeProfile?.status || 'active';
  const headline = creatorProfile?.headline || form.headline || 'Creador(a) digital / Autor Leyendas Bacalar';
  const location = creatorProfile?.location_label || form.location_label || '';
  const websiteUrl = creatorProfile?.website_url || form.website_url || '';

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    if (!activeProfile?.id) {
      setCreatorError(new Error('No se encontro el perfil autenticado.'));
      return;
    }
    if (!form.pen_name.trim()) {
      setCreatorError(new Error('Agrega un nombre de autor para guardar el perfil.'));
      return;
    }

    setSaving(true);
    setMessage('');
    setCreatorError(null);
    const { data, error } = await updateCreatorProfile(activeProfile.id, {
      full_name: form.full_name,
      username: form.username,
      avatar_url: form.avatar_url,
      bio: form.biography,
      pen_name: form.pen_name,
      biography: form.biography,
      headline: form.headline,
      location_label: form.location_label,
      website_url: form.website_url,
      profile_visibility: form.profile_visibility,
      cover_asset_id: form.cover_asset_id || undefined,
    });
    setSaving(false);

    if (error) {
      setCreatorError(error);
      return;
    }

    await refreshProfile();
    if (data?.profile) setAccountProfile(data.profile);
    setCreatorProfile(data?.creatorProfile || creatorProfile);
    setIsEditing(false);
    setMessage(data?.warning || 'Perfil actualizado correctamente.');
  }

  async function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading('avatar');
    setMessage('');
    setCreatorError(null);
    const { data, error } = await uploadCreatorAvatar(file);
    setUploading('');
    event.target.value = '';
    if (error) {
      setCreatorError(error);
      return;
    }
    updateField('avatar_url', data.publicUrl);
    if (!activeProfile?.id) {
      setMessage('Imagen cargada. Guarda el perfil para conservarla.');
      return;
    }

    const { data: savedProfile, error: saveError } = await updateCreatorProfile(activeProfile.id, {
      avatar_url: data.publicUrl,
    });

    if (saveError) {
      setCreatorError(saveError);
      return;
    }

    await refreshProfile();
    if (savedProfile?.profile) setAccountProfile(savedProfile.profile);
    setMessage('Imagen de perfil actualizada.');
  }

  async function handleCoverUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading('cover');
    setMessage('');
    setCreatorError(null);
    const { data, error } = await uploadCreatorCover(file);
    setUploading('');
    event.target.value = '';
    if (error) {
      setCreatorError(error);
      return;
    }
    updateField('cover_url', data.publicUrl);
    updateField('cover_asset_id', data.asset?.id || '');
    if (!activeProfile?.id || !data.asset?.id) {
      setMessage('Portada cargada. Guarda el perfil para conservarla.');
      return;
    }

    const { data: savedProfile, error: saveError } = await updateCreatorProfile(activeProfile.id, {
      cover_asset_id: data.asset.id,
    });

    if (saveError) {
      setCreatorError(saveError);
      return;
    }

    setCreatorProfile({
      ...(savedProfile?.creatorProfile || creatorProfile || {}),
      coverAsset: data.asset,
    });
    setMessage('Portada del perfil actualizada.');
  }

  return (
    <section className="page-stack creator-panel">
      <div className="page-heading-row">
        <div>
          <p className="creator-kicker">Perfil editorial</p>
          <h1>Mi perfil</h1>
        </div>
        <div className="creator-profile-actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              const next = !isEditing;
              setIsEditing(next);
              if (next) setActiveTab('about');
            }}
          >
            {isEditing ? 'Cancelar edicion' : 'Editar perfil'}
          </button>
          <Link className="btn btn-primary" to="/creator">Ver panel</Link>
        </div>
      </div>

      {(profileError || creatorError) && (
        <p className="error-message">{(profileError || creatorError).message}</p>
      )}
      {message && <p className="success-message">{message}</p>}

      <Card className="fbig-card">
        <div className="fbig-cover">
          {coverUrl ? <img src={coverUrl} alt="" /> : <div className="fbig-cover-fallback" />}
          {isEditing && (
            <label className="fbig-cover-change">
              <span className="material-symbols-rounded" aria-hidden="true">photo_camera</span>
              <span>{uploading === 'cover' ? 'Subiendo...' : 'Cambiar portada'}</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleCoverUpload} disabled={uploading === 'cover'} />
            </label>
          )}
        </div>

        <div className="fbig-identity">
          <div className="fbig-avatar">
            {avatarUrl ? <img src={avatarUrl} alt={`Avatar de ${displayName}`} /> : <span className="fbig-avatar-initials">{getInitials(displayName)}</span>}
            {isEditing && (
              <label className="fbig-avatar-cam" title="Cambiar avatar">
                <span className="material-symbols-rounded" aria-hidden="true">photo_camera</span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarUpload} disabled={uploading === 'avatar'} />
              </label>
            )}
          </div>

          <div className="fbig-info">
            <div className="fbig-headrow">
              <div className="fbig-names">
                <div className="fbig-namerow">
                  <h2>{displayName}</h2>
                  <StatusBadge status={profileStatus} context="creator_profile" className="creator-profile-status" />
                </div>
                {activeProfile?.username && <p className="fbig-username">@{activeProfile.username}</p>}
              </div>

              <div className="fbig-stats">
                {stats.map((item) => (
                  <div className={`fbig-stat tone-${item.tone}`} key={item.key}>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="fbig-headline">{headline}</p>
            <p className="fbig-bio">{biography}</p>
            <div className="fbig-meta">
              {location && (
                <span><span className="material-symbols-rounded" aria-hidden="true">location_on</span>{location}</span>
              )}
              {websiteUrl && (
                <a href={websiteUrl} target="_blank" rel="noreferrer">
                  <span className="material-symbols-rounded" aria-hidden="true">link</span>{formatWebsite(websiteUrl)}
                </a>
              )}
              <span><span className="material-symbols-rounded" aria-hidden="true">calendar_month</span>Se unió el {formatDate(creatorProfile?.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="fbig-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={activeTab === 'works'} className={activeTab === 'works' ? 'is-active' : ''} onClick={() => setActiveTab('works')}>
            <span className="material-symbols-rounded" aria-hidden="true">grid_view</span>Obras
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'about'} className={activeTab === 'about' ? 'is-active' : ''} onClick={() => setActiveTab('about')}>
            <span className="material-symbols-rounded" aria-hidden="true">person</span>Acerca de
          </button>
          <Link to="/creator/legends" className="fbig-tabs-link">Ver todas</Link>
        </div>
      </Card>

      {activeTab === 'works' ? (
        legends.length === 0 ? (
          <Card className="creator-empty-card fbig-empty">
            <span className="material-symbols-rounded" aria-hidden="true">auto_stories</span>
            <h2>Aun no hay obras registradas</h2>
            <p>Cuando crees leyendas, apareceran aqui como una galeria.</p>
            <Link to="/creator/legends/new" className="btn btn-primary">Nueva leyenda</Link>
          </Card>
        ) : (
          <div className="fbig-grid">
            {legends.map((legend) => (
              <Link key={legend.id} to={`/creator/legends/${legend.id}/edit`} className="fbig-tile">
                <div
                  className="fbig-tile-cover"
                  style={legend.coverUrl ? { '--cover-image': `url("${legend.coverUrl}")` } : undefined}
                >
                  {legend.coverUrl
                    ? <img src={legend.coverUrl} alt={`Portada de ${legend.title || 'leyenda'}`} />
                    : <span className="material-symbols-rounded" aria-hidden="true">auto_stories</span>}
                  <StatusBadge status={legend.status || 'draft'} context="legend" size="small" className="fbig-tile-status" />
                </div>
                <div className="fbig-tile-body">
                  <strong>{legend.title || 'Leyenda sin titulo'}</strong>
                  <span>{legend.short_synopsis || legend.synopsis || 'Sin sinopsis registrada.'}</span>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        <Card className="fbig-about">
          <div className="fbig-about-head">
            <h3>Acerca del autor</h3>
            {!isEditing && (
              <button type="button" className="btn btn-ghost fbig-about-edit" onClick={() => setIsEditing(true)}>
                <span className="material-symbols-rounded" aria-hidden="true">edit</span>Editar
              </button>
            )}
          </div>

          {isEditing ? (
            <form className="fbig-about-form" onSubmit={handleSave}>
              <div className="fbig-about-fields">
                <label className="field">
                  <span>Nombre público</span>
                  <input className="standalone-input" value={form.full_name} onChange={(event) => updateField('full_name', event.target.value)} />
                </label>
                <label className="field">
                  <span>Username</span>
                  <input className="standalone-input" value={form.username} onChange={(event) => updateField('username', event.target.value)} />
                </label>
                <label className="field">
                  <span>Nombre de autor / pen name</span>
                  <input className="standalone-input" value={form.pen_name} onChange={(event) => updateField('pen_name', event.target.value)} />
                </label>
                <label className="field">
                  <span>Frase corta</span>
                  <input className="standalone-input" value={form.headline} onChange={(event) => updateField('headline', event.target.value)} placeholder="Creador(a) digital / Autor Leyendas Bacalar" />
                </label>
                <label className="field">
                  <span>Ubicación</span>
                  <input className="standalone-input" value={form.location_label} onChange={(event) => updateField('location_label', event.target.value)} placeholder="Bacalar, Quintana Roo" />
                </label>
                <label className="field">
                  <span>Sitio web</span>
                  <input className="standalone-input" type="url" value={form.website_url} onChange={(event) => updateField('website_url', event.target.value)} placeholder="https://..." />
                </label>
                <label className="field">
                  <span>Visibilidad</span>
                  <select className="select" value={form.profile_visibility} onChange={(event) => updateField('profile_visibility', event.target.value)}>
                    <option value="public">Público</option>
                    <option value="private">Privado</option>
                  </select>
                </label>
                <label className="field fbig-about-wide">
                  <span>Biografía</span>
                  <textarea className="textarea" rows={5} value={form.biography} onChange={(event) => updateField('biography', event.target.value)} />
                </label>
              </div>
              <div className="fbig-about-actions">
                <button className="btn btn-ghost" type="button" onClick={() => setIsEditing(false)} disabled={saving}>Cancelar</button>
                <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
              </div>
            </form>
          ) : (
            <>
              <p className="fbig-about-bio">{biography}</p>
              <div className="fbig-about-grid">
                <div className="fbig-about-item">
                  <span className="material-symbols-rounded" aria-hidden="true">badge</span>
                  <div><small>Nombre de autor</small><strong>{form.pen_name || displayName}</strong></div>
                </div>
                {location && (
                  <div className="fbig-about-item">
                    <span className="material-symbols-rounded" aria-hidden="true">location_on</span>
                    <div><small>Ubicacion</small><strong>{location}</strong></div>
                  </div>
                )}
                {websiteUrl && (
                  <div className="fbig-about-item">
                    <span className="material-symbols-rounded" aria-hidden="true">link</span>
                    <div><small>Sitio web</small><a href={websiteUrl} target="_blank" rel="noreferrer">{formatWebsite(websiteUrl)}</a></div>
                  </div>
                )}
                <div className="fbig-about-item">
                  <span className="material-symbols-rounded" aria-hidden="true">calendar_month</span>
                  <div><small>Se unio</small><strong>{formatDate(creatorProfile?.created_at)}</strong></div>
                </div>
                <div className="fbig-about-item">
                  <span className="material-symbols-rounded" aria-hidden="true">visibility</span>
                  <div><small>Visibilidad</small><strong>{form.profile_visibility === 'public' ? 'Publico' : 'Privado'}</strong></div>
                </div>
              </div>
            </>
          )}
        </Card>
      )}
    </section>
  );
}

export default CreatorProfilePage;
