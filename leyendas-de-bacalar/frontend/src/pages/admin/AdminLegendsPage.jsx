import React, { useEffect, useMemo, useState } from 'react';
import {
  AdminDataTable,
  AdminSectionHeader,
  AdminStatusBadge,
} from '../../components/ui/AdminPrimitives.jsx';
import Button from '../../components/ui/Button.jsx';
import { getLegends } from '../../services/adminLegendService.js';

function AdminLegendsPage() {
  const [legends, setLegends] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadLegends() {
      const { data, error: legendsError } = await getLegends();
      setLegends(data ?? []);
      setError(legendsError);
      setLoading(false);
    }

    loadLegends();
  }, []);

  const filtered = useMemo(() => legends.filter((legend) => {
    const matchesQuery = (legend.title || '').toLowerCase().includes(query.toLowerCase());
    const matchesStatus = !status || legend.status === status;
    return matchesQuery && matchesStatus;
  }), [legends, query, status]);

  return (
    <section className="admin-page">
      <AdminSectionHeader eyebrow="Contenido" title="Leyendas" description="Vista editorial de obras registradas." />
      {error && <p className="admin-error">{error.message}</p>}
      <div className="admin-filters">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por titulo" />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Todos los estados</option>
          <option value="draft">draft</option>
          <option value="in_review">in_review</option>
          <option value="published">published</option>
          <option value="rejected">rejected</option>
          <option value="archived">archived</option>
        </select>
      </div>
      <AdminDataTable
        loading={loading}
        rows={filtered}
        emptyTitle="Sin leyendas"
        emptyMessage="No hay obras para mostrar con esos filtros."
        columns={[
          { key: 'cover', header: 'Portada', render: (row) => row.cover_url ? <img className="admin-thumb" src={row.cover_url} alt="" /> : <span className="admin-thumb-placeholder">Sin portada</span> },
          { key: 'title', header: 'Titulo' },
          { key: 'author', header: 'Autor', render: (row) => row.creator_profiles?.pen_name || 'Sin autor' },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status || 'draft'} /> },
          { key: 'access_type', header: 'Acceso' },
          { key: 'is_featured', header: 'Destacada', render: (row) => row.is_featured ? 'Si' : 'No' },
          { key: 'actions', header: 'Acciones', render: () => <Button variant="ghost" disabled>Ver detalle pronto</Button> },
        ]}
      />
    </section>
  );
}

export default AdminLegendsPage;
