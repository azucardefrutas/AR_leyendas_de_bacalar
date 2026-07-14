import { Router } from 'express';

import { getPublicSettings } from '../services/systemSettings.service.js';

const router = Router();

// Public, unauthenticated: only the settings flagged is_public (announcement,
// maintenance, creator_registration) so the frontend can render the system banner
// and gate the creator sign-up without exposing the full settings table.
router.get('/public', async (req, res, next) => {
  try {
    const settings = await getPublicSettings();
    res.json({ ok: true, settings });
  } catch (error) {
    next(error);
  }
});

export default router;
