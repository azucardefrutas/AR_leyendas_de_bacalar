import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { getAdminSystemTelemetry } from '../../services/backendApiService.js';
import Button from '../ui/Button.jsx';
import { AdminIcon, AdminSectionHeader } from '../ui/AdminPrimitives.jsx';

const REFRESH_INTERVAL_MS = 15_000;
const MAX_HISTORY_POINTS = 20;

const STATUS_META = {
  operational: { label: 'Operativo', tone: 'success' },
  degraded: { label: 'Con incidencias', tone: 'warning' },
  unavailable: { label: 'Sin respuesta', tone: 'danger' },
};

function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META.unavailable;
}

function formatLatency(value) {
  return Number.isFinite(value) ? `${Math.round(value)} ms` : 'Sin dato';
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} %` : 'Calculando';
}

function formatUptime(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) return 'Sin dato';
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

function readBrowserMetrics() {
  const navigation = performance.getEntriesByType('navigation')[0];
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const pageLoadMs = navigation?.loadEventEnd || navigation?.duration || null;
  const domReadyMs = navigation?.domContentLoadedEventEnd || null;

  return {
    online: navigator.onLine,
    pageLoadMs: Number.isFinite(pageLoadMs) && pageLoadMs > 0 ? Math.round(pageLoadMs) : null,
    domReadyMs: Number.isFinite(domReadyMs) && domReadyMs > 0 ? Math.round(domReadyMs) : null,
    connection: connection?.effectiveType || null,
    networkRttMs: Number.isFinite(connection?.rtt) ? connection.rtt : null,
  };
}

function StatusBadge({ status }) {
  const meta = getStatusMeta(status);
  return <span className={`admin-telemetry-status is-${meta.tone}`}><i />{meta.label}</span>;
}

function Metric({ label, value }) {
  return (
    <div className="admin-telemetry-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TelemetryCard({ icon, title, subtitle, status, children }) {
  return (
    <article className="admin-telemetry-card">
      <header>
        <span className="admin-telemetry-icon"><AdminIcon name={icon} /></span>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <StatusBadge status={status} />
      </header>
      <div className="admin-telemetry-metrics">{children}</div>
    </article>
  );
}

function AdminSystemTelemetry() {
  const [telemetry, setTelemetry] = useState(null);
  const [browserMetrics, setBrowserMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(false);
  const requestInFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    if (mountedRef.current) setRefreshing(true);
    const startedAt = performance.now();

    try {
      const response = await getAdminSystemTelemetry();
      const roundTripMs = Math.round(performance.now() - startedAt);
      if (!mountedRef.current) return;

      const nextTelemetry = {
        ...response.telemetry,
        backend: {
          ...response.telemetry.backend,
          roundTripMs,
        },
      };
      const sampleTime = new Date(nextTelemetry.collectedAt);

      setTelemetry(nextTelemetry);
      setBrowserMetrics(readBrowserMetrics());
      setHistory((current) => [
        ...current,
        {
          label: sampleTime.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          backend: roundTripMs,
          frontend: nextTelemetry.frontend?.latencyMs ?? null,
          supabase: nextTelemetry.supabase?.database?.latencyMs ?? null,
        },
      ].slice(-MAX_HISTORY_POINTS));
      setError(null);
    } catch (telemetryError) {
      if (!mountedRef.current) return;
      setError(telemetryError);
    } finally {
      requestInFlightRef.current = false;
      if (mountedRef.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [refresh]);

  const checkedAt = telemetry?.collectedAt
    ? new Date(telemetry.collectedAt).toLocaleTimeString('es-MX')
    : null;

  return (
    <section className="admin-telemetry-panel" aria-live="polite">
      <AdminSectionHeader
        eyebrow="Estado operativo"
        title="Telemetria en vivo"
        description="Lecturas reales de esta sesion. Se actualizan cada 15 segundos y no guardan credenciales ni datos personales."
        action={(
          <div className="admin-telemetry-actions">
            <span>{checkedAt ? `Ultima lectura: ${checkedAt}` : 'Preparando primera lectura'}</span>
            <Button variant="ghost" onClick={refresh} disabled={refreshing}>
              {refreshing ? 'Actualizando...' : 'Actualizar ahora'}
            </Button>
          </div>
        )}
      />

      {error && (
        <p className="admin-telemetry-error">
          No se pudo actualizar la telemetria. {telemetry ? 'Se conserva la ultima lectura valida.' : 'Comprueba el backend.'}
        </p>
      )}

      {!telemetry ? (
        <div className="admin-telemetry-loading">Consultando Render, Vercel y Supabase...</div>
      ) : (
        <>
          <div className="admin-telemetry-grid">
            <TelemetryCard
              icon="frontend"
              title="Frontend / Vercel"
              subtitle={telemetry.frontend.hostname || 'Sitio publico'}
              status={telemetry.frontend.status}
            >
              <Metric label="Respuesta desde Render" value={formatLatency(telemetry.frontend.latencyMs)} />
              <Metric label="Carga en este navegador" value={formatLatency(browserMetrics?.pageLoadMs)} />
              <Metric label="DOM listo" value={formatLatency(browserMetrics?.domReadyMs)} />
              <Metric label="Conexion actual" value={browserMetrics?.online ? (browserMetrics.connection || 'En linea') : 'Sin conexion'} />
            </TelemetryCard>

            <TelemetryCard
              icon="server"
              title="Backend / Render"
              subtitle={telemetry.backend.region ? `Region ${telemetry.backend.region}` : 'API de Leyendas'}
              status={telemetry.backend.status}
            >
              <Metric label="Respuesta hasta el navegador" value={formatLatency(telemetry.backend.roundTripMs)} />
              <Metric label="Tiempo encendido" value={formatUptime(telemetry.backend.uptimeSeconds)} />
              <Metric label="Memoria del proceso" value={`${telemetry.backend.memory.rssMb} MB`} />
              <Metric label="CPU del proceso" value={formatPercent(telemetry.backend.cpuPercent)} />
            </TelemetryCard>

            <TelemetryCard
              icon="database"
              title="Supabase"
              subtitle={telemetry.supabase.hostname || 'Auth y base de datos'}
              status={telemetry.supabase.status}
            >
              <Metric label="API de autenticacion" value={formatLatency(telemetry.supabase.auth.latencyMs)} />
              <Metric label="Base de datos" value={formatLatency(telemetry.supabase.database.latencyMs)} />
              <Metric label="Estado Auth" value={getStatusMeta(telemetry.supabase.auth.status).label} />
              <Metric label="Estado DB" value={getStatusMeta(telemetry.supabase.database.status).label} />
            </TelemetryCard>
          </div>

          <div className="admin-telemetry-chart">
            <div>
              <strong>Latencia reciente</strong>
              <span>Ultimas {MAX_HISTORY_POINTS} muestras de esta sesion del administrador.</span>
            </div>
            {history.length > 1 ? (
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={history} margin={{ top: 14, right: 12, bottom: 0, left: -12 }}>
                  <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis unit=" ms" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 14, borderColor: '#DBE4EF' }} />
                  <Legend />
                  <Line type="monotone" dataKey="backend" name="Render" stroke="#152659" strokeWidth={3} dot={false} connectNulls />
                  <Line type="monotone" dataKey="frontend" name="Vercel" stroke="#049DD9" strokeWidth={3} dot={false} connectNulls />
                  <Line type="monotone" dataKey="supabase" name="Supabase" stroke="#10B981" strokeWidth={3} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>La grafica aparecera al completar la segunda lectura.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default AdminSystemTelemetry;
