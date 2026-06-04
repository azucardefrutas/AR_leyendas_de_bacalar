import React, { useEffect, useMemo, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useProfile } from '../../hooks/useProfile.js';
import { getMyCreatorProfile, getMyLegends } from '../../services/creatorService.js';

const STATUS_LABELS = {
  draft: 'Borradores',
  in_review: 'En revision',
  review: 'En revision',
  pending_review: 'En revision',
  published: 'Publicadas',
  rejected: 'Rechazadas',
};

function getDisplayName(profile, creatorProfile) {
  return profile?.full_name || creatorProfile?.full_name || creatorProfile?.pen_name || profile?.username || 'Creador';
}

function getPenName(profile, creatorProfile) {
  return creatorProfile?.pen_name || profile?.username || 'Autor sin alias';
}

function getBiography(profile, creatorProfile) {
  return creatorProfile?.biography || creatorProfile?.bio || profile?.bio || 'Aun no hay biografia editorial registrada.';
}

function getProfileStatus(creatorProfile) {
  return creatorProfile?.profile_status || creatorProfile?.status || 'creator';
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

function countByStatus(legends, statuses) {
  return legends.filter((legend) => statuses.includes(String(legend.status || 'draft').toLowerCase())).length;
}

function CreatorProfilePage() {
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [legends, setLegends] = useState([]);
  const [creatorLoading, setCreatorLoading] = useState(true);
  const [creatorError, setCreatorError] = useState(null);

  useEffect(() => {
    async function loadCreatorProfile() {
      const [creatorResult, legendsResult] = await Promise.all([
        getMyCreatorProfile(),
        getMyLegends(),
      ]);

      setCreatorProfile(creatorResult.data);
      setLegends(legendsResult.data ?? []);
      setCreatorError(creatorResult.error || legendsResult.error);
      setCreatorLoading(false);
    }

    loadCreatorProfile();
  }, []);

  const stats = useMemo(() => ([
    { label: 'Total', value: legends.length },
    { label: STATUS_LABELS.draft, value: countByStatus(legends, ['draft', 'borrador']) },
    { label: STATUS_LABELS.in_review, value: countByStatus(legends, ['in_review', 'review', 'pending_review']) },
    { label: STATUS_LABELS.published, value: countByStatus(legends, ['published']) },
    { label: STATUS_LABELS.rejected, value: countByStatus(legends, ['rejected']) },
  ]), [legends]);

  if (profileLoading || creatorLoading) {
    return <LoadingState message="Cargando perfil editorial..." />;
  }

  const displayName = getDisplayName(profile, creatorProfile);
  const penName = getPenName(profile, creatorProfile);
  const biography = getBiography(profile, creatorProfile);
  const profileStatus = getProfileStatus(creatorProfile);
  const avatarUrl = profile?.avatar_url || creatorProfile?.avatar_url || '';
  const bannerUrl = creatorProfile?.banner_url || profile?.banner_url || '';

  return (
    <section className="page-stack creator-panel">
      <div className="page-heading-row">
        <div>
          <p className="creator-kicker">Perfil editorial</p>
          <h1>Mi perfil</h1>
        </div>
      </div>

      {(profileError || creatorError) && (
        <p className="error-message">{(profileError || creatorError).message}</p>
      )}

      <Card className="creator-profile-card creator-profile-modern">
        <div className="creator-profile-banner">
          {bannerUrl ? <img src={bannerUrl} alt="" /> : <span>Banner editorial pendiente</span>}
        </div>

        <div className="creator-profile-body">
          <div className="creator-profile-avatar">
            {avatarUrl ? <img src={avatarUrl} alt={`Avatar de ${displayName}`} /> : getInitials(displayName)}
          </div>

          <div className="creator-profile-main">
            <span className="creator-status-pill">{profileStatus}</span>
            <h2>{displayName}</h2>
            <p className="creator-profile-alias">{penName}</p>
            {profile?.username && <p className="creator-profile-username">@{profile.username}</p>}
            <p className="creator-profile-bio">{biography}</p>
            <div className="creator-profile-meta">
              <span>Perfil: {profile?.status || 'No disponible'}</span>
              <span>Registro creador: {formatDate(creatorProfile?.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="creator-profile-stats">
          {stats.map((item) => (
            <article key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </div>
      </Card>
    </section>
  );
}

export default CreatorProfilePage;
