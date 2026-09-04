import { performance } from 'node:perf_hooks';

const WINDOW_MS = 5 * 60 * 1_000;
const MAX_SAMPLES = 50_000;

let startedAt = Date.now();
let totalRequests = 0;
let activeRequests = 0;
let samples = [];
let firstLiveSampleIndex = 0;

function round(value, decimals = 0) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function purgeExpiredSamples(now = Date.now()) {
  const cutoff = now - WINDOW_MS;
  while (
    firstLiveSampleIndex < samples.length
    && samples[firstLiveSampleIndex].finishedAt < cutoff
  ) {
    firstLiveSampleIndex += 1;
  }

  if (firstLiveSampleIndex >= 1_000 && firstLiveSampleIndex > samples.length / 2) {
    samples = samples.slice(firstLiveSampleIndex);
    firstLiveSampleIndex = 0;
  }
}

function percentile(values, percentileValue) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[index];
}

function getTrafficCondition({ errorRatePercent, p95LatencyMs }) {
  if (errorRatePercent > 1 || p95LatencyMs > 2_000) return 'critical';
  if (errorRatePercent >= 0.1 || p95LatencyMs >= 500) return 'warning';
  return 'healthy';
}

function shouldTrack(req) {
  if (req.method === 'OPTIONS') return false;
  return req.path !== '/api/v1/admin/telemetry';
}

export function trackHttpTelemetry(req, res, next) {
  if (!shouldTrack(req)) {
    next();
    return;
  }

  const started = performance.now();
  totalRequests += 1;
  activeRequests += 1;
  let recorded = false;

  const record = () => {
    if (recorded) return;
    recorded = true;
    activeRequests = Math.max(0, activeRequests - 1);
    samples.push({
      durationMs: Math.max(0, performance.now() - started),
      finishedAt: Date.now(),
      statusCode: res.statusCode,
    });
    purgeExpiredSamples();
    if (samples.length - firstLiveSampleIndex > MAX_SAMPLES) {
      firstLiveSampleIndex = samples.length - MAX_SAMPLES;
    }
  };

  res.once('finish', record);
  res.once('close', record);
  next();
}

export function getHttpTelemetrySnapshot(now = Date.now()) {
  purgeExpiredSamples(now);

  const liveSamples = samples.slice(firstLiveSampleIndex);
  const completedRequests = liveSamples.length;
  const serverErrors = liveSamples.filter((sample) => sample.statusCode >= 500).length;
  const clientErrors = liveSamples.filter((sample) => sample.statusCode >= 400 && sample.statusCode < 500).length;
  const durations = liveSamples.map((sample) => sample.durationMs);
  const averageLatencyMs = completedRequests > 0
    ? durations.reduce((sum, duration) => sum + duration, 0) / completedRequests
    : null;
  const errorRatePercent = completedRequests > 0 ? (serverErrors / completedRequests) * 100 : 0;
  const p95LatencyMs = percentile(durations, 95);
  const condition = getTrafficCondition({ errorRatePercent, p95LatencyMs });

  return {
    status: condition === 'healthy' ? 'operational' : 'degraded',
    condition,
    windowSeconds: WINDOW_MS / 1_000,
    requestsLast5Minutes: completedRequests,
    requestsPerMinute: round(completedRequests / (WINDOW_MS / 60_000), 1),
    activeRequests,
    totalRequests,
    serverErrors,
    clientErrors,
    errorRatePercent: round(errorRatePercent, 2),
    averageLatencyMs: round(averageLatencyMs),
    p95LatencyMs: round(p95LatencyMs),
    trackingStartedAt: new Date(startedAt).toISOString(),
  };
}

export function resetHttpTelemetryForTests() {
  startedAt = Date.now();
  totalRequests = 0;
  activeRequests = 0;
  samples = [];
  firstLiveSampleIndex = 0;
}
