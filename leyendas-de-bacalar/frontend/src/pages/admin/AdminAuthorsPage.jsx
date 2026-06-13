import React, { useEffect, useState } from 'react';
import {
  AdminDataTable,
  AdminSectionHeader,
  AdminStatusBadge,
} from '../../components/ui/AdminPrimitives.jsx';
import Button from '../../components/ui/Button.jsx';
import { getAuthors } from '../../services/adminCreatorService.js';

function AdminAuthorsPage() {
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAuthors() {
      const { data, error: authorsError } = await getAuthors();
      setAuthors(data ?? []);
      setError(authorsError);
      setLoading(false);
    }

    loadAuthors();
  }, []);

  return (
    <section className="admin-page">
      <AdminSectionHeader eyebrow="Autores" title="Autores aprobados" description="Consulta perfiles de creadores y sus obras vinculadas." />
      {error && <p className="admin-error">{error.message}</p>}
      <AdminDataTable
        loading={loading}
        rows={authors}
        emptyTitle="Sin autores"
        emptyMessage="Todavia no hay autores aprobados."
        columns={[
          { key: 'pen_name', header: 'Nombre de autor', render: (row) => row.pen_name || 'Sin nombre' },
          { key: 'user', header: 'Usuario', render: (row) => row.users_profile?.full_name || row.users_profile?.username || row.user_id },
          { key: 'email', header: 'Correo', render: () => 'No disponible' },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status || 'approved'} context="creator_profile" /> },
          { key: 'legends', header: 'Leyendas', render: (row) => row.legends?.length ?? 0 },
          { key: 'created_at', header: 'Creado', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Sin fecha' },
          { key: 'actions', header: 'Acciones', render: () => <Button variant="ghost" disabled>Revocar pendiente</Button> },
        ]}
      />
    </section>
  );
}

export default AdminAuthorsPage;
