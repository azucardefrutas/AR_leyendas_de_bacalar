import React from 'react';
import Card from '../ui/Card.jsx';

function CreatorLegendCardSkeleton({ count = 4 }) {
  const items = Array.from({ length: count }, (_, index) => index);

  return (
    <div className="creator-editorial-grid" aria-label="Cargando leyendas">
      {items.map((item) => (
        <Card key={item} className="creator-editorial-card creator-legend-card creator-legend-card-skeleton" aria-hidden="true">
          <div className="creator-skeleton-block creator-skeleton-cover" />
          <div className="creator-editorial-card-main">
            <div className="creator-card-topline">
              <span className="creator-skeleton-pill" />
              <span className="creator-skeleton-pill short" />
            </div>
            <span className="creator-skeleton-line title" />
            <span className="creator-skeleton-line" />
            <span className="creator-skeleton-line short" />
          </div>
          <div className="creator-card-actions">
            <span className="creator-skeleton-button" />
            <span className="creator-skeleton-button subtle" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default CreatorLegendCardSkeleton;
