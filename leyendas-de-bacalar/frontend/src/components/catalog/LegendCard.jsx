import React from 'react';
import { Link } from 'react-router-dom';

const premiumLabels = {
  paid: 'Premium',
  subscription: 'Premium',
  code_required: 'Codigo',
  mixed: 'Premium',
};

function getInitials(title = '') {
  return title.trim().slice(0, 2).toUpperCase() || 'LB';
}

/**
 * Streaming-style poster card: cover-first, minimal text. Clicking opens the
 * legend detail page (not the reader directly).
 */
function LegendCard({ legend }) {
  const coverUrl = legend.coverUrl || legend.cover_url || legend.poster_url || null;
  const author = legend.authorName || legend.author_name || '';
  const isFree = (legend.access_type || 'free') === 'free';
  const badge = isFree ? 'Gratis' : (premiumLabels[legend.access_type] || 'Premium');

  return (
    <Link className="poster-card" to={`/legend/${legend.slug}`} aria-label={legend.title}>
      <div className="poster-card-art">
        {coverUrl ? (
          <img src={coverUrl} alt={`Portada de ${legend.title}`} loading="lazy" />
        ) : (
          <div className="poster-card-fallback"><span>{getInitials(legend.title)}</span></div>
        )}
        <span className={`poster-badge ${isFree ? 'free' : 'premium'}`}>{badge}</span>
        <div className="poster-card-shade" aria-hidden="true" />
      </div>
      <div className="poster-card-meta">
        <h3 title={legend.title}>{legend.title}</h3>
        {author && <p>{author}</p>}
      </div>
    </Link>
  );
}

export default LegendCard;
