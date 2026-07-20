import sanitizeHtml from 'sanitize-html';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { getLegendAccessContext } from './legendAccess.service.js';
import {
  buildStoragePath,
  getBucketForPurpose,
  getPublicUrlForAsset,
  uploadStorageBuffer,
} from './storage.service.js';

const EDITOR_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_EDITOR_IMAGE_BYTES = 10 * 1024 * 1024;
const isHttpUrl = (value = '') => /^https?:\/\//i.test(String(value).trim());

class EditorContentError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'EditorContentError';
    this.statusCode = statusCode;
  }
}


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
    text: plainText,
    stats: { words, characters: plainText.length, blocks: blocks.length },
  };
}

export async function renderLegendEditorContent({ legendId, userId, roles, editorData }) {
  // Ownership/role check (throws if not allowed).
  await getLegendAccessContext({ legendId, userId, roles });
  return renderEditorData(editorData);
}

const toApiPage = (row) => ({
  id: row.id,
  pageNumber: row.page_number,
  title: row.title || '',
  textContent: row.text_content || '',
  editorData: row.editor_data || { blocks: [] },
  renderedHtml: row.rendered_html || '',
  contentFormat: row.content_format || 'plain',
  editorVersion: row.editor_version || null,
  editorStats: row.editor_stats || {},
});

async function assertDraftVersion(legendId, versionId) {
  const { data: version, error } = await supabaseAdmin
    .from('legend_versions')
    .select('id, legend_id, status')
    .eq('id', versionId)
    .maybeSingle();
  if (error) throw new EditorContentError('No se pudo cargar la versión.', 500);
  if (!version || String(version.legend_id) !== String(legendId)) {
    throw new EditorContentError('Versión no encontrada para esta leyenda.', 404);
  }
  if (version.status && version.status !== 'draft') {
    throw new EditorContentError('La versión ya no está en borrador.', 409);
  }
  return version;
}

export async function getEditorPages({ legendId, versionId, userId, roles }) {
  await getLegendAccessContext({ legendId, userId, roles });
  await assertDraftVersion(legendId, versionId);
  const { data, error } = await supabaseAdmin
    .from('legend_pages')
    .select('id, page_number, title, text_content, editor_data, rendered_html, content_format, editor_version, editor_stats')
    .eq('version_id', versionId)
    .order('page_number', { ascending: true });
  if (error) throw new EditorContentError('No se pudieron cargar las páginas.', 500);
  return (data ?? []).map(toApiPage);
}

// Save editorial pages with server-side sanitization. Runs with the service role
// (ownership/draft already validated) so rendered_html is always backend-sanitized.
// Upload an editor image to Storage (legend-assets) after validating ownership +
// mime/size, and return an Editor.js Image Tool compatible URL.
export async function uploadEditorImage({ legendId, userId, roles, file }) {
  await getLegendAccessContext({ legendId, userId, roles });
  if (!file || !file.buffer) {
    throw new EditorContentError('No se recibió ningún archivo.', 400);
  }
  if (!EDITOR_IMAGE_MIME.has(file.mimetype)) {
    throw new EditorContentError('Formato no permitido. Usa PNG, JPG o WebP.', 415);
  }
  if (Number(file.size) > MAX_EDITOR_IMAGE_BYTES) {
    throw new EditorContentError('La imagen supera el tamaño máximo (10 MB).', 413);
  }

  const bucket = getBucketForPurpose('editor_image');
  const path = buildStoragePath({
    userId,
    legendId,
    purpose: 'editor_image',
    filename: file.originalname || 'imagen.png',
  });
  await uploadStorageBuffer({ bucket, path, buffer: file.buffer, contentType: file.mimetype });
  const url = getPublicUrlForAsset({ bucket, path });
  if (!url) throw new EditorContentError('La imagen se subió, pero no se obtuvo una URL pública.', 500);
  return { url };
}

// Validate an external image URL for the "by URL" path.
export async function resolveEditorImageUrl({ legendId, userId, roles, url }) {
  await getLegendAccessContext({ legendId, userId, roles });
  if (!isHttpUrl(url)) {
    throw new EditorContentError('La URL debe empezar con http:// o https://.', 400);
  }
  return { url: String(url).trim() };
}

export async function saveEditorPages({ legendId, versionId, userId, roles, pages = [] }) {
  await getLegendAccessContext({ legendId, userId, roles });
  await assertDraftVersion(legendId, versionId);
  if (!Array.isArray(pages)) throw new EditorContentError('pages debe ser un arreglo.');

  const deletedIds = pages.filter((page) => page._delete && page.id).map((page) => page.id);
  if (deletedIds.length) {
    const { error } = await supabaseAdmin.from('legend_pages').delete().in('id', deletedIds);
    if (error) throw new EditorContentError('No se pudieron eliminar páginas.', 500);
  }

  const livePages = pages.filter((page) => !page._delete);
  const saved = [];
  let index = 0;
  for (const page of livePages) {
    index += 1;
    const editorData = page.editorData ?? page.editor_data ?? { blocks: [] };
    let rendered = { html: '', text: '', stats: { words: 0, characters: 0, blocks: 0 } };
    try { rendered = renderEditorData(editorData); } catch { /* invalid -> store empty render */ }
    const payload = {
      version_id: versionId,
      page_number: Number(page.pageNumber ?? page.page_number ?? index),
      title: (page.title || '').trim() || null,
      text_content: rendered.text,
      editor_data: editorData,
      rendered_html: rendered.html,
      content_format: 'editorjs',
      editor_version: page.editorVersion || page.editor_version || editorData?.version || null,
      editor_stats: rendered.stats,
    };
    const query = page.id
      ? supabaseAdmin.from('legend_pages').update(payload).eq('id', page.id).select().single()
      : supabaseAdmin.from('legend_pages').insert(payload).select().single();
    const { data, error } = await query;
    if (error) throw new EditorContentError('No se pudo guardar la página.', 500);
    saved.push(data);
  }
  return saved.sort((a, b) => a.page_number - b.page_number).map(toApiPage);
}
