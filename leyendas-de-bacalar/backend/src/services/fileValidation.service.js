const MB = 1024 * 1024;

// Scanned-book PDFs are commonly 30-50 MB, so 25 MB was rejecting valid documents.
const MAX_SOURCE_DOCUMENT_BYTES = 50 * MB;
const MAX_IMAGE_BYTES = 10 * MB;
const MAX_MODEL_3D_BYTES = 50 * MB;

const PURPOSES = {
  source_document: {
    maxBytes: MAX_SOURCE_DOCUMENT_BYTES,
    mimeTypes: new Set([
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ]),
  },
  cover: {
    maxBytes: MAX_IMAGE_BYTES,
    mimeTypes: new Set(['image/png', 'image/jpeg', 'image/webp']),
  },
  banner: {
    maxBytes: MAX_IMAGE_BYTES,
    mimeTypes: new Set(['image/png', 'image/jpeg', 'image/webp']),
  },
  editor_image: {
    maxBytes: MAX_IMAGE_BYTES,
    mimeTypes: new Set(['image/png', 'image/jpeg', 'image/webp']),
  },
  marker_image: {
    maxBytes: MAX_IMAGE_BYTES,
    mimeTypes: new Set(['image/png', 'image/jpeg', 'image/webp']),
  },
  model_3d: {
    maxBytes: MAX_MODEL_3D_BYTES,
    mimeTypes: new Set(['model/gltf-binary', 'model/gltf+json']),
  },
};

// Carries a human-readable reason so the client can show WHY a file was rejected
// (size vs type vs missing fields) instead of an opaque "Invalid file metadata".
class FileValidationError extends Error {
  constructor(reason = '') {
    super(reason ? `Invalid file metadata: ${reason}.` : 'Invalid file metadata.');
    this.name = 'FileValidationError';
    this.statusCode = 400;
    this.reason = reason;
  }
}

const getExtension = (filename) => {
  const parts = String(filename || '').toLowerCase().split('.');
  return parts.length > 1 ? parts.at(-1) : '';
};

const isValidModelMimeType = ({ filename, mimeType }) => {
  if (PURPOSES.model_3d.mimeTypes.has(mimeType)) {
    return true;
  }

  return mimeType === 'application/octet-stream' && ['glb', 'gltf'].includes(getExtension(filename));
};

// Some browsers/OSes report PDFs/DOCX as 'application/octet-stream' or ''. Accept those
// when the file extension is a known document type, so valid documents are not rejected.
const isValidDocumentMimeType = ({ filename, mimeType, rules }) => {
  if (rules.mimeTypes.has(mimeType)) {
    return true;
  }

  return (
    (mimeType === 'application/octet-stream' || mimeType === '')
    && ['pdf', 'doc', 'docx'].includes(getExtension(filename))
  );
};

const formatMb = (bytes) => Math.round(bytes / MB);

const normalizeMetadata = ({ filename, mimeType, sizeBytes, purpose }) => {
  if (
    typeof filename !== 'string' ||
    typeof mimeType !== 'string' ||
    typeof purpose !== 'string' ||
    !Number.isFinite(sizeBytes)
  ) {
    throw new FileValidationError('missing or malformed fields');
  }

  return {
    filename: filename.trim(),
    mimeType: mimeType.trim().toLowerCase(),
    sizeBytes,
    purpose: purpose.trim(),
  };
};

const DOCUMENT_PURPOSES = new Set(['source_document']);

const ASSET_REGISTRATION_POLICIES = {
  editor_image: {
    assetType: 'illustration',
    metadataKind: 'editor_image',
    metadataContext: 'manual_editor',
  },
  model_3d: {
    assetType: 'model_3d',
    metadataKind: 'editor_model_3d',
    metadataContext: 'manual_editor',
  },
  marker_image: {
    assetType: 'marker_image',
    metadataKind: 'editor_marker',
    metadataContext: 'manual_editor',
  },
};

export const getAssetRegistrationPolicy = (purpose) => ASSET_REGISTRATION_POLICIES[purpose] ?? {
  assetType: purpose,
  metadataKind: purpose,
  metadataContext: null,
};

export const validateFileMetadata = (metadata) => {
  const normalized = normalizeMetadata(metadata ?? {});
  const rules = PURPOSES[normalized.purpose];

  if (!rules) {
    throw new FileValidationError(`unsupported purpose "${normalized.purpose}"`);
  }
  if (!normalized.filename || normalized.sizeBytes <= 0) {
    throw new FileValidationError('empty filename or size');
  }

  if (normalized.sizeBytes > rules.maxBytes) {
    throw new FileValidationError(`file too large (max ${formatMb(rules.maxBytes)} MB)`);
  }

  let validMimeType;
  if (normalized.purpose === 'model_3d') {
    validMimeType = isValidModelMimeType(normalized);
  } else if (DOCUMENT_PURPOSES.has(normalized.purpose)) {
    validMimeType = isValidDocumentMimeType({ ...normalized, rules });
  } else {
    validMimeType = rules.mimeTypes.has(normalized.mimeType);
  }

  if (!validMimeType) {
    throw new FileValidationError(`unsupported file type "${normalized.mimeType || 'unknown'}"`);
  }

  return {
    ok: true,
    normalized,
  };
};
