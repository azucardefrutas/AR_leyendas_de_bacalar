import React from 'react';
import AppIcon from '../ui/AppIcon.jsx';
import BackButton from '../ui/BackButton.jsx';

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
          <div className="legend-hero__cover">
            {coverImage ? (
              <img src={coverImage} alt={`Portada de ${title}`} loading="lazy" />
            ) : (
              <div className="legend-hero__cover-fallback">
                <span>{title?.slice(0, 2).toUpperCase()}</span>
              </div>
            )}
          </div>

          <div className="legend-hero__info">
            {badgeLabel && (
              <span className={`legend-hero__badge ${isFree ? 'is-free' : 'is-premium'}`}>
                {badgeLabel}
              </span>
            )}

            <h1 className="legend-hero__title">{title}</h1>

            {author && <p className="legend-hero__author">{author}</p>}

            {location && (
              <p className="legend-hero__location">
                <AppIcon name="location_on" size={18} />
                <span>{location}</span>
              </p>
            )}

            {chips.length > 0 && (
              <div className="legend-hero__chips">
                {chips.map((chip, index) => (
                  <span className="legend-chip" key={`${chip}-${index}`}>{chip}</span>
                ))}
              </div>
            )}

            {description && <p className="legend-hero__synopsis">{description}</p>}

            {actions && <div className="legend-hero__actions">{actions}</div>}

            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
