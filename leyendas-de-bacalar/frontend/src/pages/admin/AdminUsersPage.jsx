import React, { useEffect, useMemo, useState } from 'react';
import {
  AdminDataTable,
  AdminSectionHeader,
  AdminStatusBadge,
  AdminToast,
} from '../../components/ui/AdminPrimitives.jsx';
import Button from '../../components/ui/Button.jsx';
import { activateUser, getUsers, suspendUser } from '../../services/adminUserService.js';
import { normalizeRoleNames } from '../../services/roleService.js';

function getRoleNames(user) {
  return normalizeRoleNames(user.roles?.length ? user.roles : user.user_roles);
}

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  async function loadUsers({ preserveToast = false } = {}) {
    setLoading(true);
    setError(null);
    if (!preserveToast) setToast(null);
    const { data, error: usersError } = await getUsers();
    if (usersError && import.meta.env.DEV) {
      console.error('[AdminUsers] Error real:', {
        operation: 'loadUsers',
        table: usersError.supabaseError?.table || 'users_profile/user_roles/roles',
        error: usersError.supabaseError || usersError,
      });
    }
    setUsers(data ?? []);
    setError(usersError);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => users.filter((user) => {
    const roleNames = getRoleNames(user);
    const haystack = `${user.full_name || ''} ${user.username || ''} ${roleNames.join(' ')}`.toLowerCase();
    const roleMatch = !roleFilter || getRoleNames(user).includes(roleFilter);
    return haystack.includes(query.toLowerCase()) && roleMatch;
  }), [query, roleFilter, users]);

  async function updateStatus(user, action) {
    setError(null);
    setToast(null);
    const result = action === 'suspend' ? await suspendUser(user.id) : await activateUser(user.id);
    if (result.error) {
      if (import.meta.env.DEV) {
        console.error('[AdminUsers] Error real:', {
          operation: action === 'suspend' ? 'suspendUser' : 'activateUser',
          table: 'users_profile',
          error: result.error.supabaseError || result.error,
        });
      }
      setToast({ type: 'error', message: result.error.message });
      return;
    }
    setError(null);
    setToast({ type: 'success', message: 'Operacion completada correctamente.' });
    loadUsers({ preserveToast: true });
  }

  return (
    <section className="admin-page">
      <AdminSectionHeader eyebrow="Usuarios" title="Usuarios registrados" description="Gestion basica de perfiles, estado y roles visibles." />
      <AdminToast type={toast?.type} message={toast?.message} />
      {error && <p className="admin-error">{error.message}</p>}
      <div className="admin-filters">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, usuario o rol" />
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
          { key: 'email', header: 'Correo', render: () => 'No disponible' },
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
