import React, { useEffect, useMemo, useState } from 'react';
import LoadingState from '../../components/ui/LoadingState.jsx';
import Button from '../../components/ui/Button.jsx';
import ReaderSectionHeader from '../../components/reader/experience/ReaderSectionHeader.jsx';
import RxEmptyState from '../../components/reader/experience/RxEmptyState.jsx';
import CheckoutModal from '../../components/reader/experience/CheckoutModal.jsx';
import { cancelSubscription, getActivePlans, getMySubscriptions, subscribe } from '../../services/subscriptionService.js';
import { formatDate, formatMoney, splitPrice } from '../../utils/formatters.js';

function planPeriod(days) {
  if (days >= 360) return 'por año';
  if (days >= 85) return 'por trimestre';
  if (days >= 28) return 'por mes';
  return `por ${days} dias`;
}

function planFeatures(plan) {
  return [
    `Acceso simulado por ${plan.duration_days} dias`,
    'Leyendas premium de Bacalar',
    'Marcadores AR y modelos 3D por pagina',
    'Lectura interactiva tipo libro',
  ];
}

function subStatusBadge(status) {
  if (status === 'active') return <span className="rx-badge rx-badge-ok">Activa</span>;
  if (status === 'expired') return <span className="rx-badge rx-badge-off">Expirada</span>;
  if (status === 'cancelled') return <span className="rx-badge rx-badge-off">Cancelada</span>;
  return <span className="rx-badge rx-badge-wait">{status}</span>;
}

function SubscriptionPage() {
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkoutPlan, setCheckoutPlan] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);
  const [notice, setNotice] = useState('');

  async function reload() {
    const [{ data: planData, error: planError }, { data: subscriptionData, error: subscriptionError }] = await Promise.all([
      getActivePlans(),
      getMySubscriptions(),
    ]);
    setPlans(planData ?? []);
    setSubscriptions(subscriptionData ?? []);
    setError(planError ?? subscriptionError ?? null);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCancel(subscriptionId) {
    setCancelingId(subscriptionId);
    setError(null);
    setNotice('');
    const target = subscriptions.find((sub) => sub.id === subscriptionId);
    const { error: cancelError } = await cancelSubscription(subscriptionId);
    setCancelingId(null);
    setConfirmCancelId(null);
    if (cancelError) {
      setError(cancelError);
      return;
    }
    const until = target?.ends_at ? formatDate(target.ends_at) : null;
    setNotice(until
      ? `Cancelaste la renovacion. Conservas el acceso hasta el ${until}.`
      : 'Cancelaste la renovacion de tu suscripcion.');
    await reload();
  }

  // Best value = lowest price per day. Highlighted as the featured plan.
  const featuredId = useMemo(() => {
    if (!plans.length) return null;
    return [...plans].sort((a, b) => (a.price / a.duration_days) - (b.price / b.duration_days))[0]?.id ?? null;
  }, [plans]);

  const hasActive = subscriptions.some((sub) => sub.status === 'active');

  if (loading) return <LoadingState />;

  return (
    <div className="rx rx-page">
      <ReaderSectionHeader
        eyebrow="Membresias culturales"
        title="Suscripcion"
        subtitle="Apoya el proyecto y desbloquea el acceso completo a las leyendas premium de Bacalar, marcadores AR y lectura interactiva."
      >
        {hasActive && <span className="rx-badge rx-badge-ok">Tienes una suscripcion activa</span>}
      </ReaderSectionHeader>

      {error && <div className="rx-alert rx-alert-error">{error.message}</div>}
      {notice && <div className="rx-alert rx-alert-ok">{notice}</div>}

      <section className="rx-panel">
        <div className="rx-panel-head">
          <div>
            <h2>Elige tu plan</h2>
            <p>Precios en pesos mexicanos. Pago simulado para demostracion.</p>
          </div>
        </div>

        {plans.length === 0 ? (
          <RxEmptyState icon="✦" title="No hay planes disponibles" message="Vuelve pronto: pronto habilitaremos las membresias culturales." />
        ) : (
          <div className="rx-plans">
            {plans.map((plan) => {
              const price = splitPrice(plan.price);
              const featured = plan.id === featuredId;
              return (
                <article key={plan.id} className={`rx-plan${featured ? ' rx-plan-featured' : ''}`}>
                  {featured && <span className="rx-plan-tag">Mejor valor</span>}
                  <h3 className="rx-plan-name">{plan.name}</h3>
                  <p className="rx-plan-desc">{plan.description}</p>
                  <div className="rx-price">
                    <span className="rx-price-amount">${price.whole}</span>
                    <span className="rx-price-cents">.{price.cents}</span>
                    <span className="rx-price-period">{plan.currency} · {planPeriod(plan.duration_days)}</span>
                  </div>
                  <ul className="rx-feature-list">
                    {planFeatures(plan).map((feature) => <li key={feature}>{feature}</li>)}
                  </ul>
                  <Button onClick={() => setCheckoutPlan(plan)}>Suscribirme</Button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rx-panel">
        <div className="rx-panel-head">
          <div>
            <h2>Mis suscripciones</h2>
            <p>Historial de tus membresias en la plataforma.</p>
          </div>
          <span className="rx-badge rx-badge-info">{subscriptions.length}</span>
        </div>

        {subscriptions.length === 0 ? (
          <RxEmptyState
            icon="🎫"
            title="Aun no tienes suscripciones"
            message="Cuando actives un plan aparecera aqui con su vigencia y estado."
          />
        ) : (
          <div className="rx-ledger">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="rx-ledger-row">
                <div className="rx-ledger-icon" aria-hidden="true">🎫</div>
                <div className="rx-ledger-main">
                  <strong>{sub.subscription_plans?.name || 'Plan cultural'}</strong>
                  <span>
                    {formatDate(sub.starts_at)} — {formatDate(sub.ends_at)}
                  </span>
                </div>
                <div className="rx-ledger-side">
                  {subStatusBadge(sub.status)}
                  {sub.subscription_plans?.price != null && (
                    <span className="rx-ledger-amount">{formatMoney(sub.subscription_plans.price, sub.subscription_plans.currency)}</span>
                  )}
                  {sub.status === 'active' && (
                    confirmCancelId === sub.id ? (
                      <div className="rx-cancel-confirm">
                        <span>¿Cancelar la renovacion?</span>
                        <small className="rx-cancel-hint">Conservas el acceso hasta el {formatDate(sub.ends_at)}.</small>
                        <div className="rx-cancel-confirm-actions">
                          <Button
                            variant="danger"
                            onClick={() => handleCancel(sub.id)}
                            disabled={cancelingId === sub.id}
                          >
                            {cancelingId === sub.id ? 'Cancelando...' : 'Si, cancelar'}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setConfirmCancelId(null)}
                            disabled={cancelingId === sub.id}
                          >
                            No
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="rx-cancel-link"
                        onClick={() => { setNotice(''); setConfirmCancelId(sub.id); }}
                      >
                        Cancelar suscripcion
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <CheckoutModal
        open={Boolean(checkoutPlan)}
        title="Activar suscripcion"
        subtitle={checkoutPlan ? `Estas por activar: ${checkoutPlan.name}` : ''}
        ctaLabel="Suscribirme ahora"
        item={checkoutPlan ? {
          id: checkoutPlan.id,
          name: checkoutPlan.name,
          price: checkoutPlan.price,
          currency: checkoutPlan.currency,
          period: `${checkoutPlan.duration_days} dias`,
        } : null}
        onClose={() => { setCheckoutPlan(null); reload(); }}
        onConfirm={(lastFour, snapshot) => subscribe(checkoutPlan.id, snapshot, lastFour)}
      />
    </div>
  );
}

export default SubscriptionPage;
