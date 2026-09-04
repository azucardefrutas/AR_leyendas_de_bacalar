import { performance } from 'node:perf_hooks';

import { env } from '../config/env.js';

const PROBE_TIMEOUT_MS = 5_000;
const BYTES_PER_MEGABYTE = 1024 * 1024;

let previousCpuSample = {
  measuredAt: process.hrtime.bigint(),
  usage: process.cpuUsage(),
};

function round(value, decimals = 0) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function hostnameFromUrl(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function getProcessCpuPercent() {
  const measuredAt = process.hrtime.bigint();
  const usage = process.cpuUsage(previousCpuSample.usage);
  const elapsedMicroseconds = Number(measuredAt - previousCpuSample.measuredAt) / 1_000;

  previousCpuSample = {
    measuredAt,
    usage: process.cpuUsage(),
  };

  if (elapsedMicroseconds <= 0) return null;
  const usedMicroseconds = usage.user + usage.system;
  return round(Math.min(100, Math.max(0, (usedMicroseconds / elapsedMicroseconds) * 100)), 1);
}

function getProcessMetrics() {
  const memory = process.memoryUsage();
  const heapUsagePercent = memory.heapTotal > 0
    ? (memory.heapUsed / memory.heapTotal) * 100
    : null;

  return {
    status: 'operational',
    uptimeSeconds: Math.round(process.uptime()),
    cpuPercent: getProcessCpuPercent(),
    memory: {
      rssMb: round(memory.rss / BYTES_PER_MEGABYTE, 1),
      heapUsedMb: round(memory.heapUsed / BYTES_PER_MEGABYTE, 1),
      heapTotalMb: round(memory.heapTotal / BYTES_PER_MEGABYTE, 1),
      heapUsagePercent: round(heapUsagePercent, 1),
    },
    runtime: process.version,
    region: process.env.RENDER_REGION || null,
  };
}

async function runHttpProbe({ fetchImpl, url, method = 'GET', headers = {} }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  timeout.unref?.();
  const startedAt = performance.now();

  try {
    const response = await fetchImpl(url, {
      method,
      headers,
      redirect: 'follow',
      signal: controller.signal,
      cache: 'no-store',
    });

    // Consume the small probe response so the connection can be reused. The database
    // query is limited to one id and its contents are intentionally discarded.
    await response.arrayBuffer();

    return {
      status: response.ok ? 'operational' : 'degraded',
      httpStatus: response.status,
      latencyMs: round(performance.now() - startedAt),
    };
  } catch (error) {
    return {
      status: 'unavailable',
      httpStatus: null,
      latencyMs: round(performance.now() - startedAt),
      reason: error?.name === 'AbortError' ? 'timeout' : 'network',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function summarizeStatuses(statuses) {
  if (statuses.includes('unavailable')) return 'unavailable';
  if (statuses.includes('degraded')) return 'degraded';
  return 'operational';
}

export async function collectSystemTelemetry({ fetchImpl = fetch } = {}) {
  const collectionStartedAt = performance.now();
  const frontendUrl = env.FRONTEND_ORIGIN;
  const supabaseBaseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
  const supabaseHeaders = {
    Accept: 'application/json',
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  };

  const [frontend, supabaseAuth, supabaseDatabase] = await Promise.all([
    runHttpProbe({
      fetchImpl,
      url: frontendUrl,
      method: 'HEAD',
      headers: { Accept: 'text/html' },
    }),
    runHttpProbe({
      fetchImpl,
      url: `${supabaseBaseUrl}/auth/v1/health`,
      headers: supabaseHeaders,
    }),
    runHttpProbe({
      fetchImpl,
      url: `${supabaseBaseUrl}/rest/v1/users_profile?select=id&limit=1`,
      headers: supabaseHeaders,
    }),
  ]);

  return {
    collectedAt: new Date().toISOString(),
    refreshAfterSeconds: 15,
    collectionDurationMs: round(performance.now() - collectionStartedAt),
    backend: getProcessMetrics(),
    frontend: {
      ...frontend,
      hostname: hostnameFromUrl(frontendUrl),
    },
    supabase: {
      status: summarizeStatuses([supabaseAuth.status, supabaseDatabase.status]),
      hostname: hostnameFromUrl(supabaseBaseUrl),
      auth: supabaseAuth,
      database: supabaseDatabase,
    },
  };
}
