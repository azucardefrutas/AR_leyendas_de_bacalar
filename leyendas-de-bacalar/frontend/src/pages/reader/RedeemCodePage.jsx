import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import ReaderSectionHeader from '../../components/reader/experience/ReaderSectionHeader.jsx';
import RxEmptyState from '../../components/reader/experience/RxEmptyState.jsx';
import { getMyCodeRedemptions, redeemCode } from '../../services/codeService.js';
import { formatDate } from '../../utils/formatters.js';

const STEPS = [
  { title: 'Encuentra tu codigo', text: 'Cada edicion fisica de Leyendas de Bacalar incluye un codigo unico impreso en su interior.' },
  { title: 'Escribelo aqui', text: 'Ingresa el codigo tal cual aparece. No distingue mayusculas de minusculas.' },
  { title: 'Desbloquea la leyenda', text: 'La historia se agrega a tu biblioteca con su lectura interactiva y experiencias AR.' },
];

function RedeemCodePage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [redemptions, setRedemptions] = useState([]);

  async function loadHistory() {
    const { data } = await getMyCodeRedemptions();
    setRedemptions((data ?? []).slice(0, 10));
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const { data, error: redeemError } = await redeemCode(code.trim());
    setLoading(false);

    if (redeemError) {
      setError(redeemError.message);
      return;
    }

    setResult(data);
    setCode('');
    loadHistory();
  }

  return (
    <div className="rx rx-page">
      <ReaderSectionHeader
        eyebrow="Activacion"
        title="Canjear codigo"
        subtitle="Convierte tu libro fisico en una experiencia interactiva: ingresa el codigo unico de tu edicion para desbloquear la leyenda."
      />

      <div className="rx-redeem-grid">
        <section className="rx-panel">
          <div className="rx-panel-head">
            <div>
              <h2>Ingresa tu codigo</h2>
              <p>Lo encuentras impreso dentro de tu edicion fisica.</p>
            </div>
          </div>

          <form className="rx-redeem-form" onSubmit={handleSubmit}>
            <input
              className="rx-code-input"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="XXXX-XXXX"
              aria-label="Codigo de activacion"
              required
            />
            {error && <div className="rx-alert rx-alert-error">{error}</div>}
            {result && (
              <div className="rx-alert rx-alert-ok">
                Codigo canjeado correctamente. Ya puedes leerlo en tu biblioteca.
              </div>
            )}
            <div className="rx-head-actions">
              <Button type="submit" disabled={loading || !code.trim()}>
                {loading ? 'Canjeando...' : 'Canjear codigo'}
              </Button>
              {result && <Link to="/reader/library"><Button variant="ghost">Ir a mi biblioteca</Button></Link>}
            </div>
          </form>
        </section>

        <section className="rx-panel">
          <div className="rx-panel-head">
            <div>
              <h2>Como funciona</h2>
            </div>
          </div>
          <div className="rx-steps">
            {STEPS.map((step, index) => (
              <div key={step.title} className="rx-step">
                <div className="rx-step-num">{index + 1}</div>
                <div>
                  <p><strong>{step.title}</strong>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rx-panel">
        <div className="rx-panel-head">
          <div>
            <h2>Codigos canjeados</h2>
            <p>Tu historial reciente de activaciones.</p>
          </div>
          <span className="rx-badge rx-badge-info">{redemptions.length}</span>
        </div>

        {redemptions.length === 0 ? (
          <RxEmptyState
            icon="🎟️"
            title="Aun no has canjeado codigos"
            message="Cuando actives el codigo de un libro fisico, quedara registrado aqui."
          />
        ) : (
          <div className="rx-ledger">
            {redemptions.map((redemption) => (
              <div key={redemption.id} className="rx-ledger-row">
                <div className="rx-ledger-icon" aria-hidden="true">🎟️</div>
                <div className="rx-ledger-main">
                  <strong>Codigo activado</strong>
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
