import { Router } from 'express';

import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import codesRoutes from './codes.routes.js';
import creatorRoutes from './creator.routes.js';
import creatorLegendsRoutes from './creatorLegends.routes.js';
import documentsRoutes from './documents.routes.js';
import editorContentRoutes from './editorContent.routes.js';
import healthRoutes from './health.routes.js';
import legendHotspotsRoutes from './legendHotspots.routes.js';
import readerBundleRoutes from './readerBundle.routes.js';
import readerLegendsRoutes from './readerLegends.routes.js';

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use('/api/v1/documents', documentsRoutes);
router.use('/api/v1/legends', creatorLegendsRoutes);
router.use('/api/v1/legends', readerBundleRoutes);
router.use('/api/v1/legends', legendHotspotsRoutes);
router.use('/api/v1/legends', editorContentRoutes);
router.use('/api/v1/reader/legends', readerLegendsRoutes);
router.use('/api/v1/reader/codes', codesRoutes);
router.use('/api/v1/admin', adminRoutes);
router.use('/api/v1/creator', creatorRoutes);

export default router;
