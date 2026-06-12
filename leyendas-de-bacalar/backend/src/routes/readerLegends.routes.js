import { Router } from 'express';

import { requireAuth } from '../middlewares/requireAuth.js';
import { getUserRoleNames } from '../services/role.service.js';
import { getReaderLegendReadingContext } from '../services/readerLegendContext.service.js';

const router = Router();

// Reader-facing endpoint: any authenticated user may ask; per-legend access
// (published + free, active access, own legend or admin) is enforced in the service.
router.get('/:legendId/reading-context', requireAuth, async (req, res, next) => {
  try {
    const roles = await getUserRoleNames(req.user.id);

    const context = await getReaderLegendReadingContext({
      legendId: req.params.legendId,
      userId: req.user.id,
      roles,
    });

    res.json({ ok: true, ...context });
  } catch (error) {
    next(error);
  }
});

export default router;
