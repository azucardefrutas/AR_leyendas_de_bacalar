import { Router } from 'express';

import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  getAdminDashboardStats,
  grantLegendAccessToUser,
  listAdminLegends,
  listContentReviews,
  listLegendGrants,
  revokeLegendGrant,
  setUserStatus,
} from '../services/admin.service.js';
import { getAllSettings, updateSettings } from '../services/systemSettings.service.js';
import { collectSystemTelemetry } from '../services/systemTelemetry.service.js';

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

// Live operational snapshot for the admin dashboard. No credentials, provider tokens,
// user records, or probe response bodies are returned to the browser.
router.get('/telemetry', requireAdmin, async (_req, res, next) => {
  try {
    const telemetry = await collectSystemTelemetry();
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, telemetry });
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

// Promociones: accesos regalados por el admin (user_legend_access, source admin_grant).
router.get('/legend-grants', requireAdmin, async (req, res, next) => {
  try {
    const grants = await listLegendGrants();
    res.json({ ok: true, grants });
  } catch (error) {
    next(error);
  }
});

router.post('/legend-grants', requireAdmin, async (req, res, next) => {
  try {
    const result = await grantLegendAccessToUser({
      userId: req.body?.userId,
      legendId: req.body?.legendId,
      expiresAt: req.body?.expiresAt ?? null,
    });
    res.status(201).json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});

router.delete('/legend-grants/:accessId', requireAdmin, async (req, res, next) => {
  try {
    const grant = await revokeLegendGrant(req.params.accessId);
    res.json({ ok: true, grant });
  } catch (error) {
    next(error);
  }
});

// System settings (all keys, admin-only). Reads/writes go through the service-role.
router.get('/settings', requireAdmin, async (req, res, next) => {
  try {
    const settings = await getAllSettings();
    res.json({ ok: true, settings });
  } catch (error) {
    next(error);
  }
});

router.put('/settings', requireAdmin, async (req, res, next) => {
  try {
    const settings = await updateSettings(req.body?.settings ?? {}, req.user.id);
    res.json({ ok: true, settings });
  } catch (error) {
    next(error);
  }
});

export default router;
