import React from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LegendCard from '../../components/catalog/LegendCard.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import CreatorApplyCtaCard from '../../components/reader/creator-request/CreatorApplyCtaCard.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useProfile } from '../../hooks/useProfile.js';
import { useRoles } from '../../hooks/useRoles.js';
import { getPublishedLegends } from '../../services/legendService.js';
import { getLoginPathForRedirect } from '../../utils/authRedirect.js';

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
    text: 'Consulta tus compras y accesos registrados.',
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

const visitorActions = [
  {
    title: 'Explorar leyendas',
    text: 'Navega por el catalogo publico y descubre relatos publicados de Bacalar.',
    to: '/catalog',
    marker: 'E',
  },
  {
    title: 'Tengo un codigo',
    text: 'Inicia sesion para activar el codigo unico de tu libro fisico.',
    to: getLoginPathForRedirect('/reader/redeem'),
    marker: 'C',
  },
  {
    title: 'Desbloquear contenido',
    text: 'Crea una cuenta para guardar accesos, compras y progreso de lectura.',
    to: getLoginPathForRedirect('/reader/library'),
    marker: '+',
  },
];

function getDisplayName(profile) {
  return (
    profile?.full_name ||
    profile?.name ||
    profile?.display_name ||
    profile?.username ||
    null
  );
}

function LibraryPage() {
  const { isAuthenticated } = useAuth();
  const { profile, loading: profileLoading, error: profileError } = useProfile();
  const { roles, loading: rolesLoading, error: rolesError } = useRoles();
  const [legends, setLegends] = useState([]);
  const [legendsLoading, setLegendsLoading] = useState(true);
  const [legendsError, setLegendsError] = useState(null);
  const displayName = getDisplayName(profile);

  useEffect(() => {
    async function loadPublishedLegends() {
      const { data, error } = await getPublishedLegends();
      setLegends(data ?? []);
      setLegendsError(error);
      setLegendsLoading(false);
    }

    loadPublishedLegends();
  }, []);

  if (!isAuthenticated) {
    return (
      <section className="reader-library">
        <div className="reader-hero-panel">
          <div>
            <p className="eyebrow">Biblioteca publica</p>
            <h1>Explora Bacalar</h1>
            <p>
              Recorre leyendas publicadas, conoce el proyecto y descubre que historias
              puedes desbloquear con cuenta, codigo fisico o suscripcion.
            </p>
          </div>

          <div className="reader-role-strip" aria-label="Modo visitante">
            <span>Visitante</span>
            <span>Exploracion libre</span>
          </div>
        </div>

        <div className="reader-action-grid reader-action-grid-public">
          {visitorActions.map((item) => (
            <Link key={item.title} className="reader-action-card" to={item.to}>
              <span>{item.marker}</span>
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </Link>
          ))}
        </div>

        <section className="page-stack">
          <header>
            <p className="eyebrow">Historias publicadas</p>
            <h2>Biblioteca cultural</h2>
          </header>

          {legendsLoading ? (
            <LoadingState message="Cargando leyendas publicadas..." />
          ) : legendsError ? (
            <p className="error-message">No pudimos cargar la biblioteca publica.</p>
          ) : legends.length > 0 ? (
            <div className="catalog-grid">
              {legends.map((legend) => (
                <LegendCard key={legend.id} legend={legend} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Aun no hay leyendas publicadas"
              message="Vuelve pronto para descubrir nuevas historias de Bacalar."
            />
          )}
        </section>
      </section>
    );
  }

  return (
    <section className="reader-library">
      <div className="reader-hero-panel">
        <div>
          <p className="eyebrow">Experiencia del lector</p>
          <h1>Mi biblioteca</h1>
          {profileLoading ? (
            <p>Cargando tu perfil...</p>
          ) : (
            <p>Hola{displayName ? `, ${displayName}` : ''}. Tus leyendas desbloqueadas apareceran aqui.</p>
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

      <section className="page-stack">
        <header>
          <p className="eyebrow">Catalogo publico</p>
          <h2>Leyendas para explorar</h2>
        </header>
        {legendsLoading ? (
          <LoadingState message="Cargando leyendas publicadas..." />
        ) : legends.length > 0 ? (
          <div className="catalog-grid">
            {legends.map((legend) => (
              <LegendCard key={legend.id} legend={legend} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Aun no hay leyendas publicadas"
            message="Vuelve pronto para descubrir nuevas historias de Bacalar."
          />
        )}
      </section>
      <CreatorApplyCtaCard />
    </section>
  );
}

export default LibraryPage;
