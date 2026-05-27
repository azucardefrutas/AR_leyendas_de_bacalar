import React, { useEffect, useMemo, useState } from 'react';
import {
  AdminDataTable,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminToast,
} from '../../components/ui/AdminPrimitives.jsx';
import Button from '../../components/ui/Button.jsx';
import { activateUser, getUsers, suspendUser } from '../../services/adminUserService.js';

function getRoleNames(user) {
  return user.user_roles?.map((item) => item.roles?.name).filter(Boolean) ?? [];
}

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  async function loadUsers() {
    setLoading(true);
    const { data, error: usersError } = await getUsers();
    setUsers(data ?? []);
    setError(usersError);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => users.filter((user) => {
    const haystack = `${user.full_name || ''} ${user.email || ''} ${user.username || ''}`.toLowerCase();
    const roleMatch = !roleFilter || getRoleNames(user).includes(roleFilter);
    return haystack.includes(query.toLowerCase()) && roleMatch;
  }), [query, roleFilter, users]);

  async function updateStatus(user, action) {
    const result = action === 'suspend' ? await suspendUser(user.id) : await activateUser(user.id);
    if (result.error) {
      setToast({ type: 'error', message: result.error.message });
      return;
    }
    setToast({ type: 'success', message: 'Operacion completada correctamente.' });
    loadUsers();
  }

  return (
    <section className="admin-page">
      <AdminSectionHeader eyebrow="Usuarios" title="Usuarios registrados" description="Gestion basica de perfiles, estado y roles visibles." />
      <AdminToast type={toast?.type} message={toast?.message} />
      {error && <p className="admin-error">{error.message}</p>}
      <div className="admin-filters">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, correo o usuario" />
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="">Todos los roles</option>
          <option value="reader">reader</option>
          <option value="creator">creator</option>
          <option value="admin">admin</option>
        </select>
      </div>
      <AdminDataTable
        loading={loading}
        rows={filteredUsers}
        emptyTitle="Sin usuarios"
        emptyMessage="No encontramos usuarios con esos filtros."
        columns={[
          { key: 'full_name', header: 'Nombre', render: (row) => row.full_name || row.name || 'Sin nombre' },
          { key: 'email', header: 'Correo', render: (row) => row.email || 'No disponible' },
          { key: 'username', header: 'Username', render: (row) => row.username || 'Sin username' },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status || 'active'} /> },
          { key: 'roles', header: 'Roles', render: (row) => getRoleNames(row).join(', ') || 'Sin roles' },
          { key: 'created_at', header: 'Creado', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Sin fecha' },
          {
            key: 'actions',
            header: 'Acciones',
            render: (row) => row.status === 'suspended'
              ? <Button variant="ghost" onClick={() => updateStatus(row, 'activate')}>Reactivar</Button>
              : <Button variant="ghost" onClick={() => updateStatus(row, 'suspend')}>Suspender</Button>,
          },
        ]}
      />
    </section>
  );
}

export default AdminUsersPage;
