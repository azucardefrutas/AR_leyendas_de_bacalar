import React from 'react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { redeemCode } from '../../services/codeService.js';
import { getLoginPathForRedirect } from '../../utils/authRedirect.js';

function KeyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M14.5 9.5a4.5 4.5 0 1 1-2.1 3.8L4 21.7 2.3 20l8.4-8.4a4.5 4.5 0 0 1 3.8-2.1Z" />
      <path d="m15 9 2-2 2 2 2-2" />
    </svg>
  );
}

function PhysicalBookActivationModal({ onClose, onRedeemed }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  async function handleUnlock(event) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!isAuthenticated) {
      navigate(getLoginPathForRedirect(`${location.pathname}${location.search}${location.hash}`));
      return;
    }

    if (!code.trim()) {
      setError('Ingresa el codigo de tu libro para continuar.');
      return;
    }

    setLoading(true);
    const { error: redeemError } = await redeemCode(code.trim());
    setLoading(false);

    if (redeemError) {
      if (import.meta.env.DEV) console.error('physical book redeem error', redeemError);
      setError('No pudimos desbloquear el libro. Verifica el codigo e intenta nuevamente.');
      return;
    }

    setMessage('Libro desbloqueado correctamente.');
    onRedeemed?.();
  }

  return (
    <div className="physical-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="physical-book-title">
      <div className="physical-modal-card">
        <button className="physical-modal-close" type="button" aria-label="Cerrar" onClick={onClose}>x</button>
        <div className="physical-modal-icon"><KeyIcon /></div>
        <h2 id="physical-book-title">Activar libro fisico</h2>
        <p>Ingresa el codigo que viene impreso en tu libro para desbloquear la experiencia completa.</p>

        <form className="physical-modal-form" onSubmit={handleUnlock}>
          <label className="physical-code-field">
            <span>Codigo del libro</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="EJ: BACALAR2024"
              autoFocus
            />
          </label>

          {error && <p className="reader-modal-error">{error}</p>}
          {message && <p className="reader-modal-success">{message}</p>}

          <div className="physical-modal-actions">
            <Button className="reader-glow-button" type="submit" disabled={loading}>
              {loading ? 'Desbloqueando...' : 'Desbloquear'}
            </Button>
            <Button variant="ghost" className="reader-outline-button" onClick={() => setMessage('Compra de libro pendiente de conectar.')}>
              Comprar libro
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PhysicalBookActivationModal;
