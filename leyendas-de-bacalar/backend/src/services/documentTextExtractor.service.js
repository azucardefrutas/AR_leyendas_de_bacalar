import { Buffer } from 'node:buffer';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

import { supabaseAdmin } from '../config/supabaseAdmin.js';

export class DocumentTextExtractionError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'DocumentTextExtractionError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const SOURCE_DOCUMENT_BUCKET = 'legend-documents';
const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const getSourceDocumentAsset = (sourceDocument) => {
  return sourceDocument.asset ?? sourceDocument.assets ?? null;
};

const getStorageBucket = (sourceDocument) => {
  const asset = getSourceDocumentAsset(sourceDocument);
  return asset?.metadata?.bucket ?? SOURCE_DOCUMENT_BUCKET;
};

const normalizeExtractedText = (text) => {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const getDocumentKind = (sourceDocument) => {
  const asset = getSourceDocumentAsset(sourceDocument);
  const documentType = String(sourceDocument.document_type ?? '').toLowerCase();
  const assetType = String(asset?.asset_type ?? '').toLowerCase();
  const mimeType = String(asset?.mime_type ?? '').toLowerCase();

  if (documentType === 'pdf' || assetType === 'pdf' || mimeType === 'application/pdf') {
    return 'pdf';
  }

  if (documentType === 'docx' || assetType === 'docx' || mimeType === DOCX_MIME_TYPE) {
    return 'docx';
  }

  if (documentType === 'doc' || assetType === 'doc' || mimeType === 'application/msword') {
    return 'doc';
  }

  return documentType || assetType || mimeType || 'unknown';
};

const downloadSourceDocumentBuffer = async (sourceDocument) => {
  const asset = getSourceDocumentAsset(sourceDocument);
  const bucket = getStorageBucket(sourceDocument);
  const path = asset?.storage_path;

  if (!asset?.id || !path) {
    throw new DocumentTextExtractionError('Source document asset is incomplete.', 400, {
      extractionStatus: 'failed',
    });
  }

  const { data, error } = await supabaseAdmin.storage.from(bucket).download(path);

  if (error || !data) {
    throw new DocumentTextExtractionError('Could not download source document.', 500, {
      bucket,
      path,
      storageError: error?.message,
      extractionStatus: 'failed',
    });
  }

  const arrayBuffer = await data.arrayBuffer();

  return {
    asset,
    bucket,
    path,
    buffer: Buffer.from(arrayBuffer),
  };
};

const extractPdfText = async (buffer) => {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy().catch(() => {});
  }
};

const extractDocxText = async (buffer) => {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
};

export const extractTextFromSourceDocument = async ({ sourceDocument }) => {
  const { buffer } = await downloadSourceDocumentBuffer(sourceDocument);
  const documentKind = getDocumentKind(sourceDocument);

  let rawText = '';

  if (documentKind === 'pdf') {
    rawText = await extractPdfText(buffer);
  } else if (documentKind === 'docx') {
    rawText = await extractDocxText(buffer);
  } else if (documentKind === 'doc') {
    throw new DocumentTextExtractionError('Legacy DOC files require manual review.', 422, {
      documentKind,
      extractionStatus: 'manual_required',
    });
  } else {
    throw new DocumentTextExtractionError('Unsupported source document type.', 415, {
      documentKind,
      extractionStatus: 'manual_required',
    });
  }

  const text = normalizeExtractedText(rawText);

  if (!text) {
    throw new DocumentTextExtractionError('The source document did not contain selectable text.', 422, {
      documentKind,
      extractionStatus: 'manual_required',
    });
  }

  return {
    documentKind,
    text,
    byteLength: buffer.length,
  };
};
