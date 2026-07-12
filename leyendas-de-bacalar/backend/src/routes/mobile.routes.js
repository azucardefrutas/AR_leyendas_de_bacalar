import { Router } from 'express';

import { getMobileArScenes } from '../services/mobileAr.service.js';

const router = Router();

// Feed publico de solo lectura para la app movil AR. Solo expone contenido publicado
// (los modelos ya viven en un bucket publico), asi que no requiere sesion: la app baja
// la lista y, al reconocer un marcador, muestra su modelo.
router.get('/ar/scenes', async (req, res, next) => {
  try {
    const scenes = await getMobileArScenes();
    res.json({ ok: true, scenes });
  } catch (error) {
    if (error?.status) {
      return res.status(error.status).json({ ok: false, error: error.message });
    }
    return next(error);
  }
});

export default router;
