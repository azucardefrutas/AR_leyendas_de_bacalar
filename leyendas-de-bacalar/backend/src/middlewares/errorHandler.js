import { logger } from '../utils/logger.js';

export const errorHandler = (error, _req, res, _next) => {
  logger.error(error.message);
  if (process.env.NODE_ENV !== 'production' && error.details) {
    logger.error(JSON.stringify(error.details));
  }

  const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;

  res.status(statusCode).json({
    ok: false,
    error: statusCode === 500 ? 'Internal server error.' : error.message,
  });
};
