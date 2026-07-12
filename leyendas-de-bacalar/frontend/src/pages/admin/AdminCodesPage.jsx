import React, { useEffect, useMemo, useState } from 'react';
import {
  AdminDataTable,
  AdminSectionHeader,
  AdminStatCard,
  AdminStatusBadge,
} from '../../components/ui/AdminPrimitives.jsx';
import Button from '../../components/ui/Button.jsx';
import { getAccessCodesDetailed } from '../../services/adminCodeService.js';

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'redeemed', label: 'Canjeados' },
  { key: 'unused', label: 'Disponibles' },
];

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function redeemerName(code) {
  if (code.status !== 'redeemed') return '—';
  return code.redeemer?.full_name || code.redeemer?.username || (code.assigned_to_user_id ? 'Usuario' : '—');
}

function AdminCodesPage() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  async function loadCodes() {
    setLoading(true);
    const { data, error: loadError } = await getAccessCodesDetailed();
    setCodes(data ?? []);
    setError(loadError ?? null);
    setLoading(false);
  }

  useEffect(() => {
    loadCodes();
  }, []);

  const counts = useMemo(() => ({
    total: codes.length,
    redeemed: codes.filter((code) => code.status === 'redeemed').length,
    unused: codes.filter((code) => code.status === 'unused').length,
    inactive: codes.filter((code) => ['disabled', 'expired'].includes(code.status)).length,
  }), [codes]);

  const rows = useMemo(() => {
    if (filter === 'redeemed') return codes.filter((code) => code.status === 'redeemed');
    if (filter === 'unused') return codes.filter((code) => code.status === 'unused');
    return codes;
  }, [codes, filter]);

  return (
    <section className="admin-page">
      <AdminSectionHeader
        eyebrow="Codigos fisicos"
        title="Codigos unicos"
        description="Cada codigo desbloquea la version digital de una leyenda al canjearse."
        action={<Button variant="ghost" onClick={loadCodes} disabled={loading}>Actualizar</Button>}
      />

      {error && <p className="admin-error">{error.message}</p>}

      <div className="admin-stats-grid">
        <AdminStatCard label="Codigos totales" value={counts.total} icon="codes" tone="blue" />
        <AdminStatCard label="Canjeados" value={counts.redeemed} icon="request" tone="success" />
        <AdminStatCard label="Disponibles" value={counts.unused} icon="orders" tone="warning" />
        <AdminStatCard label="Inactivos" value={counts.inactive} icon="activity" tone="blue" />
      </div>

      <div className="admin-filter-row">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`admin-filter-chip${filter === item.key ? ' is-active' : ''}`}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <AdminDataTable
        loading={loading}
        rows={rows}
        emptyTitle="Sin codigos"
        emptyMessage="Cuando se generen o canjeen codigos apareceran aqui."
        columns={[
          { key: 'display_code', header: 'Codigo', render: (row) => <code className="admin-code-cell">{row.display_code}</code> },
          { key: 'legend', header: 'Leyenda', render: (row) => row.physical_editions?.legends?.title || row.physical_editions?.edition_name || '—' },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status || 'unused'} context="code" /> },
          { key: 'redeemer', header: 'Canjeado por', render: (row) => redeemerName(row) },
          { key: 'assigned_at', header: 'Fecha de canje', render: (row) => (row.status === 'redeemed' ? formatDateTime(row.assigned_at) : '—') },
        ]}
      />
    </section>
  );
}

export default AdminCodesPage;
