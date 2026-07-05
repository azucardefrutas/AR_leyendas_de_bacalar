import { Router } from 'express';

import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
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

export default router;
