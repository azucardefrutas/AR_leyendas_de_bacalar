import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'leyendas-backend',
    version: '1.0.0',
  });
});

export default router;
