import React, { useEffect, useRef, useState } from 'react';
import { resolveSurface } from '../templateEngine.js';
import '../templates.css';

// Renders one surface (cover OR backCover) as positioned, scalable HTML — never
// an image. A fixed base canvas (800×1200) is scaled to the container width so
// the same definition looks crisp as a thumbnail or full-size preview.
function ShapeEl({ el }) {
  const base = {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    opacity: el.opacity ?? 1,
  };
  if (el.shape === 'line') {
    return <span className="tpl-shape" style={{ ...base, background: el.resolvedColor, borderRadius: 2 }} />;
  }
  if (el.shape === 'circle') {
    return <span className="tpl-shape" style={{ ...base, background: el.resolvedColor, borderRadius: '50%' }} />;
  }
  if (el.shape === 'rect-outline') {
    return <span className="tpl-shape" style={{ ...base, border: `${el.stroke || 2}px solid ${el.resolvedColor}`, borderRadius: el.radius || 0 }} />;
  }
  // rect (filled)
  return <span className="tpl-shape" style={{ ...base, background: el.resolvedColor, borderRadius: el.radius || 0 }} />;
}

function ImageEl({ el }) {
  const style = {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.w,
    height: el.h,
    borderRadius: el.radius ?? 8,
    overflow: 'hidden',
  };
  if (el.imageUrl) {
    return (
      <div className="tpl-image" style={style}>
        <img src={el.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: el.fit || 'cover' }} />
      </div>
    );
  }
  return (
    <div className="tpl-image tpl-image--empty" style={style}>
      <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" />
      </svg>
    </div>
  );
}

function TextEl({ el }) {
  const style = {
    position: 'absolute',
    left: el.x,
    top: el.y,
    width: el.w,
    fontFamily: el.resolvedFont,
    fontSize: el.fontSize,
    fontWeight: el.weight || 400,
    lineHeight: el.lineHeight || 1.15,
    color: el.resolvedColor,
    textAlign: el.align || 'left',
    fontStyle: el.italic ? 'italic' : 'normal',
    letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : 'normal',
    textTransform: el.uppercase ? 'uppercase' : 'none',
    opacity: el.opacity ?? 1,
  };
  return <div className={`tpl-text${el.isPlaceholder ? ' is-placeholder' : ''}`} style={style}>{el.value}</div>;
}

function QrEl({ el }) {
  // Placeholder QR box (real QR generation is a future step). Decorative grid.
  const style = {
    position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
    borderRadius: el.radius || 8,
  };
  return (
    <div className="tpl-qr" style={style} aria-hidden="true">
      <div className="tpl-qr-grid">
        {Array.from({ length: 25 }).map((_, i) => (
          <span key={i} className={(i * 7) % 3 === 0 ? 'on' : ''} />
        ))}
      </div>
    </div>
  );
}

export default function TemplateSurface({ surface, data, className = '', fill = false }) {
  const wrapRef = useRef(null);
  const [box, setBox] = useState({ scale: 0, x: 0, y: 0 });
  const model = resolveSurface(surface, data);
  const { width, height } = model.base;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (fill && h > 0) {
        // Contain the fixed canvas within the page and center it (letterbox).
        const s = Math.min(w / width, h / height);
        setBox({ scale: s, x: (w - width * s) / 2, y: (h - height * s) / 2 });
      } else {
        setBox({ scale: w / width, x: 0, y: 0 });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height, fill]);

  return (
    <div
      ref={wrapRef}
      className={`tpl-surface${fill ? ' tpl-surface--fill' : ''} ${className}`.trim()}
      style={fill ? undefined : { aspectRatio: `${width} / ${height}` }}
    >
      <div
        className="tpl-canvas"
        style={{ width, height, left: box.x, top: box.y, transform: `scale(${box.scale})`, ...model.backgroundStyle }}
      >
        {model.elements.map((el) => {
          if (el.type === 'text') return <TextEl key={el.key} el={el} />;
          if (el.type === 'image') return <ImageEl key={el.key} el={el} />;
          if (el.type === 'qr') return <QrEl key={el.key} el={el} />;
          if (el.type === 'shape') return <ShapeEl key={el.key} el={el} />;
          return null;
        })}
      </div>
    </div>
  );
}
