import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import StoryActions from '../ui/StoryActions.jsx';

const premiumLabels = {
  paid: 'Premium',
  subscription: 'Premium',
  code_required: 'Codigo',
  mixed: 'Premium',
};

// Solo transform/opacity (aceleradas por GPU). El grid padre controla el stagger.
const cardVariants = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 26 } },
};
const hoverAnim = { y: -8, transition: { type: 'spring', stiffness: 300, damping: 22 } };
const tapAnim = { scale: 0.97 };
const cardStyle = { willChange: 'transform' };

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

  const reduce = useReducedMotion();

  return (
    <motion.div
      className="poster-card-wrap"
      variants={reduce ? undefined : cardVariants}
      whileHover={reduce ? undefined : hoverAnim}
      whileTap={reduce ? undefined : tapAnim}
      style={cardStyle}
    >
      <Link className="poster-card" to={`/legend/${legend.slug}`} aria-label={legend.title}>
        <div className="poster-card-art">
          {coverUrl ? (
            <img src={coverUrl} alt={`Portada de ${legend.title}`} loading="lazy" decoding="async" />
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
      <StoryActions legend={legend} className="poster-card-actions" />
    </motion.div>
  );
}

export default LegendCard;
