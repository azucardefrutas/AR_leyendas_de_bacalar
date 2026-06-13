// Single source of truth for turning a reader-bundle into the unified page list
// that ConalitegStyleReader renders, and for filtering hotspots per page.
// Both PDF-rendered and manual stories share the SAME normalized shape.

/**
 * Normalize a reader-bundle into a common page list.
 * Prefers backend-rendered PDF pages; falls back to manual legend_pages.
 *
 * @returns {Array<{pageNumber:number, type:'rendered_pdf'|'manual', imageUrl:?string,
 *   title:?string, textContent:?string, width:?number, height:?number,
 *   sourceDocumentId:?string, pageId:?string}>}
 */
export function buildReaderPagesFromBundle(bundle) {
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
    width: null,
    height: null,
    sourceDocumentId: null,
    pageId: page.id ?? null,
  }));
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
