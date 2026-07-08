import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { animate, createTimeline, stagger, utils } from 'animejs';
import Button from '../../components/ui/Button.jsx';
import RxEmptyState from '../../components/reader/experience/RxEmptyState.jsx';
import { getMyCodeRedemptions, redeemCode } from '../../services/codeService.js';
import { formatDate } from '../../utils/formatters.js';

const TIPS = [
  { id: 'where', label: '¿Dónde está mi código?', text: 'Viene impreso dentro de tu edición física de Leyendas de Bacalar, normalmente en la primera o última página.' },
  { id: 'format', label: 'Formato del código', text: 'Suele tener el formato XXXX-XXXX. No distingue mayúsculas de minúsculas ni espacios.' },
  { id: 'used', label: '¿Ya lo canjeé?', text: 'Cada código se activa una sola vez. Si ya lo usaste, la leyenda ya está desbloqueada en tu biblioteca.' },
];

const SPARK_COLORS = ['#30cff2', '#3be0a4', '#f2c14e', '#049dd9', '#ffffff'];

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function RedeemCodePage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | error | success
  const [error, setError] = useState(null);
  const [redemptions, setRedemptions] = useState([]);
  const [activeTip, setActiveTip] = useState(null);

  const ticketRef = useRef(null);
  const mainRef = useRef(null);
  const stubRef = useRef(null);
  const lockRef = useRef(null);
  const stageRef = useRef(null);

  async function loadHistory() {
    const { data } = await getMyCodeRedemptions();
    setRedemptions((data ?? []).slice(0, 10));
  }

  useEffect(() => {
    loadHistory();
  }, []);

  // Entrance: the ticket springs up into place.
  useEffect(() => {
    if (!ticketRef.current || prefersReducedMotion()) return;
    animate(ticketRef.current, {
      opacity: [0, 1],
      translateY: [24, 0],
      scale: [0.965, 1],
      duration: 560,
      ease: 'outExpo',
    });
  }, []);

  function spawnConfetti() {
    const stage = stageRef.current;
    if (!stage || prefersReducedMotion()) return;
    const sparks = Array.from({ length: 16 }, (_, i) => {
      const s = document.createElement('span');
      s.className = 'rx-spark';
      s.style.background = SPARK_COLORS[i % SPARK_COLORS.length];
      stage.appendChild(s);
      return s;
    });
    animate(sparks, {
      translateX: () => utils.random(-150, 150),
      translateY: () => utils.random(-120, 96),
      rotate: () => utils.random(-200, 200),
      scale: [{ to: 1.15, duration: 120 }, { to: 0, duration: 460 }],
      opacity: [{ to: 1, duration: 60 }, { to: 0, duration: 480 }],
      duration: 620,
      delay: stagger(10),
      ease: 'outExpo',
      onComplete: () => sparks.forEach((s) => s.remove()),
    });
  }

  // Animate on state change.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (status === 'error' && ticketRef.current) {
      const tl = createTimeline();
      tl.add(ticketRef.current, {
        translateX: [0, -8, 8, -5, 5, -2, 0],
        duration: 360,
        ease: 'inOutSine',
      }, 0);
      tl.add(mainRef.current, { translateX: -16, translateY: 10, rotate: -6, duration: 460, ease: 'outBack' }, 290);
      tl.add(stubRef.current, { translateX: 16, translateY: 12, rotate: 8, duration: 460, ease: 'outBack' }, 290);
    } else if (status === 'success') {
      utils.set([mainRef.current, stubRef.current], { translateX: 0, translateY: 0, rotate: 0 });
      const tl = createTimeline();
      tl.add(ticketRef.current, { scale: [1, 1.03, 1], duration: 520, ease: 'outQuad' }, 0);
      if (lockRef.current) {
        tl.add(lockRef.current, { rotate: [0, -12, 0], scale: [1, 1.32, 1.14], duration: 640, ease: 'outElastic(1, .5)' }, 90);
      }
      spawnConfetti();
    }
  }, [status]);

  function handleCodeChange(value) {
    setCode(value);
    if (status === 'error') {
      setStatus('idle');
      setError(null);
      if (!prefersReducedMotion() && mainRef.current) {
        animate([mainRef.current, stubRef.current], {
          translateX: 0, translateY: 0, rotate: 0,
          duration: 460, ease: 'outElastic(1, .62)',
        });
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading || !code.trim()) return;
    setLoading(true);
    setError(null);

    const { error: redeemError } = await redeemCode(code.trim());
    setLoading(false);

    if (redeemError) {
      setStatus('error');
      setError(redeemError.message);
      return;
    }

    setStatus('success');
    loadHistory();
  }

  const ticketClass =
    status === 'success' ? 'rx-ticket rx-ticket-unlocked'
      : status === 'error' ? 'rx-ticket rx-ticket-broken'
        : 'rx-ticket';

  return (
    <div className="rx rx-page">
      <header className="rx-redeem-center">
        <p className="rx-eyebrow">Activación</p>
        <h1 className="rx-title">Canjear código</h1>
        <p className="rx-sub">
          Convierte tu libro físico en una experiencia interactiva: ingresa el código único de tu
          edición para desbloquear la leyenda.
        </p>
      </header>

      <section className="rx-panel">
        <div className="rx-ticket-stage" ref={stageRef}>
          <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
            <div className={ticketClass} ref={ticketRef} aria-live="polite">
              <div className="rx-ticket-piece rx-ticket-main" ref={mainRef}>
                <span className="rx-ticket-eyebrow">Boleto de acceso</span>
                <span className="rx-ticket-brand">Leyendas de Bacalar</span>
                <input
                  className="rx-ticket-code"
                  value={code}
                  onChange={(event) => handleCodeChange(event.target.value)}
                  placeholder="XXXX-XXXX"
                  aria-label="Código de activación"
                  disabled={status === 'success'}
                  required
                />
                <span className="rx-ticket-hint">Lo encuentras impreso dentro de tu edición física.</span>
              </div>
              <div className="rx-ticket-piece rx-ticket-stub" ref={stubRef}>
                <span className="rx-ticket-stub-lock" ref={lockRef} aria-hidden="true">{status === 'success' ? '🔓' : '🔒'}</span>
              </div>
            </div>

            {status === 'error' && error && (
              <div className="rx-alert rx-alert-error" style={{ maxWidth: 420 }}>{error}</div>
            )}
            {status === 'success' && (
              <div className="rx-alert rx-alert-ok" style={{ maxWidth: 420 }}>
                ¡Boleto validado! La leyenda se desbloqueó en tu biblioteca.
              </div>
            )}

            <div className="rx-head-actions" style={{ justifyContent: 'center' }}>
              {status === 'success' ? (
                <>
                  <Link to="/reader/library"><Button>Ir a mi biblioteca</Button></Link>
                  <Button variant="ghost" onClick={() => { setStatus('idle'); setCode(''); }}>Canjear otro código</Button>
                </>
              ) : (
                <Button type="submit" disabled={loading || !code.trim()}>
                  {loading ? 'Validando...' : 'Canjear código'}
                </Button>
              )}
            </div>
          </form>
        </div>

        <div style={{ marginTop: 22 }}>
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
