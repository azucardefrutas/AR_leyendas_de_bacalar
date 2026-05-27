import React, { useEffect, useState } from 'react';
import {
  AdminDataTable,
  AdminSectionHeader,
  AdminStatusBadge,
} from '../../components/ui/AdminPrimitives.jsx';
import { getAccessCodesByBatch, getCodeBatches } from '../../services/adminCodeService.js';

function AdminCodeBatchesPage() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codesLoading, setCodesLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadBatches() {
      const { data, error: batchesError } = await getCodeBatches();
      setBatches(data ?? []);
      setError(batchesError);
      setLoading(false);
    }

    loadBatches();
  }, []);

  async function selectBatch(batch) {
    setSelectedBatch(batch);
    setCodesLoading(true);
    const { data, error: codesError } = await getAccessCodesByBatch(batch.id);
    setCodes(data ?? []);
    setError(codesError);
    setCodesLoading(false);
  }

  return (
    <section className="admin-page">
      <AdminSectionHeader eyebrow="Codigos" title="Lotes de codigos" description="Consulta lotes y codigos visibles sin exponer hashes." />
      {error && <p className="admin-error">{error.message}</p>}
      <AdminDataTable
        loading={loading}
        rows={batches}
        emptyTitle="No hay lotes generados"
        emptyMessage="Los lotes creados por administracion apareceran aqui."
        columns={[
          { key: 'id', header: 'Lote', render: (row) => String(row.id).slice(0, 8) },
          { key: 'edition', header: 'Edicion', render: (row) => row.physical_editions?.name || row.physical_edition_id || 'Sin edicion' },
          { key: 'quantity', header: 'Cantidad' },
          { key: 'prefix', header: 'Prefijo', render: (row) => row.prefix || '-' },
          { key: 'created_at', header: 'Creado', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Sin fecha' },
          { key: 'actions', header: 'Codigos', render: (row) => <button className="admin-link-button" onClick={() => selectBatch(row)}>Ver codigos</button> },
        ]}
      />

      {selectedBatch && (
        <>
          <AdminSectionHeader title={`Codigos del lote ${String(selectedBatch.id).slice(0, 8)}`} action={<button className="admin-link-button" disabled>Exportar CSV pendiente</button>} />
          <AdminDataTable
            loading={codesLoading}
            rows={codes}
            emptyTitle="Sin codigos visibles"
            emptyMessage="No hay codigos asociados a este lote."
            columns={[
              { key: 'display_code', header: 'Codigo' },
              { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status || 'unused'} /> },
              { key: 'redeemed_at', header: 'Canjeado', render: (row) => row.redeemed_at ? new Date(row.redeemed_at).toLocaleString() : 'No' },
              { key: 'assigned_to_user_id', header: 'Usuario', render: (row) => row.assigned_to_user_id || '-' },
            ]}
          />
        </>
      )}
    </section>
  );
}

export default AdminCodeBatchesPage;
