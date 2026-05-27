import React, { useEffect, useState } from 'react';
import {
  AdminDataTable,
  AdminSectionHeader,
  AdminStatusBadge,
} from '../../components/ui/AdminPrimitives.jsx';
import { getAssets } from '../../services/adminAssetService.js';

function AdminAssetsPage() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAssets() {
      const { data, error: assetsError } = await getAssets();
      setAssets(data ?? []);
      setError(assetsError);
      setLoading(false);
    }

    loadAssets();
  }, []);

  return (
    <section className="admin-page">
      <AdminSectionHeader eyebrow="Recursos" title="Recursos multimedia" description="Portadas, banners, PDFs, modelos 3D y marcadores AR registrados." />
      {error && <p className="admin-error">{error.message}</p>}
      <AdminDataTable
        loading={loading}
        rows={assets}
        emptyTitle="No hay recursos"
        emptyMessage="Los archivos y recursos multimedia apareceran aqui."
        columns={[
          { key: 'name', header: 'Nombre', render: (row) => row.name || row.file_name || row.id },
          { key: 'asset_type', header: 'Tipo', render: (row) => row.asset_type || row.type || 'recurso' },
          { key: 'source_type', header: 'Origen', render: (row) => row.source_type || 'upload' },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status || 'active'} /> },
          { key: 'url', header: 'Vista', render: (row) => row.public_url || row.url ? <a href={row.public_url || row.url} target="_blank" rel="noreferrer">Abrir</a> : 'Sin URL' },
          { key: 'created_at', header: 'Fecha', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Sin fecha' },
        ]}
      />
    </section>
  );
}

export default AdminAssetsPage;
