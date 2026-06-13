import React, { useEffect, useState } from 'react';
import {
  AdminDataTable,
  AdminSectionHeader,
  AdminStatusBadge,
} from '../../components/ui/AdminPrimitives.jsx';
import { getAdminOrders, getAdminPayments } from '../../services/adminOrderService.js';

function valueFrom(row, keys = []) {
  const value = keys.map((key) => row?.[key]).find((item) => item !== undefined && item !== null);
  return value ?? '-';
}

function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadOrders() {
      const [ordersResult, paymentsResult] = await Promise.all([
        getAdminOrders(),
        getAdminPayments(),
      ]);
      setOrders(ordersResult.data ?? []);
      setPayments(paymentsResult.data ?? []);
      setError(ordersResult.error || paymentsResult.error);
      setLoading(false);
    }

    loadOrders();
  }, []);

  return (
    <section className="admin-page">
      <AdminSectionHeader
        eyebrow="Compras"
        title="Ordenes y pagos"
        description="Consulta administrativa de ordenes, pagos y accesos registrados."
      />
      {error && <p className="admin-error">{error.message}</p>}

      <AdminDataTable
        loading={loading}
        rows={orders}
        emptyTitle="No hay ordenes"
        emptyMessage="Cuando se registren compras apareceran aqui."
        columns={[
          { key: 'id', header: 'Orden', render: (row) => String(row.id).slice(0, 8) },
          { key: 'user_id', header: 'Usuario', render: (row) => row.user_id || '-' },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status || 'pending'} context="order" /> },
          { key: 'total', header: 'Total', render: (row) => valueFrom(row, ['total', 'amount_total', 'amount', 'total_amount']) },
          { key: 'created_at', header: 'Fecha', render: (row) => row.created_at ? new Date(row.created_at).toLocaleString('es-MX') : 'Sin fecha' },
        ]}
      />

      <AdminSectionHeader title="Pagos" description="Consulta de pagos registrados para seguimiento administrativo." />
      <AdminDataTable
        loading={loading}
        rows={payments}
        emptyTitle="No hay pagos"
        emptyMessage="Los pagos registrados apareceran aqui."
        columns={[
          { key: 'id', header: 'Pago', render: (row) => String(row.id).slice(0, 8) },
          { key: 'order_id', header: 'Orden', render: (row) => row.order_id ? String(row.order_id).slice(0, 8) : '-' },
          { key: 'status', header: 'Estado', render: (row) => <AdminStatusBadge status={row.status || 'pending'} context="order" /> },
          { key: 'amount', header: 'Monto', render: (row) => valueFrom(row, ['amount', 'total', 'amount_total', 'payment_amount']) },
          { key: 'created_at', header: 'Fecha', render: (row) => row.created_at ? new Date(row.created_at).toLocaleString('es-MX') : 'Sin fecha' },
        ]}
      />
    </section>
  );
}

export default AdminOrdersPage;
