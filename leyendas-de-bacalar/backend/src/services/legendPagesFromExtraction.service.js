import { supabaseAdmin } from '../config/supabaseAdmin.js';
import {
  getExtractionReadyForPages,
  getSourceDocumentAccessContext,
} from './documentExtraction.service.js';

class LegendPagesFromExtractionError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'LegendPagesFromExtractionError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const DRAFT_VERSION_SELECT = 'id, legend_id, version_number, status, created_by, created_at';
const PAGE_SELECT = 'id, version_id, page_number, title, text_content, created_at';
const MAX_PAGE_CHARS = 2800;

const getDatabaseErrorDetails = (table, error) => ({
  table,
  code: error?.code,
  reason: error?.message,
  details: error?.details,
  hint: error?.hint,
});

const normalizeExtractedText = (text) => {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const splitLongUnit = (unit, maxChars = MAX_PAGE_CHARS) => {
  if (unit.length <= maxChars) {
    return [unit];
  }

  const words = unit.split(/(\s+)/);
  const chunks = [];
  let current = '';

  for (const word of words) {
    if ((current + word).length > maxChars && current.trim()) {
      chunks.push(current.trim());
      current = word.trimStart();
    } else {
      current += word;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
};

const splitTextIntoPages = (text) => {
  const normalized = normalizeExtractedText(text);

  if (!normalized) {
    throw new LegendPagesFromExtractionError('Extracted text is empty.', 400);
  }

  if (normalized.length <= MAX_PAGE_CHARS) {
    return [normalized];
  }

  const paragraphUnits = normalized.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const units = paragraphUnits.length > 1
    ? paragraphUnits
    : normalized.split('\n').map((item) => item.trim()).filter(Boolean);
  const separator = paragraphUnits.length > 1 ? '\n\n' : '\n';
  const pages = [];
  let current = '';

  for (const unit of units.flatMap((item) => splitLongUnit(item))) {
    const next = current ? `${current}${separator}${unit}` : unit;

    if (next.length > MAX_PAGE_CHARS && current) {
      pages.push(current);
      current = unit;
    } else {
      current = next;
    }
  }

  if (current) {
    pages.push(current);
  }

  return pages;
};

const loadDraftVersionForLegend = async (legendId) => {
  const { data, error } = await supabaseAdmin
    .from('legend_versions')
    .select(DRAFT_VERSION_SELECT)
    .eq('legend_id', legendId)
    .eq('status', 'draft')
    .order('version_number', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new LegendPagesFromExtractionError(
      'Could not load draft legend version.',
      500,
      getDatabaseErrorDetails('legend_versions', error),
    );
  }

  const version = data?.[0] ?? null;

  if (!version) {
    throw new LegendPagesFromExtractionError('Draft legend version not found.', 404, {
      legendId,
    });
  }

  return version;
};

const countPagesForVersion = async (versionId) => {
  const { count, error } = await supabaseAdmin
    .from('legend_pages')
    .select('id', { count: 'exact', head: true })
    .eq('version_id', versionId);

  if (error) {
    throw new LegendPagesFromExtractionError(
      'Could not count existing legend pages.',
      500,
      getDatabaseErrorDetails('legend_pages', error),
    );
  }

  return count ?? 0;
};

const insertPages = async ({ versionId, pages }) => {
  const payload = pages.map((textContent, index) => ({
    version_id: versionId,
    page_number: index + 1,
    title: `Pagina ${index + 1}`,
    text_content: textContent,
  }));

  const { data, error } = await supabaseAdmin
    .from('legend_pages')
    .insert(payload)
    .select(PAGE_SELECT);

  if (error || !data) {
    throw new LegendPagesFromExtractionError(
      'Could not insert legend pages.',
      500,
      getDatabaseErrorDetails('legend_pages', error),
    );
  }

  return data.sort((a, b) => a.page_number - b.page_number);
};

export const generatePagesFromExtraction = async ({ sourceDocumentId, requestedBy }) => {
  if (!requestedBy?.userId || !Array.isArray(requestedBy.roles)) {
    throw new LegendPagesFromExtractionError('Authenticated user context is required.', 401);
  }

  await getSourceDocumentAccessContext({
    sourceDocumentId,
    userId: requestedBy.userId,
    roles: requestedBy.roles,
  });

  const ready = await getExtractionReadyForPages(sourceDocumentId);
  const draftVersion = await loadDraftVersionForLegend(ready.legendId);
  const existingPageCount = await countPagesForVersion(draftVersion.id);

  if (existingPageCount > 0) {
    throw new LegendPagesFromExtractionError(
      'Legend version already has pages. Manual confirmation required.',
      409,
      {
        legendId: ready.legendId,
        versionId: draftVersion.id,
        existingPageCount,
      },
    );
  }

  const pageTexts = splitTextIntoPages(ready.extractedText);
  const pages = await insertPages({
    versionId: draftVersion.id,
    pages: pageTexts,
  });

  return {
    legendId: ready.legendId,
    versionId: draftVersion.id,
    extractionId: ready.extractionId,
    pagesCreated: pages.length,
    pages,
  };
};
