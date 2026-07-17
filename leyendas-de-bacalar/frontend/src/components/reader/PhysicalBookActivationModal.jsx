import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { animate } from 'animejs';
import Button from '../ui/Button.jsx';
import AppIcon from '../ui/AppIcon.jsx';
import CheckoutModal from './experience/CheckoutModal.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { redeemCode } from '../../services/codeService.js';
import { getLegendProduct, buyProduct } from '../../services/purchaseService.js';
import { getLoginPathForRedirect } from '../../utils/authRedirect.js';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Surface the REAL reason from the backend (código usado / expirado / de otra cuenta /
// inválido) instead of a single generic line — without leaking technical text.
function friendlyRedeemError(message = '') {
  const m = String(message);
  if (/no autor|unauthor|inicia sesi|sesión/i.test(m)) return 'Inicia sesión para activar tu libro.';
  if (/usad|redimid|canjead|already/i.test(m)) return 'Ese código ya fue utilizado.';
  if (/expir|vencid/i.test(m)) return 'Ese código está expirado.';
  if (/otra cuenta|other account|pertenece/i.test(m)) return 'Ese código pertenece a otra cuenta.';
  if (/rate|demasiad|too many|intentos/i.test(m)) return 'Demasiados intentos. Espera un momento y reintenta.';
  if (/no.*(existe|v[áa]lido|encontr)|invalid|not found/i.test(m)) return 'Código no válido. Revisa que esté bien escrito.';
  return m && m.length > 0 && m.length < 120 ? m : 'No pudimos activar el libro. Verifica el código e intenta de nuevo.';
}

function PhysicalBookActivationModal({ legend = null, onClose, onRedeemed }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const cardRef = useRef(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [product, setProduct] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Entrance pop-in — the same motion as the checkout card ("reutiliza la animación").
  useEffect(() => {
    const el = cardRef.current;
    if (!el || prefersReducedMotion()) return;
    animate(el, { opacity: [0, 1], translateY: [18, 0], scale: [0.94, 1], duration: 520, ease: 'outExpo' });
  }, []);

  // Producto comprable de esta leyenda (habilita "Comprar libro" con pago simulado).
  useEffect(() => {
    if (!legend?.id) { setProduct(null); return undefined; }
    let active = true;
    getLegendProduct(legend.id).then(({ data }) => { if (active) setProduct(data || null); });
    return () => { active = false; };
  }, [legend?.id]);

  function requireLogin() {
    navigate(getLoginPathForRedirect(`${location.pathname}${location.search}${location.hash}`));
  }

  async function handleUnlock(event) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (!isAuthenticated) { requireLogin(); return; }
    if (!code.trim()) { setError('Ingresa el código de tu libro para continuar.'); return; }

    setLoading(true);
    const { error: redeemError } = await redeemCode(code.trim());
    setLoading(false);

    if (redeemError) {
      if (import.meta.env.DEV) console.error('physical book redeem error', redeemError);
      setError(friendlyRedeemError(redeemError.message));
      return;
    }
    setMessage('¡Libro activado! Ya puedes abrir la experiencia completa.');
    onRedeemed?.();
  }

  function handleBuy() {
    setError(null);
    setMessage(null);
    if (!isAuthenticated) { requireLogin(); return; }
    if (product) { setCheckoutOpen(true); return; }
    setMessage('La compra en línea de este libro aún no está disponible. Consíguelo con tu distribuidor y actívalo con el código impreso.');
  }

  async function handleConfirmPurchase(lastFour, snapshot) {
    const result = await buyProduct(product.id, { ...snapshot, legend_id: legend?.id ?? null }, lastFour);
    if (!result.error) onRedeemed?.();
    return result;
  }

  return (
    <div
      className="physical-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="physical-book-title"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}
    >
      <div className="physical-modal-card" ref={cardRef}>
        <button className="physical-modal-close" type="button" aria-label="Cerrar" onClick={onClose}>
          <AppIcon name="close" size={20} />
        </button>

        <div className="physical-modal-icon" aria-hidden="true">
          <AppIcon name="redeem" size={38} />
        </div>

        <div className="physical-modal-heading">
          <span className="physical-modal-kicker">Libro físico</span>
          <h2 id="physical-book-title">Activar tu libro</h2>
          <p>
            Ingresa el código impreso en tu libro para desbloquear la experiencia completa
            {legend?.title ? <> de <strong>{legend.title}</strong></> : ''}.
          </p>
        </div>

        <form className="physical-modal-form" onSubmit={handleUnlock}>
          <label className="physical-code-field">
            <span>Código del libro</span>
            <input
              className="physical-code-input"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="EJ: BACALAR2024"
              autoComplete="off"
              spellCheck="false"
              autoFocus
            />
            <small className="physical-code-hint">
              <AppIcon name="info" size={15} /> Suele venir en la primera página o la contraportada.
            </small>
          </label>

          {error && <p className="reader-modal-error"><AppIcon name="error" size={16} /> {error}</p>}
          {message && <p className="reader-modal-success"><AppIcon name="check_circle" size={16} /> {message}</p>}

          <div className="physical-modal-actions">
            <Button className="reader-glow-button" type="submit" disabled={loading}>
              <AppIcon name="lock_open" size={18} /> {loading ? 'Activando…' : 'Desbloquear'}
            </Button>
            <Button type="button" variant="ghost" className="reader-outline-button" onClick={handleBuy}>
              <AppIcon name="shopping_bag" size={18} /> Comprar libro
            </Button>
          </div>
        </form>
      </div>

      {checkoutOpen && product && (
        <CheckoutModal
          open={checkoutOpen}
          title="Comprar libro"
          subtitle={legend?.title || 'Libro físico'}
          item={{ id: product.id, name: product.name, price: product.price, currency: product.currency }}
          ctaLabel="Pagar"
          onClose={() => setCheckoutOpen(false)}
          onConfirm={handleConfirmPurchase}
        />
      )}
    </div>
  );
}

export default PhysicalBookActivationModal;
