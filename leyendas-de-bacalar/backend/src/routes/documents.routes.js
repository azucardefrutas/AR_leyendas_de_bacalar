import { Router } from 'express';

import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { prepareAiPageProposal } from '../services/ai/aiPageProposal.service.js';
import { registerUploadedAsset } from '../services/assetRegistry.service.js';
import {
  getExtractionJob,
  getSourceDocumentAccessContext,
  startExtractionForSourceDocument,
} from '../services/documentExtraction.service.js';
import {
  getRenderedPagesForSourceDocument,
  renderPagesForSourceDocument,
} from '../services/documentRender.service.js';
import { validateFileMetadata } from '../services/fileValidation.service.js';
import { getLegendAccessContext } from '../services/legendAccess.service.js';
import { generatePagesFromExtraction } from '../services/legendPagesFromExtraction.service.js';
import {
  assertStoragePathMatchesUpload,
  buildStoragePath,
  createSignedReadUrl,
  createSignedUploadUrl,
  getBucketForPurpose,
  getPublicUrlForAsset,
  normalizeStoragePath,
  verifyStorageObjectExists,
} from '../services/storage.service.js';

const router = Router();

const requireCreatorOrAdmin = [requireAuth, requireRole(['creator', 'admin'])];
const SOURCE_DOCUMENT_VIEW_URL_TTL_SECONDS = 300;

const serializeExtraction = (extraction) => ({
  id: extraction.id,
  sourceDocumentId: extraction.source_document_id,
  status: extraction.status,
  errorMessage: extraction.error_message,
  createdAt: extraction.created_at,
  hasExtractedText: Boolean(extraction.extracted_text),
  textLength: extraction.extracted_text?.length ?? 0,
  preview: extraction.extracted_text ? extraction.extracted_text.slice(0, 240) : null,
});

const serializeSourceDocument = (sourceDocument) => ({
  id: sourceDocument.id,
  legendId: sourceDocument.legend_id,
  assetId: sourceDocument.asset_id,
  documentType: sourceDocument.document_type,
  extractionStatus: sourceDocument.extraction_status,
  isPrimarySource: sourceDocument.is_primary_source,
  pageCount: sourceDocument.page_count ?? null,
});

const logRegisterUploadDebug = (message, payload = {}) => {
  if (process.env.NODE_ENV === 'production') return;

  console.info('[documents/register-upload]', message, payload);
};

const logRegisterUploadError = (message, payload = {}) => {
  if (process.env.NODE_ENV === 'production') return;

  console.error('[documents/register-upload]', message, payload);
};

router.get('/legend/:legendId/context', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const { legend } = await getLegendAccessContext({
      legendId: req.params.legendId,
      userId: req.user.id,
      roles: req.user.roles,
    });

    res.json({
      ok: true,
      legend: {
        id: legend.id,
        title: legend.title,
        status: legend.status,
      },
      permissions: {
        canUploadSourceDocument: true,
        canUploadAssets: true,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/validate-file', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const { legendId, filename, mimeType, sizeBytes, purpose } = req.body ?? {};

    await getLegendAccessContext({
      legendId,
      userId: req.user.id,
      roles: req.user.roles,
    });

    const { normalized } = validateFileMetadata({
      filename,
      mimeType,
      sizeBytes,
      purpose,
    });

    res.json({
      ok: true,
      file: normalized,
      nextStep: 'upload_not_implemented_yet',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/prepare-upload', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const { legendId, filename, mimeType, sizeBytes, purpose } = req.body ?? {};

    await getLegendAccessContext({
      legendId,
      userId: req.user.id,
      roles: req.user.roles,
    });

    const { normalized } = validateFileMetadata({
      filename,
      mimeType,
      sizeBytes,
      purpose,
    });

    const bucket = getBucketForPurpose(normalized.purpose);
    const path = buildStoragePath({
      userId: req.user.id,
      legendId,
      purpose: normalized.purpose,
      filename: normalized.filename,
    });
    const upload = await createSignedUploadUrl({ bucket, path });

    res.json({
      ok: true,
      upload: {
        bucket,
        path,
        signedUrl: upload.signedUrl,
        token: upload.token,
      },
      file: normalized,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/register-upload', requireCreatorOrAdmin, async (req, res, next) => {
  const debugContext = {
    legendId: req.body?.legendId,
    bucket: req.body?.bucket,
    path: req.body?.path,
    filename: req.body?.filename,
    mimeType: req.body?.mimeType,
    sizeBytes: req.body?.sizeBytes,
    purpose: req.body?.purpose,
  };

  try {
    const { legendId, bucket, path, filename, mimeType, sizeBytes, purpose } = req.body ?? {};

    await getLegendAccessContext({
      legendId,
      userId: req.user.id,
      roles: req.user.roles,
    });

    const { normalized } = validateFileMetadata({
      filename,
      mimeType,
      sizeBytes,
      purpose,
    });
    const expectedBucket = getBucketForPurpose(normalized.purpose);

    if (bucket !== expectedBucket) {
      const error = new Error('Invalid storage bucket.');
      error.statusCode = 400;
      throw error;
    }

    const normalizedPath = normalizeStoragePath({ bucket, path });
    debugContext.normalizedPath = normalizedPath;
    debugContext.normalizedPurpose = normalized.purpose;
    debugContext.normalizedMimeType = normalized.mimeType;
    debugContext.normalizedSizeBytes = normalized.sizeBytes;

    logRegisterUploadDebug('validating uploaded object', debugContext);

    assertStoragePathMatchesUpload({
      path: normalizedPath,
      userId: req.user.id,
      legendId,
      purpose: normalized.purpose,
    });

    await verifyStorageObjectExists({ bucket, path: normalizedPath });

    const publicUrl = getPublicUrlForAsset({ bucket, path: normalizedPath });
    logRegisterUploadDebug('registering uploaded asset', {
      ...debugContext,
      assetType: normalized.purpose,
      publicAsset: Boolean(publicUrl),
    });

    const { asset, relation } = await registerUploadedAsset({
      userId: req.user.id,
      legendId,
      purpose: normalized.purpose,
      bucket,
      path: normalizedPath,
      filename: normalized.filename,
      mimeType: normalized.mimeType,
      sizeBytes: normalized.sizeBytes,
      publicUrl,
    });

    logRegisterUploadDebug('registered uploaded asset', {
      ...debugContext,
      assetId: asset.id,
      assetType: asset.asset_type,
      relationType: relation?.type,
      relationId: relation?.id,
      pageCount: relation?.pageCount ?? null,
    });

    res.json({
      ok: true,
      asset: {
        id: asset.id,
        asset_type: asset.asset_type,
        source_type: asset.source_type,
        file_url: asset.file_url,
        storage_path: asset.storage_path,
        mime_type: asset.mime_type,
        file_size: asset.file_size,
        metadata: asset.metadata,
        created_at: asset.created_at,
      },
      relation,
    });
  } catch (error) {
    logRegisterUploadError('failed', {
      ...debugContext,
      error: error.message,
      statusCode: error.statusCode,
      details: error.details,
    });
    next(error);
  }
});

router.get('/:sourceDocumentId/view-url', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const { sourceDocument } = await getSourceDocumentAccessContext({
      sourceDocumentId: req.params.sourceDocumentId,
      userId: req.user.id,
      roles: req.user.roles,
    });

    const asset = sourceDocument.asset ?? {};
    const expectedBucket = getBucketForPurpose('source_document');
    const bucket = asset.metadata?.bucket || expectedBucket;

    if (bucket !== expectedBucket) {
      const error = new Error('Invalid source document bucket.');
      error.statusCode = 400;
      throw error;
    }

    const storagePath = normalizeStoragePath({
      bucket,
      path: asset.storage_path,
    });

    if (!storagePath) {
      const error = new Error('Source document storage path not found.');
      error.statusCode = 404;
      throw error;
    }

    const { signedUrl } = await createSignedReadUrl({
      bucket,
      path: storagePath,
      expiresIn: SOURCE_DOCUMENT_VIEW_URL_TTL_SECONDS,
    });

    res.json({
      ok: true,
      sourceDocumentId: sourceDocument.id,
      signedUrl,
      documentType: sourceDocument.document_type,
      mimeType: asset.mime_type,
      fileSize: asset.file_size,
      pageCount: sourceDocument.page_count ?? null,
      expiresIn: SOURCE_DOCUMENT_VIEW_URL_TTL_SECONDS,
      storagePath,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:sourceDocumentId/render-pages', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const result = await getRenderedPagesForSourceDocument({
      sourceDocumentId: req.params.sourceDocumentId,
      userId: req.user.id,
      roles: req.user.roles,
    });

    res.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:sourceDocumentId/render-pages', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const result = await renderPagesForSourceDocument({
      sourceDocumentId: req.params.sourceDocumentId,
      userId: req.user.id,
      roles: req.user.roles,
      force: req.body?.force === true,
      scale: req.body?.scale,
      format: req.body?.format,
    });

    res.json({
      ok: true,
      ...result,
      nextStep: 'rendered_pages_ready_for_reader_bundle',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:sourceDocumentId/extraction/start', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const { extraction, sourceDocument, legend, extractionResult, reusedExistingExtraction } =
      await startExtractionForSourceDocument({
        sourceDocumentId: req.params.sourceDocumentId,
        userId: req.user.id,
        roles: req.user.roles,
      });

    if (extraction.status !== 'completed') {
      const error = new Error('Extraction did not complete.');
      error.statusCode = 500;
      throw error;
    }

    res.json({
      ok: true,
      extraction: serializeExtraction(extraction),
      sourceDocument: serializeSourceDocument(sourceDocument),
      legend: {
        id: legend.id,
        title: legend.title,
        status: legend.status,
      },
      extractionResult: extractionResult ?? null,
      reusedExistingExtraction,
      nextStep: 'legend_pages_not_generated_yet',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:sourceDocumentId/pages/generate', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const result = await generatePagesFromExtraction({
      sourceDocumentId: req.params.sourceDocumentId,
      requestedBy: {
        userId: req.user.id,
        roles: req.user.roles,
      },
    });

    res.status(201).json({
      ok: true,
      legendId: result.legendId,
      versionId: result.versionId,
      extractionId: result.extractionId,
      pagesCreated: result.pagesCreated,
      pages: result.pages.map((page) => ({
        id: page.id,
        pageNumber: page.page_number,
        title: page.title,
        textLength: page.text_content?.length ?? 0,
      })),
      nextStep: 'pages_generated_without_ai',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:sourceDocumentId/pages/propose-ai', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const result = await prepareAiPageProposal({
      sourceDocumentId: req.params.sourceDocumentId,
      requestedBy: {
        userId: req.user.id,
        roles: req.user.roles,
      },
    });

    res.json(result);
  } catch (error) {
    if (error.name === 'AiPageProposalError' && error.details?.reason) {
      res.status(error.statusCode || error.details.status || 500).json({
        ok: false,
        ...error.details,
      });
      return;
    }

    next(error);
  }
});

router.get('/extractions/:extractionId', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const { extraction, sourceDocument, legend } = await getExtractionJob({
      extractionId: req.params.extractionId,
      userId: req.user.id,
      roles: req.user.roles,
    });

    res.json({
      ok: true,
      extraction: serializeExtraction(extraction),
      sourceDocument: serializeSourceDocument(sourceDocument),
      legend: {
        id: legend.id,
        title: legend.title,
        status: legend.status,
      },
      nextStep: extraction.status === 'completed' ? 'legend_pages_not_generated_yet' : null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
