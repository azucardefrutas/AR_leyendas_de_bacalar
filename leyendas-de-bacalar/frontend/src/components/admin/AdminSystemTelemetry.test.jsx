import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAdminSystemTelemetry } from '../../services/backendApiService.js';
import AdminSystemTelemetry from './AdminSystemTelemetry.jsx';

vi.mock('../../services/backendApiService.js', () => ({
  getAdminSystemTelemetry: vi.fn(),
}));

const telemetry = {
  collectedAt: '2026-09-04T15:00:00.000Z',
  backend: {
    status: 'operational',
    uptimeSeconds: 7_200,
    cpuPercent: 8.4,
    memory: { rssMb: 200, heapUsedMb: 80, heapTotalMb: 120, heapUsagePercent: 66.7 },
  },
  frontend: {
    status: 'operational',
    hostname: 'www.bacalarlegends-ar.com',
    latencyMs: 120,
  },
  supabase: {
    status: 'operational',
    hostname: 'project-ref.supabase.co',
    auth: { status: 'operational', latencyMs: 90 },
    database: { status: 'operational', latencyMs: 110 },
  },
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('AdminSystemTelemetry', () => {
  it('renders real provider readings returned by the protected backend endpoint', async () => {
    getAdminSystemTelemetry.mockResolvedValue({ ok: true, telemetry });
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{
      loadEventEnd: 640,
      domContentLoadedEventEnd: 410,
    }]);

    render(<AdminSystemTelemetry />);

    expect(screen.getByText('Consultando Render, Vercel y Supabase...')).toBeInTheDocument();
    expect(await screen.findByText('Frontend / Vercel')).toBeInTheDocument();
    expect(screen.getByText('Backend / Render')).toBeInTheDocument();
    expect(screen.getByText('Supabase')).toBeInTheDocument();
    expect(screen.getByText('www.bacalarlegends-ar.com')).toBeInTheDocument();
    expect(screen.getByText('project-ref.supabase.co')).toBeInTheDocument();
    expect(screen.getByText('200 MB')).toBeInTheDocument();
    expect(screen.getAllByText('Operativo').length).toBeGreaterThanOrEqual(3);

    await waitFor(() => expect(getAdminSystemTelemetry).toHaveBeenCalledTimes(1));
  });
});
