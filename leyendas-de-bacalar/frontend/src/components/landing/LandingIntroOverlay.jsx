import React, { useEffect, useRef, useState } from 'react';
import '../../styles/landingIntro.css';

// No project video exists; a montage of real Bacalar/UPB photos plays inside the
// masked window (Ken-Burns + crossfade) to recreate the "moving footage" feel.
// Order builds an arc: lagoon -> Day of the Dead -> UPB -> legends collage (climax).
const MEDIA = [
  '/landing-intro/display-motion/1.jpg', // Laguna de Bacalar
  '/landing-intro/display-motion/2.jpg', // Dia de Muertos
  '/landing-intro/display-motion/3.png', // Universidad Politecnica de Bacalar
  '/landing-intro/display-motion/collage_final.png', // Collage de leyendas
];

// Timeline (ms). The window opens with the curtain, the photos cycle, then the
// last image DWELLS in the window for a moment before everything expands.
const SPLIT_AT = 1300;        // curtain opens, window + first photo appear
const MEDIA_STEP_MS = 950;    // montage: lagoon -> muertos -> UPB -> collage (~4150ms)
const EXPAND_AT = 5850;       // ~1.7s dwell on the open window before it expands
const OUTRO_AT = 7050;        // fade the layer out
const FINISH_AT = 7800;       // unmount, revealing the home

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

  return (
    <section
      className={`lbi-overlay phase-${phase}`}
      role="dialog"
      aria-label="Intro de Leyendas de Bacalar"
      onClick={skip}
    >
      <div className="lbi-bg" aria-hidden="true" />

      <div className="lbi-media" aria-hidden="true">
        {MEDIA.map((src, index) => (
          <img
            key={src}
            className={`lbi-media-img ${index === mediaIndex ? 'active' : ''}`}
            src={src}
            alt=""
            draggable={false}
          />
        ))}
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

      <button
        type="button"
        className="lbi-skip"
        onClick={(event) => {
          event.stopPropagation();
          skip();
        }}
      >
        Saltar intro
      </button>
    </section>
  );
}

export default LandingIntroOverlay;
