import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getMyCreatorStatus,
  submitCreatorApplication,
} from '../../../services/creatorApplicationService.js';
import Button from '../../ui/Button.jsx';
import Card from '../../ui/Card.jsx';

function getFeedback(application) {
  return application?.admin_feedback || application?.feedback || application?.review_feedback || '';
}

function CreatorRequestCard() {
  const [state, setState] = useState({
    application: null,
    isCreator: false,
    status: 'none',
  });
  const [form, setForm] = useState({ reason: '', portfolioUrl: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  async function loadStatus() {
    setLoading(true);
    const { data, error: statusError } = await getMyCreatorStatus();
    setState(data ?? { application: null, isCreator: false, status: 'none' });
    setError(statusError);
    setLoading(false);
  }

  useEffect(() => {
    loadStatus();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const { data, error: submitError } = await submitCreatorApplication({
      reason: form.reason,
      portfolioUrl: form.portfolioUrl,
    });

    setSubmitting(false);

    if (submitError) {
      setError(submitError);
      return;
    }

    setState((current) => ({
      ...current,
      application: data,
      status: data?.status ?? 'pending',
    }));
    setForm({ reason: '', portfolioUrl: '' });
    setMessage('Tu solicitud esta en revision.');
  }

  if (loading) {
    return (
      <Card className="creator-application-card">
        <p>Cargando estado de solicitud...</p>
      </Card>
    );
  }

  if (state.isCreator || state.status === 'creator') {
    return (
      <Card className="creator-application-card">
        <div>
          <p className="eyebrow">Creador aprobado</p>
          <h2>Ya tienes acceso como creador</h2>
          <p>Administra leyendas, recursos y revisiones desde tu panel editorial.</p>
        </div>
        <Link to="/creator"><Button>Ir al panel de creador</Button></Link>
      </Card>
    );
  }

  if (state.status === 'pending') {
    return (
      <Card className="creator-application-card">
        <div>
          <p className="eyebrow">Solicitud enviada</p>
          <h2>Tu solicitud esta en revision.</h2>
          <p>El equipo administrador revisara tu propuesta antes de activar el panel de creador.</p>
        </div>
      </Card>
    );
  }

  if (state.status === 'approved') {
    return (
      <Card className="creator-application-card">
        <div>
          <p className="eyebrow">Solicitud aprobada</p>
          <h2>Tu solicitud fue aprobada.</h2>
          <p>Actualiza tu sesion si aun no ves el panel editorial disponible.</p>
        </div>
        <Link to="/creator"><Button>Ir al panel de creador</Button></Link>
      </Card>
    );
  }

  const rejectedFeedback = state.status === 'rejected' ? getFeedback(state.application) : '';

  return (
    <Card className="creator-application-card">
      <div>
        <p className="eyebrow">Creador</p>
        <h2>Tienes una leyenda de Bacalar que compartir?</h2>
        <p>Solicita convertirte en creador para publicar historias, recursos y experiencias culturales.</p>
        {state.status === 'rejected' && (
          <p className="error-message">
            Tu solicitud fue rechazada. {rejectedFeedback ? `Comentario: ${rejectedFeedback}` : 'Puedes enviar una nueva propuesta.'}
          </p>
        )}
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field" htmlFor="creator-reason">
          <span>Motivo o razon</span>
          <textarea
            id="creator-reason"
            className="textarea"
            value={form.reason}
            minLength={10}
            onChange={(event) => updateField('reason', event.target.value)}
            placeholder="Cuenta brevemente que historia quieres compartir y por que es importante para Bacalar."
            rows={4}
            required
          />
        </label>
        <label className="field" htmlFor="creator-portfolio">
          <span>Portfolio URL opcional</span>
          <input
            id="creator-portfolio"
            className="input standalone-input"
            type="url"
            value={form.portfolioUrl}
            onChange={(event) => updateField('portfolioUrl', event.target.value)}
            placeholder="https://..."
          />
        </label>
        {error && <p className="error-message">{error.message}</p>}
        {message && <p className="success-message">{message}</p>}
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Enviando...' : 'Solicitar ser creador'}
        </Button>
      </form>
    </Card>
  );
}

export default CreatorRequestCard;
