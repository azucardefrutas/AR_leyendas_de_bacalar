import { Router } from 'express';

import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { validateFileMetadata } from '../services/fileValidation.service.js';
import { getLegendAccessContext } from '../services/legendAccess.service.js';

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

export default router;
