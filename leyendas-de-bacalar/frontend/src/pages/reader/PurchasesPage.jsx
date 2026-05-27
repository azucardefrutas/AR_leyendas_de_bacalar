import React from 'react';
import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { getMyOrders, getMyPayments } from '../../services/purchaseService.js';

function PurchasesPage() {
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadPurchases() {
      const [{ data: orderData, error: orderError }, { data: paymentData, error: paymentError }] = await Promise.all([
        getMyOrders(),
        getMyPayments(),
      ]);
      setOrders(orderData ?? []);
      setPayments(paymentData ?? []);
      setError(orderError ?? paymentError);
      setLoading(false);
    }

    loadPurchases();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <section className="page-stack">
      <h1>Compras</h1>
      {error && <p className="error-message">{error.message}</p>}
      <Card><h2>Ordenes</h2><p>{orders.length} ordenes registradas.</p></Card>
      <Card><h2>Pagos</h2><p>{payments.length} pagos registrados.</p></Card>
    </section>
  );
}

export default PurchasesPage;
