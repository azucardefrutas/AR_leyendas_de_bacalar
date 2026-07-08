import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import LegendCard from '../../components/catalog/LegendCard.jsx';
import { getPublishedLegends } from '../../services/legendService.js';

const ACCESS_LABELS = {
  free: 'Gratis',
  paid: 'Premium',
  subscription: 'Suscripción',
  code_required: 'Código físico',
  mixed: 'Premium',
};

function CatalogPage() {
  const [legends, setLegends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadLegends() {
      const { data, error: legendsError } = await getPublishedLegends();
      setLegends(data ?? []);
      setError(legendsError);
      setLoading(false);
    }

    loadLegends();
  }, []);

  const featured = useMemo(() => {
    if (!legends.length) return null;
    return legends.find((legend) => legend.is_featured) || legends[0];
  }, [legends]);

  if (loading) return <LoadingState message="Cargando leyendas publicadas..." />;

  if (error) {
    return (
      <section className="page-stack">
        <p className="error-message">No pudimos cargar el catalogo.</p>
      </section>
    );
  }

  if (legends.length === 0) {
    return (
      <section className="page-stack">
        <header>
          <p className="eyebrow">Catálogo</p>
          <h1>Leyendas publicadas</h1>
        </header>
        <EmptyState title="Aún no hay historias publicadas." message="Vuelve pronto para descubrir nuevas leyendas de Bacalar." />
      </section>
    );
  }

  const heroBg = featured?.backdropUrl || featured?.bannerUrl || featured?.coverUrl;

  return (
    <div className="rx rx-cine">
      {featured && (
        <section className="rx-cine-hero" aria-label={`Destacada: ${featured.title}`}>
          {heroBg && <div className="rx-cine-hero-bg" style={{ backgroundImage: `url(${heroBg})` }} aria-hidden="true" />}
          <div className="rx-cine-hero-body">
            <span className="rx-cine-badge">★ Destacada</span>
            <h1 className="rx-cine-hero-title">{featured.title}</h1>
            <div className="rx-cine-hero-meta">
              <span className="rx-cine-tag">{ACCESS_LABELS[featured.access_type] || 'Premium'}</span>
              {featured.origin_place && <span className="rx-cine-tag">📍 {featured.origin_place}</span>}
              {(featured.genres || []).slice(0, 3).map((genre) => (
                <span key={genre.id} className="rx-cine-tag">{genre.name}</span>
              ))}
            </div>
            {(featured.shortSynopsis || featured.synopsis) && (
              <p className="rx-cine-hero-synopsis">{featured.shortSynopsis || featured.synopsis}</p>
            )}
            <div className="rx-cine-hero-cta">
              <Link to={`/legend/${featured.slug}`}><Button>Ver leyenda</Button></Link>
              <Link to={`/legend/${featured.slug}/read`}><Button variant="ghost">Leer ahora</Button></Link>
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="rx-cine-section-head">
          <h2>Todas las leyendas</h2>
          <span className="rx-cine-count">{legends.length} {legends.length === 1 ? 'historia' : 'historias'}</span>
        </div>
        <div className="rx-cine-grid">
          {legends.map((legend) => (
            <LegendCard key={legend.id} legend={legend} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default CatalogPage;
