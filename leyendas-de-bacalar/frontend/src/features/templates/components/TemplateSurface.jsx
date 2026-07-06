import React, { useEffect, useMemo, useRef, useState } from 'react';
import { resolveSurface, absoluteQrUrl } from '../templateEngine.js';
import { generateQrMatrix } from '../qr.js';
import '../templates.css';

// Renders one surface (cover OR backCover) as positioned, scalable HTML — never
// an image. A fixed base canvas (800×1200) is scaled to the container width so the
// same definition looks crisp as a thumbnail or full-size preview. When `editable`,
// text/image elements can be dragged to reposition (persisted in data.layout).
function ShapeEl({ el }) {
  const base = { position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h, opacity: el.opacity ?? 1 };
  if (el.shape === 'line') return <span className="tpl-shape" style={{ ...base, background: el.resolvedColor, borderRadius: 2 }} />;
  if (el.shape === 'circle') return <span className="tpl-shape" style={{ ...base, background: el.resolvedColor, borderRadius: '50%' }} />;
  if (el.shape === 'rect-outline') return <span className="tpl-shape" style={{ ...base, border: `${el.stroke || 2}px solid ${el.resolvedColor}`, borderRadius: el.radius || 0 }} />;
  return <span className="tpl-shape" style={{ ...base, background: el.resolvedColor, borderRadius: el.radius || 0 }} />;
}

function ImageEl({ el, editable, selected, onStartDrag }) {
  const style = {
    position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
    borderRadius: el.radius ?? 8, overflow: 'hidden',
  };
  const cls = `tpl-image${el.imageUrl ? '' : ' tpl-image--empty'}${editable ? ' tpl-el--editable' : ''}${selected ? ' is-selected' : ''}`;
  return (
    <div className={cls} style={style} onPointerDown={editable ? onStartDrag : undefined}>
      {el.imageUrl ? (
        <img src={el.imageUrl} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: el.fit || 'cover', pointerEvents: 'none' }} />
      ) : (
        <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" />
        </svg>
      )}
    </div>
  );
}

function TextEl({ el, editable, selected, onStartDrag }) {
  const style = {
    position: 'absolute', left: el.x, top: el.y, width: el.w,
    fontFamily: el.resolvedFont, fontSize: el.fontSize, fontWeight: el.weight || 400,
    lineHeight: el.lineHeight || 1.15, color: el.resolvedColor, textAlign: el.align || 'left',
    fontStyle: el.italic ? 'italic' : 'normal', letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : 'normal',
    textTransform: el.uppercase ? 'uppercase' : 'none', opacity: el.opacity ?? 1,
  };
  const cls = `tpl-text${el.isPlaceholder ? ' is-placeholder' : ''}${editable ? ' tpl-el--editable' : ''}${selected ? ' is-selected' : ''}`;
  return <div className={cls} style={style} onPointerDown={editable ? onStartDrag : undefined}>{el.value}</div>;
}

function QrEl({ el }) {
  const style = { position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h, borderRadius: el.radius || 8 };
  const href = absoluteQrUrl(el.value);
  const matrix = useMemo(() => (href ? generateQrMatrix(href) : null), [href]);

  if (!matrix) {
    // No reader URL yet (e.g. draft without slug) → neutral placeholder.
    return (
      <div className="tpl-qr tpl-qr--empty" style={style} aria-hidden="true">
        <div className="tpl-qr-grid">
          {Array.from({ length: 25 }).map((_, i) => <span key={i} className={(i * 7) % 3 === 0 ? 'on' : ''} />)}
        </div>
      </div>
    );
  }

  const quiet = 2;
  const n = matrix.size;
  const dim = n + quiet * 2;
  let path = '';
  for (let r = 0; r < n; r += 1) {
    for (let c = 0; c < n; c += 1) {
      if (matrix.modules[r][c]) path += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    }
  }
  return (
    <div className="tpl-qr" style={style} title={href}>
      <svg viewBox={`0 0 ${dim} ${dim}`} width="100%" height="100%" shapeRendering="crispEdges" role="img" aria-label="Código QR a la lectura">
        <rect width={dim} height={dim} fill="#ffffff" />
        <path d={path} fill="#0b1220" />
      </svg>
    </div>
  );
}

export default function TemplateSurface({ surface, data, className = '', fill = false, editable = false, selected = null, onMove, onSelect }) {
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

  function startDrag(el, event) {
    if (!editable || !el.layoutKey) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.(el.layoutKey);
    const scale = box.scale || 1;
    const startX = event.clientX;
    const startY = event.clientY;
    const originX = el.x;
    const originY = el.y;
    const elW = el.w || 240;
    const move = (ev) => {
      const nx = Math.round(Math.max(0, Math.min(width - Math.min(elW, width), originX + (ev.clientX - startX) / scale)));
      const ny = Math.round(Math.max(0, Math.min(height - 30, originY + (ev.clientY - startY) / scale)));
      onMove?.(el.layoutKey, { x: nx, y: ny });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  return (
    <div
      ref={wrapRef}
      className={`tpl-surface${fill ? ' tpl-surface--fill' : ''}${editable ? ' tpl-surface--editable' : ''} ${className}`.trim()}
      style={fill ? undefined : { aspectRatio: `${width} / ${height}` }}
    >
      <div className="tpl-canvas" style={{ width, height, left: box.x, top: box.y, transform: `scale(${box.scale})`, ...model.backgroundStyle }}>
        {model.elements.map((el) => {
          if (el.type === 'text') {
            return <TextEl key={el.key} el={el} editable={editable} selected={selected === el.layoutKey} onStartDrag={(e) => startDrag(el, e)} />;
          }
          if (el.type === 'image') {
            return <ImageEl key={el.key} el={el} editable={editable} selected={selected === el.layoutKey} onStartDrag={(e) => startDrag(el, e)} />;
          }
          if (el.type === 'qr') return <QrEl key={el.key} el={el} />;
          if (el.type === 'shape') return <ShapeEl key={el.key} el={el} />;
          return null;
        })}
      </div>
    </div>
  );
}
