import React, { useEffect, useState } from 'react';
import { AdminDataTable, AdminSectionHeader } from '../../components/ui/AdminPrimitives.jsx';
import { getAdminAuditLogs } from '../../services/adminActivityService.js';

function formatMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') return '-';
  return Object.entries(metadata).slice(0, 3).map(([key, value]) => `${key}: ${String(value)}`).join(' | ');
}

function AdminActivityPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadLogs() {
      const { data, error: logsError } = await getAdminAuditLogs();
      setLogs(data ?? []);
      setError(logsError);
      setLoading(false);
    }

    loadLogs();
  }, []);

  return (
    <section className="admin-page">
      <AdminSectionHeader eyebrow="Actividad" title="Actividad administrativa" description="Registro legible de acciones administrativas." />
      {error && <p className="admin-error">{error.message}</p>}
      <AdminDataTable
        loading={loading}
        rows={logs}
        emptyTitle="Sin actividad"
        emptyMessage="Todavia no hay actividad administrativa registrada."
        columns={[
          { key: 'created_at', header: 'Fecha', render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : 'Sin fecha' },
          { key: 'admin_user_id', header: 'Admin' },
          { key: 'action', header: 'Accion' },
          { key: 'entity_type', header: 'Entidad' },
          { key: 'entity_id', header: 'ID' },
          { key: 'metadata', header: 'Metadata', render: (row) => formatMetadata(row.metadata) },
        ]}
      />
    </section>
  );
}

export default AdminActivityPage;
