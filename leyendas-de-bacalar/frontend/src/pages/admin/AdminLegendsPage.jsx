import React, { useEffect, useMemo, useState } from 'react';
import {
  AdminConfirmModal,
  AdminDataTable,
  AdminSectionHeader,
  AdminStatusBadge,
} from '../../components/ui/AdminPrimitives.jsx';
import Button from '../../components/ui/Button.jsx';
import { getLegendById, getLegends } from '../../services/adminLegendService.js';

function formatDate(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return date.toLocaleDateString('es-MX');
}

function AdminLegendsPage() {
  const [legends, setLegends] = useState([]);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
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

  async function openDetail(legend) {
    setDetail(legend);
    setDetailError(null);
    setDetailLoading(true);
    const { data, error: legendError } = await getLegendById(legend.id);
    setDetail(data || legend);
    setDetailError(legendError);
    setDetailLoading(false);
  }

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
          { key: 'author', header: 'Autor', render: (row) => row.authorName || row.creator_profiles?.pen_name || 'Sin autor' },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status || 'draft'} context="legend" /> },
          { key: 'access_type', header: 'Acceso' },
          { key: 'is_featured', header: 'Destacada', render: (row) => row.is_featured ? 'Si' : 'No' },
          { key: 'actions', header: 'Acciones', render: (row) => <Button variant="ghost" onClick={() => openDetail(row)}>Ver detalle</Button> },
        ]}
      />

      <AdminConfirmModal
        open={Boolean(detail)}
        title={detail?.title || 'Detalle de leyenda'}
        description="Detalle editorial con datos reales registrados en Supabase."
        confirmLabel="Cerrar"
        showCancel={false}
        onConfirm={() => setDetail(null)}
        modalClassName="admin-modal-wide"
      >
        {detailLoading ? (
          <p className="admin-muted">Cargando detalle...</p>
        ) : (
          <div className="admin-legend-detail">
            {detailError && <p className="admin-error">{detailError.message}</p>}
            <div className="admin-legend-detail-cover">
              {detail?.cover_url ? <img src={detail.cover_url} alt={`Portada de ${detail.title}`} /> : <span>Sin portada</span>}
            </div>
            <div className="admin-inspection-grid">
              <div><strong>Titulo</strong><p>{detail?.title || 'Sin titulo'}</p></div>
              <div><strong>Autor</strong><p>{detail?.authorName || detail?.creator_profiles?.pen_name || 'Sin autor'}</p></div>
              <div><strong>Estado</strong><p>{detail?.status || 'draft'}</p></div>
              <div><strong>Acceso</strong><p>{detail?.access_type || 'No disponible'}</p></div>
              <div><strong>Destacada</strong><p>{detail?.is_featured ? 'Si' : 'No'}</p></div>
              <div><strong>Version actual</strong><p>{detail?.currentVersion?.version_number || 'Sin version'} · {detail?.currentVersion?.status || 'Sin estado'}</p></div>
              <div><strong>Paginas</strong><p>{detail?.pagesCount ?? 0}</p></div>
              <div><strong>Recursos</strong><p>{detail?.media?.length ?? 0}</p></div>
              <div><strong>Creada</strong><p>{formatDate(detail?.created_at)}</p></div>
              <div><strong>Actualizada</strong><p>{formatDate(detail?.updated_at)}</p></div>
            </div>
            <section className="admin-legal-note">
              <strong>Sinopsis</strong>
              <p>{detail?.synopsis || detail?.short_synopsis || 'Sin sinopsis'}</p>
            </section>
            <section className="admin-legal-note">
              <strong>Generos</strong>
              <p>{detail?.genres?.length ? detail.genres.map((genre) => genre.name).join(', ') : 'Sin generos'}</p>
            </section>
            {detail?.currentReview && (
              <section className="admin-legal-note">
                <strong>Ultima revision</strong>
                <p>{detail.currentReview.status}: {detail.currentReview.feedback || 'Sin feedback'}</p>
              </section>
            )}
          </div>
        )}
      </AdminConfirmModal>
    </section>
  );
}

export default AdminLegendsPage;
