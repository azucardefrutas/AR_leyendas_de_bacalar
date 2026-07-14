// Single source of truth for turning a reader-bundle into the unified page list
// that ConalitegStyleReader renders, and for filtering hotspots per page.
// Both PDF-rendered and manual stories share the SAME normalized shape.
import { editorJsToHtml } from './editorJsToHtml.js';

/**
 * Normalize a reader-bundle into a common page list.
 * Prefers backend-rendered PDF pages; falls back to manual legend_pages.
 *
 * @returns {Array<{pageNumber:number, type:'rendered_pdf'|'manual', imageUrl:?string,
 *   title:?string, textContent:?string, width:?number, height:?number,
 *   sourceDocumentId:?string, pageId:?string}>}
 */
function buildContentPages(bundle) {
  const rendered = bundle?.renderedPages ?? [];
  if (rendered.length > 0) {
    const sourceDocumentId = bundle?.sourceDocument?.id ?? null;
    return rendered
      .filter((page) => page?.imageUrl)
      .map((page) => ({
        pageNumber: page.pageNumber,
        type: 'rendered_pdf',
        imageUrl: page.imageUrl,
        title: null,
        textContent: null,
        width: page.width ?? null,
        height: page.height ?? null,
        sourceDocumentId,
        pageId: null,
      }));
  }

  const manual = bundle?.legendPages ?? [];
  return manual.map((page) => ({
    pageNumber: page.pageNumber,
    type: 'manual',
    imageUrl: null,
    title: page.title ?? null,
    textContent: page.textContent ?? '',
    renderedHtml: page.renderedHtml ?? page.rendered_html ?? null,
    // Live Editor.js data (only present for the local preview); lets the reader
    // render real inline 3D models. The public reader (bundle) leaves this null.
    editorData: page.editorData ?? null,
    width: null,
    height: null,
    sourceDocumentId: null,
    pageId: page.id ?? null,
  }));
}

// Wraps the content pages with the editorial-template cover & back cover so the
// book reads continuously: cover → pages → back cover. Pages stay Editor.js/PDF.
export function buildReaderPagesFromBundle(bundle) {
  const content = buildContentPages(bundle);
  const legend = bundle?.legend;
  if (!legend?.coverTemplateId || content.length === 0) return content;

  const cover = {
    pageNumber: '',
    type: 'template-cover',
    templateId: legend.coverTemplateId,
    templateData: legend.coverData ?? {},
    hideNumber: true,
    width: null,
    height: null,
    sourceDocumentId: null,
    pageId: null,
  };
  const back = {
    pageNumber: '',
    type: 'template-back',
    templateId: legend.coverTemplateId,
    templateData: legend.backCoverData ?? {},
    hideNumber: true,
    width: null,
    height: null,
    sourceDocumentId: null,
    pageId: null,
  };
  return [cover, ...content, back];
}

// Build the SAME reader page list from the editor's LIVE local state (unsaved),
// so "Vista previa" shows the book with the exact CONALITEG flip physics without
// waiting for a save/fetch. Reuses buildReaderPagesFromBundle so the preview and
// the public reader are guaranteed to build pages identically.
export function buildPreviewPages(localPages = [], meta = {}) {
  const legendPages = (localPages || []).map((page, index) => ({
    id: page.id || page.client_id || `preview-${index}`,
    pageNumber: page.page_number ?? index + 1,
    title: page.title || null,
    textContent: '',
    renderedHtml: page.editor_data?.blocks?.length ? editorJsToHtml(page.editor_data) : '',
    // Keep the live blocks so the reader can render real inline 3D models/markers.
    editorData: page.editor_data?.blocks?.length ? page.editor_data : null,
  }));
  return buildReaderPagesFromBundle({
    legend: {
      coverTemplateId: meta.templateId || null,
      coverData: meta.coverData || {},
      backCoverData: meta.backCoverData || {},
    },
    legendPages,
    // Uploaded legends preview their real rendered PDF pages (images) instead of the
    // extracted text; buildContentPages prefers renderedPages when present.
    renderedPages: meta.renderedPages ?? [],
  });
}

/**
 * Return the hotspots that belong to a given reader page.
 * Centralized so both PDF and manual readers use the exact same logic.
 */
export function getHotspotsForReaderPage(page, hotspots = []) {
  if (!page) return [];
  if (page.type === 'rendered_pdf') {
    return hotspots.filter(
      (hotspot) =>
        (hotspot.targetType ?? hotspot.target_type) === 'source_document'
        && Number(hotspot.sourcePageNumber ?? hotspot.source_page_number) === Number(page.pageNumber),
    );
  }
  return hotspots.filter(
    (hotspot) =>
      (hotspot.targetType ?? hotspot.target_type) === 'legend_page'
      && page.pageId != null
      && String(hotspot.pageId ?? hotspot.page_id) === String(page.pageId),
  );
}
