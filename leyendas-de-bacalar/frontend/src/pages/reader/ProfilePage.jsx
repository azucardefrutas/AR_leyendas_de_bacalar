import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import CreatorApplyCtaCard from '../../components/reader/creator-request/CreatorApplyCtaCard.jsx';
import RxEmptyState from '../../components/reader/experience/RxEmptyState.jsx';
import ProfileEditModal from '../../components/reader/experience/ProfileEditModal.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useProfile } from '../../hooks/useProfile.js';
import { useRoles } from '../../hooks/useRoles.js';
import { getMyFavorites, getMyLibrary, getMyReviews, getReaderStats } from '../../services/readerService.js';
import { formatDate } from '../../utils/formatters.js';

function getDisplayName(profile) {
  return profile?.full_name || profile?.name || profile?.display_name || profile?.username || 'Lector';
}

function initials(name) {
  return (name || 'L').trim().slice(0, 1).toUpperCase();
}

function MediaGrid({ items, emptyIcon, emptyTitle, emptyMessage }) {
  if (items.length === 0) {
    return <RxEmptyState icon={emptyIcon} title={emptyTitle} message={emptyMessage} />;
  }
  return (
    <div className="rx-media-grid">
      {items.map((item) => {
        const legend = item.legend;
        if (!legend) return null;
        return (
          <Link key={item.id || item.legend_id} className="rx-media-tile" to={`/legend/${legend.slug}`}>
            {legend.coverUrl
              ? <img src={legend.coverUrl} alt={legend.title} loading="lazy" />
              : <div className="rx-media-fallback">{initials(legend.title)}</div>}
            <span className="rx-media-cap">{legend.title}</span>
          </Link>
        );
      })}
    </div>
  );
}

function ProfilePage() {
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const { roles, activeRole } = useRoles();

  const [tab, setTab] = useState('library');
  const [editing, setEditing] = useState(false);
  const [library, setLibrary] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ library: 0, favorites: 0, reviews: 0, completed: 0, reading: 0 });

  useEffect(() => {
    let active = true;
    async function load() {
      const [libraryResult, favoritesResult, reviewsResult, statsResult] = await Promise.all([
        getMyLibrary(),
        getMyFavorites(),
        getMyReviews(),
        getReaderStats(),
      ]);
      if (!active) return;
      setLibrary(libraryResult.data ?? []);
      setFavorites(favoritesResult.data ?? []);
      setReviews(reviewsResult.data ?? []);
      if (statsResult.data) setStats(statsResult.data);
    }
    load();
    return () => { active = false; };
  }, [user?.id]);

  const displayName = getDisplayName(profile);
  const username = profile?.username ? `@${profile.username}` : null;
  const isReaderOnly = roles.length === 0 || (roles.length === 1 && roles[0] === 'reader');

  return (
    <div className="rx rx-profile">
      <div className="rx-profile-head">
        <div
          className="rx-cover"
          style={profile?.cover_url ? { backgroundImage: `url(${profile.cover_url})` } : undefined}
        >
          <button className="rx-cover-edit" type="button" onClick={() => setEditing(true)}>
            📷 Editar portada
          </button>
        </div>

        <div className="rx-profile-bar">
          <div className="rx-avatar-wrap">
            <div className="rx-avatar">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt={displayName} /> : initials(displayName)}
            </div>
            <button className="rx-avatar-edit" type="button" onClick={() => setEditing(true)} aria-label="Cambiar foto">✎</button>
          </div>

          <div className="rx-identity">
            <h1>{displayName}</h1>
            {username && <p className="rx-handle">{username}</p>}
            {profile?.bio && <p className="rx-bio">{profile.bio}</p>}
            <div className="rx-identity-meta">
              {profile?.created_at && <span>🗓️ Miembro desde {formatDate(profile.created_at, { month: 'long', year: 'numeric' })}</span>}
              <span>🎭 {activeRole || roles[0] || 'reader'}</span>
            </div>
          </div>

          <div className="rx-profile-actions">
            <Button onClick={() => setEditing(true)}>Editar perfil</Button>
          </div>
        </div>

        <div className="rx-profile-stats">
          <div className="rx-profile-stat"><b>{stats.library}</b><span>Biblioteca</span></div>
          <div className="rx-profile-stat"><b>{stats.completed}</b><span>Completadas</span></div>
          <div className="rx-profile-stat"><b>{stats.favorites}</b><span>Favoritas</span></div>
          <div className="rx-profile-stat"><b>{stats.reviews}</b><span>Reseñas</span></div>
        </div>
      </div>

      <div className="rx-panel">
        <div className="rx-tabs" role="tablist">
          <button className={`rx-tab${tab === 'library' ? ' rx-tab-active' : ''}`} onClick={() => setTab('library')} role="tab" aria-selected={tab === 'library'}>Biblioteca</button>
          <button className={`rx-tab${tab === 'favorites' ? ' rx-tab-active' : ''}`} onClick={() => setTab('favorites')} role="tab" aria-selected={tab === 'favorites'}>Favoritos</button>
          <button className={`rx-tab${tab === 'reviews' ? ' rx-tab-active' : ''}`} onClick={() => setTab('reviews')} role="tab" aria-selected={tab === 'reviews'}>Reseñas</button>
          <button className={`rx-tab${tab === 'account' ? ' rx-tab-active' : ''}`} onClick={() => setTab('account')} role="tab" aria-selected={tab === 'account'}>Cuenta</button>
        </div>

        {tab === 'library' && (
          <div className="rx-tab-panel">
            <MediaGrid
              items={library}
              emptyIcon="📚"
              emptyTitle="Tu biblioteca esta vacia"
              emptyMessage="Las leyendas que desbloquees apareceran aqui como una galeria."
            />
          </div>
        )}

        {tab === 'favorites' && (
          <div className="rx-tab-panel">
            <MediaGrid
              items={favorites}
              emptyIcon="❤️"
              emptyTitle="Sin favoritos todavia"
              emptyMessage="Marca leyendas como favoritas para encontrarlas rapido aqui."
            />
          </div>
        )}

        {tab === 'reviews' && (
          <div className="rx-tab-panel">
            {reviews.length === 0 ? (
              <RxEmptyState icon="⭐" title="Aun no escribes reseñas" message="Cuando reseñes una leyenda, tus opiniones apareceran en esta seccion." />
            ) : (
              <div className="rx-ledger">
                {reviews.map((review) => (
                  <div key={review.id} className="rx-review">
                    <div className="rx-review-top">
                      <strong>{review.legend?.title || 'Leyenda'}</strong>
                      <span className="rx-stars" aria-label={`${review.rating} de 5`}>
                        {'★'.repeat(Math.max(0, Math.min(5, review.rating)))}{'☆'.repeat(Math.max(0, 5 - review.rating))}
                      </span>
                    </div>
                    {review.comment && <p>{review.comment}</p>}
                    <span className="rx-continue-meta">{formatDate(review.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'account' && (
          <div className="rx-tab-panel">
            <div className="rx-ledger">
              <div className="rx-ledger-row">
                <div className="rx-ledger-icon" aria-hidden="true">✉️</div>
                <div className="rx-ledger-main">
                  <strong>{user?.email || 'Correo no disponible'}</strong>
                  <span>Correo de la cuenta</span>
                </div>
                <div className="rx-ledger-side"><span className="rx-badge rx-badge-ok">Verificado</span></div>
              </div>
              <div className="rx-ledger-row">
                <div className="rx-ledger-icon" aria-hidden="true">🎭</div>
                <div className="rx-ledger-main">
                  <strong>{roles.length ? roles.join(', ') : 'reader'}</strong>
                  <span>Roles asignados · activo: {activeRole || 'reader'}</span>
                </div>
                <div className="rx-ledger-side"><span className="rx-badge rx-badge-info">{roles.length || 1}</span></div>
              </div>
              <div className="rx-ledger-row">
                <div className="rx-ledger-icon" aria-hidden="true">🏷️</div>
                <div className="rx-ledger-main">
                  <strong>{profile?.username ? `@${profile.username}` : 'Sin nombre de usuario'}</strong>
                  <span>Identificador publico</span>
                </div>
                <div className="rx-ledger-side">
                  <Button variant="ghost" onClick={() => setEditing(true)}>Editar</Button>
                </div>
              </div>
            </div>

            {isReaderOnly && <div style={{ marginTop: 18 }}><CreatorApplyCtaCard /></div>}
          </div>
        )}
      </div>

      <ProfileEditModal
        open={editing}
        profile={profile}
        onClose={() => setEditing(false)}
        onSubmit={(payload) => updateProfile(payload)}
      />

      {profileLoading && !profile && <p className="rx-sub">Cargando perfil...</p>}
    </div>
  );
}

export default ProfilePage;
