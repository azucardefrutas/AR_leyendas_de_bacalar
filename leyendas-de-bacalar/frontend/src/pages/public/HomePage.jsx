import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ModelShowcaseSection from '../../components/3d/ModelShowcaseSection.jsx';
import Button from '../../components/ui/Button.jsx';
import LandingIntroOverlay from '../../components/landing/LandingIntroOverlay.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getLoginPathForRedirect } from '../../utils/authRedirect.js';

// Lazy: the hero's 3D book pulls in the whole three.js stack. Loading it on demand
// keeps it out of the initial bundle so the hero copy + CTAs paint immediately; the
// book then streams into the same stage (the placeholder reserves its space).
const FloatingBook = lazy(() => import('../../components/3d/FloatingBook.jsx'));

function HomePage() {
  const { isAuthenticated } = useAuth();
  const redeemPath = isAuthenticated ? '/reader/redeem' : getLoginPathForRedirect('/reader/redeem');
  const [introDone, setIntroDone] = useState(false);

  // Defer the heavy three.js chunk so it never competes with the hero's first
  // paint: keep the placeholder until the book stage scrolls into view. The book
  // lives in the hero, so a guaranteed idle fallback also reveals it shortly after
  // first paint even where IntersectionObserver never fires (prerender/headless) —
  // the hero book must always appear.
  const bookStageRef = useRef(null);
  const [showBook, setShowBook] = useState(false);

  useEffect(() => {
    const node = bookStageRef.current;
    if (!node || showBook) return undefined;

    let done = false;
    const reveal = () => {
      if (!done) {
        done = true;
        setShowBook(true);
      }
    };

    let observer;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) reveal();
        },
        { rootMargin: '200px' },
      );
      observer.observe(node);
    }

    const idleId = typeof window.requestIdleCallback === 'function'
      ? window.requestIdleCallback(reveal, { timeout: 1500 })
      : window.setTimeout(reveal, 1200);

    return () => {
      observer?.disconnect();
      if (typeof window.cancelIdleCallback === 'function' && typeof window.requestIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId);
      }
    };
  }, [showBook]);

  return (
    <main className="home-page">
      {!introDone && <LandingIntroOverlay onFinish={() => setIntroDone(true)} />}

      <section className="home-hero">
        <div className="hero-background" aria-hidden="true" />
        <div className="hero-content">
          <div className="home-hero-copy">
            <p className="eyebrow">Bienvenido a</p>
            <h1>Leyendas de Bacalar</h1>
            <p>
              Explora las leyendas, mitos y relatos que forman parte de nuestra cultura.
              Una biblioteca cultural para descubrir Bacalar desde sus relatos, memorias y misterios.
            </p>
            <div className="actions-row">
              <Link to="/catalog"><Button className="btn-hero">Explorar biblioteca</Button></Link>
              <Link to={redeemPath}><Button variant="ghost">Canjear codigo</Button></Link>
            </div>
          </div>

          <div className="home-book-stage" ref={bookStageRef}>
            {showBook ? (
              <Suspense fallback={<div className="floating-book-shell" aria-hidden="true" />}>
                <FloatingBook />
              </Suspense>
            ) : (
              <div className="floating-book-shell" aria-hidden="true" />
            )}
          </div>
        </div>
      </section>

      <ModelShowcaseSection ariaLabel="Galeria de modelos 3D de Leyendas de Bacalar" />

      <div className="home-content-spacer" id="acerca" aria-hidden="true" />
    </main>
  );
}

export default HomePage;
