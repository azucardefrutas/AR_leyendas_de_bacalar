import React from 'react';
import { Link } from 'react-router-dom';
import Badge from '../ui/Badge.jsx';
import Card from '../ui/Card.jsx';

const accessLabels = {
  free: 'Gratis',
  paid: 'Compra',
  subscription: 'Suscripcion',
  code_required: 'Codigo fisico',
  mixed: 'Mixto',
};

function LegendCard({ legend }) {
  const coverUrl = legend.coverUrl || legend.cover_url || null;
  const synopsis = legend.shortSynopsis || legend.short_synopsis || legend.synopsis || 'Leyenda publicada de Bacalar.';
  const genres = Array.isArray(legend.genres) ? legend.genres.slice(0, 2) : [];
  const accessLabel = accessLabels[legend.access_type] || legend.access_type || 'Publicado';

  return (
    <Card className="legend-card">
      <Link to={`/legend/${legend.slug}`}>
        <div className="legend-cover">
          {coverUrl ? <img src={coverUrl} alt={`Portada de ${legend.title}`} /> : <span>{legend.title?.slice(0, 2) ?? 'LB'}</span>}
        </div>
        <div className="legend-card-body">
          <Badge>{accessLabel}</Badge>
          <h3>{legend.title}</h3>
          <p>{synopsis}</p>
          <p>{legend.authorName || 'Autor no disponible'}</p>
          {genres.length > 0 && (
            <div className="legend-meta-row">
              {genres.map((genre) => <span className="legend-chip" key={genre.id || genre.name}>{genre.name}</span>)}
            </div>
          )}
        </div>
      </Link>
    </Card>
  );
}

export default LegendCard;
