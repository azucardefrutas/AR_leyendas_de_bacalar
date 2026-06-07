const MB = 1024 * 1024;

const MAX_SOURCE_DOCUMENT_BYTES = 25 * MB;
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
  marker_image: {
    maxBytes: MAX_IMAGE_BYTES,
    mimeTypes: new Set(['image/png', 'image/jpeg', 'image/webp']),
  },
  model_3d: {
    maxBytes: MAX_MODEL_3D_BYTES,
    mimeTypes: new Set(['model/gltf-binary', 'model/gltf+json']),
  },
};

class FileValidationError extends Error {
  constructor() {
    super('Invalid file metadata.');
    this.name = 'FileValidationError';
    this.statusCode = 400;
  }
}

const getExtension = (filename) => {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts.at(-1) : '';
};

const isValidModelMimeType = ({ filename, mimeType }) => {
  if (PURPOSES.model_3d.mimeTypes.has(mimeType)) {
    return true;
  }

  return mimeType === 'application/octet-stream' && ['glb', 'gltf'].includes(getExtension(filename));
};

const normalizeMetadata = ({ filename, mimeType, sizeBytes, purpose }) => {
  if (
    typeof filename !== 'string' ||
    typeof mimeType !== 'string' ||
    typeof purpose !== 'string' ||
    !Number.isFinite(sizeBytes)
  ) {
    throw new FileValidationError();
  }

  return {
    filename: filename.trim(),
    mimeType: mimeType.trim().toLowerCase(),
    sizeBytes,
    purpose: purpose.trim(),
  };
};

export const validateFileMetadata = (metadata) => {
  const normalized = normalizeMetadata(metadata ?? {});
  const rules = PURPOSES[normalized.purpose];

  if (!rules || !normalized.filename || normalized.sizeBytes <= 0) {
    throw new FileValidationError();
  }

  if (normalized.sizeBytes > rules.maxBytes) {
    throw new FileValidationError();
  }

  const validMimeType =
    normalized.purpose === 'model_3d'
      ? isValidModelMimeType(normalized)
      : rules.mimeTypes.has(normalized.mimeType);

  if (!validMimeType) {
    throw new FileValidationError();
  }

  return {
    ok: true,
    normalized,
  };
};
