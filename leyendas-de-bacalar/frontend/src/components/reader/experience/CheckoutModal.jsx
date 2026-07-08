import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../ui/Button.jsx';
import { formatMoney } from '../../../utils/formatters.js';

// Simulated-payment modal with a live 3D card preview. The card art updates as
// you type, detects the brand (Visa / MasterCard / Amex / Discover) and flips
// to the back when the CVV field is focused. Only the last four digits ever
// reach the backend RPC (simulated flow — no real charge). onConfirm(cardLastFour,
// snapshot) must return { data, error } from the process_simulated_* RPC.
function onlyDigits(value) {
  return value.replace(/\D+/g, '');
}

// Brand detection from the leading digits (same ranges the big processors use).
function detectBrand(digits) {
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  if (/^(6011|65|64[4-9]|622)/.test(digits)) return 'discover';
  return 'generic';
}

function brandMaxLen(brand) {
  return brand === 'amex' ? 15 : 16;
}

function groupDigits(digits) {
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function displayNumber(digits, brand) {
  const max = brandMaxLen(brand);
  const padded = (digits + '•'.repeat(max)).slice(0, max);
  return groupDigits(padded);
}

function BrandLogo({ brand }) {
  if (brand === 'visa') return <span className="rx-cc-brand-text">VISA</span>;
  if (brand === 'amex') return <span className="rx-cc-brand-text" style={{ fontSize: '0.95rem' }}>AMEX</span>;
  if (brand === 'discover') return <span className="rx-cc-brand-text" style={{ fontSize: '0.8rem', fontStyle: 'normal' }}>DISCOVER</span>;
  if (brand === 'mastercard') return <span className="rx-cc-mc" aria-label="Mastercard"><i /><i /></span>;
  return <span className="rx-cc-brand-text" style={{ opacity: 0.4, fontStyle: 'normal', fontSize: '0.8rem' }}>•• ••</span>;
}

function CheckoutModal({ open, title, subtitle, item, ctaLabel = 'Pagar', onClose, onConfirm }) {
  const [name, setName] = useState('');
  const [card, setCard] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [flipped, setFlipped] = useState(false);
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
      setFlipped(false);
      setError(null);
      setSuccess(null);
      setLoading(false);
    }
  }, [open, item?.id]);

  if (!open) return null;

  const cardDigits = onlyDigits(card);
  const brand = detectBrand(cardDigits);
  const canPay = name.trim().length > 1 && cardDigits.length >= 15 && expiry.length >= 4 && cvv.length >= 3;

  async function handlePay() {
    if (!canPay || loading) return;
    setLoading(true);
    setError(null);

    const lastFour = cardDigits.slice(-4);
    const snapshot = {
      simulated: true,
      cardholder: name.trim(),
      brand,
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
            {/* Live 3D card preview */}
            <div className={`rx-cc rx-cc-${brand}`}>
              <div className={`rx-cc-inner ${flipped ? 'rx-cc-flipped' : ''}`}>
                <div className="rx-cc-face rx-cc-front">
                  <div className="rx-cc-row">
                    <div className="rx-cc-chip" aria-hidden="true" />
                    <div className="rx-cc-brand"><BrandLogo brand={brand} /></div>
                  </div>
                  <div className="rx-cc-number">{displayNumber(cardDigits, brand)}</div>
                  <div className="rx-cc-bottom">
                    <div>
                      <div className="rx-cc-label">Titular</div>
                      <div className="rx-cc-value">{name.trim().toUpperCase() || 'NOMBRE APELLIDO'}</div>
                    </div>
                    <div>
                      <div className="rx-cc-label">Vence</div>
                      <div className="rx-cc-value">{expiry || 'MM/AA'}</div>
                    </div>
                  </div>
                </div>
                <div className="rx-cc-face rx-cc-back">
                  <div className="rx-cc-stripe" />
                  <div className="rx-cc-cvv-label">CVV</div>
                  <div className="rx-cc-sign">
                    <div className="rx-cc-sign-strip">{cvv || '•••'}</div>
                  </div>
                  <div className="rx-cc-row" style={{ padding: '0 18px', marginTop: 'auto' }}>
                    <div className="rx-cc-brand"><BrandLogo brand={brand} /></div>
                  </div>
                </div>
              </div>
            </div>

            <label className="rx-field">
              <span>Nombre en la tarjeta</span>
              <input
                className="rx-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onFocus={() => setFlipped(false)}
                placeholder="Como aparece en la tarjeta"
                autoComplete="cc-name"
              />
            </label>
            <label className="rx-field">
              <span>Numero de tarjeta</span>
              <input
                className="rx-input"
                value={groupDigits(cardDigits)}
                onChange={(event) => setCard(onlyDigits(event.target.value).slice(0, brandMaxLen(brand)))}
                onFocus={() => setFlipped(false)}
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
                  onFocus={() => setFlipped(false)}
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
                  onFocus={() => setFlipped(true)}
                  onBlur={() => setFlipped(false)}
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
