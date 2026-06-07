import { Router } from 'express';

import authRoutes from './auth.routes.js';
import documentsRoutes from './documents.routes.js';
import healthRoutes from './health.routes.js';

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use('/api/v1/documents', documentsRoutes);

export default router;
