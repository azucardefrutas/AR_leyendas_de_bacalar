import { Router } from 'express';

import { optionalAuth } from '../middlewares/optionalAuth.js';
import { getReaderBundle } from '../services/readerBundle.service.js';
import { getUserRoleNames } from '../services/role.service.js';

const router = Router();

router.get('/:legendId/reader-bundle', optionalAuth, async (req, res, next) => {
  try {
    const roles = req.user?.id ? await getUserRoleNames(req.user.id) : [];
    const bundle = await getReaderBundle({
      legendId: req.params.legendId,
      userId: req.user?.id ?? null,
      roles,
    });

    res.json({
      ok: true,
      ...bundle,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
