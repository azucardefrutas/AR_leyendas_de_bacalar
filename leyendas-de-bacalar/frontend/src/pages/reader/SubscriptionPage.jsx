import React from 'react';
import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { getActivePlans, getMySubscriptions } from '../../services/subscriptionService.js';

function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadSubscriptions() {
      const [{ data: planData, error: planError }, { data: subscriptionData, error: subscriptionError }] = await Promise.all([
        getActivePlans(),
        getMySubscriptions(),
      ]);
      setPlans(planData ?? []);
      setSubscriptions(subscriptionData ?? []);
      setError(planError ?? subscriptionError);
      setLoading(false);
    }

    loadSubscriptions();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <section className="page-stack">
      <h1>Suscripcion</h1>
      {error && <p className="error-message">{error.message}</p>}
      <Card><h2>Planes activos</h2><p>{plans.length} planes disponibles.</p></Card>
      <Card><h2>Mis suscripciones</h2><p>{subscriptions.length} suscripciones registradas.</p></Card>
    </section>
  );
}

export default SubscriptionPage;
