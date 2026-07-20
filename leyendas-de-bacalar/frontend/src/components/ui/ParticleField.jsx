import React, { useEffect, useRef } from 'react';

/**
 * Campo de particulas tipo "antigravity": pequenos TRAZOS de colores que orbitan
 * lentamente, cada uno orientado en la direccion del giro. El color depende del ANGULO,
 * asi que la rueda de color queda fija en el espacio mientras las particulas la cruzan.
 *
 * Interaccion con el cursor: cada particula esta atada a su posicion de origen por un
 * MUELLE. El cursor la empuja, pero el muelle la regresa enseguida -> se dispersan y
 * vuelven, sin dejar un hueco vacio siguiendo al raton. Ademas, las cercanas al cursor
 * brillan y se estiran, para que la reaccion se vea sin necesidad de vaciar la zona.
 * Canvas puro, sin dependencias.
 */
const POINTER_RADIUS = 170; // radio de influencia del cursor en px
const POINTER_PUSH = 0.6; // impulso del empuje
const SPRING = 0.03; // fuerza del muelle de regreso (mas alto = vuelven antes)
const DAMP = 0.88; // amortiguacion (evita que reboten sin parar)

// Rueda de color completa, precalculada en cortes de 4 grados para no crear strings
// de color en cada frame.
function buildColorLUT(sat, light) {
  const lut = [];
  for (let deg = 0; deg < 360; deg += 4) lut.push(`hsl(${deg}, ${sat}%, ${light}%)`);
  return lut;
}

export default function ParticleField({ className, saturation = 78, lightness = 66 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const COLORS = buildColorLUT(saturation, lightness);
    let w = 0;
    let h = 0;
    let dpr = 1;
    let particles = [];
    let raf = 0;
    const pointer = { cx: 0, cy: 0, seen: false, x: 0, y: 0, active: false };

    // r con raiz cuadrada => densidad UNIFORME en toda la elipse. (Con r lineal las
    // particulas se apinan en el centro y dejan zonas vacias en el borde.)
    const spawn = () => ({
      th: Math.random() * Math.PI * 2,
      r: 0.06 + Math.sqrt(Math.random()) * 1.06,
      // las de adentro giran un poco mas rapido: sensacion de vortice suave
      w: (Math.random() * 0.0015 + 0.0006) * (Math.random() < 0.5 ? -1 : 1),
      len: 4 + Math.random() * 10,
      thick: 1.6 + Math.random() * 1.7,
      alpha: 0.5 + Math.random() * 0.42,
      tw: Math.random() * Math.PI * 2, // fase del parpadeo
      tws: 0.006 + Math.random() * 0.012,
      ox: 0, // desplazamiento respecto a su origen (lo maneja el muelle)
      oy: 0,
      vx: 0,
      vy: 0,
    });

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // Puntero -> coords locales una sola vez por frame (no por evento).
      if (pointer.seen && !reduce) {
        const rect = canvas.getBoundingClientRect();
        pointer.x = pointer.cx - rect.left;
        pointer.y = pointer.cy - rect.top;
        const m = POINTER_RADIUS;
        pointer.active =
          pointer.x >= -m && pointer.y >= -m && pointer.x <= rect.width + m && pointer.y <= rect.height + m;
      }

      const cx = w / 2;
      const cy = h / 2;
      const rx = w * 0.58;
      const ry = h * 0.58;

      ctx.lineCap = 'round';
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        if (!reduce) p.th += p.w;

        const bx = cx + Math.cos(p.th) * p.r * rx;
        const by = cy + Math.sin(p.th) * p.r * ry;

        let prox = 0;
        if (!reduce) {
          let fx = 0;
          let fy = 0;
          if (pointer.active) {
            const dx = bx + p.ox - pointer.x;
            const dy = by + p.oy - pointer.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < POINTER_RADIUS) {
              prox = 1 - dist / POINTER_RADIUS;
              const d = dist || 1;
              const f = prox * POINTER_PUSH;
              fx = (dx / d) * f;
              fy = (dy / d) * f;
            }
          }
          // Empuje del cursor + MUELLE que la devuelve a su origen. El muelle acota el
          // desplazamiento, por eso el campo no se vacia: se ondula y se recompone.
          p.vx += fx - SPRING * p.ox;
          p.vy += fy - SPRING * p.oy;
          p.vx *= DAMP;
          p.vy *= DAMP;
          p.ox += p.vx;
          p.oy += p.vy;
          p.tw += p.tws;
        }

        const x = bx + p.ox;
        const y = by + p.oy;
        if (x < -40 || x > w + 40 || y < -40 || y > h + 40) continue;

        // Color segun el ANGULO -> rueda de color fija en el espacio.
        const deg = ((p.th * 57.2957795) % 360 + 360) % 360;
        ctx.strokeStyle = COLORS[(deg / 4) | 0] || COLORS[0];

        // Parpadeo suave + realce cerca del cursor (brillan y se estiran al reaccionar).
        const twinkle = 0.85 + 0.15 * Math.sin(p.tw);
        ctx.globalAlpha = Math.min(1, p.alpha * twinkle * (1 + prox * 1.1));
        ctx.lineWidth = p.thick * (1 + prox * 0.35);
        const len = p.len * (1 + prox * 0.9);

        // Trazo orientado tangencialmente (en la direccion del giro).
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.th + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -len / 2);
        ctx.lineTo(0, len / 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };

    // Ajusta el buffer al tamano REAL del elemento. Solo regenera si cambia el numero
    // objetivo, para que un cambio de alto no reinicie el campo de golpe.
    const resize = () => {
      const nw = canvas.clientWidth;
      const nh = canvas.clientHeight;
      if (nw === w && nh === h && particles.length) return;
      w = nw;
      h = nh;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(220, Math.max(70, Math.floor((w * h) / 4200)));
      if (particles.length !== count) {
        particles = Array.from({ length: count }, spawn);
      }
      // Con prefers-reduced-motion no hay loop de animacion: hay que repintar el frame
      // estatico despues de cada cambio de tamano (redimensionar el canvas lo borra).
      if (reduce) draw();
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
    // El canvas tiene pointer-events:none (para no bloquear clics), asi que seguimos el
    // puntero desde window. 'pointermove' cubre mouse y tactil.
    const onPointerMove = (event) => {
      pointer.cx = event.clientX;
      pointer.cy = event.clientY;
      pointer.seen = true;
    };
    const onPointerOut = () => {
      pointer.active = false;
      pointer.seen = false;
    };

    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);
    if (!reduce) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerdown', onPointerMove, { passive: true });
      window.addEventListener('blur', onPointerOut);
      document.addEventListener('pointerleave', onPointerOut);
    }

    // El contenedor puede cambiar de alto sin que cambie la ventana (p.ej. el carrusel
    // del home al fijarse), asi que observamos el elemento directamente.
    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => resize());
      ro.observe(canvas);
    }

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerMove);
      window.removeEventListener('blur', onPointerOut);
      document.removeEventListener('pointerleave', onPointerOut);
      if (ro) ro.disconnect();
    };
  }, [saturation, lightness]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
