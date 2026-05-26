import React, { useEffect, useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import {
  createCodeRequest,
  getMyCodeRequests,
  getMyLegends,
} from '../../services/creatorService.js';

function CodeRequestsPage() {
  const [legends, setLegends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({ legendId: '', quantity: 25, reason: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    async function loadData() {
      const [legendsResult, requestsResult] = await Promise.all([
        getMyLegends(),
        getMyCodeRequests(),
      ]);

      setLegends(legendsResult.data ?? []);
      setRequests(requestsResult.data ?? []);
      setForm((current) => ({ ...current, legendId: legendsResult.data?.[0]?.id || '' }));
      setError(legendsResult.error || requestsResult.error);
      setLoading(false);
    }

    loadData();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const { data, error: submitError } = await createCodeRequest(
      form.legendId,
      form.quantity,
      form.reason,
    );

    setSubmitting(false);

    if (submitError) {
      setError(submitError);
      return;
    }

    setRequests((current) => [data, ...current]);
    setForm((current) => ({ ...current, quantity: 25, reason: '' }));
    setMessage('Solicitud enviada a administracion.');
  }

  if (loading) return <LoadingState message="Cargando solicitudes..." />;

  return (
    <section className="page-stack creator-panel">
      <div>
        <p className="eyebrow">Edicion fisica</p>
        <h1>Solicitudes de codigos</h1>
        <p className="state-message">Los creadores solicitan codigos; solo administracion puede generar lotes.</p>
      </div>

      {error && <p className="error-message">{error.message}</p>}
      {message && <p className="success-message">{message}</p>}

      <Card>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field" htmlFor="code-legend">
            <span>Leyenda propia</span>
            <select
              id="code-legend"
              className="select"
              value={form.legendId}
              onChange={(event) => updateField('legendId', event.target.value)}
              required
            >
              {legends.length === 0 && <option value="">Sin leyendas disponibles</option>}
              {legends.map((legend) => <option key={legend.id} value={legend.id}>{legend.title}</option>)}
            </select>
          </label>
          <label className="field" htmlFor="code-quantity">
            <span>Cantidad</span>
            <input
              id="code-quantity"
              className="input standalone-input"
              type="number"
              min="1"
              value={form.quantity}
              onChange={(event) => updateField('quantity', event.target.value)}
              required
            />
          </label>
          <label className="field form-span-2" htmlFor="code-reason">
            <span>Razon</span>
            <textarea
              id="code-reason"
              className="textarea"
              rows={4}
              value={form.reason}
              onChange={(event) => updateField('reason', event.target.value)}
              placeholder="Ejemplo: primera edicion fisica para presentacion escolar."
              required
            />
          </label>
          <div className="form-actions form-span-2">
            <Button type="submit" disabled={submitting || legends.length === 0}>
              {submitting ? 'Enviando...' : 'Solicitar codigos'}
            </Button>
          </div>
        </form>
      </Card>

      <div className="creator-list-grid">
        {requests.length === 0 ? (
          <Card><h2>Sin solicitudes</h2><p>Aun no has solicitado codigos para ediciones fisicas.</p></Card>
        ) : requests.map((request) => (
          <Card key={request.id}>
            <span className="badge">{request.status || 'pending'}</span>
            <h2>{request.legends?.title || 'Leyenda'}</h2>
            <p>Cantidad solicitada: {request.quantity}</p>
            <p>{request.reason}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default CodeRequestsPage;
