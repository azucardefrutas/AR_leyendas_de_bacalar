import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { getLegendAccessContext } from './legendAccess.service.js';
import {
  DocumentTextExtractionError,
  extractTextFromSourceDocument,
} from './documentTextExtractor.service.js';

class DocumentExtractionError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'DocumentExtractionError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const SOURCE_DOCUMENT_SELECT = 'id, legend_id, asset_id, document_type, extraction_status, is_primary_source, page_count';
const ASSET_SELECT = 'id, asset_type, source_type, storage_path, file_url, mime_type, file_size, metadata';
const EXTRACTION_SELECT = 'id, source_document_id, extracted_text, status, error_message, created_at';
const EXTRACTION_SUMMARY_SELECT = 'id, source_document_id, status, error_message, created_at';

const getDatabaseErrorDetails = (table, error) => ({
  table,
  code: error?.code,
  reason: error?.message,
  details: error?.details,
  hint: error?.hint,
});

const getSafeExtractionErrorMessage = (error) => {
  if (error instanceof DocumentTextExtractionError || error instanceof DocumentExtractionError) {
    return error.message;
  }

  return 'Could not extract text from source document.';
};

const getSourceDocumentFailureStatus = (error) => {
  if (error?.details?.extractionStatus === 'manual_required') {
    return 'manual_required';
  }

  return 'failed';
};

const loadAsset = async (assetId) => {
  if (!assetId) {
    throw new DocumentExtractionError('Source document asset id is required.', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('assets')
    .select(ASSET_SELECT)
    .eq('id', assetId)
    .maybeSingle();

  if (error) {
    throw new DocumentExtractionError('Could not load source document asset.', 500, getDatabaseErrorDetails('assets', error));
  }

  if (!data) {
    throw new DocumentExtractionError('Source document asset not found.', 404);
  }

  return data;
};

const loadSourceDocument = async (sourceDocumentId) => {
  if (!sourceDocumentId) {
    throw new DocumentExtractionError('Source document id is required.', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('legend_source_documents')
    .select(SOURCE_DOCUMENT_SELECT)
    .eq('id', sourceDocumentId)
    .maybeSingle();

  if (error) {
    throw new DocumentExtractionError(
      'Could not load source document.',
      500,
      getDatabaseErrorDetails('legend_source_documents', error),
    );
  }

  if (!data) {
    throw new DocumentExtractionError('Source document not found.', 404);
  }

  const asset = await loadAsset(data.asset_id);

  return {
    ...data,
    asset,
  };
};

const insertExtractionJob = async (sourceDocumentId) => {
  const payload = {
    source_document_id: sourceDocumentId,
    status: 'pending',
    extracted_text: null,
    error_message: null,
  };

  const { data, error } = await supabaseAdmin
    .from('document_extractions')
    .insert(payload)
    .select(EXTRACTION_SELECT)
    .single();

  if (error || !data) {
    throw new DocumentExtractionError(
      'Could not create extraction job.',
      500,
      getDatabaseErrorDetails('document_extractions', error),
    );
  }

  return data;
};

const loadLatestExtractionJob = async (sourceDocumentId) => {
  const { data, error } = await supabaseAdmin
    .from('document_extractions')
    .select(EXTRACTION_SELECT)
    .eq('source_document_id', sourceDocumentId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new DocumentExtractionError(
      'Could not load latest extraction job.',
      500,
      getDatabaseErrorDetails('document_extractions', error),
    );
  }

  return data?.[0] ?? null;
};

export const getLatestCompletedExtractionForSourceDocument = async (sourceDocumentId) => {
  if (!sourceDocumentId) {
    throw new DocumentExtractionError('Source document id is required.', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('document_extractions')
    .select(EXTRACTION_SELECT)
    .eq('source_document_id', sourceDocumentId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new DocumentExtractionError(
      'Could not load completed extraction.',
      500,
      getDatabaseErrorDetails('document_extractions', error),
    );
  }

  return data?.[0] ?? null;
};

const updateSourceDocumentExtractionStatus = async ({ sourceDocumentId, extractionStatus, pageCount }) => {
  const payload = { extraction_status: extractionStatus };

  if (Number.isInteger(pageCount) && pageCount >= 0) {
    payload.page_count = pageCount;
  }

  const { data, error } = await supabaseAdmin
    .from('legend_source_documents')
    .update(payload)
    .eq('id', sourceDocumentId)
    .select(SOURCE_DOCUMENT_SELECT)
    .single();

  if (error || !data) {
    throw new DocumentExtractionError(
      'Could not update source document extraction status.',
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

const markExtractionCompleted = async ({ extractionId, extractedText }) => {
  const { data, error } = await supabaseAdmin
    .from('document_extractions')
    .update({
      status: 'completed',
      extracted_text: extractedText,
      error_message: null,
    })
    .eq('id', extractionId)
    .select(EXTRACTION_SELECT)
    .single();

  if (error || !data) {
    throw new DocumentExtractionError(
      'Could not mark extraction completed.',
      500,
      getDatabaseErrorDetails('document_extractions', error),
    );
  }

  return data;
};

export const getSourceDocumentAccessContext = async ({ sourceDocumentId, userId, roles }) => {
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

export const startExtractionForSourceDocument = async ({ sourceDocumentId, userId, roles }) => {
  const context = await getSourceDocumentAccessContext({ sourceDocumentId, userId, roles });
  const completedExtraction = await getLatestCompletedExtractionForSourceDocument(context.sourceDocument.id);

  if (completedExtraction?.extracted_text) {
    const sourceDocument =
      context.sourceDocument.extraction_status === 'extracted'
        ? context.sourceDocument
        : await updateSourceDocumentExtractionStatus({
            sourceDocumentId: context.sourceDocument.id,
            extractionStatus: 'extracted',
          });

    return {
      extraction: completedExtraction,
      sourceDocument,
      legend: context.legend,
      extractionResult: {
        documentKind: sourceDocument.document_type,
        byteLength: sourceDocument.asset?.file_size ?? null,
        textLength: completedExtraction.extracted_text.length,
      },
      reusedExistingExtraction: true,
    };
  }

  const existingExtraction = await loadLatestExtractionJob(context.sourceDocument.id);
  let extraction = existingExtraction?.status === 'pending' ? existingExtraction : null;

  try {
    if (!extraction) {
      extraction = await insertExtractionJob(context.sourceDocument.id);
    }

    const extracted = await extractTextFromSourceDocument({
      sourceDocument: context.sourceDocument,
    });

    const completedExtraction = await markExtractionCompleted({
      extractionId: extraction.id,
      extractedText: extracted.text,
    });

    const sourceDocument = await updateSourceDocumentExtractionStatus({
      sourceDocumentId: context.sourceDocument.id,
      extractionStatus: 'extracted',
      pageCount: extracted.pageCount,
    });

    return {
      extraction: completedExtraction,
      sourceDocument,
      legend: context.legend,
      extractionResult: {
        documentKind: extracted.documentKind,
        byteLength: extracted.byteLength,
        textLength: extracted.text.length,
      },
      reusedExistingExtraction: false,
    };
  } catch (error) {
    const safeMessage = getSafeExtractionErrorMessage(error);
    const extractionStatus = getSourceDocumentFailureStatus(error);

    if (extraction?.id) {
      await markExtractionFailed({
        extractionId: extraction.id,
        errorMessage: safeMessage,
      }).catch(() => null);
    }

    await updateSourceDocumentExtractionStatus({
      sourceDocumentId: context.sourceDocument.id,
      extractionStatus,
    }).catch(() => null);

    throw new DocumentExtractionError(safeMessage, error.statusCode || 500, {
      reason: error.message,
      details: error.details,
    });
  }
};

export const getExtractionReadyForPages = async (sourceDocumentId) => {
  const sourceDocument = await loadSourceDocument(sourceDocumentId);

  if (sourceDocument.extraction_status !== 'extracted') {
    throw new DocumentExtractionError('Source document is not extracted yet.', 409, {
      sourceDocumentId,
      extractionStatus: sourceDocument.extraction_status,
    });
  }

  const extraction = await getLatestCompletedExtractionForSourceDocument(sourceDocument.id);

  if (!extraction?.extracted_text) {
    throw new DocumentExtractionError('Completed extraction text was not found.', 409, {
      sourceDocumentId,
    });
  }

  return {
    sourceDocument,
    legendId: sourceDocument.legend_id,
    extractionId: extraction.id,
    extractedText: extraction.extracted_text,
    textLength: extraction.extracted_text.length,
  };
};

export const getExtractionJob = async ({ extractionId, userId, roles }) => {
  if (!extractionId) {
    throw new DocumentExtractionError('Extraction id is required.', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('document_extractions')
    .select(EXTRACTION_SELECT)
    .eq('id', extractionId)
    .maybeSingle();

  if (error) {
    throw new DocumentExtractionError(
      'Could not load extraction job.',
      500,
      getDatabaseErrorDetails('document_extractions', error),
    );
  }

  if (!data) {
    throw new DocumentExtractionError('Extraction job not found.', 404);
  }

  const context = await getSourceDocumentAccessContext({
    sourceDocumentId: data.source_document_id,
    userId,
    roles,
  });

  return {
    extraction: data,
    ...context,
  };
};

export const markExtractionPending = async ({ extractionId }) => {
  if (!extractionId) {
    throw new DocumentExtractionError('Extraction id is required.', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('document_extractions')
    .update({
      status: 'pending',
      error_message: null,
    })
    .eq('id', extractionId)
    .select(EXTRACTION_SUMMARY_SELECT)
    .single();

  if (error || !data) {
    throw new DocumentExtractionError(
      'Could not mark extraction pending.',
      500,
      getDatabaseErrorDetails('document_extractions', error),
    );
  }

  return data;
};

export const markExtractionFailed = async ({ extractionId, errorMessage }) => {
  if (!extractionId) {
    throw new DocumentExtractionError('Extraction id is required.', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('document_extractions')
    .update({
      status: 'failed',
      error_message: errorMessage || 'Extraction failed.',
    })
    .eq('id', extractionId)
    .select(EXTRACTION_SUMMARY_SELECT)
    .single();

  if (error || !data) {
    throw new DocumentExtractionError(
      'Could not mark extraction failed.',
      500,
      getDatabaseErrorDetails('document_extractions', error),
    );
  }

  return data;
};
