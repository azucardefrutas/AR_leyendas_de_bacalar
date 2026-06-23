import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../../styles/siteFooter.css';

// TODO: replace these placeholders with the real Leyendas de Bacalar profile URLs.
const SOCIAL = {
  facebook: 'https://www.facebook.com/Upbacalar/?ref=embed_page',
  tiktok: 'https://www.tiktok.com/@upbacalar?is_from_webapp=1&sender_device=pc',
};

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.56v1.87h2.78l-.44 2.91h-2.34V22A9.99 9.99 0 0 0 22 12.06Z" />
    </svg>
  );
}

function TiktokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.1 3h2.82c.27 1.66 1.27 3.13 2.68 4 .63.39 1.34.65 2.06.74v2.86c-1.66 0-3.27-.52-4.6-1.45v6.4a6.45 6.45 0 1 1-6.45-6.45c.34 0 .68.03 1.01.09v2.93a3.55 3.55 0 1 0 2.48 3.38V3Z" />
    </svg>
  );
}

function SiteFooter() {
  const year = new Date().getFullYear();
  const footerRef = useRef(null);
  const cloudsRef = useRef(null);

  // Scroll-coupled parallax: the cloud layer drifts as the footer moves through the
  // viewport. Only wired up while the footer is on screen, and skipped entirely for
  // users who prefer reduced motion.
  useEffect(() => {
    const footer = footerRef.current;
    const clouds = cloudsRef.current;
    if (!footer || !clouds) return undefined;
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    let ticking = false;

    const apply = () => {
      ticking = false;
      const rect = footer.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const progress = (vh - rect.top) / (vh + rect.height);
      const clamped = Math.min(Math.max(progress, 0), 1);
      const y = (0.5 - clamped) * 90; // ~ -45px .. +45px
      clouds.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(1.08)`;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(apply);
      }
    };

    let observer;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            window.addEventListener('scroll', onScroll, { passive: true });
            apply();
          } else {
            window.removeEventListener('scroll', onScroll);
          }
        },
        { rootMargin: '120px' },
      );
      observer.observe(footer);
    } else {
      window.addEventListener('scroll', onScroll, { passive: true });
      apply();
    }

    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <footer ref={footerRef} className="site-footer" aria-labelledby="site-footer-brand">
      <div ref={cloudsRef} className="site-footer-clouds" aria-hidden="true" />
      <div className="site-footer-clouds-overlay" aria-hidden="true" />

      <span className="site-footer-edge site-footer-edge-left" aria-hidden="true">Leyendas · 2026</span>
      <span className="site-footer-edge site-footer-edge-right" aria-hidden="true">Bacalar · AR</span>

      <div className="site-footer-inner">
        <h2 id="site-footer-brand" className="site-footer-wordmark">
          <span>Leyendas</span>
          <span>Bacalar</span>
        </h2>

        <div className="site-footer-bar">
          <p className="site-footer-copy">
            &copy; {year} Leyendas de Bacalar Con AR, All rights reserved.
          </p>

          <div className="site-footer-social">
            <a
              href={SOCIAL.facebook}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Facebook de Leyendas de Bacalar"
            >
              <FacebookIcon />
            </a>
            <a
              href={SOCIAL.tiktok}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="TikTok de Leyendas de Bacalar"
            >
              <TiktokIcon />
            </a>
          </div>
        </div>

        <nav className="site-footer-links" aria-label="Enlaces del pie de pagina">
          <Link to="/privacy">Privacidad</Link>
          <a href="tel:+529831281591">Contacto</a>
          <Link to="/terms">Terminos</Link>
        </nav>
      </div>
    </footer>
  );
}

export default SiteFooter;
