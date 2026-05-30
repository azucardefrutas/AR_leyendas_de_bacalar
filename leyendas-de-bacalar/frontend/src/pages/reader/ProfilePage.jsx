import React from 'react';
import CreatorApplyCtaCard from '../../components/reader/creator-request/CreatorApplyCtaCard.jsx';
import Card from '../../components/ui/Card.jsx';
import { useProfile } from '../../hooks/useProfile.js';
import { useRoles } from '../../hooks/useRoles.js';

function getDisplayName(profile) {
  return profile?.full_name || profile?.name || profile?.display_name || profile?.username || 'Lector';
}

function ProfilePage() {
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const { roles, activeRole, loading: rolesLoading } = useRoles();
  const displayName = getDisplayName(profile);

  return (
    <section className="page-stack">
      <h1>Perfil</h1>
      <Card>
        <h2>Datos de usuario</h2>
        {profileLoading ? (
          <p>Cargando perfil...</p>
        ) : (
          <div className="profile-summary">
            <span>{displayName.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{displayName}</strong>
              <p>{profile?.email || 'Correo no disponible'}</p>
            </div>
          </div>
        )}
        {profileError && <p className="error-message">{profileError.message}</p>}
      </Card>
      <Card>
        <h2>Roles</h2>
        {rolesLoading ? <p>Cargando roles...</p> : <p>{roles.join(', ') || 'Sin roles'} | Activo: {activeRole ?? 'ninguno'}</p>}
      </Card>
      <CreatorApplyCtaCard />
    </section>
  );
}

export default ProfilePage;
