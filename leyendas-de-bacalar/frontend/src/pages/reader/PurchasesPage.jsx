import React, { useEffect, useState } from 'react';
import LoadingState from '../../components/ui/LoadingState.jsx';
import Button from '../../components/ui/Button.jsx';
import ReaderSectionHeader from '../../components/reader/experience/ReaderSectionHeader.jsx';
import RxEmptyState from '../../components/reader/experience/RxEmptyState.jsx';
import CheckoutModal from '../../components/reader/experience/CheckoutModal.jsx';
import { buyProduct, getActiveProducts, getMyOrders, getMyPayments } from '../../services/purchaseService.js';
import { formatDate, formatMoney } from '../../utils/formatters.js';

const PRODUCT_TYPE_LABELS = {
  subscription_plan: 'Suscripcion',
  digital_legend: 'Leyenda digital',
  physical_edition: 'Edicion fisica',
  bundle: 'Paquete',
};

function statusBadge(status) {
  const map = {
    approved: 'rx-badge-ok',
    active: 'rx-badge-ok',
    pending: 'rx-badge-wait',
    failed: 'rx-badge-off',
    cancelled: 'rx-badge-off',
    refunded: 'rx-badge-info',
  };
  return <span className={`rx-badge ${map[status] || 'rx-badge-info'}`}>{status}</span>;
}

function PurchasesPage() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkoutProduct, setCheckoutProduct] = useState(null);

  async function reload() {
    const [
      { data: productData, error: productError },
      { data: orderData, error: orderError },
      { data: paymentData, error: paymentError },
    ] = await Promise.all([getActiveProducts(), getMyOrders(), getMyPayments()]);
    setProducts(productData ?? []);
    setOrders(orderData ?? []);
    setPayments(paymentData ?? []);
    setError(productError ?? orderError ?? paymentError ?? null);
    setLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="rx rx-page">
      <ReaderSectionHeader
        eyebrow="Tienda cultural"
        title="Compras"
        subtitle="Adquiere leyendas digitales y membresias. Aqui tambien queda el registro de tus ordenes y pagos."
      />

      {error && <div className="rx-alert rx-alert-error">{error.message}</div>}

      <section className="rx-panel">
        <div className="rx-panel-head">
          <div>
            <h2>Disponible para ti</h2>
            <p>Compra simulada para demostracion. No se genera ningun cargo real.</p>
          </div>
        </div>

        {products.length === 0 ? (
          <RxEmptyState icon="🛍️" title="No hay productos disponibles" message="Pronto agregaremos leyendas y ediciones para adquirir." />
        ) : (
          <div className="rx-store-grid">
            {products.map((product) => (
              <article key={product.id} className="rx-product">
                <span className="rx-product-type">{PRODUCT_TYPE_LABELS[product.product_type] || 'Producto'}</span>
                <h4>{product.name}</h4>
                <p>{product.description}</p>
                <div className="rx-product-foot">
                  <span className="rx-product-price">{formatMoney(product.price, product.currency)}</span>
                  <Button onClick={() => setCheckoutProduct(product)}>Comprar</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rx-panel">
        <div className="rx-panel-head">
          <div>
            <h2>Ordenes</h2>
            <p>Historial de compras registradas en tu cuenta.</p>
          </div>
          <span className="rx-badge rx-badge-info">{orders.length}</span>
        </div>

        {orders.length === 0 ? (
          <RxEmptyState icon="🧾" title="Sin ordenes todavia" message="Cuando realices una compra, tu orden aparecera aqui con su detalle." />
        ) : (
          <div className="rx-ledger">
            {orders.map((order) => {
              const items = order.order_items || [];
              const title = items[0]?.products?.name || 'Compra';
              const extra = items.length > 1 ? ` + ${items.length - 1} mas` : '';
              return (
                <div key={order.id} className="rx-ledger-row">
                  <div className="rx-ledger-icon" aria-hidden="true">🧾</div>
                  <div className="rx-ledger-main">
                    <strong>{title}{extra}</strong>
                    <span>{formatDate(order.created_at)} · orden #{String(order.id).slice(0, 8)}</span>
                  </div>
                  <div className="rx-ledger-side">
                    {statusBadge(order.status)}
                    <span className="rx-ledger-amount">{formatMoney(order.total_amount, order.currency)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rx-panel">
        <div className="rx-panel-head">
          <div>
            <h2>Pagos</h2>
            <p>Movimientos simulados asociados a tus ordenes.</p>
          </div>
          <span className="rx-badge rx-badge-info">{payments.length}</span>
        </div>

        {payments.length === 0 ? (
          <RxEmptyState icon="💳" title="Sin pagos registrados" message="Los pagos simulados de tus compras se mostraran en esta lista." />
        ) : (
          <div className="rx-ledger">
            {payments.map((payment) => (
              <div key={payment.id} className="rx-ledger-row">
                <div className="rx-ledger-icon" aria-hidden="true">💳</div>
                <div className="rx-ledger-main">
                  <strong>{payment.payment_method?.replace(/_/g, ' ') || 'Pago simulado'}{payment.card_last_four ? ` · ****${payment.card_last_four}` : ''}</strong>
                  <span>{formatDate(payment.created_at)} · {payment.provider}</span>
                </div>
                <div className="rx-ledger-side">
                  {statusBadge(payment.status)}
                  <span className="rx-ledger-amount">{formatMoney(payment.amount, payment.currency)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <CheckoutModal
        open={Boolean(checkoutProduct)}
        title="Confirmar compra"
        subtitle={checkoutProduct ? `Estas por comprar: ${checkoutProduct.name}` : ''}
        ctaLabel="Pagar ahora"
        item={checkoutProduct ? {
          id: checkoutProduct.id,
          name: checkoutProduct.name,
          price: checkoutProduct.price,
          currency: checkoutProduct.currency,
        } : null}
        onClose={() => { setCheckoutProduct(null); reload(); }}
        onConfirm={(lastFour, snapshot) => buyProduct(checkoutProduct.id, snapshot, lastFour)}
      />
    </div>
  );
}

export default PurchasesPage;
