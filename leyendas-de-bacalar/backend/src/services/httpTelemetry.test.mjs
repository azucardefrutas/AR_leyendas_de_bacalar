import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';

import {
  getHttpTelemetrySnapshot,
  resetHttpTelemetryForTests,
  trackHttpTelemetry,
} from './httpTelemetry.service.js';

function completeRequest({ method = 'GET', path = '/health', statusCode = 200 } = {}) {
  const response = new EventEmitter();
  response.statusCode = statusCode;
  let continued = false;

  trackHttpTelemetry({ method, path }, response, () => {
    continued = true;
  });
  response.emit('finish');

  return continued;
}

test('tracks completed requests and calculates the rolling error rate', () => {
  resetHttpTelemetryForTests();

  assert.equal(completeRequest(), true);
  assert.equal(completeRequest({ path: '/api/v1/legends', statusCode: 503 }), true);

  const snapshot = getHttpTelemetrySnapshot();

  assert.equal(snapshot.requestsLast5Minutes, 2);
  assert.equal(snapshot.totalRequests, 2);
  assert.equal(snapshot.serverErrors, 1);
  assert.equal(snapshot.errorRatePercent, 50);
  assert.equal(snapshot.activeRequests, 0);
  assert.equal(snapshot.condition, 'critical');
  assert.equal(snapshot.status, 'degraded');
});

test('does not count telemetry refreshes or preflight requests', () => {
  resetHttpTelemetryForTests();

  completeRequest({ path: '/api/v1/admin/telemetry' });
  completeRequest({ method: 'OPTIONS', path: '/api/v1/legends' });

  const snapshot = getHttpTelemetrySnapshot();
  assert.equal(snapshot.requestsLast5Minutes, 0);
  assert.equal(snapshot.totalRequests, 0);
});
