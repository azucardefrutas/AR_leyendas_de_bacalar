import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRoles } from '../../hooks/useRoles.js';
import {
  createCreatorApplication,
  getMyCreatorApplications,
} from '../../services/creatorService.js';
import Button from './Button.jsx';
import Card from './Card.jsx';

function CreatorApplicationCard() {
  const { roles } = useRoles();
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState({ reason: '', portfolioUrl: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const isCreator = roles.includes('creator');

  const latestApplication = applications[0];
  const pendingApplication = useMemo(
    () => applications.find((application) => application.status === 'pending'),
    [applications],
  );

  useEffect(() => {
    async function loadApplications() {
      const { data, error: applicationsError } = await getMyCreatorApplications();
      setApplications(data ?? []);
      setError(applicationsError);
      setLoading(false);
    }

    loadApplications();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const { data, error: submitError } = await createCreatorApplication(
      form.reason,
      form.portfolioUrl || null,
    );

    setSubmitting(false);

    if (submitError) {
      setError(submitError);
      return;
    }

    setApplications((current) => [data, ...current]);
    setForm({ reason: '', portfolioUrl: '' });
    setMessage('Tu solicitud esta en revision.');
  }

  if (isCreator) {
    return (
      <Card className="creator-application-card">
        <div>
          <p className="eyebrow">Autor aprobado</p>
          <h2>Ya puedes publicar historias</h2>
          <p>Accede al panel de creador para administrar tus leyendas y revisiones.</p>
        </div>
        <Link to="/creator"><Button>Ir al panel de creador</Button></Link>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="creator-application-card">
        <p>Cargando solicitudes de creador...</p>
      </Card>
    );
  }

  if (pendingApplication) {
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

  return (
    <Card className="creator-application-card">
      <div>
        <p className="eyebrow">Creador</p>
        <h2>Tienes una historia de Bacalar que compartir?</h2>
        <p>Solicita convertirte en creador. Es una solicitud discreta y sera revisada por administracion.</p>
        {latestApplication?.status === 'rejected' && (
          <p className="error-message">Tu solicitud anterior fue rechazada. Puedes enviar una nueva propuesta.</p>
        )}
      </div>

      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field" htmlFor="creator-reason">
          <span>Motivo o razon</span>
          <textarea
            id="creator-reason"
            className="textarea"
            value={form.reason}
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
          {submitting ? 'Enviando...' : 'Solicita convertirte en creador'}
        </Button>
      </form>
    </Card>
  );
}

export default CreatorApplicationCard;
