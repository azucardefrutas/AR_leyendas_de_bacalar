import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useProfile } from '../../hooks/useProfile.js';
import { getMyCreatorProfile } from '../../services/creatorService.js';

function getDisplayName(profile, creatorProfile) {
  return creatorProfile?.pen_name || profile?.full_name || profile?.name || 'Creador';
}

function CreatorProfilePage() {
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [creatorLoading, setCreatorLoading] = useState(true);
  const [creatorError, setCreatorError] = useState(null);

  useEffect(() => {
    async function loadCreatorProfile() {
      const { data, error } = await getMyCreatorProfile();
      setCreatorProfile(data);
      setCreatorError(error);
      setCreatorLoading(false);
    }

    loadCreatorProfile();
  }, []);

  if (profileLoading || creatorLoading) {
    return <LoadingState message="Cargando perfil editorial..." />;
  }

  const displayName = getDisplayName(profile, creatorProfile);

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

      <Card className="creator-profile-card">
        <div className="creator-profile-avatar">{displayName.slice(0, 1).toUpperCase()}</div>
        <div>
          <h2>{displayName}</h2>
          <p>{profile?.email || 'Correo no disponible'}</p>
          <span className="creator-status-pill">{creatorProfile?.status || 'creator'}</span>
        </div>
      </Card>
    </section>
  );
}

export default CreatorProfilePage;
