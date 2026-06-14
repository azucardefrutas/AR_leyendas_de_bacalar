import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  getShowcaseModels,
  mapScenesToShowcaseItems,
} from '../../services/modelShowcaseService.js';

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
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const targetXRef = useRef(0);
  const currentXRef = useRef(0);
  const frameRef = useRef(null);
  const snapTimeoutRef = useRef(null);
  const snappingRef = useRef(false);

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
      setPinHeight(window.innerHeight + maxX);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [pinned, items.length, loading]);

  useEffect(() => {
    if (!pinned) {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      targetXRef.current = 0;
      currentXRef.current = 0;
      if (trackRef.current) trackRef.current.style.transform = '';
      if (snapTimeoutRef.current) window.clearTimeout(snapTimeoutRef.current);
      snapTimeoutRef.current = null;
      return undefined;
    }

    const animate = () => {
      const track = trackRef.current;
      if (!track) {
        frameRef.current = null;
        return;
      }

      const delta = targetXRef.current - currentXRef.current;
      currentXRef.current += delta * 0.16;
      if (Math.abs(delta) < 0.35) currentXRef.current = targetXRef.current;
      track.style.transform = `translate3d(${-currentXRef.current}px, 0, 0)`;

      if (Math.abs(targetXRef.current - currentXRef.current) > 0.35) {
        frameRef.current = window.requestAnimationFrame(animate);
      } else {
        frameRef.current = null;
      }
    };

    const queueAnimation = () => {
      if (!frameRef.current) frameRef.current = window.requestAnimationFrame(animate);
    };

    const update = () => {
      const section = sectionRef.current;
      const viewport = viewportRef.current;
      const track = trackRef.current;
      if (!section || !viewport || !track) return;

      const rect = section.getBoundingClientRect();
      const total = Math.max(section.offsetHeight - window.innerHeight, 1);
      const travelTotal = total;
      const rawScrolled = Math.max(-rect.top, 0);
      const scrolled = Math.min(rawScrolled, travelTotal);
      const progress = scrolled / travelTotal;
      const maxX = Math.max(track.scrollWidth - viewport.clientWidth, 0);
      targetXRef.current = progress * maxX;
      section.style.setProperty('--sc-progress', progress.toFixed(4));
      queueAnimation();

      if (snapTimeoutRef.current) window.clearTimeout(snapTimeoutRef.current);
      if (!snappingRef.current && items.length > 1 && maxX > 0 && rawScrolled > 0 && rawScrolled < travelTotal) {
        snapTimeoutRef.current = window.setTimeout(() => {
          const cards = Array.from(track.querySelectorAll('.model-showcase-card'));
          if (!cards.length) return;

          const currentX = progress * maxX;
          const viewportCenter = viewport.clientWidth / 2;
          const snapPoints = cards.map((card) => {
            const cardCenter = card.offsetLeft + card.offsetWidth / 2;
            return Math.min(Math.max(cardCenter - viewportCenter, 0), maxX);
          });
          const nearestX = snapPoints.reduce((nearest, point) => (
            Math.abs(point - currentX) < Math.abs(nearest - currentX) ? point : nearest
          ), snapPoints[0]);
          const sectionTop = window.scrollY + rect.top;
          const targetScrollTop = sectionTop + (nearestX / maxX) * travelTotal;

          snappingRef.current = true;
          window.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
          window.setTimeout(() => {
            snappingRef.current = false;
          }, 520);
        }, 150);
      }
    };

    update();
    window.addEventListener('scroll', update, { passive: true, capture: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      if (snapTimeoutRef.current) window.clearTimeout(snapTimeoutRef.current);
      frameRef.current = null;
      snapTimeoutRef.current = null;
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
      <div className="model-showcase-sticky">
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
