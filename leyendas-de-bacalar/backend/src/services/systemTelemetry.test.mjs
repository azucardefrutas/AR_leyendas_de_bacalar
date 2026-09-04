import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '4011';
process.env.SUPABASE_URL = 'https://project-ref.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.FRONTEND_ORIGIN = 'https://www.bacalarlegends-ar.com';

const { collectSystemTelemetry } = await import('./systemTelemetry.service.js');

test('collects operational telemetry without returning credentials', async () => {
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(String(url));
    return new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const telemetry = await collectSystemTelemetry({ fetchImpl });
  const serialized = JSON.stringify(telemetry);

  assert.equal(telemetry.backend.status, 'operational');
  assert.equal(telemetry.frontend.status, 'operational');
  assert.equal(telemetry.supabase.status, 'operational');
  assert.equal(telemetry.frontend.hostname, 'www.bacalarlegends-ar.com');
  assert.equal(telemetry.supabase.hostname, 'project-ref.supabase.co');
  assert.equal(requestedUrls.length, 3);
  assert.equal(serialized.includes('test-service-role-key'), false);
  assert.equal(typeof telemetry.backend.memory.rssMb, 'number');
});

test('reports unavailable dependencies without failing the whole telemetry response', async () => {
  const telemetry = await collectSystemTelemetry({
    fetchImpl: async () => {
      throw new Error('offline');
    },
  });

  assert.equal(telemetry.backend.status, 'operational');
  assert.equal(telemetry.frontend.status, 'unavailable');
  assert.equal(telemetry.supabase.status, 'unavailable');
  assert.equal(telemetry.supabase.auth.reason, 'network');
  assert.equal(telemetry.supabase.database.reason, 'network');
});
