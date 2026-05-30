export function getSiteUrl() {
  const configuredUrl = import.meta.env.VITE_SITE_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return '';
}
