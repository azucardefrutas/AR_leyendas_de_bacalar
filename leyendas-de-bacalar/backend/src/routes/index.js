import { Router } from 'express';

import authRoutes from './auth.routes.js';
import documentsRoutes from './documents.routes.js';
import healthRoutes from './health.routes.js';
import legendHotspotsRoutes from './legendHotspots.routes.js';

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use('/api/v1/documents', documentsRoutes);
router.use('/api/v1/legends', legendHotspotsRoutes);

export default router;
