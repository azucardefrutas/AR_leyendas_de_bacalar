import { Router } from 'express';

import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { registerUploadedAsset } from '../services/assetRegistry.service.js';
import { validateFileMetadata } from '../services/fileValidation.service.js';
import { getLegendAccessContext } from '../services/legendAccess.service.js';
import {
  assertStoragePathMatchesUpload,
  buildStoragePath,
  createSignedUploadUrl,
  getBucketForPurpose,
  getPublicUrlForAsset,
  normalizeStoragePath,
  verifyStorageObjectExists,
} from '../services/storage.service.js';

const router = Router();

const requireCreatorOrAdmin = [requireAuth, requireRole(['creator', 'admin'])];

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

    assertStoragePathMatchesUpload({
      path: normalizedPath,
      userId: req.user.id,
      legendId,
      purpose: normalized.purpose,
    });

    await verifyStorageObjectExists({ bucket, path: normalizedPath });

    const publicUrl = getPublicUrlForAsset({ bucket, path: normalizedPath });
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

    res.json({
      ok: true,
      asset: {
        id: asset.id,
        asset_type: asset.asset_type,
        storage_path: asset.storage_path,
      },
      relation,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
