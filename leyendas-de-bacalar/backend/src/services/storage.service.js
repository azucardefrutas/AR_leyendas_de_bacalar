import { supabaseAdmin } from '../config/supabaseAdmin.js';

const BUCKETS_BY_PURPOSE = {
  source_document: 'legend-documents',
  cover: 'legend-assets',
  banner: 'legend-assets',
  marker_image: 'legend-assets',
  model_3d: 'legend-assets',
};

class StorageServiceError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'StorageServiceError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

const getExtension = (filename) => {
  const cleanName = String(filename || '').replace(/\\/g, '/').split('/').pop() || '';
  const parts = cleanName.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

const getSafeFilename = (filename) => {
  const cleanName = String(filename || '').replace(/\\/g, '/').split('/').pop() || '';
  const extension = getExtension(cleanName);
  const baseName = cleanName
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  if (!baseName) {
    throw new StorageServiceError('Invalid filename.', 400);
  }

  return extension ? `${baseName}.${extension}` : baseName;
};

export const getBucketForPurpose = (purpose) => {
  const bucket = BUCKETS_BY_PURPOSE[purpose];

  if (!bucket) {
    throw new StorageServiceError('Invalid upload purpose.', 400);
  }

  return bucket;
};

export const normalizeStoragePath = ({ bucket, path }) => {
  const normalized = String(path || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  const bucketPrefix = `${bucket}/`;

  return normalized.startsWith(bucketPrefix) ? normalized.slice(bucketPrefix.length) : normalized;
};

export const buildStoragePath = ({ userId, legendId, purpose, filename }) => {
  if (!userId || !legendId || !purpose) {
    throw new StorageServiceError('Invalid upload path context.', 400);
  }

  const safeFilename = getSafeFilename(filename);
  const timestamp = Date.now();

  return `${userId}/${legendId}/${purpose}/${timestamp}-${safeFilename}`;
};

export const createSignedUploadUrl = async ({ bucket, path }) => {
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);

  if (error || !data?.signedUrl) {
    throw new StorageServiceError('Could not create signed upload URL.');
  }

  return {
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path || path,
  };
};

export const createSignedReadUrl = async ({ bucket, path, expiresIn }) => {
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    throw new StorageServiceError('Could not create signed read URL.', 500, {
      bucket,
      path,
      reason: error?.message,
    });
  }

  return {
    signedUrl: data.signedUrl,
    path: data.path || path,
  };
};

export const getPublicUrlForAsset = ({ bucket, path }) => {
  if (bucket !== 'legend-assets') {
    return null;
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || null;
};

export const assertStoragePathMatchesUpload = ({ path, userId, legendId, purpose }) => {
  const normalizedPath = String(path || '').replace(/\\/g, '/');
  const expectedPrefix = `${userId}/${legendId}/${purpose}/`;

  if (!normalizedPath || normalizedPath.includes('..') || !normalizedPath.startsWith(expectedPrefix)) {
    throw new StorageServiceError('Invalid storage path.', 400);
  }
};

export const verifyStorageObjectExists = async ({ bucket, path }) => {
  const segments = String(path || '').split('/');
  const filename = segments.pop();
  const folder = segments.join('/');

  if (!filename || !folder) {
    throw new StorageServiceError('Invalid storage path.', 400);
  }

  const { data, error } = await supabaseAdmin.storage.from(bucket).list(folder, {
    limit: 100,
    search: filename,
  });

  if (error) {
    throw new StorageServiceError('Could not verify uploaded file.', 500, {
      bucket,
      folder,
      reason: error.message,
    });
  }

  const exists = (data ?? []).some((item) => item.name === filename);

  if (!exists) {
    throw new StorageServiceError('Uploaded file not found.', 404);
  }
};
