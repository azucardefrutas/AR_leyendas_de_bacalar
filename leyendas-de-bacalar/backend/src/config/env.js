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

const resolveFrontendOrigin = () => {
  const origin = process.env.FRONTEND_ORIGIN || process.env.CLIENT_URL;

  if (!origin) {
    throw new Error('FRONTEND_ORIGIN is required.');
  }

  try {
    return new URL(origin).origin;
  } catch {
    throw new Error('FRONTEND_ORIGIN must be a valid URL origin.');
  }
};

const validateRequiredEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

validateRequiredEnv();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: normalizePort(process.env.PORT),
  FRONTEND_ORIGIN: resolveFrontendOrigin(),
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};
