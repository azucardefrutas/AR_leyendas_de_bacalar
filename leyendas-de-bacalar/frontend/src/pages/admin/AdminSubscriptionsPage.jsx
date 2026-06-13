import React, { useEffect, useState } from 'react';
import {
  AdminDataTable,
  AdminSectionHeader,
  AdminStatusBadge,
} from '../../components/ui/AdminPrimitives.jsx';
import {
  getAdminSubscriptionPlans,
  getAdminSubscriptions,
} from '../../services/adminSubscriptionService.js';

function AdminSubscriptionsPage() {
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadSubscriptions() {
      const [plansResult, subscriptionsResult] = await Promise.all([
        getAdminSubscriptionPlans(),
        getAdminSubscriptions(),
      ]);
      setPlans(plansResult.data ?? []);
      setSubscriptions(subscriptionsResult.data ?? []);
      setError(plansResult.error || subscriptionsResult.error);
      setLoading(false);
    }

    loadSubscriptions();
  }, []);

  return (
    <section className="admin-page">
      <AdminSectionHeader
        eyebrow="Suscripciones"
        title="Planes y suscripciones"
        description="Consulta el estado de planes y suscripciones registradas por Supabase."
      />
      {error && <p className="admin-error">{error.message}</p>}

      <AdminDataTable
        loading={loading}
        rows={plans}
        emptyTitle="No hay planes configurados"
        emptyMessage="Los planes activos apareceran aqui cuando existan en subscription_plans."
        columns={[
          { key: 'name', header: 'Plan', render: (row) => row.name || row.title || String(row.id).slice(0, 8) },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.is_active === false ? 'inactive' : row.status || 'active'} context="creator_profile" /> },
          { key: 'price', header: 'Precio', render: (row) => row.price ?? row.amount ?? '-' },
          { key: 'interval', header: 'Periodo', render: (row) => row.interval || row.billing_interval || '-' },
          { key: 'created_at', header: 'Creado', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString('es-MX') : 'Sin fecha' },
        ]}
      />

      <AdminSectionHeader title="Suscripciones de usuarios" />
      <AdminDataTable
        loading={loading}
        rows={subscriptions}
        emptyTitle="No hay suscripciones"
        emptyMessage="Las suscripciones registradas apareceran aqui."
        columns={[
          { key: 'id', header: 'Suscripcion', render: (row) => String(row.id).slice(0, 8) },
          { key: 'user_id', header: 'Usuario', render: (row) => row.user_id || '-' },
          { key: 'plan_id', header: 'Plan', render: (row) => row.plan_id || row.subscription_plan_id || '-' },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status || 'pending'} context="order" /> },
          { key: 'starts_at', header: 'Inicio', render: (row) => row.starts_at ? new Date(row.starts_at).toLocaleDateString('es-MX') : '-' },
          { key: 'ends_at', header: 'Fin', render: (row) => row.ends_at ? new Date(row.ends_at).toLocaleDateString('es-MX') : '-' },
        ]}
      />
    </section>
  );
}

export default AdminSubscriptionsPage;
