import { monitorEventLoopDelay, performance } from 'node:perf_hooks';

import { env } from '../config/env.js';
import { getHttpTelemetrySnapshot } from './httpTelemetry.service.js';

const PROBE_TIMEOUT_MS = 5_000;
const BYTES_PER_MEGABYTE = 1024 * 1024;
const RENDER_COMPUTE_BY_CPU = new Map([
  [0.1, { planId: 'free', planLabel: 'Free', memoryLimitMb: 512, paid: false }],
  [0.5, { planId: '0.5c-512mb', planLabel: 'Starter', memoryLimitMb: 512, paid: true }],
  [1, { planId: '1c-2g', planLabel: 'Standard', memoryLimitMb: 2_048, paid: true }],
]);

const eventLoopDelay = monitorEventLoopDelay({ resolution: 20 });
eventLoopDelay.enable();

let previousCpuSample = null;

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
  const currentUsage = process.cpuUsage();

  if (!previousCpuSample) {
    previousCpuSample = { measuredAt, usage: currentUsage };
    return null;
  }

  const usage = process.cpuUsage(previousCpuSample.usage);
  const elapsedMicroseconds = Number(measuredAt - previousCpuSample.measuredAt) / 1_000;

  previousCpuSample = {
    measuredAt,
    usage: currentUsage,
  };

  if (elapsedMicroseconds <= 0) return null;
  const usedMicroseconds = usage.user + usage.system;
  return round(Math.min(100, Math.max(0, (usedMicroseconds / elapsedMicroseconds) * 100)), 1);
}

function getRenderCompute() {
  const cpuLimit = Number(process.env.RENDER_CPU_COUNT);
  const knownCompute = RENDER_COMPUTE_BY_CPU.get(cpuLimit);

  if (!process.env.RENDER || !knownCompute) {
    return {
      provider: process.env.RENDER ? 'Render' : 'Local',
      planId: null,
      planLabel: null,
      cpuLimit: Number.isFinite(cpuLimit) && cpuLimit > 0 ? cpuLimit : null,
      memoryLimitMb: null,
      paid: null,
    };
  }

  return {
    provider: 'Render',
    ...knownCompute,
    cpuLimit,
  };
}

function getResourceCondition({ cpuPercent, memoryUsagePercent }) {
  if (cpuPercent >= 85 || memoryUsagePercent >= 90) return 'critical';
  if (cpuPercent >= 70 || memoryUsagePercent >= 80) return 'warning';
  return 'healthy';
}

function getEventLoopMetrics() {
  const toMilliseconds = (nanoseconds) => round(nanoseconds / 1_000_000, 1);
  const metrics = {
    meanMs: toMilliseconds(eventLoopDelay.mean),
    p95Ms: toMilliseconds(eventLoopDelay.percentile(95)),
    maxMs: toMilliseconds(eventLoopDelay.max),
  };
  eventLoopDelay.reset();
  return metrics;
}

function getProcessMetrics() {
  const memory = process.memoryUsage();
  const compute = getRenderCompute();
  const heapUsagePercent = memory.heapTotal > 0
    ? (memory.heapUsed / memory.heapTotal) * 100
    : null;
  const rssMb = round(memory.rss / BYTES_PER_MEGABYTE, 1);
  const memoryUsagePercent = compute.memoryLimitMb
    ? (rssMb / compute.memoryLimitMb) * 100
    : null;
  const cpuPercent = getProcessCpuPercent();
  const resourceCondition = getResourceCondition({ cpuPercent, memoryUsagePercent });
  const http = getHttpTelemetrySnapshot();

  return {
    status: resourceCondition === 'healthy' && http.status === 'operational'
      ? 'operational'
      : 'degraded',
    condition: resourceCondition === 'critical' || http.condition === 'critical'
      ? 'critical'
      : (resourceCondition === 'warning' || http.condition === 'warning' ? 'warning' : 'healthy'),
    uptimeSeconds: Math.round(process.uptime()),
    cpuPercent,
    compute,
    memory: {
      rssMb,
      heapUsedMb: round(memory.heapUsed / BYTES_PER_MEGABYTE, 1),
      heapTotalMb: round(memory.heapTotal / BYTES_PER_MEGABYTE, 1),
      heapUsagePercent: round(heapUsagePercent, 1),
      limitMb: compute.memoryLimitMb,
      usagePercent: round(memoryUsagePercent, 1),
    },
    http,
    eventLoop: getEventLoopMetrics(),
    runtime: process.version,
    region: process.env.RENDER_REGION || null,
    serviceName: process.env.RENDER_SERVICE_NAME || null,
    commit: process.env.RENDER_GIT_COMMIT?.slice(0, 7) || null,
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
