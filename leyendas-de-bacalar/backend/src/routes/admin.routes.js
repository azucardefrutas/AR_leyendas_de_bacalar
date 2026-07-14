import { Router } from 'express';

import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import { getAdminDashboardStats, listAdminLegends, listContentReviews, setUserStatus } from '../services/admin.service.js';

const router = Router();
const requireAdmin = [requireAuth, requireRole(['admin'])];

// Dashboard counters aggregated server-side (one call instead of ~10 from the browser).
router.get('/stats', requireAdmin, async (req, res, next) => {
  try {
    const stats = await getAdminDashboardStats();
    res.json({ ok: true, stats });
  } catch (error) {
    next(error);
  }
});

// Admin legends list enriched server-side (media + genres + versions + reviews).
router.get('/legends', requireAdmin, async (req, res, next) => {
  try {
    const legends = await listAdminLegends();
    res.json({ ok: true, legends });
  } catch (error) {
    next(error);
  }
});

// Content reviews list joined server-side (one call instead of 4 round-trips).
router.get('/reviews', requireAdmin, async (req, res, next) => {
  try {
    const reviews = await listContentReviews();
    res.json({ ok: true, reviews });
  } catch (error) {
    next(error);
  }
});

// Suspend / activate a user — admin-only, enforced server-side. Replaces a direct
// users_profile write from the browser that relied solely on RLS.
router.post('/users/:userId/status', requireAdmin, async (req, res, next) => {
  try {
    const user = await setUserStatus(req.params.userId, req.body?.status);
    res.json({ ok: true, user });
  } catch (error) {
    next(error);
  }
});

export default router;
