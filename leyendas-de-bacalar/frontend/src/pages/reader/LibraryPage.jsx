import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LegendCard from '../../components/catalog/LegendCard.jsx';
import Button from '../../components/ui/Button.jsx';
import CreatorApplyCtaCard from '../../components/reader/creator-request/CreatorApplyCtaCard.jsx';
import RxEmptyState from '../../components/reader/experience/RxEmptyState.jsx';
import RxStatTile from '../../components/reader/experience/RxStatTile.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useProfile } from '../../hooks/useProfile.js';
import { useRoles } from '../../hooks/useRoles.js';
import { getPublishedLegends } from '../../services/legendService.js';
import { getContinueReading, getMyLibrary, getReaderStats } from '../../services/readerService.js';
import { getLoginPathForRedirect } from '../../utils/authRedirect.js';

const quickAccess = [
  { title: 'Canjear codigo', text: 'Activa una leyenda con el codigo de tu libro fisico.', to: '/reader/redeem', icon: '🎟️' },
  { title: 'Compras', text: 'Explora la tienda y revisa tus ordenes y pagos.', to: '/reader/purchases', icon: '🛍️' },
  { title: 'Suscripcion', text: 'Gestiona tu membresia cultural y sus beneficios.', to: '/reader/subscription', icon: '🎫' },
  { title: 'Perfil', text: 'Edita tu identidad publica y revisa tu actividad.', to: '/reader/profile', icon: '👤' },
];

const visitorActions = [
  { title: 'Explorar leyendas', text: 'Navega el catalogo publico y descubre relatos de Bacalar.', to: '/catalog', icon: '🧭' },
  { title: 'Tengo un codigo', text: 'Inicia sesion para activar el codigo de tu libro fisico.', to: getLoginPathForRedirect('/reader/redeem'), icon: '🎟️' },
  { title: 'Crear cuenta', text: 'Guarda accesos, compras y tu progreso de lectura.', to: getLoginPathForRedirect('/reader/library'), icon: '✨' },
];

function getDisplayName(profile) {
  return profile?.full_name || profile?.name || profile?.display_name || profile?.username || null;
}

function initials(name) {
  return (name || 'L').trim().slice(0, 1).toUpperCase();
}

function LibraryPage() {
  const { isAuthenticated } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { roles, loading: rolesLoading } = useRoles();

  const [legends, setLegends] = useState([]);
  const [library, setLibrary] = useState([]);
  const [continueReading, setContinueReading] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const displayName = getDisplayName(profile);

  useEffect(() => {
    let active = true;
    async function load() {
      const tasks = [getPublishedLegends()];
      if (isAuthenticated) {
        tasks.push(getMyLibrary(), getContinueReading(), getReaderStats());
      }
      const [legendsResult, libraryResult, continueResult, statsResult] = await Promise.all(tasks);
      if (!active) return;
      setLegends(legendsResult?.data ?? []);
      if (isAuthenticated) {
        setLibrary(libraryResult?.data ?? []);
        setContinueReading(continueResult?.data ?? []);
        setStats(statsResult?.data ?? null);
      }
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="rx rx-page">
        <section className="rx-hero">
          <p className="rx-eyebrow">Biblioteca publica</p>
          <h1>Explora Bacalar</h1>
          <p className="rx-hero-lead">
            Recorre leyendas publicadas, conoce el proyecto y descubre que historias puedes
            desbloquear con cuenta, codigo fisico o suscripcion.
          </p>
          <div className="rx-hero-cta">
            <Link to="/catalog"><Button>Explorar catalogo</Button></Link>
            <Link to={getLoginPathForRedirect('/reader/library')}><Button variant="ghost">Iniciar sesion</Button></Link>
          </div>
        </section>

        <div className="rx-quick-grid">
          {visitorActions.map((item) => (
            <Link key={item.title} className="rx-quick" to={item.to}>
              <span className="rx-quick-icon" aria-hidden="true">{item.icon}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <span className="rx-quick-arrow">Continuar →</span>
            </Link>
          ))}
        </div>

        <section className="rx-panel">
          <div className="rx-panel-head">
            <div>
              <h2>Historias publicadas</h2>
              <p>Biblioteca cultural abierta al publico.</p>
            </div>
          </div>
          {loading ? (
            <LoadingState message="Cargando leyendas publicadas..." />
          ) : legends.length > 0 ? (
            <div className="catalog-grid">
              {legends.map((legend) => <LegendCard key={legend.id} legend={legend} />)}
            </div>
          ) : (
            <RxEmptyState icon="📖" title="Aun no hay leyendas publicadas" message="Vuelve pronto para descubrir nuevas historias de Bacalar." />
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="rx rx-page">
      <section className="rx-hero">
        <div className="rx-hero-top">
          <div className="rx-hero-avatar" aria-hidden="true">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initials(displayName)}
          </div>
          <div className="rx-hero-greeting">
            <span>Experiencia del lector</span>
            <strong>Hola{displayName ? `, ${displayName}` : ''}</strong>
          </div>
        </div>
        <h1>Mi biblioteca</h1>
        <p className="rx-hero-lead">
          Aqui viven las leyendas que has desbloqueado, tu progreso de lectura y todo lo que puedes
          explorar en la plataforma.
        </p>
        <div className="rx-hero-cta">
          <Link to="/catalog"><Button>Explorar catalogo</Button></Link>
          <Link to="/reader/redeem"><Button variant="ghost">Canjear codigo</Button></Link>
        </div>
        {!rolesLoading && roles.length > 0 && (
          <div className="rx-chips" style={{ marginTop: 18 }}>
            {roles.map((role) => <span key={role} className="rx-chip">{role}</span>)}
          </div>
        )}
      </section>

      {stats && (
        <div className="rx-stats">
          <RxStatTile icon="📚" value={stats.library} label="En tu biblioteca" />
          <RxStatTile icon="📖" value={stats.reading} label="Leyendo ahora" />
          <RxStatTile icon="✅" value={stats.completed} label="Completadas" />
          <RxStatTile icon="❤️" value={stats.favorites} label="Favoritas" />
          <RxStatTile icon="⭐" value={stats.reviews} label="Reseñas" />
        </div>
      )}

      {continueReading.length > 0 && (
        <section className="rx-panel">
          <div className="rx-panel-head">
            <div>
              <h2>Continuar leyendo</h2>
              <p>Retoma justo donde lo dejaste.</p>
            </div>
          </div>
          <div className="rx-continue-list">
            {continueReading.map((item) => {
              const percent = Math.min(100, Math.round(Number(item.progress_percent) || 0));
              return (
                <Link key={item.legend_id} className="rx-continue-card" to={`/legend/${item.legend.slug}/read`}>
                  <div className="rx-continue-cover">
                    {item.legend.coverUrl
                      ? <img src={item.legend.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                      : initials(item.legend.title)}
                  </div>
                  <div className="rx-continue-body">
                    <h4>{item.legend.title}</h4>
                    <div className="rx-progress"><div className="rx-progress-bar" style={{ width: `${percent}%` }} /></div>
                    <div className="rx-continue-meta">
                      <span>Pagina {item.last_page_number}</span>
                      <span>{percent}%</span>
                    </div>
                  </div>
                  <span className="rx-badge rx-badge-info">Seguir</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="rx-panel">
        <div className="rx-panel-head">
          <div>
            <h2>Mi coleccion</h2>
            <p>Leyendas desbloqueadas con codigo, compra o suscripcion.</p>
          </div>
          {library.length > 0 && <span className="rx-badge rx-badge-info">{library.length}</span>}
        </div>
        {loading ? (
          <LoadingState message="Cargando tu coleccion..." />
        ) : library.length > 0 ? (
          <div className="catalog-grid">
            {library.map((item) => <LegendCard key={item.id} legend={item.legend} />)}
          </div>
        ) : (
          <RxEmptyState
            icon="🔓"
            title="Aun no tienes leyendas desbloqueadas"
            message="Canjea un codigo, compra una leyenda o activa una suscripcion para comenzar tu coleccion."
          >
            <Link to="/reader/redeem"><Button>Canjear codigo</Button></Link>
            <Link to="/catalog"><Button variant="ghost">Explorar catalogo</Button></Link>
          </RxEmptyState>
        )}
      </section>

      <div className="rx-quick-grid">
        {quickAccess.map((item) => (
          <Link key={item.title} className="rx-quick" to={item.to}>
            <span className="rx-quick-icon" aria-hidden="true">{item.icon}</span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            <span className="rx-quick-arrow">Abrir →</span>
          </Link>
        ))}
      </div>

      <section className="rx-panel">
        <div className="rx-panel-head">
          <div>
            <h2>Catalogo publico</h2>
            <p>Descubre nuevas historias para leer y desbloquear.</p>
          </div>
          <Link to="/catalog"><Button variant="ghost">Ver todo</Button></Link>
        </div>
        {loading ? (
          <LoadingState message="Cargando leyendas..." />
        ) : legends.length > 0 ? (
          <div className="catalog-grid">
            {legends.map((legend) => <LegendCard key={legend.id} legend={legend} />)}
          </div>
        ) : (
          <RxEmptyState icon="📖" title="Aun no hay leyendas publicadas" message="Vuelve pronto para descubrir nuevas historias de Bacalar." />
        )}
      </section>

      <CreatorApplyCtaCard />
    </div>
  );
}

export default LibraryPage;
