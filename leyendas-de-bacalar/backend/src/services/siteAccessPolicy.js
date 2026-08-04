export const SITE_ACCESS_MODES = Object.freeze({
  OPEN: 'open',
  CATALOG_ONLY: 'catalog_only',
  CLOSED: 'closed',
});

const VALID_MODES = new Set(Object.values(SITE_ACCESS_MODES));

export const normalizeSiteAccess = (value = {}) => {
  const input = value && typeof value === 'object' ? value : {};
  const mode = VALID_MODES.has(input.mode) ? input.mode : SITE_ACCESS_MODES.OPEN;

  return {
    mode,
    message: String(input.message ?? '').trim().slice(0, 500),
  };
};

export const isSiteAccessRestricted = (value) =>
  normalizeSiteAccess(value).mode !== SITE_ACCESS_MODES.OPEN;
