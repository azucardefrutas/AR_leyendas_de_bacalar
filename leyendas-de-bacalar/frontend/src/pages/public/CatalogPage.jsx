import React from 'react';
import { useEffect, useState } from 'react';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import LegendCard from '../../components/catalog/LegendCard.jsx';
import { getPublishedLegends } from '../../services/legendService.js';

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

  if (loading) return <LoadingState message="Cargando leyendas publicadas..." />;

  return (
    <section className="page-stack">
      <header>
        <p className="eyebrow">Catalogo</p>
        <h1>Leyendas publicadas</h1>
      </header>
      {error && <p className="error-message">No pudimos cargar el catalogo.</p>}
      {!error && legends.length === 0 && <EmptyState title="Aun no hay historias publicadas." message="Vuelve pronto para descubrir nuevas leyendas de Bacalar." />}
      <div className="catalog-grid">
        {legends.map((legend) => (
          <LegendCard key={legend.id} legend={legend} />
        ))}
      </div>
    </section>
  );
}

export default CatalogPage;
