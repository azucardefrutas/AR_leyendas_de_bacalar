import dotenv from 'dotenv';

dotenv.config();

const REQUIRED_ENV_VARS = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

const normalizePort = (value) => {
  const port = Number.parseInt(value || '3000', 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer.');
  }

  return port;
};

const FRONTEND_ORIGIN_ENV_KEYS = ['FRONTEND_ORIGIN', 'FRONTEND_URL', 'CLIENT_URL'];

const splitOriginList = (value) =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const resolveFrontendOrigins = () => {
  const configuredOrigins = FRONTEND_ORIGIN_ENV_KEYS.flatMap((key) =>
    splitOriginList(process.env[key] || '')
  );

  if (configuredOrigins.length === 0) {
    throw new Error('FRONTEND_ORIGIN or FRONTEND_URL is required.');
  }

  try {
    return [...new Set(configuredOrigins.map((origin) => new URL(origin).origin))];
  } catch {
    throw new Error('FRONTEND_ORIGIN, FRONTEND_URL, and CLIENT_URL must contain valid URL origins.');
  }
};

const validateRequiredEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

validateRequiredEnv();

const frontendOrigins = resolveFrontendOrigins();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: normalizePort(process.env.PORT),
  FRONTEND_ORIGIN: frontendOrigins[0],
  FRONTEND_ORIGINS: frontendOrigins,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
