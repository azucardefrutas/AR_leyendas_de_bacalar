import { migrateEditorDataMedia } from '../components/creator/editor-media/compositionMigration.js';
import { normalizeCrop, normalizeMediaLayout } from '../components/creator/editor-media/mediaLayoutState.js';

// Convert Editor.js saved data ({ blocks: [...] }) into HTML for preview / rendered_html,
// and into plain text for the existing text_content field (validation, search, fallback).
// Supports: header, paragraph, list, quote, delimiter, checklist, table, image.

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

// Editor.js stores inline formatting (bold/italic/links) as HTML inside text fields.
// We keep it as-is for the author's own preview. (Sanitization is a later concern.)
const inline = (value = '') => String(value ?? '');

const stripTags = (value = '') => String(value ?? '').replace(/<[^>]*>/g, '');

function listItemsToHtml(items = []) {
  return items
    .map((item) => {
      // v2 list items can be objects { content, items }; v1 items are plain strings.
      const content = typeof item === 'string' ? item : inline(item?.content);
      const nested = Array.isArray(item?.items) && item.items.length
        ? renderList(item.style, item.items)
        : '';
      return `<li>${content}${nested}</li>`;
    })
    .join('');
}

function renderList(style, items) {
  const tag = style === 'ordered' ? 'ol' : 'ul';
  return `<${tag}>${listItemsToHtml(items)}</${tag}>`;
}

function mediaStyle(layout, defaults) {
  const normalized = normalizeMediaLayout(layout, defaults);
  const size = `width:${normalized.width}px;max-width:100%;${normalized.height === 'auto' ? '' : `height:${normalized.height}px;`}`;
  const visual = `opacity:${normalized.opacity};transform:rotate(${normalized.rotation}deg);z-index:${normalized.zIndex};`;
  if (normalized.mode === 'free') {
    return `${size}${visual}position:absolute;left:${normalized.x}px;top:${normalized.y}px;margin:0;`;
  }
  if (normalized.mode === 'wrap-left') return `${size}${visual}float:left;margin:0 24px 16px 0;`;
  if (normalized.mode === 'wrap-right') return `${size}${visual}float:right;margin:0 0 16px 24px;`;
  const margins = normalized.align === 'left'
    ? 'margin-left:0;margin-right:auto;'
    : normalized.align === 'right'
      ? 'margin-left:auto;margin-right:0;'
      : 'margin-left:auto;margin-right:auto;';
  return `${size}${visual}${margins}`;
}

function cropStyle(crop) {
  const normalized = normalizeCrop(crop);
  if (!normalized) return '';
  return `width:100%;height:100%;object-fit:cover;object-position:${normalized.x * 100}% ${normalized.y * 100}%;transform:scale(${normalized.zoom});transform-origin:${normalized.x * 100}% ${normalized.y * 100}%;`;
}

function blockToHtml(block) {
  const data = block?.data ?? {};
  switch (block?.type) {
    case 'header': {
      const level = Math.min(Math.max(Number(data.level) || 2, 1), 6);
      return `<h${level}>${inline(data.text)}</h${level}>`;
    }
    case 'paragraph':
      return `<p>${inline(data.text)}</p>`;
    case 'list':
      return renderList(data.style, data.items ?? []);
    case 'checklist':
      return `<ul class="ejs-checklist">${(data.items ?? [])
        .map((item) => `<li class="${item?.checked ? 'is-checked' : ''}">${inline(item?.text)}</li>`)
        .join('')}</ul>`;
    case 'quote':
      return `<blockquote>${inline(data.text)}${data.caption ? `<cite>${inline(data.caption)}</cite>` : ''}</blockquote>`;
    case 'delimiter':
      return '<hr class="ejs-delimiter" />';
    case 'table': {
      const rows = Array.isArray(data.content) ? data.content : [];
      const body = rows
        .map((row, rowIndex) => {
          const cellTag = data.withHeadings && rowIndex === 0 ? 'th' : 'td';
          const cells = (row ?? []).map((cell) => `<${cellTag}>${inline(cell)}</${cellTag}>`).join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');
      return `<table class="ejs-table"><tbody>${body}</tbody></table>`;
    }
    case 'image': {
      const url = data?.file?.url || data?.url || '';
      if (!url) return '';
      return `<figure class="ejs-image" style="${mediaStyle(data.layout, { defaultWidth: 520, defaultHeight: 'auto' })}"><img src="${escapeHtml(url)}" alt="${escapeHtml(stripTags(data.alt || data.caption))}" style="${cropStyle(data.crop)}" />${
        data.caption ? `<figcaption>${inline(data.caption)}</figcaption>` : ''
      }</figure>`;
    }
    case 'model3d':
      return `<article class="ejs-model3d" style="${mediaStyle(data.layout, { defaultWidth: 520, defaultHeight: 360 })}"><strong>${escapeHtml(data.title || 'Modelo 3D')}</strong>${
        data.caption ? `<p>${escapeHtml(stripTags(data.caption))}</p>` : ''
      }</article>`;
    case 'marker':
    case 'leyendaMarker': {
      const imageUrl = data.imageUrl || data.previewUrl || '';
      return `<article class="ejs-model3d ejs-marker" style="${mediaStyle(data.layout, { defaultWidth: 180, defaultHeight: 'auto' })}">${
        imageUrl ? `<img class="ejs-marker__thumbnail" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(stripTags(data.title || 'Marcador'))}" style="${cropStyle(data.crop)}" />` : ''
      }<strong>${escapeHtml(data.title || 'Marcador')}</strong>${
        data.caption ? `<p>${escapeHtml(stripTags(data.caption))}</p>` : ''
      }</article>`;
    }
    default:
      return data.text ? `<p>${inline(data.text)}</p>` : '';
  }
}

export function editorJsToHtml(editorData) {
  const migrated = migrateEditorDataMedia(editorData || {});
  const blocks = Array.isArray(migrated?.blocks) ? migrated.blocks : [];
  return blocks.map(blockToHtml).join('\n');
}

// Convert legacy plain-text page content into a minimal Editor.js document so old
// drafts open in the editorial editor without losing their text.
export function plainTextToEditorData(text = '') {
  const paragraphs = String(text || '')
    .split(/\n{2,}|\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    blocks: paragraphs.map((paragraph) => ({ type: 'paragraph', data: { text: paragraph } })),
  };
}

export function editorJsToPlainText(editorData) {
  const migrated = migrateEditorDataMedia(editorData || {});
  const blocks = Array.isArray(migrated?.blocks) ? migrated.blocks : [];
  const lines = [];
  for (const block of blocks) {
    const data = block?.data ?? {};
    if (block?.type === 'list' || block?.type === 'checklist') {
      for (const item of data.items ?? []) {
        const text = typeof item === 'string' ? item : (item?.content ?? item?.text ?? '');
        lines.push(stripTags(text));
      }
    } else if (block?.type === 'table') {
      for (const row of data.content ?? []) lines.push((row ?? []).map(stripTags).join(' · '));
    } else if (block?.type === 'image' && data.caption) {
      lines.push(stripTags(data.caption));
    } else if (block?.type === 'model3d' || block?.type === 'marker' || block?.type === 'leyendaMarker') {
      const label = [data.title, data.caption].filter(Boolean).map(stripTags).join(' — ');
      if (label) lines.push(label);
    } else if (data.text) {
      lines.push(stripTags(data.text));
    }
  }
  return lines.join('\n').trim();
}
