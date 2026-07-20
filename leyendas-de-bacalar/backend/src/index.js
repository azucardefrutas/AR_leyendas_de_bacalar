import express from 'express';
import cors from 'cors';

import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { rateLimit } from './middlewares/rateLimit.js';
import { securityHeaders } from './middlewares/securityHeaders.js';
import routes from './routes/index.js';
import { logger } from './utils/logger.js';

const app = express();

app.disable('x-powered-by');
// Behind Render/Vercel edge: trust the first proxy hop so req.ip is the real client
// (needed for correct rate limiting). Only 1 hop — never blindly trust the chain.
app.set('trust proxy', 1);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.FRONTEND_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS origin not allowed.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(securityHeaders);
app.use(
  cors(corsOptions)
);
app.use(express.json({ limit: '1mb' }));
// Global anti-flood rate limit (defense-in-depth; the code-redemption route keeps its
// own stricter per-user brute-force limit). Generous for real users, stops hammering.
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 600 }));

app.use(routes);

app.use(notFound);
app.use(errorHandler);

// Exportada para las pruebas de integración, que la levantan en un puerto efímero.
export default app;

// Solo escucha cuando corre como proceso principal (npm start / npm run dev).
// Al importarla en pruebas (NODE_ENV=test) no abre el puerto.
if (process.env.NODE_ENV !== 'test') {
  app.listen(env.PORT, () => {
    logger.info(`leyendas-backend listening on port ${env.PORT}`);
  });
}
