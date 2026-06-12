import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { getLegendAccessContext } from './legendAccess.service.js';
import {
  createSignedReadUrls,
  normalizeStoragePath,
  uploadStorageBuffer,
} from './storage.service.js';

class DocumentRenderError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'DocumentRenderError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const DOCUMENTS_BUCKET = 'legend-documents';
const SIGNED_URL_TTL_SECONDS = 3600;
const DEFAULT_RENDER_SCALE = 1.5;
const DEFAULT_RENDER_FORMAT = 'jpg';
const ASSET_SELECT = 'id, uploaded_by, asset_type, source_type, file_url, storage_path, mime_type, file_size, metadata, created_at';
const SOURCE_DOCUMENT_SELECT = [
  'id',
  'legend_id',
  'version_id',
  'asset_id',
  'uploaded_by',
  'document_type',
  'extraction_status',
  'is_primary_source',
  'page_count',
  'render_status',
  'rendered_page_count',
  'rendered_at',
  'render_error',
  'created_at',
].join(', ');
const RENDER_PAGE_SELECT = [
  'id',
  'source_document_id',
  'legend_id',
  'version_id',
  'page_number',
  'image_asset_id',
  'thumbnail_asset_id',
  'width',
  'height',
  'render_format',
  'render_scale',
  'status',
  'error_message',
  'metadata',
  'created_at',
  'updated_at',
].join(', ');

const getDatabaseErrorDetails = (table, error) => ({
  table,
  code: error?.code,
  reason: error?.message,
  details: error?.details,
  hint: error?.hint,
});

const normalizeRenderFormat = (format) => {
  const value = String(format || DEFAULT_RENDER_FORMAT).toLowerCase();

  if (value === 'jpeg') return 'jpg';
  if (['webp', 'jpg', 'png'].includes(value)) return value;

  throw new DocumentRenderError('Unsupported render format.', 400, { format });
};

const getMimeTypeForFormat = (format) => {
  if (format === 'webp') return 'image/webp';
  if (format === 'png') return 'image/png';
  return 'image/jpeg';
};

const getCanvasEncodeFormat = (format) => {
  if (format === 'jpg') return 'jpeg';
  return format;
};

const normalizeRenderScale = (scale) => {
  const numeric = Number(scale ?? DEFAULT_RENDER_SCALE);

  if (!Number.isFinite(numeric) || numeric <= 0 || numeric > 4) {
    throw new DocumentRenderError('Invalid render scale.', 400, { scale });
  }

  return numeric;
};

const padPageNumber = (pageNumber) => String(pageNumber).padStart(3, '0');

const getSafeErrorMessage = (error) => {
  if (error instanceof DocumentRenderError) return error.message;
  return error?.message || 'Could not render PDF page.';
};

const loadAsset = async (assetId) => {
  const { data, error } = await supabaseAdmin
    .from('assets')
    .select(ASSET_SELECT)
    .eq('id', assetId)
    .maybeSingle();

  if (error) {
    throw new DocumentRenderError('Could not load source document asset.', 500, getDatabaseErrorDetails('assets', error));
  }

  if (!data) {
    throw new DocumentRenderError('Source document asset not found.', 404);
  }

  return data;
};

const loadSourceDocument = async (sourceDocumentId) => {
  if (!sourceDocumentId) {
    throw new DocumentRenderError('Source document id is required.', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('legend_source_documents')
    .select(SOURCE_DOCUMENT_SELECT)
    .eq('id', sourceDocumentId)
    .maybeSingle();

  if (error) {
    throw new DocumentRenderError(
      'Could not load source document.',
      500,
      getDatabaseErrorDetails('legend_source_documents', error),
    );
  }

  if (!data) {
    throw new DocumentRenderError('Source document not found.', 404);
  }

  const asset = await loadAsset(data.asset_id);

  return {
    ...data,
    asset,
  };
};

const getSourceDocumentRenderContext = async ({ sourceDocumentId, userId, roles }) => {
  const sourceDocument = await loadSourceDocument(sourceDocumentId);
  const { legend } = await getLegendAccessContext({
    legendId: sourceDocument.legend_id,
    userId,
    roles,
  });

  return {
    sourceDocument,
    legend,
  };
};

const downloadSourcePdf = async (sourceDocument) => {
  const bucket = sourceDocument.asset?.metadata?.bucket || DOCUMENTS_BUCKET;

  if (bucket !== DOCUMENTS_BUCKET) {
    throw new DocumentRenderError('Source document is not stored in the documents bucket.', 400, { bucket });
  }

  const path = normalizeStoragePath({ bucket, path: sourceDocument.asset?.storage_path });

  if (!path) {
    throw new DocumentRenderError('Source document storage path not found.', 404);
  }

  const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);

  if (error || !data) {
    throw new DocumentRenderError('Could not download source PDF.', 500, {
      bucket,
      path,
      reason: error?.message,
    });
  }

  const arrayBuffer = await data.arrayBuffer();
  return {
    bucket,
    path,
    buffer: Buffer.from(arrayBuffer),
  };
};

const updateSourceDocumentRenderStatus = async ({
  sourceDocumentId,
  renderStatus,
  renderedPageCount = null,
  renderedAt = null,
  renderError = null,
  pageCount,
}) => {
  const payload = {
    render_status: renderStatus,
    rendered_page_count: renderedPageCount,
    rendered_at: renderedAt,
    render_error: renderError,
  };

  if (Number.isInteger(pageCount) && pageCount > 0) {
    payload.page_count = pageCount;
  }

  const { data, error } = await supabaseAdmin
    .from('legend_source_documents')
    .update(payload)
    .eq('id', sourceDocumentId)
    .select(SOURCE_DOCUMENT_SELECT)
    .single();

  if (error || !data) {
    throw new DocumentRenderError(
      'Could not update source document render status.',
      500,
      getDatabaseErrorDetails('legend_source_documents', error),
    );
  }

  const asset = await loadAsset(data.asset_id);

  return {
    ...data,
    asset,
  };
};

const loadRenderedPages = async (sourceDocumentId) => {
  const { data, error } = await supabaseAdmin
    .from('document_render_pages')
    .select(RENDER_PAGE_SELECT)
    .eq('source_document_id', sourceDocumentId)
    .order('page_number', { ascending: true });

  if (error) {
    throw new DocumentRenderError(
      'Could not load rendered document pages.',
      500,
      getDatabaseErrorDetails('document_render_pages', error),
    );
  }

  return data ?? [];
};

const loadRenderedPageAssets = async (pages) => {
  const assetIds = [
    ...new Set(
      pages
        .flatMap((page) => [page.image_asset_id, page.thumbnail_asset_id])
        .filter(Boolean),
    ),
  ];

  if (!assetIds.length) return new Map();

  const { data, error } = await supabaseAdmin
    .from('assets')
    .select(ASSET_SELECT)
    .in('id', assetIds);

  if (error) {
    throw new DocumentRenderError('Could not load rendered page assets.', 500, getDatabaseErrorDetails('assets', error));
  }

  return new Map((data ?? []).map((asset) => [String(asset.id), asset]));
};

const buildSignedUrlMapForAssets = async (assetsById) => {
  const assets = [...assetsById.values()];
  const paths = assets
    .filter((asset) => (asset.metadata?.bucket || DOCUMENTS_BUCKET) === DOCUMENTS_BUCKET)
    .map((asset) => normalizeStoragePath({ bucket: DOCUMENTS_BUCKET, path: asset.storage_path }))
    .filter(Boolean);

  return createSignedReadUrls({
    bucket: DOCUMENTS_BUCKET,
    paths,
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
};

const serializeRenderedPage = ({ page, assetsById, signedUrlsByPath }) => {
  const imageAsset = page.image_asset_id ? assetsById.get(String(page.image_asset_id)) : null;
  const thumbnailAsset = page.thumbnail_asset_id ? assetsById.get(String(page.thumbnail_asset_id)) : null;
  const imagePath = imageAsset?.storage_path
    ? normalizeStoragePath({ bucket: DOCUMENTS_BUCKET, path: imageAsset.storage_path })
    : null;
  const thumbnailPath = thumbnailAsset?.storage_path
    ? normalizeStoragePath({ bucket: DOCUMENTS_BUCKET, path: thumbnailAsset.storage_path })
    : null;

  return {
    id: page.id,
    sourceDocumentId: page.source_document_id,
    legendId: page.legend_id,
    versionId: page.version_id,
    pageNumber: page.page_number,
    status: page.status,
    errorMessage: page.error_message,
    width: page.width,
    height: page.height,
    renderFormat: page.render_format,
    renderScale: page.render_scale === null ? null : Number(page.render_scale),
    imageAssetId: page.image_asset_id,
    thumbnailAssetId: page.thumbnail_asset_id,
    imageUrl: imagePath ? signedUrlsByPath.get(imagePath) ?? null : null,
    thumbnailUrl: thumbnailPath ? signedUrlsByPath.get(thumbnailPath) ?? null : null,
    storagePath: imagePath,
    createdAt: page.created_at,
    updatedAt: page.updated_at,
  };
};

const buildRenderedPagesResponse = async ({ sourceDocument, pages }) => {
  const assetsById = await loadRenderedPageAssets(pages);
  const signedUrlsByPath = await buildSignedUrlMapForAssets(assetsById);

  return {
    sourceDocumentId: sourceDocument.id,
    legendId: sourceDocument.legend_id,
    versionId: sourceDocument.version_id,
    pageCount: sourceDocument.page_count ?? null,
    renderStatus: sourceDocument.render_status ?? 'not_rendered',
    renderedPageCount: sourceDocument.rendered_page_count ?? null,
    renderedAt: sourceDocument.rendered_at ?? null,
    renderError: sourceDocument.render_error ?? null,
    pages: pages.map((page) => serializeRenderedPage({ page, assetsById, signedUrlsByPath })),
  };
};

const loadPdfDocument = async (buffer) => {
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  return loadingTask.promise;
};

const getPdfPageCount = (pdfDocument) =>
  Number.isInteger(pdfDocument?.numPages) && pdfDocument.numPages > 0 ? pdfDocument.numPages : 0;

const renderPdfPageToImage = async ({ pdfDocument, pageNumber, scale, format }) => {
  const page = await pdfDocument.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const width = Math.ceil(viewport.width);
  const height = Math.ceil(viewport.height);
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  await page.render({
    canvasContext: context,
    viewport,
    background: 'white',
  }).promise;
  page.cleanup();

  return {
    buffer: await canvas.encode(getCanvasEncodeFormat(format), 86),
    width,
    height,
  };
};

const buildRenderedPageStoragePath = ({ legendId, versionId, sourceDocumentId, pageNumber, format }) => {
  const versionSegment = versionId || `source-${sourceDocumentId}`;
  return `legends/${legendId}/versions/${versionSegment}/rendered-pages/page-${padPageNumber(pageNumber)}.${format}`;
};

const upsertRenderedPageAsset = async ({
  existingAssetId,
  userId,
  sourceDocument,
  pageNumber,
  storagePath,
  mimeType,
  fileSize,
  format,
  scale,
  width,
  height,
}) => {
  const payload = {
    uploaded_by: userId,
    asset_type: 'illustration',
    source_type: 'upload',
    file_url: null,
    storage_path: storagePath,
    mime_type: mimeType,
    file_size: fileSize,
    metadata: {
      bucket: DOCUMENTS_BUCKET,
      kind: 'rendered_pdf_page',
      source_document_id: sourceDocument.id,
      legend_id: sourceDocument.legend_id,
      version_id: sourceDocument.version_id,
      page_number: pageNumber,
      render_format: format,
      render_scale: scale,
      width,
      height,
    },
  };

  if (existingAssetId) {
    const { data, error } = await supabaseAdmin
      .from('assets')
      .update(payload)
      .eq('id', existingAssetId)
      .select(ASSET_SELECT)
      .single();

    if (error || !data) {
      throw new DocumentRenderError('Could not update rendered page asset.', 500, getDatabaseErrorDetails('assets', error));
    }

    return data;
  }

  const { data, error } = await supabaseAdmin
    .from('assets')
    .insert(payload)
    .select(ASSET_SELECT)
    .single();

  if (error || !data) {
    throw new DocumentRenderError('Could not create rendered page asset.', 500, getDatabaseErrorDetails('assets', error));
  }

  return data;
};

const upsertRenderPage = async (payload) => {
  const { data, error } = await supabaseAdmin
    .from('document_render_pages')
    .upsert(payload, { onConflict: 'source_document_id,page_number' })
    .select(RENDER_PAGE_SELECT)
    .single();

  if (error || !data) {
    throw new DocumentRenderError(
      'Could not register rendered document page.',
      500,
      getDatabaseErrorDetails('document_render_pages', error),
    );
  }

  return data;
};

const getExistingRenderedPageByNumber = (pages, pageNumber) =>
  pages.find((page) => Number(page.page_number) === Number(pageNumber)) ?? null;

const renderSinglePage = async ({
  pdfDocument,
  sourceDocument,
  existingPage,
  pageNumber,
  userId,
  scale,
  format,
}) => {
  const image = await renderPdfPageToImage({
    pdfDocument,
    pageNumber,
    scale,
    format,
  });

  const mimeType = getMimeTypeForFormat(format);
  const storagePath = buildRenderedPageStoragePath({
    legendId: sourceDocument.legend_id,
    versionId: sourceDocument.version_id,
    sourceDocumentId: sourceDocument.id,
    pageNumber,
    format,
  });

  await uploadStorageBuffer({
    bucket: DOCUMENTS_BUCKET,
    path: storagePath,
    buffer: image.buffer,
    contentType: mimeType,
    upsert: true,
  });

  const asset = await upsertRenderedPageAsset({
    existingAssetId: existingPage?.image_asset_id,
    userId,
    sourceDocument,
    pageNumber,
    storagePath,
    mimeType,
    fileSize: image.buffer.length,
    format,
    scale,
    width: image.width,
    height: image.height,
  });

  return upsertRenderPage({
    source_document_id: sourceDocument.id,
    legend_id: sourceDocument.legend_id,
    version_id: sourceDocument.version_id,
    page_number: pageNumber,
    image_asset_id: asset.id,
    thumbnail_asset_id: existingPage?.thumbnail_asset_id ?? null,
    width: image.width,
    height: image.height,
    render_format: format,
    render_scale: scale,
    status: 'ready',
    error_message: null,
    metadata: {
      bucket: DOCUMENTS_BUCKET,
      storage_path: storagePath,
      source_asset_id: sourceDocument.asset_id,
      rendered_by: userId,
    },
  });
};

const markRenderPageFailed = async ({ sourceDocument, existingPage, pageNumber, format, scale, error }) =>
  upsertRenderPage({
    source_document_id: sourceDocument.id,
    legend_id: sourceDocument.legend_id,
    version_id: sourceDocument.version_id,
    page_number: pageNumber,
    image_asset_id: existingPage?.image_asset_id ?? null,
    thumbnail_asset_id: existingPage?.thumbnail_asset_id ?? null,
    width: existingPage?.width ?? null,
    height: existingPage?.height ?? null,
    render_format: format,
    render_scale: scale,
    status: 'failed',
    error_message: getSafeErrorMessage(error),
    metadata: {
      source_asset_id: sourceDocument.asset_id,
      reason: error?.message || null,
      details: error?.details ?? null,
    },
  });

export const getRenderedPagesForSourceDocument = async ({ sourceDocumentId, userId, roles }) => {
  const { sourceDocument } = await getSourceDocumentRenderContext({ sourceDocumentId, userId, roles });
  const pages = await loadRenderedPages(sourceDocument.id);

  return buildRenderedPagesResponse({ sourceDocument, pages });
};

export const renderPagesForSourceDocument = async ({
  sourceDocumentId,
  userId,
  roles,
  force = false,
  scale,
  format,
}) => {
  const renderScale = normalizeRenderScale(scale);
  const renderFormat = normalizeRenderFormat(format);
  const { sourceDocument } = await getSourceDocumentRenderContext({ sourceDocumentId, userId, roles });

  if (sourceDocument.document_type !== 'pdf' && sourceDocument.asset?.mime_type !== 'application/pdf') {
    throw new DocumentRenderError('Only PDF source documents can be rendered.', 400, {
      documentType: sourceDocument.document_type,
      mimeType: sourceDocument.asset?.mime_type,
    });
  }

  const existingPages = await loadRenderedPages(sourceDocument.id);
  const readyPages = existingPages.filter((page) => page.status === 'ready');

  if (!force && readyPages.length > 0) {
    return {
      ...(await buildRenderedPagesResponse({ sourceDocument, pages: existingPages })),
      reusedExistingRender: true,
    };
  }

  await updateSourceDocumentRenderStatus({
    sourceDocumentId: sourceDocument.id,
    renderStatus: 'rendering',
    renderedPageCount: readyPages.length || null,
    renderedAt: null,
    renderError: null,
  });

  let pdfDocument;

  try {
    const { buffer } = await downloadSourcePdf(sourceDocument);
    pdfDocument = await loadPdfDocument(buffer);
    const pageCount = getPdfPageCount(pdfDocument);

    if (!pageCount) {
      throw new DocumentRenderError('Could not detect PDF page count.', 422);
    }

    const renderedPages = [];
    const failedPages = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const existingPage = getExistingRenderedPageByNumber(existingPages, pageNumber);

      try {
        const renderedPage = await renderSinglePage({
          pdfDocument,
          sourceDocument,
          existingPage,
          pageNumber,
          userId,
          scale: renderScale,
          format: renderFormat,
        });
        renderedPages.push(renderedPage);
      } catch (error) {
        const failedPage = await markRenderPageFailed({
          sourceDocument,
          existingPage,
          pageNumber,
          format: renderFormat,
          scale: renderScale,
          error,
        });
        failedPages.push(failedPage);
      }
    }

    const finalStatus = renderedPages.length > 0 ? 'ready' : 'failed';
    const finalSourceDocument = await updateSourceDocumentRenderStatus({
      sourceDocumentId: sourceDocument.id,
      renderStatus: finalStatus,
      renderedPageCount: renderedPages.length,
      renderedAt: renderedPages.length > 0 ? new Date().toISOString() : null,
      renderError: failedPages.length > 0 ? `${failedPages.length} page(s) failed to render.` : null,
      pageCount,
    });
    const finalPages = await loadRenderedPages(sourceDocument.id);

    return {
      ...(await buildRenderedPagesResponse({ sourceDocument: finalSourceDocument, pages: finalPages })),
      reusedExistingRender: false,
      failedPages: failedPages.length,
    };
  } catch (error) {
    await updateSourceDocumentRenderStatus({
      sourceDocumentId: sourceDocument.id,
      renderStatus: 'failed',
      renderedPageCount: readyPages.length || null,
      renderedAt: null,
      renderError: getSafeErrorMessage(error),
    }).catch(() => null);

    throw error instanceof DocumentRenderError
      ? error
      : new DocumentRenderError('Could not render PDF pages.', 500, { reason: error?.message });
  } finally {
    if (pdfDocument) {
      await pdfDocument.destroy().catch(() => null);
    }
  }
};
