// Lightweight in-memory rate limiter (no external deps — backend/node_modules is
// tracked, so we avoid adding packages). Fixed window per client IP. Enough for
// basic abuse/flood protection on a single instance; horizontal scaling would need
// a shared store (Redis). Relies on `app.set('trust proxy', 1)` so req.ip is the
// real client behind Render/Vercel edge.
const buckets = new Map();

export function rateLimit({
  windowMs = 15 * 60 * 1000,
  max = 600,
  message = 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.',
} = {}) {
  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || 'unknown';

    let entry = buckets.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      buckets.set(key, entry);
    }
    entry.count += 1;

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - entry.count)));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ error: message });
      return;
    }
    next();
  };
}

// Purge expired buckets so the Map never grows unbounded. unref() so it never keeps
// the process alive on its own.
const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now > entry.resetAt) buckets.delete(key);
  }
}, 5 * 60 * 1000);
cleanup.unref?.();
