import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  getShowcaseModels,
  mapScenesToShowcaseItems,
} from '../../services/modelShowcaseService.js';

const Model3DViewer = lazy(() => import('./Model3DViewer.jsx'));

// Vertical scroll distance for the pinned carousel = viewport + maxX * SCROLL_RATIO.
// < 1 tightens the pin so the cards traverse fully with less "dead" vertical scroll.
const SCROLL_RATIO = 0.6;

function CubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 2.5 21 7v10l-9 4.5L3 17V7l9-4.5Z" strokeLinejoin="round" />
      <path d="M3 7l9 4.5L21 7M12 11.5V21.5" strokeLinejoin="round" />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M9 6h9v9M18 6 6 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function normalizeLabel(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ShowcaseCard({ item, onOpen }) {
  const disabled = !item.modelUrl;
  const showLegendTitle = item.legendTitle && normalizeLabel(item.legendTitle) !== normalizeLabel(item.name);
  const content = (
    <>
      <span className="model-showcase-poster" style={{ background: item.background }}>
        {item.poster ? (
          <img
            className="model-showcase-poster-img"
            src={item.poster}
            alt={`Vista previa de ${item.name}`}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : (
          <span className="model-showcase-poster-fallback" aria-hidden="true">
            <CubeIcon />
          </span>
        )}
        <span className="model-showcase-badge">3D</span>
        {!disabled && (
          <span className="model-showcase-open" aria-hidden="true">
            <OpenIcon />
          </span>
        )}
        {disabled && <span className="model-showcase-soon">Proximamente</span>}
      </span>
      <span className="model-showcase-meta">
        <span className="model-showcase-name">{item.name}</span>
        {showLegendTitle && <span className="model-showcase-legend">{item.legendTitle}</span>}
      </span>
    </>
  );

  return (
    <article className={`model-showcase-card${disabled ? ' is-disabled' : ''}`}>
      {disabled ? (
        <div className="model-showcase-card-button" aria-disabled="true">
          {content}
        </div>
      ) : (
        <button
          type="button"
          className="model-showcase-card-button"
          onClick={() => onOpen(item)}
          aria-label={`Abrir modelo 3D: ${item.name}`}
        >
          {content}
        </button>
      )}
    </article>
  );
}

function ModelShowcaseSection({
  models = null,
  scenes = null,
  ariaLabel = 'Galeria de modelos 3D',
}) {
  const providedItems = useMemo(() => {
    if (Array.isArray(models)) return models;
    if (Array.isArray(scenes)) return mapScenesToShowcaseItems(scenes);
    return null;
  }, [models, scenes]);

  const [items, setItems] = useState(providedItems || []);
  const [loading, setLoading] = useState(!providedItems);
  const [pinned, setPinned] = useState(false);
  const [pinHeight, setPinHeight] = useState(null);
  const [openItem, setOpenItem] = useState(null);

  const sectionRef = useRef(null);
  const stickyRef = useRef(null);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);

  useEffect(() => {
    if (providedItems) return undefined;
    let active = true;
    setLoading(true);
    getShowcaseModels()
      .then((result) => {
        if (active) setItems(result.data || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [providedItems]);

  useEffect(() => {
    if (providedItems) setItems(providedItems);
  }, [providedItems]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compute = () => setPinned(window.innerWidth >= 768 && !motionQuery.matches);
    compute();
    window.addEventListener('resize', compute);
    motionQuery.addEventListener?.('change', compute);
    return () => {
      window.removeEventListener('resize', compute);
      motionQuery.removeEventListener?.('change', compute);
    };
  }, []);

  useEffect(() => {
    if (!pinned) {
      setPinHeight(null);
      return undefined;
    }

    const measure = () => {
      const viewport = viewportRef.current;
      const track = trackRef.current;
      if (!viewport || !track) return;
      const maxX = Math.max(track.scrollWidth - viewport.clientWidth, 0);
      setPinHeight(window.innerHeight + maxX * SCROLL_RATIO);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [pinned, items.length, loading]);

  useEffect(() => {
    if (!pinned) {
      if (trackRef.current) trackRef.current.style.transform = '';
      if (stickyRef.current) {
        stickyRef.current.style.position = '';
        stickyRef.current.style.top = '';
        stickyRef.current.style.bottom = '';
      }
      return undefined;
    }

    const update = () => {
      const section = sectionRef.current;
      const viewport = viewportRef.current;
      const track = trackRef.current;
      const pin = stickyRef.current;
      if (!section || !viewport || !track || !pin) return;

      const rect = section.getBoundingClientRect();
      const travelTotal = Math.max(section.offsetHeight - window.innerHeight, 1);
      const scrolled = Math.min(Math.max(-rect.top, 0), travelTotal);
      const progress = scrolled / travelTotal;
      const maxX = Math.max(track.scrollWidth - viewport.clientWidth, 0);

      // JS-driven pin using position:fixed. The app's global `overflow-x: hidden`
      // turns #root/body into scroll containers, which breaks position:sticky; a
      // fixed pin is relative to the viewport and immune to that. Three phases:
      // before the zone -> absolute at top, inside -> fixed, after -> absolute at bottom.
      if (rect.top > 0) {
        pin.style.position = 'absolute';
        pin.style.top = '0';
        pin.style.bottom = 'auto';
      } else if (-rect.top < travelTotal) {
        pin.style.position = 'fixed';
        pin.style.top = '0';
        pin.style.bottom = 'auto';
      } else {
        pin.style.position = 'absolute';
        pin.style.top = 'auto';
        pin.style.bottom = '0';
      }

      // Track the scroll 1:1 — no smoothing and no snapping.
      track.style.transform = `translate3d(${(-(progress * maxX)).toFixed(2)}px, 0, 0)`;
      section.style.setProperty('--sc-progress', progress.toFixed(4));
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [pinned, pinHeight, items.length]);

  useEffect(() => {
    if (!openItem) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [openItem]);

  const sectionStyle = pinned && pinHeight ? { height: `${pinHeight}px` } : undefined;

  return (
    <section
      ref={sectionRef}
      className={`model-showcase ${pinned ? 'is-pinned' : 'is-strip'}`}
      style={sectionStyle}
      aria-label={ariaLabel}
    >
      <div className="model-showcase-sticky" ref={stickyRef}>
        <div className="model-showcase-a11y">
          <h2>Galeria de piezas 3D</h2>
        </div>

        {pinned && items.length > 0 && (
          <div className="model-showcase-progress" aria-hidden="true">
            <span />
          </div>
        )}

        {loading ? (
          <div className="model-showcase-status">
            <span className="model-showcase-spinner" aria-hidden="true" />
            <span>Cargando modelos 3D...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="model-showcase-status">Aun no hay modelos 3D publicados.</div>
        ) : (
          <div className="model-showcase-viewport" ref={viewportRef}>
            <div className="model-showcase-track" ref={trackRef}>
              {items.map((item) => (
                <ShowcaseCard key={item.id} item={item} onOpen={setOpenItem} />
              ))}
            </div>
          </div>
        )}
      </div>

      {openItem && (
        <Suspense fallback={null}>
          <Model3DViewer
            scene={openItem.scene}
            modelUrl={openItem.modelUrl}
            title={openItem.name}
            onClose={() => setOpenItem(null)}
          />
        </Suspense>
      )}
    </section>
  );
}

export default ModelShowcaseSection;
