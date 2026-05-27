import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AdminEmptyState,
  AdminIcon,
  AdminSectionHeader,
  AdminStatCard,
} from '../../components/ui/AdminPrimitives.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  getAdminDashboardStats,
  getCodeUsageStats,
  getRecentAdminActivity,
  getSimulatedSalesSummary,
  getSubscriptionSummary,
} from '../../services/adminService.js';

function formatCurrency(value = 0) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(value);
}

function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [codeUsage, setCodeUsage] = useState(null);
  const [sales, setSales] = useState(null);
  const [subscriptions, setSubscriptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      const [statsResult, activityResult, codeResult, salesResult, subscriptionResult] = await Promise.all([
        getAdminDashboardStats(),
        getRecentAdminActivity(),
        getCodeUsageStats(),
        getSimulatedSalesSummary(),
        getSubscriptionSummary(),
      ]);

      setStats(statsResult.data);
      setActivity(activityResult.data ?? []);
      setCodeUsage(codeResult.data);
      setSales(salesResult.data);
      setSubscriptions(subscriptionResult.data);
      setError(statsResult.error || activityResult.error || codeResult.error || salesResult.error || subscriptionResult.error);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  const cards = [
    ['Usuarios registrados', stats?.users ?? 0, 'Perfiles en plataforma', 'users', 'cyan'],
    ['Autores activos', stats?.authors ?? 0, 'Creados por aprobacion', 'author', 'blue'],
    ['Solicitudes pendientes', stats?.pendingApplications ?? 0, 'Autores por revisar', 'application', 'warning'],
    ['Leyendas en revision', stats?.reviewLegends ?? 0, 'Contenido pendiente', 'review', 'warning'],
    ['Codigos generados', stats?.generatedCodes ?? 0, 'Codigos fisicos', 'codes', 'cyan'],
    ['Codigos canjeados', stats?.redeemedCodes ?? 0, 'Accesos registrados', 'request', 'success'],
    ['Compras', stats?.simulatedOrders ?? sales?.orders ?? 0, 'Ordenes registradas', 'orders', 'blue'],
    ['Suscripciones activas', stats?.activeSubscriptions ?? subscriptions?.activeSubscriptions ?? 0, 'Lectores suscritos', 'subscription', 'success'],
  ];

  const chartData = useMemo(() => codeUsage?.weekly ?? [], [codeUsage]);
  const chartHasData = chartData.some((item) => item.value > 0);

  return (
    <section className="admin-page admin-dashboard-page">
      <div className="admin-dashboard-hero">
        <div>
          <p>Resumen institucional</p>
          <h2>Administracion de Leyendas de Bacalar</h2>
          <span>Supervisa autores, revisiones, codigos fisicos, compras, accesos y suscripciones desde un solo lugar.</span>
        </div>
        <div className="admin-hero-summary">
          <strong>{loading ? '...' : stats?.publishedLegends ?? 0}</strong>
          <span>Leyendas publicadas</span>
        </div>
      </div>

      {error && <p className="admin-error">{error.message}</p>}

      <div className="admin-stats-grid admin-stats-grid-compact">
        {cards.map(([label, value, description, icon, tone]) => (
          <AdminStatCard
            key={label}
            label={label}
            value={loading ? '...' : value}
            description={description}
            icon={icon}
            tone={tone}
          />
        ))}
      </div>

      <div className="admin-dashboard-grid">
        <article className="admin-chart-card">
          <AdminSectionHeader
            eyebrow="Crecimiento"
            title="Codigos canjeados por semana"
            description="Lectura conectable desde access_codes; no se muestran hashes."
          />
          {loading ? (
            <p className="admin-muted">Cargando grafica...</p>
          ) : chartHasData ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 12, right: 12, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="adminCodeGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#049DD9" stopOpacity={0.36} />
                    <stop offset="95%" stopColor="#049DD9" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 14, borderColor: '#DBE4EF' }} />
                <Area type="monotone" dataKey="value" name="Canjes" stroke="#049DD9" strokeWidth={3} fill="url(#adminCodeGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <AdminEmptyState
              title="Aun no hay canjes recientes"
              message="Cuando lectores canjeen codigos, la grafica mostrara la actividad semanal."
            />
          )}
        </article>

        <aside className="admin-activity-panel">
          <AdminSectionHeader eyebrow="Bitacora" title="Actividad reciente" />
          {loading ? (
            <p className="admin-muted">Cargando actividad...</p>
          ) : activity.length ? (
            <div className="admin-activity-list">
              {activity.slice(0, 6).map((item) => (
                <article key={item.id || `${item.action}-${item.created_at}`} className="admin-activity-item">
                  <span><AdminIcon name="activity" /></span>
                  <div>
                    <strong>{item.action || 'Actividad registrada'}</strong>
                    <small>{item.entity_type || 'Sistema'} - {item.created_at ? new Date(item.created_at).toLocaleString('es-MX') : 'Sin fecha'}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <AdminEmptyState title="Sin actividad reciente" message="Todavia no hay registros administrativos." />
          )}
        </aside>
      </div>

      <div className="admin-dashboard-grid admin-dashboard-grid-small">
        <article className="admin-summary-card">
          <AdminSectionHeader eyebrow="Compras" title="Resumen administrativo" />
          <div className="admin-summary-metrics">
            <div><strong>{loading ? '...' : sales?.orders ?? 0}</strong><span>Ordenes</span></div>
            <div><strong>{loading ? '...' : sales?.monthlyOrders ?? 0}</strong><span>Este mes</span></div>
            <div><strong>{loading ? '...' : formatCurrency(sales?.total ?? 0)}</strong><span>Pagos</span></div>
          </div>
        </article>

        <article className="admin-summary-card">
          <AdminSectionHeader eyebrow="Accesos rapidos" title="Tareas frecuentes" />
          <div className="admin-quick-actions">
            <Link to="/admin/creator-applications"><Button>Revisar autores</Button></Link>
            <Link to="/admin/reviews"><Button variant="ghost">Revisar leyendas</Button></Link>
            <Link to="/admin/code-requests"><Button variant="ghost">Generar codigos</Button></Link>
            <Link to="/admin/orders"><Button variant="ghost">Compras</Button></Link>
          </div>
        </article>
      </div>
    </section>
  );
}

export default AdminDashboardPage;
