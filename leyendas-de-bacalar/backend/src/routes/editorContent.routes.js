import { Router } from 'express';
import multer from 'multer';

import { requireAuth } from '../middlewares/requireAuth.js';
import { requireRole } from '../middlewares/requireRole.js';
import {
  getEditorPages,
  renderLegendEditorContent,
  resolveEditorImageUrl,
  saveEditorPages,
  uploadEditorImage,
} from '../services/editorContent.service.js';

const router = Router();

const requireCreatorOrAdmin = [requireAuth, requireRole(['creator', 'admin'])];

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 11 * 1024 * 1024, files: 1 },
}).single('image');

// Image upload/validation for the Editor.js Image Tool (multipart file or { url }).
// Returns the tool-compatible shape { success: 1, file: { url } }.
router.post('/:legendId/editor-assets/image', [...requireCreatorOrAdmin, uploadImage], async (req, res, next) => {
  try {
    const ctx = { legendId: req.params.legendId, userId: req.user.id, roles: req.user.roles };
    let result;
    if (req.file) {
      result = await uploadEditorImage({ ...ctx, file: req.file });
    } else if (req.body?.url) {
      result = await resolveEditorImageUrl({ ...ctx, url: req.body.url });
    } else {
      res.status(400).json({ success: 0, message: 'Envía un archivo (image) o una URL.' });
      return;
    }
    res.json({ success: 1, file: { url: result.url } });
  } catch (error) {
    next(error);
  }
});

// Load editorial pages for a draft version.
router.get('/:legendId/versions/:versionId/editor-pages', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const pages = await getEditorPages({
      legendId: req.params.legendId,
      versionId: req.params.versionId,
      userId: req.user.id,
      roles: req.user.roles,
    });
    res.json({ ok: true, pages });
  } catch (error) {
    next(error);
  }
});

// Save editorial pages (server-side sanitized rendered_html + stats). Never duplicates
// a legend; updates/inserts pages for the given draft version.
router.put('/:legendId/versions/:versionId/editor-pages', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const pages = await saveEditorPages({
      legendId: req.params.legendId,
      versionId: req.params.versionId,
      userId: req.user.id,
      roles: req.user.roles,
      pages: req.body?.pages ?? [],
    });
    res.json({ ok: true, pages });
  } catch (error) {
    next(error);
  }
});

// Sanitize + render an Editor.js page into safe HTML + stats. The frontend uses this so
// stored rendered_html is sanitized server-side (no scripts / unsafe markup), keeping
// sanitization off the client per the separation of responsibilities.
router.post('/:legendId/editor-content/render-html', requireCreatorOrAdmin, async (req, res, next) => {
  try {
    const { html, stats } = await renderLegendEditorContent({
      legendId: req.params.legendId,
      userId: req.user.id,
      roles: req.user.roles,
      editorData: req.body?.editorData,
    });
    res.json({ ok: true, html, stats });
  } catch (error) {
    next(error);
  }
});

export default router;
