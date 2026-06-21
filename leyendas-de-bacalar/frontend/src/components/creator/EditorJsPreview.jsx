import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { EditorIcon } from './EditorJsToolbar.jsx';
import { canRenderInlineModel } from './editorBlockTools.js';
import { migrateEditorDataMedia } from './editor-media/compositionMigration.js';
import { normalizeCrop, normalizeMediaLayout } from './editor-media/mediaLayoutState.js';

const InlineModel3DViewer = lazy(() => import('../3d/Model3DViewer.jsx'));

// Editor.js stores inline formatting (bold/italic/links) as HTML inside text fields.
// We render blocks as React elements and sanitize only the inline HTML with a strict
// allowlist, so the author never sees raw tags and no unsafe markup can run.
const INLINE_CONFIG = {
  ALLOWED_TAGS: ['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'a', 'mark', 'code', 'br', 'sup', 'sub', 'span'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
};

const stripTags = (value = '') => String(value ?? '').replace(/<[^>]*>/g, '');

function getLayoutStyle(layout, defaults) {
  const normalized = normalizeMediaLayout(layout, defaults);
  const common = {
    width: `${normalized.width}px`,
    maxWidth: '100%',
    height: normalized.height === 'auto' ? undefined : `${normalized.height}px`,
    opacity: normalized.opacity,
    transform: `rotate(${normalized.rotation}deg)`,
    zIndex: normalized.zIndex,
  };
  if (normalized.mode === 'free') {
    return {
      ...common,
      position: 'absolute',
      left: `${normalized.x}px`,
      top: `${normalized.y}px`,
      margin: 0,
    };
  }
  if (normalized.mode === 'wrap-left' || normalized.mode === 'wrap-right') {
    const left = normalized.mode === 'wrap-left';
    return {
      ...common,
      float: left ? 'left' : 'right',
      margin: left ? '0 24px 16px 0' : '0 0 16px 24px',
    };
  }
  return {
    ...common,
    marginLeft: normalized.align === 'left' ? 0 : 'auto',
    marginRight: normalized.align === 'right' ? 0 : 'auto',
  };
}

function getCropStyle(crop) {
  const normalized = normalizeCrop(crop);
  if (!normalized) return {};
  return {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: `${normalized.x * 100}% ${normalized.y * 100}%`,
    transform: `scale(${normalized.zoom})`,
    transformOrigin: `${normalized.x * 100}% ${normalized.y * 100}%`,
  };
}

function Inline({ html, as: Tag = 'span', className }) {
  const clean = DOMPurify.sanitize(String(html ?? ''), INLINE_CONFIG);
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}

function ListItems({ items = [], ordered = false }) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag>
      {items.map((item, index) => {
        const content = typeof item === 'string' ? item : (item?.content ?? '');
        const nested = Array.isArray(item?.items) && item.items.length
          ? <ListItems items={item.items} ordered={ordered} />
          : null;
        return <li key={index}><Inline html={content} />{nested}</li>;
      })}
    </Tag>
  );
}

function InlineModelPreview({ data, onOpenModel }) {
  const holderRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const normalizedLayout = normalizeMediaLayout(data.layout, { defaultWidth: 520, defaultHeight: 360 });
  const style = {
    ...getLayoutStyle(normalizedLayout, { defaultWidth: 520, defaultHeight: 360 }),
    height: `${normalizedLayout.height === 'auto' ? 360 : normalizedLayout.height}px`,
  };

  useEffect(() => {
    const node = holderRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '180px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!canRenderInlineModel(data)) {
    return (
      <div className="ejs-inline-model-fallback" style={style}>
        <span className="ejs-model3d__icon"><EditorIcon name="box" size={24} /></span>
        <strong>{data.title || 'Modelo 3D'}</strong>
        {onOpenModel && data.assetId && <button type="button" onClick={() => onOpenModel(data)}>Abrir modelo</button>}
      </div>
    );
  }

  return (
    <figure ref={holderRef} className="ejs-inline-model" style={style}>
      <div className="ejs-inline-model__stage">
        {visible ? (
          <Suspense fallback={<div className="ejs-inline-model__loading">Cargando modelo 3D…</div>}>
            <InlineModel3DViewer
              modelUrl={data.modelUrl}
              title={data.title}
              embedded
              hideHeading
              compactControls
            />
          </Suspense>
        ) : <div className="ejs-inline-model__loading">Modelo 3D listo para cargar</div>}
      </div>
      {data.caption ? <figcaption><Inline html={data.caption} /></figcaption> : null}
    </figure>
  );
}

function Block({ block, onOpenModel }) {
  const data = block?.data ?? {};
  switch (block?.type) {
    case 'header': {
      const level = Math.min(Math.max(Number(data.level) || 2, 1), 6);
      return <Inline as={`h${level}`} html={data.text} />;
    }
    case 'paragraph':
      return <Inline as="p" html={data.text} />;
    case 'list':
      return <ListItems items={data.items} ordered={data.style === 'ordered'} />;
    case 'checklist':
      return (
        <ul className="ejs-checklist">
          {(data.items || []).map((item, index) => (
            <li key={index} className={item?.checked ? 'is-checked' : ''}><Inline html={item?.text} /></li>
          ))}
        </ul>
      );
    case 'quote':
      return (
        <blockquote>
          <Inline html={data.text} />
          {data.caption ? <cite><Inline html={data.caption} /></cite> : null}
        </blockquote>
      );
    case 'delimiter':
      return <hr className="ejs-delimiter" />;
    case 'table': {
      const rows = Array.isArray(data.content) ? data.content : [];
      return (
        <table className="ejs-table">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {(row || []).map((cell, cellIndex) => (
                  <Inline key={cellIndex} as={data.withHeadings && rowIndex === 0 ? 'th' : 'td'} html={cell} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    case 'image': {
      const url = data?.file?.url || data?.url || '';
      if (!url) return null;
      return (
        <figure className="ejs-image" style={getLayoutStyle(data.layout, { defaultWidth: 520, defaultHeight: 'auto' })}>
          <img src={url} alt={stripTags(data.alt || data.caption)} loading="lazy" style={getCropStyle(data.crop)} />
          {data.caption ? <figcaption><Inline html={data.caption} /></figcaption> : null}
        </figure>
      );
    }
    case 'model3d':
      return <InlineModelPreview data={data} onOpenModel={onOpenModel} />;
    case 'marker':
    case 'leyendaMarker':
      return (
        <div className="ejs-model3d ejs-marker" style={getLayoutStyle(data.layout, { defaultWidth: 180, defaultHeight: 'auto' })}>
          {(data.imageUrl || data.previewUrl)
            ? <img className="ejs-marker__thumbnail" src={data.imageUrl || data.previewUrl} alt={stripTags(data.title || 'Marcador')} loading="lazy" style={getCropStyle(data.crop)} />
            : <span className="ejs-model3d__icon"><EditorIcon name="bookmark" size={24} /></span>}
          <div className="ejs-model3d__info">
            <strong>{data.title || 'Marcador'}</strong>
            {data.caption ? <p><Inline html={data.caption} /></p> : null}
          </div>
        </div>
      );
    default:
      return data.text ? <Inline as="p" html={data.text} /> : null;
  }
}

/**
 * Safe, block-by-block renderer for Editor.js data. Never shows raw HTML; inline
 * formatting is sanitized with a strict allowlist (DOMPurify).
 */
export default function EditorJsPreview({ data, className = '', onOpenModel }) {
  const migrated = migrateEditorDataMedia(data || {});
  const blocks = Array.isArray(migrated?.blocks) ? migrated.blocks : [];
  if (!blocks.length) {
    return <p className="editorial-editor__preview-empty">Esta página todavía no tiene contenido.</p>;
  }
  return (
    <div className={`editorial-content editorial-content--hybrid ${className}`.trim()}>
      {blocks.map((block, index) => <Block key={block.id || index} block={block} onOpenModel={onOpenModel} />)}
    </div>
  );
}
