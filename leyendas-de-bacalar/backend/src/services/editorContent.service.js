import sanitizeHtml from 'sanitize-html';
import { getLegendAccessContext } from './legendAccess.service.js';

class EditorContentError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'EditorContentError';
    this.statusCode = statusCode;
  }
}

// Block types the editorial editor is allowed to store/render. Anything else is dropped.
const ALLOWED_BLOCKS = new Set([
  'paragraph', 'header', 'list', 'checklist', 'quote', 'delimiter',
  'table', 'image', 'code', 'warning', 'model3d', 'marker', 'leyendaMarker',
]);

const SANITIZE_OPTIONS = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
    'ul', 'ol', 'li', 'blockquote', 'cite',
    'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'figure', 'figcaption', 'img', 'pre', 'code',
    'b', 'strong', 'i', 'em', 'u', 's', 'mark', 'sup', 'sub', 'a', 'span', 'div',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt'],
    '*': ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  // Force safe rel on links that open in a new tab.
  transformTags: {
    a: (tagName, attribs) => {
      const out = { ...attribs };
      if (out.target === '_blank') {
        out.rel = Array.from(new Set(`${out.rel || ''} noopener noreferrer`.trim().split(/\s+/))).join(' ');
      }
      return { tagName, attribs: out };
    },
  },
  disallowedTagsMode: 'discard',
};

const escapeHtml = (value = '') => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const stripTags = (value = '') => String(value ?? '').replace(/<[^>]*>/g, '');

const inline = (value = '') => String(value ?? '');

function renderList(style, items = []) {
  const tag = style === 'ordered' ? 'ol' : 'ul';
  const body = items.map((item) => {
    const content = typeof item === 'string' ? item : inline(item?.content);
    const nested = Array.isArray(item?.items) && item.items.length ? renderList(style, item.items) : '';
    return `<li>${content}${nested}</li>`;
  }).join('');
  return `<${tag}>${body}</${tag}>`;
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
        .map((item) => `<li class="${item?.checked ? 'is-checked' : ''}">${inline(item?.text)}</li>`).join('')}</ul>`;
    case 'quote':
      return `<blockquote>${inline(data.text)}${data.caption ? `<cite>${inline(data.caption)}</cite>` : ''}</blockquote>`;
    case 'delimiter':
      return '<hr class="ejs-delimiter" />';
    case 'code':
      return `<pre class="ejs-code"><code>${escapeHtml(data.code)}</code></pre>`;
    case 'warning':
      return `<div class="ejs-warning"><strong>${inline(data.title)}</strong><p>${inline(data.message)}</p></div>`;
    case 'table': {
      const rows = Array.isArray(data.content) ? data.content : [];
      const body = rows.map((row, rowIndex) => {
        const cellTag = data.withHeadings && rowIndex === 0 ? 'th' : 'td';
        return `<tr>${(row ?? []).map((cell) => `<${cellTag}>${inline(cell)}</${cellTag}>`).join('')}</tr>`;
      }).join('');
      return `<table class="ejs-table"><tbody>${body}</tbody></table>`;
    }
    case 'image': {
      const url = data?.file?.url || data?.url || '';
      if (!url) return '';
      return `<figure class="ejs-image"><img src="${escapeHtml(url)}" alt="${escapeHtml(stripTags(data.caption))}" />${
        data.caption ? `<figcaption>${inline(data.caption)}</figcaption>` : ''}</figure>`;
    }
    case 'model3d':
      return `<div class="ejs-model3d" data-asset-id="${escapeHtml(data.assetId)}"><strong>${escapeHtml(data.title || 'Modelo 3D')}</strong>${
        data.caption ? `<p>${inline(data.caption)}</p>` : ''}</div>`;
    case 'marker':
    case 'leyendaMarker':
      return `<div class="ejs-marker" data-asset-id="${escapeHtml(data.assetId)}"><strong>${escapeHtml(data.title || 'Marcador')}</strong>${
        data.caption ? `<p>${inline(data.caption)}</p>` : ''}</div>`;
    default:
      return '';
  }
}

const textOf = (block) => {
  const data = block?.data ?? {};
  if (block?.type === 'list' || block?.type === 'checklist') {
    return (data.items ?? []).map((item) => stripTags(typeof item === 'string' ? item : (item?.content ?? item?.text ?? ''))).join(' ');
  }
  if (block?.type === 'table') return (data.content ?? []).flat().map(stripTags).join(' ');
  return stripTags(data.text || data.code || data.message || '');
};

// Sanitize + render a single page's Editor.js data into safe HTML + stats.
export function renderEditorData(editorData) {
  if (!editorData || typeof editorData !== 'object' || !Array.isArray(editorData.blocks)) {
    throw new EditorContentError('editorData inválido: se esperaba { blocks: [] }.');
  }
  const blocks = editorData.blocks.filter((block) => block && ALLOWED_BLOCKS.has(block.type));
  const rawHtml = blocks.map(blockToHtml).join('\n');
  const html = sanitizeHtml(rawHtml, SANITIZE_OPTIONS);
  const plainText = blocks.map(textOf).join('\n').trim();
  const words = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  return {
    html,
    stats: { words, characters: plainText.length, blocks: blocks.length },
  };
}

export async function renderLegendEditorContent({ legendId, userId, roles, editorData }) {
  // Ownership/role check (throws if not allowed).
  await getLegendAccessContext({ legendId, userId, roles });
  return renderEditorData(editorData);
}
