import React, { useEffect, useRef, useState } from 'react';
import '../../styles/landingIntro.css';

// No project video exists; a montage of real Bacalar/UPB photos plays inside a central
// window. The window ADAPTS its size to each photo's aspect ratio, so every image fills
// it edge-to-edge (object-fit: cover) with NO empty/blurred side bars and WITHOUT being
// cropped: when the frame matches the photo, "cover" shows it whole. The frame eases
// between sizes as photos cross-fade (a subtle cinematic "breathing").
// Order builds an arc: lagoon -> Day of the Dead -> UPB -> Fuerte -> legends collage (climax).
const MEDIA = [
  '/landing-intro/display-motion/1.jpg', // Laguna de Bacalar
  '/landing-intro/display-motion/2_nuevo_.webp', // Dia de Muertos (nuevo)
  '/landing-intro/display-motion/Universidad-politecnica.webp', // Universidad Politecnica de Bacalar
  '/landing-intro/display-motion/fuerte-san-felipe.webp', // Fuerte de San Felipe (Bacalar)
  '/landing-intro/display-motion/collage_final.png', // Collage de leyendas (climax)
];

// Aspect ratio (w/h) of each photo above — fallback used until the real image loads and
// we measure it (onLoad). The window sizes itself to the current photo's aspect.
const ASPECTS = [1.667, 1.777, 1.469, 1.333, 1.5];

// Timeline (ms). The window opens SLOWLY (grand, ~1.6s), the photos cycle while the
// frame eases to each one's shape, then the last image DWELLS before expanding.
const SPLIT_AT = 1400;        // curtain parts and the window opens (slow: 1.6s)
const MEDIA_STEP_MS = 1300;   // calmer montage; the frame breathes to each photo
const EXPAND_AT = 7600;       // reach the collage (~6600), dwell ~1s, then expand
const OUTRO_AT = 9000;        // window has filled the screen; fade the layer out
const FINISH_AT = 9700;       // unmount, revealing the home

function prefersReducedMotion() {
  return Boolean(
    typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
}

/**
 * Cinematic landing intro overlay (Humbe-style). On a solid #00626f field the
 * stacked words "LEYENDAS / BACALAR" part like a curtain (left half slides left,
 * right half slides right) to reveal a central media window that plays a montage
 * of real Bacalar photos, which then expands to full screen before the layer
 * fades out to reveal the existing home untouched underneath.
 */
function LandingIntroOverlay({ onFinish }) {
  const [phase, setPhase] = useState('enter');
  const [mediaIndex, setMediaIndex] = useState(0);
  const [aspects, setAspects] = useState(ASPECTS);
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));
  const timers = useRef([]);
  const montageRef = useRef(null);
  const finishedRef = useRef(false);
  const reducedRef = useRef(prefersReducedMotion());

  function clearTimers() {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current = [];
    if (montageRef.current) {
      clearInterval(montageRef.current);
      montageRef.current = null;
    }
  }

  function finish() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (onFinish) onFinish();
  }

  function skip() {
    if (finishedRef.current) return;
    clearTimers();
    setMediaIndex(MEDIA.length - 1);
    setPhase('outro');
    timers.current.push(setTimeout(finish, 700));
  }

  // Advance the photo montage (starts when the curtain opens).
  function startMontage() {
    setMediaIndex(0);
    let index = 0;
    montageRef.current = setInterval(() => {
      index += 1;
      if (index >= MEDIA.length - 1) {
        setMediaIndex(MEDIA.length - 1);
        clearInterval(montageRef.current);
        montageRef.current = null;
      } else {
        setMediaIndex(index);
      }
    }, MEDIA_STEP_MS);
  }

  // When a photo loads, measure its TRUE aspect so the window fits it exactly (this
  // corrects the ASPECTS fallback if an image is ever swapped for another shape).
  function handlePhotoLoad(index, img) {
    const a = img.naturalWidth / img.naturalHeight;
    if (!a || !Number.isFinite(a)) return;
    setAspects((prev) => {
      if (Math.abs((prev[index] || 0) - a) < 0.005) return prev;
      const next = prev.slice();
      next[index] = a;
      return next;
    });
  }

  useEffect(() => {
    if (reducedRef.current) {
      setMediaIndex(MEDIA.length - 1);
      timers.current.push(setTimeout(() => setPhase('split'), 300));
      timers.current.push(setTimeout(() => setPhase('expand'), 900));
      timers.current.push(setTimeout(() => setPhase('outro'), 1700));
      timers.current.push(setTimeout(finish, 2300));
    } else {
      timers.current.push(setTimeout(() => setPhase('split'), SPLIT_AT));
      timers.current.push(setTimeout(() => setPhase('expand'), EXPAND_AT));
      timers.current.push(setTimeout(() => setPhase('outro'), OUTRO_AT));
      timers.current.push(setTimeout(finish, FINISH_AT));
      timers.current.push(setTimeout(startMontage, SPLIT_AT));
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') skip();
    }
    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('landing-intro-active');

    return () => {
      clearTimers();
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove('landing-intro-active');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the adaptive window sized correctly when the viewport changes.
  useEffect(() => {
    function onResize() {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Size the window to the CURRENT photo's aspect: fill the height budget, unless that
  // would exceed 92vw (then fit the width instead). Closed = 0 width; expanded = full
  // screen. Because the frame matches the photo, object-fit: cover fills it with no
  // empty bars and no real crop.
  const aspect = aspects[mediaIndex] || 1.6;
  const hFactor = viewport.w <= 640 ? 0.42 : viewport.w <= 1024 ? 0.5 : 0.6;
  let boxH = viewport.h * hFactor;
  let boxW = boxH * aspect;
  const maxW = viewport.w * 0.92;
  if (boxW > maxW) {
    boxW = maxW;
    boxH = boxW / aspect;
  }
  const windowStyle = phase === 'enter'
    ? { width: 0, height: Math.round(boxH) }
    : phase === 'split'
      ? { width: Math.round(boxW), height: Math.round(boxH) }
      : { width: '100vw', height: '100vh' };

  return (
    <section
      className={`lbi-overlay phase-${phase}`}
      role="dialog"
      aria-label="Intro de Leyendas de Bacalar"
      onClick={skip}
    >
      <div className="lbi-bg" aria-hidden="true" />

      <div className="lbi-media" aria-hidden="true">
        <div className="lbi-window" style={windowStyle}>
          {MEDIA.map((src, index) => (
            <div
              key={src}
              className={`lbi-media-slide ${index === mediaIndex ? 'active' : ''}`}
            >
              {/* Foto completa: el marco ya calza su proporcion, asi que cover la
                  llena de borde a borde sin barras ni recorte. */}
              <img
                className="lbi-media-photo"
                src={src}
                alt=""
                draggable={false}
                onLoad={(e) => handlePhotoLoad(index, e.currentTarget)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="lbi-title-wrap" aria-hidden="true">
        <div className="lbi-title lbi-title-left">
          <span>Leyendas</span>
          <span>Bacalar</span>
        </div>
        <div className="lbi-title lbi-title-right">
          <span>Leyendas</span>
          <span>Bacalar</span>
        </div>
      </div>

      {/* Sin boton de "saltar": se salta con un click en cualquier parte de la capa
          (onClick del <section>) o con la tecla Escape. */}
    </section>
  );
}

export default LandingIntroOverlay;
