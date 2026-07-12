import { Router } from 'express';

import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  CreatorCodesError,
  exportCreatorCodeBatchCsv,
  generateCreatorCodes,
  getCreatorCodesOverview,
} from '../services/creatorCodes.service.js';
import { listCreatorLegends } from '../services/creatorLegends.service.js';

const router = Router();
const requireCreatorOrAdmin = [requireAuth, requireRole(['creator', 'admin'])];

// Enriched list of the creator's legends (genres + cover + page count + review
// state) aggregated server-side, so the browser makes one call.
router.get('/legends', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const legends = await listCreatorLegends({
      userId: req.user.id,
      roles: req.user.roles,
      limit: req.query?.limit ? Number(req.query.limit) : 50,
    });
    res.json({ ok: true, legends });
  } catch (error) {
    next(error);
  }
});

router.get('/codes/overview', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const overview = await getCreatorCodesOverview({ userId: req.user.id });
    res.json({ ok: true, ...overview });
  } catch (error) {
    if (error instanceof CreatorCodesError) {
      return res.status(error.statusCode).json({ ok: false, error: error.message });
    }
    return next(error);
  }
});

router.post('/codes', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const result = await generateCreatorCodes({
      userId: req.user.id,
      accessToken: req.accessToken,
      payload: req.body,
    });
    res.status(result?.outcome === 'generated' ? 201 : 202).json({ ok: true, result });
  } catch (error) {
    if (error instanceof CreatorCodesError) {
      return res.status(error.statusCode).json({ ok: false, error: error.message });
    }
    return next(error);
  }
});

router.get('/code-batches/:batchId/export.csv', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const result = await exportCreatorCodeBatchCsv({
      userId: req.user.id,
      batchId: req.params.batchId,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(result.csv);
  } catch (error) {
    if (error instanceof CreatorCodesError) {
      return res.status(error.statusCode).json({ ok: false, error: error.message });
    }
    return next(error);
  }
});

export default router;
