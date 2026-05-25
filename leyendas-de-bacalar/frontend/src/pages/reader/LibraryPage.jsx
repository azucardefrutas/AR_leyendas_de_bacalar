import React from 'react';
import Card from '../../components/ui/Card.jsx';
import { useProfile } from '../../hooks/useProfile.js';
import { useRoles } from '../../hooks/useRoles.js';

function LibraryPage() {
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const { roles, loading: rolesLoading, error: rolesError } = useRoles();

  return (
    <section className="page-stack">
      <h1>Mi biblioteca</h1>
      <Card>
        <h2>Perfil</h2>
        {profileLoading ? <p>Cargando perfil...</p> : <pre>{JSON.stringify(profile, null, 2)}</pre>}
        {profileError && <p className="error-message">{profileError.message}</p>}
      </Card>
      <Card>
        <h2>Roles</h2>
        {rolesLoading ? <p>Cargando roles...</p> : <p>{roles.length ? roles.join(', ') : 'Sin roles asignados'}</p>}
        {rolesError && <p className="error-message">{rolesError.message}</p>}
      </Card>
    </section>
  );
}

export default LibraryPage;
