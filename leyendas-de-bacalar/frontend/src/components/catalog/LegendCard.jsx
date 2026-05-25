import React from 'react';
import { Link } from 'react-router-dom';
import Badge from '../ui/Badge.jsx';
import Card from '../ui/Card.jsx';

function LegendCard({ legend }) {
  return (
    <Card className="legend-card">
      <Link to={`/legend/${legend.slug}`}>
        <div className="legend-cover">
          {legend.cover_url ? <img src={legend.cover_url} alt="" /> : <span>{legend.title?.slice(0, 2) ?? 'LB'}</span>}
        </div>
        <div className="legend-card-body">
          <Badge>{legend.status ?? 'published'}</Badge>
          <h3>{legend.title}</h3>
          <p>{legend.short_description ?? legend.description ?? 'Leyenda publicada de Bacalar.'}</p>
        </div>
      </Link>
    </Card>
  );
}

export default LegendCard;
