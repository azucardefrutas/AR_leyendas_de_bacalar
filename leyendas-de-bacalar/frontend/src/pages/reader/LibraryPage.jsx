import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import { useProfile } from '../../hooks/useProfile.js';
import { useRoles } from '../../hooks/useRoles.js';

const libraryActions = [
  {
    title: 'Biblioteca',
    text: 'Revisa las leyendas que has desbloqueado para leerlas cuando quieras.',
    to: '/reader/library',
    marker: 'B',
  },
  {
    title: 'Canjear codigo',
    text: 'Usa el codigo unico de tu libro fisico para activar una leyenda.',
    to: '/reader/redeem',
    marker: 'C',
  },
  {
    title: 'Compras',
    text: 'Consulta tus compras simuladas y accesos registrados.',
    to: '/reader/purchases',
    marker: '$',
  },
  {
    title: 'Suscripcion',
    text: 'Gestiona planes culturales cuando el modulo este disponible.',
    to: '/reader/subscription',
    marker: 'S',
  },
  {
    title: 'Perfil',
    text: 'Actualiza tu informacion y revisa tus permisos activos.',
    to: '/reader/profile',
    marker: 'P',
  },
];

function getDisplayName(profile) {
  return (
    profile?.full_name ||
    profile?.name ||
    profile?.display_name ||
    profile?.username ||
    'lector'
  );
}

function LibraryPage() {
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const { roles, loading: rolesLoading, error: rolesError } = useRoles();
  const displayName = getDisplayName(profile);

  return (
    <section className="reader-library">
      <div className="reader-hero-panel">
        <div>
          <p className="eyebrow">Experiencia del lector</p>
          <h1>Mi biblioteca</h1>
          {profileLoading ? (
            <p>Cargando tu perfil...</p>
          ) : (
            <p>Hola, {displayName}. Tus leyendas desbloqueadas apareceran aqui.</p>
          )}
        </div>

        <div className="reader-role-strip" aria-label="Roles activos">
          {rolesLoading ? (
            <span>Cargando roles...</span>
          ) : roles.length > 0 ? (
            roles.map((role) => <span key={role}>{role}</span>)
          ) : (
            <span>reader</span>
          )}
        </div>

        {profileError && <p className="error-message">{profileError.message}</p>}
        {rolesError && <p className="error-message">{rolesError.message}</p>}
      </div>

      <div className="reader-action-grid">
        {libraryActions.map((item) => (
          <Link key={item.title} className="reader-action-card" to={item.to}>
            <span>{item.marker}</span>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </Link>
        ))}
      </div>

      <Card className="library-empty-card">
        <div>
          <p className="eyebrow">Contenido desbloqueado</p>
          <h2>Aun no tienes leyendas desbloqueadas</h2>
          <p>Canjea un codigo o explora el catalogo para comenzar.</p>
        </div>
        <div className="actions-row">
          <Link to="/catalog"><Button>Explorar catalogo</Button></Link>
          <Link to="/reader/redeem"><Button variant="ghost">Canjear codigo</Button></Link>
        </div>
      </Card>
    </section>
  );
}

export default LibraryPage;
