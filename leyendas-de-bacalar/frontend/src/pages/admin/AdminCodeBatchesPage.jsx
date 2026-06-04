import React, { useEffect, useState } from 'react';
import {
  AdminDataTable,
  AdminSectionHeader,
  AdminStatusBadge,
} from '../../components/ui/AdminPrimitives.jsx';
import { getAccessCodesByBatch, getCodeBatches } from '../../services/adminCodeService.js';

function getEditionLabel(batch) {
  return batch.physical_editions?.edition_name
    || batch.physical_editions?.legends?.title
    || batch.edition_id
    || 'Sin edicion';
}

function getVisibleCode(code) {
  return code.display_code || 'Codigo protegido';
}

function escapeCsv(value = '') {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function AdminCodeBatchesPage() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codesLoading, setCodesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [codesError, setCodesError] = useState(null);

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
    setCodesError(null);
    const { data, error: codesError } = await getAccessCodesByBatch(batch.id);
    setCodes(data ?? []);
    setCodesError(codesError);
    setCodesLoading(false);
  }

  function exportVisibleCodes() {
    const visibleCodes = codes.filter((code) => code.display_code);
    if (!visibleCodes.length || !selectedBatch) return;

    const headers = ['codigo', 'estado', 'usuario_asignado', 'canjeado_en'];
    const rows = visibleCodes.map((code) => [
      code.display_code,
      code.status || 'unused',
      code.assigned_to_user_id || code.redeemed_by_user_id || '',
      code.redeemed_at || '',
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `codigos-lote-${String(selectedBatch.id).slice(0, 8)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
          { key: 'edition', header: 'Edicion', render: getEditionLabel },
          { key: 'quantity', header: 'Cantidad' },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status || 'generated'} /> },
          { key: 'prefix', header: 'Prefijo', render: (row) => row.prefix || '-' },
          { key: 'created_at', header: 'Creado', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Sin fecha' },
          { key: 'actions', header: 'Codigos', render: (row) => <button className="admin-link-button" onClick={() => selectBatch(row)}>Ver codigos</button> },
        ]}
      />

      {selectedBatch && (
        <>
          <AdminSectionHeader
            title={`Codigos del lote ${String(selectedBatch.id).slice(0, 8)}`}
            description={codes.some((code) => code.display_code)
              ? `${codes.filter((code) => code.display_code).length} codigos visibles para exportar.`
              : 'Codigos protegidos; no hay display_code visible para exportar.'}
            action={codes.some((code) => code.display_code)
              ? <button className="admin-link-button" type="button" onClick={exportVisibleCodes}>Exportar CSV</button>
              : null}
          />
          {codesError && <p className="admin-error">{codesError.message}</p>}
          <AdminDataTable
            loading={codesLoading}
            rows={codes}
            emptyTitle="Sin codigos asociados"
            emptyMessage="Este lote no tiene access_codes asociados. Revisa la generacion del lote."
            columns={[
              { key: 'display_code', header: 'Codigo', render: getVisibleCode },
              { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status || 'unused'} /> },
              { key: 'redeemed_at', header: 'Canjeado', render: (row) => row.redeemed_at ? new Date(row.redeemed_at).toLocaleString() : 'No' },
              { key: 'assigned_to_user_id', header: 'Usuario', render: (row) => row.assigned_to_user_id || row.redeemed_by_user_id || '-' },
            ]}
          />
        </>
      )}
    </section>
  );
}

export default AdminCodeBatchesPage;
