import express from 'express';
import cors from 'cors';

import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import routes from './routes/index.js';
import { logger } from './utils/logger.js';

const app = express();

app.disable('x-powered-by');

app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));

app.use(routes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`leyendas-backend listening on port ${env.PORT}`);
});
