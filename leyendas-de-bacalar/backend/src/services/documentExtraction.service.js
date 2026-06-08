import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { getLegendAccessContext } from './legendAccess.service.js';

class DocumentExtractionError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'DocumentExtractionError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const loadSourceDocument = async (sourceDocumentId) => {
  if (!sourceDocumentId) {
    throw new DocumentExtractionError('Source document id is required.', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('legend_source_documents')
    .select('id, legend_id, asset_id, document_type, extraction_status, is_primary_source')
    .eq('id', sourceDocumentId)
    .maybeSingle();

  if (error) {
    throw new DocumentExtractionError('Could not load source document.', 500, {
      table: 'legend_source_documents',
      code: error.code,
      reason: error.message,
      details: error.details,
      hint: error.hint,
    });
  }

  if (!data) {
    throw new DocumentExtractionError('Source document not found.', 404);
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

export const createExtractionJob = async ({ sourceDocumentId, userId, roles }) => {
  const context = await getSourceDocumentAccessContext({ sourceDocumentId, userId, roles });
  const payload = {
    source_document_id: context.sourceDocument.id,
    status: 'pending',
    extracted_text: null,
    error_message: null,
  };

  const { data, error } = await supabaseAdmin
    .from('document_extractions')
    .insert(payload)
    .select('id, source_document_id, status, error_message, created_at')
    .single();

  if (error || !data) {
    throw new DocumentExtractionError('Could not create extraction job.', 500, {
      table: 'document_extractions',
      code: error?.code,
      reason: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
  }

  return {
    extraction: data,
    ...context,
  };
};

export const getExtractionJob = async ({ extractionId, userId, roles }) => {
  if (!extractionId) {
    throw new DocumentExtractionError('Extraction id is required.', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('document_extractions')
    .select('id, source_document_id, extracted_text, status, error_message, created_at')
    .eq('id', extractionId)
    .maybeSingle();

  if (error) {
    throw new DocumentExtractionError('Could not load extraction job.', 500, {
      table: 'document_extractions',
      code: error.code,
      reason: error.message,
      details: error.details,
      hint: error.hint,
    });
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
    .select('id, source_document_id, status, error_message, created_at')
    .single();

  if (error || !data) {
    throw new DocumentExtractionError('Could not mark extraction pending.', 500, {
      table: 'document_extractions',
      code: error?.code,
      reason: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
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
    .select('id, source_document_id, status, error_message, created_at')
    .single();

  if (error || !data) {
    throw new DocumentExtractionError('Could not mark extraction failed.', 500, {
      table: 'document_extractions',
      code: error?.code,
      reason: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
  }

  return data;
};
