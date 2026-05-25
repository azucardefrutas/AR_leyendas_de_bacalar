import React from 'react';
import Card from '../../components/ui/Card.jsx';
import { useProfile } from '../../hooks/useProfile.js';
import { useRoles } from '../../hooks/useRoles.js';

function ProfilePage() {
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const { roles, activeRole, loading: rolesLoading } = useRoles();

  return (
    <section className="page-stack">
      <h1>Perfil</h1>
      <Card>
        <h2>Datos de usuario</h2>
        {profileLoading ? <p>Cargando perfil...</p> : <pre>{JSON.stringify(profile, null, 2)}</pre>}
        {profileError && <p className="error-message">{profileError.message}</p>}
      </Card>
      <Card>
        <h2>Roles</h2>
        {rolesLoading ? <p>Cargando roles...</p> : <p>{roles.join(', ') || 'Sin roles'} | Activo: {activeRole ?? 'ninguno'}</p>}
      </Card>
    </section>
  );
}

export default ProfilePage;
