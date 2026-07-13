import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import EmptyState from '../../components/ui/EmptyState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import LegendCard from '../../components/catalog/LegendCard.jsx';
import { gridStagger, pageFade } from '../../lib/motionPresets.js';
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

  const reduce = useReducedMotion();

  if (loading) return <LoadingState message="Cargando leyendas publicadas..." />;

  if (error) {
    return (
      <section className="page-stack">
        <p className="error-message">No pudimos cargar el catalogo.</p>
      </section>
    );
  }

  return (
    <motion.div
      className="rx rx-cine"
      initial={reduce ? false : pageFade.initial}
      animate={reduce ? false : pageFade.animate}
    >
      <div className="rx-cine-section-head">
        <div>
          <p className="rx-eyebrow">Catálogo</p>
          <h2>Leyendas publicadas</h2>
        </div>
        {legends.length > 0 && (
          <span className="rx-cine-count">{legends.length} {legends.length === 1 ? 'historia' : 'historias'}</span>
        )}
      </div>

      {legends.length === 0 ? (
        <EmptyState title="Aún no hay historias publicadas." message="Vuelve pronto para descubrir nuevas leyendas de Bacalar." />
      ) : (
        <motion.div
          className="rx-cine-grid"
          variants={reduce ? undefined : gridStagger}
          initial={reduce ? false : 'hidden'}
          animate={reduce ? false : 'visible'}
        >
          {legends.map((legend) => (
            <LegendCard key={legend.id} legend={legend} />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

export default CatalogPage;
