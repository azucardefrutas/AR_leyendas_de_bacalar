import { Router } from 'express';

import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  createLegendDraft,
  duplicateLegend,
  getEditorData,
  updateLegendGeneral,
} from '../services/creatorLegends.service.js';

const router = Router();
const requireCreatorOrAdmin = [requireAuth, requireRole(['creator', 'admin'])];

// Create a legend draft (legend + version 1 + genres) in one call.
router.post('/', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const result = await createLegendDraft({
      userId: req.user.id,
      roles: req.user.roles,
      payload: req.body?.legend ?? req.body ?? {},
    });
    res.status(201).json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});

// Update legend metadata (+ optional genres) for a draft/rejected legend.
router.patch('/:legendId', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const result = await updateLegendGeneral({
      legendId: req.params.legendId,
      userId: req.user.id,
      roles: req.user.roles,
      payload: req.body?.legend ?? req.body ?? {},
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});

// Full editor payload in one call: legend + version + pages + genres + resources.
router.get('/:legendId/editor', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const data = await getEditorData({
      legendId: req.params.legendId,
      userId: req.user.id,
      roles: req.user.roles,
    });
    res.json({ ok: true, ...data });
  } catch (error) {
    next(error);
  }
});

// Duplicate a legend the creator owns into a brand-new draft (copies pages + genres).
router.post('/:legendId/duplicate', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const result = await duplicateLegend({
      legendId: req.params.legendId,
      userId: req.user.id,
      roles: req.user.roles,
    });
    res.status(201).json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});

export default router;
