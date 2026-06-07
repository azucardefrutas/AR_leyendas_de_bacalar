import { Router } from 'express';

import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { getUserRoleNames } from '../services/role.service.js';

const router = Router();

router.get('/api/v1/auth/me', requireAuth, (req, res) => {
  res.json({
    ok: true,
    user: {
      id: req.user.id,
      email: req.user.email,
    },
  });
});

router.get('/api/v1/auth/roles', requireAuth, async (req, res, next) => {
  try {
    const roles = await getUserRoleNames(req.user.id);

    req.user.roles = roles;

    res.json({
      ok: true,
      roles,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/api/v1/auth/admin-check', requireAuth, requireRole(['admin']), (_req, res) => {
  res.json({
    ok: true,
    message: 'Admin access granted.',
  });
});

export default router;
