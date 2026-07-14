import { Router } from 'express';

import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  createHotspot,
  createMarker,
  createScene,
  deleteHotspot,
  listHotspots,
  listScenes,
  updateHotspot,
} from '../services/interactiveHotspots.service.js';

const router = Router();

const requireCreatorOrAdmin = [requireAuth, requireRole(['creator', 'admin'])];

router.get('/:legendId/hotspots', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const hotspots = await listHotspots({
      legendId: req.params.legendId,
      userId: req.user.id,
      roles: req.user.roles,
      query: {
        targetType: req.query.targetType,
        sourceDocumentId: req.query.sourceDocumentId,
        sourcePageNumber: req.query.sourcePageNumber,
        pageId: req.query.pageId,
      },
    });

    res.json({ ok: true, hotspots });
  } catch (error) {
    next(error);
  }
});

router.post('/:legendId/hotspots', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const hotspot = await createHotspot({
      legendId: req.params.legendId,
      userId: req.user.id,
      roles: req.user.roles,
      payload: req.body ?? {},
    });

    res.status(201).json({ ok: true, hotspot });
  } catch (error) {
    next(error);
  }
});

router.get('/:legendId/scenes', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const scenes = await listScenes({
      legendId: req.params.legendId,
      userId: req.user.id,
      roles: req.user.roles,
    });

    res.json({ ok: true, scenes });
  } catch (error) {
    next(error);
  }
});

router.post('/:legendId/scenes', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const scene = await createScene({
      legendId: req.params.legendId,
      userId: req.user.id,
      roles: req.user.roles,
      payload: req.body ?? {},
    });

    res.status(201).json({ ok: true, scene });
  } catch (error) {
    next(error);
  }
});

router.post('/:legendId/markers', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const marker = await createMarker({
      legendId: req.params.legendId,
      userId: req.user.id,
      roles: req.user.roles,
      payload: req.body ?? {},
    });

    res.status(201).json({ ok: true, marker });
  } catch (error) {
    next(error);
  }
});

router.patch('/:legendId/hotspots/:hotspotId', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const hotspot = await updateHotspot({
      legendId: req.params.legendId,
      hotspotId: req.params.hotspotId,
      userId: req.user.id,
      roles: req.user.roles,
      payload: req.body ?? {},
    });

    res.json({ ok: true, hotspot });
  } catch (error) {
    next(error);
  }
});

router.delete('/:legendId/hotspots/:hotspotId', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const result = await deleteHotspot({
      legendId: req.params.legendId,
      hotspotId: req.params.hotspotId,
      userId: req.user.id,
      roles: req.user.roles,
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});

export default router;
