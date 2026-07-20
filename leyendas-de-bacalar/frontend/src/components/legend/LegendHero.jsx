import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import AppIcon from '../ui/AppIcon.jsx';
import BackButton from '../ui/BackButton.jsx';
import Picture from '../ui/Picture.jsx';
import { resizedImageUrl, onImageError } from '../../utils/imageUrl.js';

const infoStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 240, damping: 26 } },
};
const coverStyle = { willChange: 'transform, opacity' };

/**
 * Cinematic, streaming-style hero (Disney+/Netflix feel) for a legend.
 * Presentational and reusable: the page passes data + the action buttons as
 * `actions`, so all business logic stays in the page, never baked into one legend.
 */
export default function LegendHero({
  title,
  author,
  location,
  description,
  coverImage,
  bannerImage,
  badgeLabel,
  isFree = false,
  chips = [],
  backTo,
  onBack,
  backLabel = 'Regresar',
  actions,
  children,
}) {
  const reduce = useReducedMotion();
  const containerProps = reduce ? {} : { variants: infoStagger, initial: 'hidden', animate: 'visible' };
  const itemProps = reduce ? {} : { variants: item };
  const coverProps = reduce
    ? {}
    : { initial: { opacity: 0, scale: 0.92 }, animate: { opacity: 1, scale: 1 }, transition: { type: 'spring', stiffness: 200, damping: 24, delay: 0.05 } };

  return (
    <section className="legend-hero">
      <div
        className="legend-hero__backdrop"
        style={bannerImage ? { backgroundImage: `url("${bannerImage}")` } : undefined}
        aria-hidden="true"
      />
      <div className="legend-hero__overlay" aria-hidden="true" />

      <div className="legend-hero__content">
        {(backTo || onBack) && (
          <BackButton
            to={backTo}
            onClick={onBack}
            label={backLabel}
            variant="glass"
            className="legend-hero__back"
          />
        )}

        <div className="legend-hero__layout">
          <motion.div className="legend-hero__cover" style={coverStyle} {...coverProps}>
            {coverImage ? (
              <Picture src={resizedImageUrl(coverImage, 900)} alt={`Portada de ${title}`} loading="lazy" decoding="async" onError={(e) => onImageError(e, coverImage)} />
            ) : (
              <div className="legend-hero__cover-fallback">
                <span>{title?.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
          </motion.div>

          <motion.div className="legend-hero__info" {...containerProps}>
            {badgeLabel && (
              <motion.span className={`legend-hero__badge ${isFree ? 'is-free' : 'is-premium'}`} {...itemProps}>
                {badgeLabel}
              </motion.span>
            )}

            <motion.h1 className="legend-hero__title" {...itemProps}>{title}</motion.h1>

            {author && <motion.p className="legend-hero__author" {...itemProps}>{author}</motion.p>}

            {location && (
              <motion.p className="legend-hero__location" {...itemProps}>
                <AppIcon name="location_on" size={18} />
                <span>{location}</span>
              </motion.p>
            )}

            {chips.length > 0 && (
              <motion.div className="legend-hero__chips" {...itemProps}>
                {chips.map((chip, index) => (
                  <span className="legend-chip" key={`${chip}-${index}`}>{chip}</span>
                ))}
              </motion.div>
            )}

            {description && <motion.p className="legend-hero__synopsis" {...itemProps}>{description}</motion.p>}

            {actions && <motion.div className="legend-hero__actions" {...itemProps}>{actions}</motion.div>}

            {children}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
