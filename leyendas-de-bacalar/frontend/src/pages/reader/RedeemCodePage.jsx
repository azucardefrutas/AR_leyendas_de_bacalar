import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import RxEmptyState from '../../components/reader/experience/RxEmptyState.jsx';
import AccessTicketCanvas from '../../components/reader/experience/AccessTicketCanvas.jsx';
import { getMyCodeRedemptions, redeemCode } from '../../services/codeService.js';
import { formatDate } from '../../utils/formatters.js';

const TIPS = [
  { id: 'where', label: '¿Dónde está mi código?', text: 'Viene impreso dentro de tu edición física de Leyendas de Bacalar, normalmente en la primera o última página.' },
  { id: 'format', label: 'Formato del código', text: 'Tiene el formato PREFIJO-XXXX-XXXXX (por ejemplo PRINCI-WCFB-5D45T). No distingue mayúsculas de minúsculas ni espacios.' },
  { id: 'used', label: '¿Ya lo canjeé?', text: 'Cada código se activa una sola vez. Si ya lo usaste, la leyenda ya está desbloqueada en tu biblioteca.' },
];

function RedeemCodePage() {
  const [redemptions, setRedemptions] = useState([]);
  const [justRedeemed, setJustRedeemed] = useState(false);
  const [activeTip, setActiveTip] = useState(null);

  async function loadHistory() {
    const { data } = await getMyCodeRedemptions();
    setRedemptions((data ?? []).slice(0, 10));
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleValidate(code) {
    const { error } = await redeemCode(code.trim());
    return { error };
  }

  function handleSuccess() {
    setJustRedeemed(true);
    loadHistory();
  }

  return (
    <div className="rx rx-page">
      <header className="rx-redeem-center">
        <p className="rx-eyebrow">El despertar</p>
        <h1 className="rx-title">Canjear código</h1>
        <p className="rx-sub">
          Las aguas de los 7 colores custodian historias olvidadas. Ingresa el código único de tu
          edición física para despertar la leyenda y sumar su experiencia interactiva a tu biblioteca.
        </p>
      </header>

      <section className="rx-panel">
        <AccessTicketCanvas onValidate={handleValidate} onSuccess={handleSuccess} />

        {justRedeemed && (
          <div className="rx-head-actions" style={{ justifyContent: 'center', marginTop: 8 }}>
            <Link to="/reader/library"><Button>Ir a mi biblioteca</Button></Link>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <div className="rx-tips">
            {TIPS.map((tip) => (
              <button
                key={tip.id}
                type="button"
                className={`rx-tip ${activeTip === tip.id ? 'rx-tip-active' : ''}`}
                onClick={() => setActiveTip(activeTip === tip.id ? null : tip.id)}
                aria-expanded={activeTip === tip.id}
              >
                💡 {tip.label}
              </button>
            ))}
          </div>
          {activeTip && (
            <p className="rx-tip-panel">{TIPS.find((tip) => tip.id === activeTip)?.text}</p>
          )}
        </div>
      </section>

      <section className="rx-panel">
        <div className="rx-panel-head">
          <div>
            <h2>Códigos canjeados</h2>
            <p>Tu historial reciente de activaciones.</p>
          </div>
          <span className="rx-badge rx-badge-info">{redemptions.length}</span>
        </div>

        {redemptions.length === 0 ? (
          <RxEmptyState
            icon="🎟️"
            title="Aún no has canjeado códigos"
            message="Cuando actives el código de un libro físico, quedará registrado aquí."
          />
        ) : (
          <div className="rx-ledger">
            {redemptions.map((redemption) => (
              <div key={redemption.id} className="rx-ledger-row">
                <div className="rx-ledger-icon" aria-hidden="true">🎟️</div>
                <div className="rx-ledger-main">
                  <strong>Código activado</strong>
                  <span>{formatDate(redemption.redeemed_at, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="rx-ledger-side">
                  <span className="rx-badge rx-badge-ok">Desbloqueado</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default RedeemCodePage;
