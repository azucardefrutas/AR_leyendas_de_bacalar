import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppIcon from '../../components/ui/AppIcon.jsx';
import Button from '../../components/ui/Button.jsx';
import CreatorApplyCtaCard from '../../components/reader/creator-request/CreatorApplyCtaCard.jsx';
import RxEmptyState from '../../components/reader/experience/RxEmptyState.jsx';
import RxStatTile from '../../components/reader/experience/RxStatTile.jsx';
import LegendCarousel from '../../components/reader/experience/LegendCarousel.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useProfile } from '../../hooks/useProfile.js';
import { getPublishedLegends } from '../../services/legendService.js';
import { getContinueReading, getMyLibrary, getReaderStats } from '../../services/readerService.js';
import { getLoginPathForRedirect } from '../../utils/authRedirect.js';

// Placeholder banner artwork for the library hero (eLibro-style). Swap this
// file (or path) for custom artwork later — it's the single source to change.
const LIBRARY_BANNER = '/assets/backgraoud collage.png';

const quickAccess = [
  { title: 'Canjear codigo', text: 'Activa una leyenda con el codigo de tu libro fisico.', to: '/reader/redeem', icon: 'confirmation_number' },
  { title: 'Compras', text: 'Explora la tienda y revisa tus ordenes y pagos.', to: '/reader/purchases', icon: 'shopping_bag' },
  { title: 'Suscripcion', text: 'Gestiona tu membresia cultural y sus beneficios.', to: '/reader/subscription', icon: 'workspace_premium' },
  { title: 'Perfil', text: 'Edita tu identidad publica y revisa tu actividad.', to: '/reader/profile', icon: 'person' },
];

const visitorActions = [
  { title: 'Explorar leyendas', text: 'Navega el catalogo publico y descubre relatos de Bacalar.', to: '/catalog', icon: 'explore' },
  { title: 'Tengo un codigo', text: 'Inicia sesion para activar el codigo de tu libro fisico.', to: getLoginPathForRedirect('/reader/redeem'), icon: 'confirmation_number' },
  { title: 'Crear cuenta', text: 'Guarda accesos, compras y tu progreso de lectura.', to: getLoginPathForRedirect('/reader/library'), icon: 'auto_awesome' },
];

function getDisplayName(profile) {
  return profile?.full_name || profile?.name || profile?.display_name || profile?.username || null;
}

// Friendly greeting: prefer a real name; if it's an email, show only the local
// part; otherwise fall back to "Lector".
function greetingName(name) {
  if (!name) return 'Lector';
  return name.includes('@') ? name.split('@')[0] : name;
}

function initials(name) {
  return (name || 'L').trim().slice(0, 1).toUpperCase();
}

function toStory(legend) {
  return { id: legend.id, title: legend.title, slug: legend.slug, coverUrl: legend.coverUrl || legend.cover_url || null };
}

function LibraryPage() {
  const { isAuthenticated } = useAuth();
  const { profile } = useProfile();

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
        <section className="rx-libhero">
          <div className="rx-libhero-bg" style={{ backgroundImage: `url("${LIBRARY_BANNER}")` }} aria-hidden="true" />
          <div className="rx-libhero-body">
            <h1>Explora Bacalar</h1>
            <span className="rx-libhero-name">Leyendas, relatos y experiencias culturales</span>
          </div>
        </section>

        <section className="rx-lib-sec">
          <div className="rx-quick-grid">
            {visitorActions.map((item) => (
              <Link key={item.title} className="rx-quick" to={item.to}>
                <span className="rx-quick-icon" aria-hidden="true"><AppIcon name={item.icon} size={22} filled /></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className="rx-quick-arrow">Continuar →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rx-lib-sec">
          <div className="rx-lib-head">
            <div>
              <h2>Historias publicadas</h2>
              <p>Biblioteca cultural abierta al publico.</p>
            </div>
            <Link to="/catalog"><Button variant="ghost">Ver catalogo</Button></Link>
          </div>
          {loading ? (
            <LoadingState message="Cargando leyendas..." />
          ) : legends.length > 0 ? (
            <LegendCarousel stories={legends.map(toStory)} ctaLabel="Ver" />
          ) : (
            <RxEmptyState icon="menu_book" title="Aun no hay leyendas publicadas" message="Vuelve pronto para descubrir nuevas historias de Bacalar." />
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="rx rx-page">
      <section className="rx-libhero">
        <div className="rx-libhero-bg" style={{ backgroundImage: `url("${LIBRARY_BANNER}")` }} aria-hidden="true" />
        <div className="rx-libhero-body">
          <h1>Hola</h1>
          <span className="rx-libhero-name">{greetingName(displayName)}</span>
        </div>
      </section>

      {stats && (
        <div className="rx-stats">
          <RxStatTile icon="auto_stories" value={stats.library} label="En tu biblioteca" />
          <RxStatTile icon="menu_book" value={stats.reading} label="Leyendo ahora" />
          <RxStatTile icon="task_alt" value={stats.completed} label="Completadas" />
          <RxStatTile icon="favorite" value={stats.favorites} label="Favoritas" />
          <RxStatTile icon="reviews" value={stats.reviews} label="Reseñas" />
        </div>
      )}

      {continueReading.length > 0 && (
        <section className="rx-lib-sec">
          <div className="rx-lib-head">
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

      <section className="rx-lib-sec">
        <div className="rx-lib-head">
          <div>
            <h2>Mi coleccion</h2>
            <p>Leyendas desbloqueadas con codigo, compra o suscripcion.</p>
          </div>
          {library.length > 0 && <span className="rx-badge rx-badge-info">{library.length}</span>}
        </div>
        {loading ? (
          <LoadingState message="Cargando tu coleccion..." />
        ) : library.length > 0 ? (
          <LegendCarousel stories={library.map((item) => toStory(item.legend))} ctaLabel="Abrir" />
        ) : (
          <RxEmptyState
            icon="lock_open"
            title="Aun no tienes leyendas desbloqueadas"
            message="Canjea un codigo, compra una leyenda o activa una suscripcion para comenzar tu coleccion."
          >
            <Link to="/reader/redeem"><Button>Canjear codigo</Button></Link>
            <Link to="/catalog"><Button variant="ghost">Explorar catalogo</Button></Link>
          </RxEmptyState>
        )}
      </section>

      <section className="rx-lib-sec">
        <div className="rx-lib-head">
          <div><h2>Tu cuenta</h2></div>
        </div>
        <div className="rx-quick-grid">
          {quickAccess.map((item) => (
            <Link key={item.title} className="rx-quick" to={item.to}>
              <span className="rx-quick-icon" aria-hidden="true"><AppIcon name={item.icon} size={22} filled /></span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <span className="rx-quick-arrow">Abrir →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rx-lib-sec">
        <div className="rx-lib-head">
          <div>
            <h2>Catalogo publico</h2>
            <p>Descubre nuevas historias para leer y desbloquear.</p>
          </div>
          <Link to="/catalog"><Button variant="ghost">Ver todo</Button></Link>
        </div>
        {loading ? (
          <LoadingState message="Cargando leyendas..." />
        ) : legends.length > 0 ? (
          <LegendCarousel stories={legends.map(toStory)} ctaLabel="Ver" />
        ) : (
          <RxEmptyState icon="menu_book" title="Aun no hay leyendas publicadas" message="Vuelve pronto para descubrir nuevas historias de Bacalar." />
        )}
      </section>

      <CreatorApplyCtaCard />
    </div>
  );
}

export default LibraryPage;
