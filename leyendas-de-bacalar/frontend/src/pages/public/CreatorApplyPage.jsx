import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useRoles } from '../../hooks/useRoles.js';
import {
  getMyCreatorStatus,
  submitCreatorApplication,
} from '../../services/creatorApplicationService.js';
import { getLoginPathForRedirect } from '../../utils/authRedirect.js';

const initialForm = {
  legalFirstName: '',
  legalLastName: '',
  penName: '',
  affiliation: '',
  city: '',
  stateRegion: '',
  country: 'Mexico',
  phone: '',
  biography: '',
  portfolioUrl: '',
  reason: '',
  acceptedCreatorTerms: false,
  acceptedCreatorPrivacy: false,
  acceptedAuthorshipDeclaration: false,
};

function getFeedback(application) {
  return application?.admin_feedback || application?.feedback || application?.review_feedback || '';
}

function hasVerifiedEmail(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

function CreatorApplyPage() {
  const { isAuthenticated, user } = useAuth();
  const { roles, loading: rolesLoading, refetchRoles } = useRoles();
  const navigate = useNavigate();
  const [statusState, setStatusState] = useState({
    application: null,
    isCreator: false,
    status: 'none',
  });
  const [statusLoading, setStatusLoading] = useState(Boolean(isAuthenticated));
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      if (!isAuthenticated) {
        setStatusLoading(false);
    
        return;
      }

      setStatusLoading(true);
      const { data, error: statusError } = await getMyCreatorStatus();
      if (!active) return;
      setStatusState(data ?? { application: null, isCreator: false, status: 'none' });
      setError(statusError?.message ?? null);
      setStatusLoading(false);
    }

    loadStatus();

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function validateForm() {
    if (!form.legalFirstName.trim() || !form.legalLastName.trim()) {
      return 'Escribe tu nombre legal y apellidos.';
    }
    if (!form.penName.trim()) {
      return 'Escribe tu nombre de autor o seudonimo.';
    }
    if (!form.city.trim() || !form.stateRegion.trim() || !form.country.trim()) {
      return 'Completa ciudad, estado y pais.';
    }
    if (!form.biography.trim() || form.biography.trim().length < 20) {
      return 'Escribe una biografia breve de al menos 20 caracteres.';
    }
    if (!form.reason.trim() || form.reason.trim().length < 10) {
      return 'Escribe un motivo de al menos 10 caracteres.';
    }
    if (!form.acceptedCreatorTerms || !form.acceptedCreatorPrivacy || !form.acceptedAuthorshipDeclaration) {
      return 'Debes aceptar los terminos, el aviso de privacidad y la declaracion de autoria.';
    }

    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    const { data, error: submitError } = await submitCreatorApplication(form);
    setSubmitting(false);

    if (submitError) {
      setError(submitError.message);
      if (data) {
        setStatusState((current) => ({
          ...current,
          application: data,
          status: data?.status ?? 'pending',
        }));
      }
      return;
    }

    if (data?.activation_status === 'activated') {
      await refetchRoles();
      setMessage('Tu perfil de creador fue activado correctamente.');
      navigate('/creator', { replace: true });
      return;
    }

    setStatusState((current) => ({
      ...current,
      application: data,
      status: data?.status ?? 'pending',
    }));
    setForm(initialForm);
    setMessage('Tu perfil de creador fue activado correctamente.');
  }

  if (!isAuthenticated) {
    return (
      <section className="legal-page creator-apply-page">
        <div className="legal-hero">
          <p className="eyebrow">Publica historias culturales</p>
          <h1>Conviertete en creador</h1>
          <p>
            Publica leyendas, relatos y experiencias culturales de Bacalar. El
            proceso requiere cuenta, correo confirmado, declaracion de derechos y terminos estrictos.
          </p>
        </div>

        <Card className="creator-apply-card">
          <div className="legal-section">
            <h2>Antes de continuar</h2>
            <p>1. Inicia sesion o crea una cuenta de lector.</p>
            <p>2. Confirma tu correo electronico.</p>
            <p>3. Completa el formulario editorial y acepta los terminos para creadores.</p>
          </div>
          <div className="actions-row">
            <Link to={getLoginPathForRedirect('/creator/apply')}>
              <Button>Iniciar sesion para continuar</Button>
            </Link>
            <Link to={`/register?redirect=${encodeURIComponent('/creator/apply')}`}>
              <Button variant="ghost">Crear cuenta</Button>
            </Link>
          </div>
        </Card>
      </section>
    );
  }

  if (rolesLoading || statusLoading) {
    return <LoadingState message="Preparando solicitud de creador..." />;
  }

  if (roles.includes('creator') || statusState.isCreator) {
    return <Navigate to="/creator" replace />;
  }

  if (roles.includes('admin')) {
    return (
      <section className="legal-page creator-apply-page">
        <Card className="creator-apply-card">
          <p className="eyebrow">Cuenta administrativa</p>
          <h1>Tu cuenta es administrativa.</h1>
          <p>Usa el panel admin para revisar solicitudes de creador y gestionar la plataforma.</p>
          <Link to="/admin">
            <Button>Ir al panel admin</Button>
          </Link>
        </Card>
      </section>
    );
  }

  if (!hasVerifiedEmail(user)) {
    return (
      <section className="legal-page creator-apply-page">
        <Card className="creator-apply-card">
          <p className="eyebrow">Correo pendiente</p>
          <h1>Confirma tu correo antes de continuar como creador.</h1>
          <p>Para activar el panel de autor necesitamos una cuenta con correo verificado. Revisa tu bandeja de entrada o spam.</p>
          <div className="actions-row">
            <Link to="/auth/check-email">
              <Button>Ver instrucciones</Button>
            </Link>
            <Link to={getLoginPathForRedirect('/creator/apply')}>
              <Button variant="ghost">Volver a iniciar sesion</Button>
            </Link>
          </div>
        </Card>
      </section>
    );
  }

  if (statusState.status === 'approved') {
    return (
      <section className="legal-page creator-apply-page">
        <Card className="creator-apply-card">
          <p className="eyebrow">Perfil activo</p>
          <h1>Tu perfil de creador ya esta activo.</h1>
          <p>Si el panel no se abre automaticamente, vuelve a iniciar sesion para refrescar tus permisos.</p>
          <div className="actions-row">
            <Link to="/creator">
              <Button>Ir al panel de creador</Button>
            </Link>
            <Link to="/reader/library">
              <Button variant="ghost">Volver a biblioteca</Button>
            </Link>
          </div>
        </Card>
      </section>
    );
  }

  if (message) {
    return (
      <section className="legal-page creator-apply-page">
        <Card className="creator-apply-card">
          <p className="eyebrow">Perfil activado</p>
          <h1>Tu perfil de creador fue activado correctamente.</h1>
          <p>{message}</p>
          <div className="actions-row">
            <Link to="/creator">
              <Button>Ir al panel de creador</Button>
            </Link>
            <Link to="/terms/creators">
              <Button variant="ghost">Ver terminos</Button>
            </Link>
          </div>
        </Card>
      </section>
    );
  }

  const rejectedFeedback = statusState.status === 'rejected' ? getFeedback(statusState.application) : '';

  return (
    <section className="legal-page creator-apply-page">
      <div className="legal-hero">
        <p className="eyebrow">Solicitud editorial</p>
        <h1>Conviertete en creador</h1>
        <p>
          Completa tu perfil editorial. El acceso de creador se activa con correo verificado,
          formulario completo y aceptacion de terminos; tus obras seguiran pasando por revision antes de publicarse.
        </p>
      </div>

      <form className="creator-apply-form" onSubmit={handleSubmit}>
        {statusState.status === 'rejected' && (
          <Card className="creator-apply-card">
            <p className="eyebrow">Solicitud rechazada</p>
            <h2>Puedes enviar una nueva propuesta.</h2>
            <p>{rejectedFeedback ? `Comentario del administrador: ${rejectedFeedback}` : 'Revisa tu informacion y fortalece tu motivo antes de reenviar.'}</p>
          </Card>
        )}

        <Card className="creator-apply-card">
          <div className="legal-section">
            <p className="eyebrow">Paso 1</p>
            <h2>Datos personales y editoriales</h2>
            <p>Estos datos formalizan tu alta como creador. No se solicitan credenciales ni documentos en esta etapa.</p>
          </div>

          <div className="form-grid">
            <label className="field" htmlFor="creator-legal-first-name">
              <span>Nombre legal</span>
              <input
                id="creator-legal-first-name"
                className="standalone-input"
                value={form.legalFirstName}
                onChange={(event) => updateField('legalFirstName', event.target.value)}
                required
              />
            </label>
            <label className="field" htmlFor="creator-legal-last-name">
              <span>Apellidos</span>
              <input
                id="creator-legal-last-name"
                className="standalone-input"
                value={form.legalLastName}
                onChange={(event) => updateField('legalLastName', event.target.value)}
                required
              />
            </label>
            <label className="field" htmlFor="creator-pen-name">
              <span>Nombre de autor / seudonimo</span>
              <input
                id="creator-pen-name"
                className="standalone-input"
                value={form.penName}
                onChange={(event) => updateField('penName', event.target.value)}
                required
              />
            </label>
            <label className="field" htmlFor="creator-affiliation">
              <span>Institucion o afiliacion</span>
              <input
                id="creator-affiliation"
                className="standalone-input"
                value={form.affiliation}
                onChange={(event) => updateField('affiliation', event.target.value)}
                placeholder="Opcional"
              />
            </label>
            <label className="field" htmlFor="creator-city">
              <span>Ciudad</span>
              <input
                id="creator-city"
                className="standalone-input"
                value={form.city}
                onChange={(event) => updateField('city', event.target.value)}
                required
              />
            </label>
            <label className="field" htmlFor="creator-state-region">
              <span>Estado</span>
              <input
                id="creator-state-region"
                className="standalone-input"
                value={form.stateRegion}
                onChange={(event) => updateField('stateRegion', event.target.value)}
                required
              />
            </label>
            <label className="field" htmlFor="creator-country">
              <span>Pais</span>
              <input
                id="creator-country"
                className="standalone-input"
                value={form.country}
                onChange={(event) => updateField('country', event.target.value)}
                required
              />
            </label>
            <label className="field" htmlFor="creator-phone">
              <span>Telefono opcional</span>
              <input
                id="creator-phone"
                className="standalone-input"
                value={form.phone}
                onChange={(event) => updateField('phone', event.target.value)}
                placeholder="Opcional"
              />
            </label>
          </div>
        </Card>

        <Card className="creator-apply-card">
          <div className="legal-section">
            <p className="eyebrow">Paso 2</p>
            <h2>Perfil creativo</h2>
          </div>
          <label className="field" htmlFor="creator-biography">
            <span>Biografia breve</span>
            <textarea
              id="creator-biography"
              className="textarea"
              value={form.biography}
              onChange={(event) => updateField('biography', event.target.value)}
              rows={4}
              required
            />
          </label>
          <label className="field" htmlFor="creator-portfolio-url">
            <span>Portafolio o enlace opcional</span>
            <input
              id="creator-portfolio-url"
              className="standalone-input"
              type="url"
              value={form.portfolioUrl}
              onChange={(event) => updateField('portfolioUrl', event.target.value)}
              placeholder="https://..."
            />
          </label>
          <label className="field" htmlFor="creator-motivation">
            <span>Motivo para ser creador</span>
            <textarea
              id="creator-motivation"
              className="textarea"
              value={form.reason}
              onChange={(event) => updateField('reason', event.target.value)}
              rows={5}
              required
            />
          </label>
        </Card>

        <Card className="creator-apply-card">
          <div className="legal-section">
            <p className="eyebrow">Paso 3</p>
            <h2>Declaraciones legales</h2>
          </div>
          <label className="legal-checkbox">
            <input
              type="checkbox"
              checked={form.acceptedCreatorTerms}
              onChange={(event) => updateField('acceptedCreatorTerms', event.target.checked)}
            />
            <span>
              Acepto los <Link to="/terms/creators">Terminos para Creadores</Link>.
            </span>
          </label>
          <label className="legal-checkbox">
            <input
              type="checkbox"
              checked={form.acceptedCreatorPrivacy}
              onChange={(event) => updateField('acceptedCreatorPrivacy', event.target.checked)}
            />
            <span>
              Acepto el <Link to="/privacy/creators">Aviso de Privacidad para Creadores</Link>.
            </span>
          </label>
          <label className="legal-checkbox">
            <input
              type="checkbox"
              checked={form.acceptedAuthorshipDeclaration}
              onChange={(event) => updateField('acceptedAuthorshipDeclaration', event.target.checked)}
            />
            <span>
              Declaro que la informacion proporcionada es veraz y que cuento o contare con los derechos necesarios sobre las obras, textos, imagenes, modelos 3D, PDFs, marcadores y recursos que publique.
            </span>
          </label>
          {error && <p className="error-message">{error}</p>}
          <div className="actions-row">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Activando perfil...' : 'Activar perfil de creador'}
            </Button>
            <Link to="/terms/creators">
              <Button variant="ghost">Revisar terminos</Button>
            </Link>
          </div>
        </Card>
      </form>
    </section>
  );
}

export default CreatorApplyPage;
