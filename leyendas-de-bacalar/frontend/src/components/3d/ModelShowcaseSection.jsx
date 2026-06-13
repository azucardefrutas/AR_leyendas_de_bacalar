import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  getShowcaseModels,
  mapScenesToShowcaseItems,
} from '../../services/modelShowcaseService.js';

// Heavy three.js / react-three viewer is only fetched when a card is opened.
const Model3DViewer = lazy(() => import('./Model3DViewer.jsx'));

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

function ShowcaseCard({ item, onOpen }) {
  const disabled = !item.modelUrl;
  const content = (
    <>
      <span className="model-showcase-poster" style={{ backgroundColor: item.backgroundColor }}>
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
        {disabled && <span className="model-showcase-soon">Próximamente</span>}
      </span>
      <span className="model-showcase-meta">
        <span className="model-showcase-name">{item.name}</span>
        {item.legendTitle && <span className="model-showcase-legend">{item.legendTitle}</span>}
      </span>
    </>
  );

  if (disabled) {
    return (
      <div className="model-showcase-card is-disabled" aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="model-showcase-card"
      onClick={() => onOpen(item)}
      aria-label={`Abrir modelo 3D: ${item.name}`}
    >
      {content}
    </button>
  );
}

/**
 * Premium, scroll-driven 3D model gallery.
 *
 * On desktop (and when reduced-motion is off) the section is pinned (sticky) and
 * vertical scroll translates the card track horizontally. On small screens or with
 * reduced motion it degrades to a normal horizontal-scroll strip. No Canvas is
 * mounted per card — the real Model3DViewer is lazy-loaded only when a card opens.
 *
 * Accepts `models` or `scenes`; if neither is provided it self-fetches via
 * modelShowcaseService (deferred until the section is near the viewport).
 */
function ModelShowcaseSection({
  models = null,
  scenes = null,
  title = 'Modelos 3D',
  subtitle = '',
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
  const trackRef = useRef(null);

  // Fetch the showcase models on mount (metadata + lazy posters are light; the
  // heavy GLBs still load only when a card is opened). The service self-limits
  // with a timeout, so this never hangs.
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

  // Decide pinned (scroll-driven carousel) vs strip (manual horizontal scroll).
  // Desktop/tablet get the pinned carousel; phones get a touch-friendly strip.
  // Uses innerWidth + resize so it stays correct across window/viewport changes.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const compute = () => setPinned(window.innerWidth >= 768);
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // Measure how much extra vertical scroll the pinned section needs to traverse
  // the full horizontal track (1px vertical ≈ 1px horizontal).
  useEffect(() => {
    if (!pinned) {
      setPinHeight(null);
      return undefined;
    }
    const measure = () => {
      const track = trackRef.current;
      if (!track) return;
      const maxX = Math.max(track.scrollWidth - track.clientWidth, 0);
      setPinHeight(window.innerHeight + maxX);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [pinned, items.length, loading]);

  // Map vertical scroll progress to horizontal track translation (rAF-throttled).
  useEffect(() => {
    if (!pinned) {
      if (trackRef.current) trackRef.current.style.transform = '';
      return undefined;
    }
    const update = () => {
      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track) return;
      const rect = section.getBoundingClientRect();
      const total = section.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 0));
      const progress = total > 0 ? scrolled / total : 0;
      const maxX = Math.max(track.scrollWidth - track.clientWidth, 0);
      track.style.transform = `translate3d(${-(progress * maxX)}px, 0, 0)`;
    };
    // Update directly on scroll (one rect read + one transform write). Capture
    // phase so we catch scroll no matter which element actually scrolls (this app
    // makes the scroll happen off `window` via `overflow-x: hidden` on #root/body),
    // and no rAF dependency so it works even where rAF is throttled.
    update();
    window.addEventListener('scroll', update, { passive: true, capture: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
    };
  }, [pinned, pinHeight, items.length]);

  // Lock background scroll while the viewer overlay is open.
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
      aria-label={title}
    >
      <div className="model-showcase-sticky">
        <div className="model-showcase-head">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>

        {loading ? (
          <div className="model-showcase-status">
            <span className="model-showcase-spinner" aria-hidden="true" />
            <span>Cargando modelos 3D…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="model-showcase-status">Aún no hay modelos 3D publicados.</div>
        ) : (
          <div className="model-showcase-viewport">
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
