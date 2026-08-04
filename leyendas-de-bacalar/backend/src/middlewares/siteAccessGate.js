import { getSiteAccessState } from '../services/systemSettings.service.js';
import { SITE_ACCESS_MODES } from '../services/siteAccessPolicy.js';

const DEFAULT_MESSAGES = {
  [SITE_ACCESS_MODES.CATALOG_ONLY]: 'El contenido interactivo no esta disponible temporalmente.',
  [SITE_ACCESS_MODES.CLOSED]: 'La plataforma no esta disponible temporalmente.',
};

export const createSiteAccessGate = (loadSiteAccess = getSiteAccessState) => async (_req, res, next) => {
  const siteAccess = await loadSiteAccess();

  if (siteAccess.mode === SITE_ACCESS_MODES.OPEN) {
    return next();
  }

  res.set('Cache-Control', 'no-store');
  return res.status(423).json({
    ok: false,
    code: 'SITE_ACCESS_RESTRICTED',
    mode: siteAccess.mode,
    error: siteAccess.message || DEFAULT_MESSAGES[siteAccess.mode],
  });
};

export const siteAccessGate = createSiteAccessGate();
