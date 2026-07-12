import { Router } from 'express';

import { requireAuth } from '../middlewares/requireAuth.js';
import { redeemCodeForUser } from '../services/codeRedemption.service.js';

const router = Router();

// Canje de codigo fisico -> digital. El frontend solo envia el codigo tal cual; todo el
// procesamiento (normalizacion, rate-limit, validacion y canje) ocurre aqui en el backend.
router.post('/redeem', requireAuth, async (req, res, next) => {
  try {
    const result = await redeemCodeForUser(req.user.id, req.body?.code);
    res.json({ ok: true, ...result });
  } catch (error) {
    if (error?.status) {
      return res.status(error.status).json({ ok: false, error: error.message });
    }
    return next(error);
  }
});

export default router;
