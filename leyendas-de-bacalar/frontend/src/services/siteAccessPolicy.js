export const SITE_ACCESS_MODES = Object.freeze({
  OPEN: 'open',
  CATALOG_ONLY: 'catalog_only',
  CLOSED: 'closed',
});

const VALID_MODES = new Set(Object.values(SITE_ACCESS_MODES));
const AUTH_PATHS = ['/login', '/auth/check-email', '/auth/callback', '/access-denied'];
const LEGAL_PREFIXES = ['/terms/', '/privacy/'];

export function normalizeSiteAccess(value = {}) {
  const input = value && typeof value === 'object' ? value : {};
  return {
    mode: VALID_MODES.has(input.mode) ? input.mode : SITE_ACCESS_MODES.OPEN,
    message: String(input.message ?? '').trim().slice(0, 500),
  };
}

export function getAdminHostname(adminUrl = '') {
  try {
    return new URL(adminUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function isAdminHostname(hostname, adminUrl) {
  const expected = getAdminHostname(adminUrl);
  return Boolean(expected) && String(hostname || '').toLowerCase() === expected;
}

function isRecoveryPath(pathname) {
  return AUTH_PATHS.includes(pathname) || LEGAL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function getSiteAccessDecision({ mode, pathname = '/', hostname = '', adminUrl = '' }) {
  const normalizedMode = VALID_MODES.has(mode) ? mode : SITE_ACCESS_MODES.OPEN;
  const adminHost = isAdminHostname(hostname, adminUrl);

  if (adminHost) {
    if (pathname === '/') return { action: 'redirect', to: '/admin' };
    if (pathname.startsWith('/admin') || isRecoveryPath(pathname)) return { action: 'allow' };
    return { action: 'redirect', to: '/admin' };
  }

  if (pathname.startsWith('/admin') || isRecoveryPath(pathname)) return { action: 'allow' };
  if (normalizedMode === SITE_ACCESS_MODES.OPEN) return { action: 'allow' };

  if (
    normalizedMode === SITE_ACCESS_MODES.CATALOG_ONLY
    && (pathname === '/' || pathname === '/catalog')
  ) {
    return { action: 'allow' };
  }

  return { action: 'block', mode: normalizedMode };
}
