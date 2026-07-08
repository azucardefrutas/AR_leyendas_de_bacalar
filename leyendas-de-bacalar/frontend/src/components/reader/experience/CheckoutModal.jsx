import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../ui/Button.jsx';
import { formatMoney } from '../../../utils/formatters.js';

// Simulated-payment modal. It collects card-like details purely for the demo
// UX; only the last four digits are ever sent to the backend RPC (which is a
// simulated flow — no real charge). onConfirm(cardLastFour, snapshot) must
// return { data, error } from the corresponding process_simulated_* RPC.
function onlyDigits(value) {
  return value.replace(/\D+/g, '');
}

function groupCard(digits) {
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function CheckoutModal({ open, title, subtitle, item, ctaLabel = 'Pagar', onClose, onConfirm }) {
  const [name, setName] = useState('');
  const [card, setCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === 'Escape' && !loading) onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, loading, onClose]);

  useEffect(() => {
    if (open) {
      setName('');
      setCard('');
      setExpiry('');
      setCvv('');
      setError(null);
      setSuccess(null);
      setLoading(false);
    }
  }, [open, item?.id]);

  if (!open) return null;

  const cardDigits = onlyDigits(card);
  const canPay = name.trim().length > 1 && cardDigits.length >= 15 && expiry.length >= 4 && cvv.length >= 3;

  async function handlePay() {
    if (!canPay || loading) return;
    setLoading(true);
    setError(null);

    const lastFour = cardDigits.slice(-4);
    const snapshot = {
      simulated: true,
      cardholder: name.trim(),
      item: item?.name ?? null,
      created_via: 'reader_checkout',
    };

    const { data, error: rpcError } = await onConfirm(lastFour, snapshot);
    setLoading(false);

    if (rpcError) {
      setError(rpcError.message || 'No se pudo procesar el pago simulado.');
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setSuccess(row?.message || 'Pago simulado completado correctamente.');
  }

  return createPortal(
    <div
      className="rx-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose?.();
      }}
    >
      <div className="rx-modal">
        <div className="rx-modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="rx-modal-close" type="button" onClick={onClose} disabled={loading} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {item && (
          <div className="rx-summary-line">
            <span>{item.name}{item.period ? ` · ${item.period}` : ''}</span>
            <strong>{formatMoney(item.price, item.currency)}</strong>
          </div>
        )}

        {success ? (
          <div className="rx-form">
            <div className="rx-alert rx-alert-ok">{success}</div>
            <div className="rx-modal-actions">
              <Button onClick={onClose}>Listo</Button>
            </div>
          </div>
        ) : (
          <div className="rx-form">
            <label className="rx-field">
              <span>Nombre en la tarjeta</span>
              <input
                className="rx-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Como aparece en la tarjeta"
                autoComplete="cc-name"
              />
            </label>
            <label className="rx-field">
              <span>Numero de tarjeta</span>
              <input
                className="rx-input"
                value={groupCard(cardDigits)}
                onChange={(event) => setCard(onlyDigits(event.target.value).slice(0, 16))}
                placeholder="4242 4242 4242 4242"
                inputMode="numeric"
                autoComplete="cc-number"
              />
            </label>
            <div className="rx-form-row">
              <label className="rx-field">
                <span>Vencimiento</span>
                <input
                  className="rx-input"
                  value={expiry}
                  onChange={(event) => {
                    const digits = onlyDigits(event.target.value).slice(0, 4);
                    setExpiry(digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits);
                  }}
                  placeholder="MM/AA"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                />
              </label>
              <label className="rx-field">
                <span>CVV</span>
                <input
                  className="rx-input"
                  value={cvv}
                  onChange={(event) => setCvv(onlyDigits(event.target.value).slice(0, 4))}
                  placeholder="123"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                />
              </label>
            </div>

            {error && <div className="rx-alert rx-alert-error">{error}</div>}

            <p className="rx-note">Pago simulado para fines de demostracion. No se realiza ningun cargo real.</p>

            <div className="rx-modal-actions">
              <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
              <Button onClick={handlePay} disabled={!canPay || loading}>
                {loading ? 'Procesando...' : ctaLabel}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default CheckoutModal;
