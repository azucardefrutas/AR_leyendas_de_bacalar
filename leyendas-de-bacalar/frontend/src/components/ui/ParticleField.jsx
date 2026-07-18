import React, { useEffect, useRef } from 'react';

/**
 * Campo de partículas "antigravity": motas de luz que ascienden lentamente, como
 * bioluminiscencia subiendo por el agua de un cenote. Canvas puro, sin dependencias.
 *
 * Rendimiento: cada mota se pinta con un sprite de brillo pre-renderizado (drawImage),
 * no con shadowBlur por frame. Respeta prefers-reduced-motion (pinta un frame estático)
 * y pausa la animación cuando la pestaña no está visible.
 */
const COLORS = [
  'rgba(121, 219, 220,', // #79dbdc
  'rgba(109, 189, 230,', // #6dbde6
  'rgba(165, 242, 243,', // #a5f2f3
  'rgba(142, 214, 238,', // #8ed6ee
];

function makeSprite(colorPrefix) {
  const s = document.createElement('canvas');
  s.width = s.height = 64;
  const g = s.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, `${colorPrefix} 1)`);
  grd.addColorStop(0.28, `${colorPrefix} 0.55)`);
  grd.addColorStop(1, `${colorPrefix} 0)`);
  g.fillStyle = grd;
  g.beginPath();
  g.arc(32, 32, 32, 0, Math.PI * 2);
  g.fill();
  return s;
}

export default function ParticleField({ className }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sprites = COLORS.map(makeSprite);
    let w = 0;
    let h = 0;
    let dpr = 1;
    let particles = [];
    let raf = 0;

    const spawn = (fromBottom) => {
      const r = Math.random() * 2.4 + 0.7;
      const ci = (Math.random() * COLORS.length) | 0;
      return {
        x: Math.random() * w,
        y: fromBottom ? h + Math.random() * 60 : Math.random() * h,
        r,
        vy: -(Math.random() * 0.34 + 0.1) * (r / 2.4 + 0.5),
        vx: (Math.random() - 0.5) * 0.14,
        base: Math.random() * 0.45 + 0.18,
        tw: Math.random() * Math.PI * 2,
        tws: Math.random() * 0.02 + 0.008,
        sprite: sprites[ci],
      };
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(80, Math.max(24, Math.floor((w * h) / 15000)));
      particles = Array.from({ length: count }, () => spawn(false));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        if (!reduce) {
          p.y += p.vy;
          p.x += p.vx;
          p.tw += p.tws;
          if (p.y < -14 || p.x < -14 || p.x > w + 14) Object.assign(p, spawn(true));
        }
        const alpha = p.base * (0.6 + 0.4 * Math.sin(p.tw));
        const size = p.r * 9;
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.drawImage(p.sprite, p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      draw();
      raf = window.requestAnimationFrame(loop);
    };

    resize();
    if (reduce) {
      draw();
    } else {
      raf = window.requestAnimationFrame(loop);
    }

    const onResize = () => resize();
    const onVisibility = () => {
      window.cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) raf = window.requestAnimationFrame(loop);
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
