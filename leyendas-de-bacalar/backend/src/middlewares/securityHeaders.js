// Minimal security headers for the JSON API (no external deps — the useful subset of
// helmet). No CSP (the API serves no HTML) and no HSTS (it can cause lockouts and TLS
// is handled at the edge, per security guidance).
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
}
