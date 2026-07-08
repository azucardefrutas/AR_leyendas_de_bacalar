import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useRoles } from '../../hooks/useRoles.js';
import {
  getLatestPendingCreatorApplication,
  getMyCreatorStatus,
  sendCreatorOnboardingEmail,
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

// Per-field validators for inline (on-blur) validation. Each returns an error
// string or null. Used both for the live progress bar and the field messages.
const FIELD_VALIDATORS = {
  legalFirstName: (v) => (v.trim() ? null : 'Escribe tu nombre legal.'),
  legalLastName: (v) => (v.trim() ? null : 'Escribe tus apellidos.'),
  penName: (v) => (v.trim() ? null : 'Escribe tu nombre de autor o seudónimo.'),
  city: (v) => (v.trim() ? null : 'Escribe tu ciudad.'),
  stateRegion: (v) => (v.trim() ? null : 'Escribe tu estado.'),
  country: (v) => (v.trim() ? null : 'Escribe tu país.'),
  biography: (v) => (v.trim().length >= 20 ? null : 'Mínimo 20 caracteres.'),
  reason: (v) => (v.trim().length >= 10 ? null : 'Mínimo 10 caracteres.'),
};

const REQUIRED_TEXT_FIELDS = Object.keys(FIELD_VALIDATORS);

const creatorBenefits = [
  { icon: '📚', title: 'Publica tus leyendas', text: 'Comparte relatos y experiencias culturales de Bacalar con lectores de toda la región.' },
  { icon: '🧊', title: 'Experiencias AR y 3D', text: 'Asocia marcadores de realidad aumentada y modelos 3D a las páginas de tus obras.' },
  { icon: '📖', title: 'Lectura interactiva', text: 'Sube tu PDF y conviértelo en un libro digital con efecto de página real.' },
  { icon: '🛡️', title: 'Tu autoría protegida', text: 'Tu obra siempre queda a tu nombre y pasa por revisión editorial antes de publicarse.' },
];

const creatorProcess = [
  { title: 'Cuenta y correo', text: 'Regístrate como lector y confirma tu correo electrónico.' },
  { title: 'Formulario editorial', text: 'Completa tus datos y acepta los términos para creadores.' },
  { title: 'Confirma por correo', text: 'Activa tu alta con el enlace que te enviamos.' },
  { title: '¡A crear!', text: 'Se abre tu panel de autor para publicar historias.' },
];

function getFeedback(application) {
  return application?.admin_feedback || application?.feedback || application?.review_feedback || '';
}

function hasVerifiedEmail(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

function getApplicationId(application) {
  return application?.id || application?.application_id || application?.applicationId || null;
}

function StateCard({ variant = '', icon, eyebrow, title, children, actions }) {
  return (
    <section className="rx capp">
      <div className={`capp-state ${variant}`}>
        {icon && <div className="capp-state-icon" aria-hidden="true">{icon}</div>}
        {eyebrow && <p className="rx-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {children}
        {actions && <div className="capp-actions">{actions}</div>}
      </div>
    </section>
  );
}

function BenefitsAside() {
  return (
    <aside className="capp-aside">
      <div className="capp-aside-panel">
        <h3>Qué obtienes como creador</h3>
        <ul className="capp-benefits">
          {creatorBenefits.map((benefit) => (
            <li key={benefit.title} className="capp-benefit">
              <span className="capp-benefit-icon" aria-hidden="true">{benefit.icon}</span>
              <span>
                <strong>{benefit.title}</strong>
                <span>{benefit.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="capp-aside-panel">
        <h3>Cómo funciona</h3>
        <ol className="capp-process">
          {creatorProcess.map((step, index) => (
            <li key={step.title}>
              <span className="capp-process-num">{index + 1}</span>
              <span>
                <strong>{step.title}</strong>
                <span>{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}

function CreatorApplyPage() {
  const { isAuthenticated, user } = useAuth();
  const { roles, loading: rolesLoading } = useRoles();
  const [statusState, setStatusState] = useState({
    application: null,
    isCreator: false,
    status: 'none',
  });
  const [statusLoading, setStatusLoading] = useState(Boolean(isAuthenticated));
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [touched, setTouched] = useState({});
  const acceptedLegalTerms =
    form.acceptedCreatorTerms &&
    form.acceptedCreatorPrivacy &&
    form.acceptedAuthorshipDeclaration;

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
          status: data?.email_status === 'failed' ? 'email_failed' : data?.status ?? 'pending',
        }));
      }
      return;
    }

    setStatusState((current) => ({
      ...current,
      application: data,
      status: data?.status ?? 'pending',
    }));
    setForm(initialForm);
    setMessage('Te enviamos un enlace para confirmar tu alta como creador. Cuando lo confirmes, tu perfil se activara automaticamente.');
  }

  async function handleResendEmail() {
    let application = statusState.application;
    let applicationId = getApplicationId(application);

    if (!applicationId) {
      const { data: pendingApplication, error: pendingError } = await getLatestPendingCreatorApplication();
      if (pendingError) {
        setError('No pudimos enviar el correo de confirmacion. Intentalo nuevamente.');
        return;
      }

      application = pendingApplication;
      applicationId = getApplicationId(pendingApplication);

      if (!applicationId) {
        setError('No encontramos una solicitud pendiente. Vuelve a enviar el formulario.');
        return;
      }
    }

    setResending(true);
    setError(null);
    setMessage(null);

    const { data, error: resendError } = await sendCreatorOnboardingEmail(applicationId);
    setResending(false);

    if (resendError) {
      setError(resendError.message || 'No pudimos enviar el correo de confirmacion. Intentalo nuevamente.');
      setStatusState((current) => ({
        ...current,
        application: {
          ...(current.application ?? {}),
          ...(application ?? {}),
          id: applicationId,
          email_status: 'failed',
        },
        status: 'email_failed',
      }));
      return;
    }

    setStatusState((current) => ({
      ...current,
      application: {
        ...(current.application ?? {}),
        ...(application ?? {}),
        id: applicationId,
        email_status: 'sent',
        resend_id: data?.resend_id || null,
      },
      status: 'pending',
    }));
    setMessage('Te enviamos un enlace para confirmar tu alta como creador. Cuando lo confirmes, tu perfil se activara automaticamente.');
  }

  if (!isAuthenticated) {
    return (
      <section className="rx capp">
        <div className="capp-hero">
          <p className="rx-eyebrow">Publica historias culturales</p>
          <h1>Conviértete en creador</h1>
          <p className="capp-hero-lead">
            Publica leyendas, relatos y experiencias culturales de Bacalar. El proceso requiere
            cuenta, correo confirmado, declaración de derechos y términos claros.
          </p>
        </div>
        <div className="capp-layout">
          <div className="capp-panel">
            <div className="capp-panel-head">
              <span className="capp-step-badge">✦</span>
              <div>
                <h2>Antes de continuar</h2>
                <p>Tres pasos rápidos para empezar.</p>
              </div>
            </div>
            <ol className="capp-process">
              <li><span className="capp-process-num">1</span><span><strong>Inicia sesión o crea una cuenta</strong><span>Necesitas una cuenta de lector para comenzar.</span></span></li>
              <li><span className="capp-process-num">2</span><span><strong>Confirma tu correo electrónico</strong><span>Verifica tu bandeja de entrada.</span></span></li>
              <li><span className="capp-process-num">3</span><span><strong>Completa el formulario editorial</strong><span>Y acepta los términos para creadores.</span></span></li>
            </ol>
            <div className="capp-actions">
              <Link to={getLoginPathForRedirect('/creator/apply')}><Button>Iniciar sesión para continuar</Button></Link>
              <Link to={`/register?redirect=${encodeURIComponent('/creator/apply')}`}><Button variant="ghost">Crear cuenta</Button></Link>
            </div>
          </div>
          <BenefitsAside />
        </div>
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
      <StateCard
        icon="🛡️"
        eyebrow="Cuenta administrativa"
        title="Tu cuenta es administrativa"
        actions={<Link to="/admin"><Button>Ir al panel admin</Button></Link>}
      >
        <p>Usa el panel admin para revisar solicitudes de creador y gestionar la plataforma.</p>
      </StateCard>
    );
  }

  if (!hasVerifiedEmail(user)) {
    return (
      <StateCard
        variant="capp-state-warn"
        icon="✉️"
        eyebrow="Correo pendiente"
        title="Confirma tu correo antes de continuar"
        actions={(
          <>
            <Link to="/auth/check-email"><Button>Ver instrucciones</Button></Link>
            <Link to={getLoginPathForRedirect('/creator/apply')}><Button variant="ghost">Volver a iniciar sesión</Button></Link>
          </>
        )}
      >
        <p>Para activar el panel de autor necesitamos una cuenta con correo verificado. Revisa tu bandeja de entrada o spam.</p>
      </StateCard>
    );
  }

  if (statusState.status === 'approved') {
    return (
      <StateCard
        variant="capp-state-ok"
        icon="🎉"
        eyebrow="Perfil activo"
        title="Tu perfil de creador ya está activo"
        actions={(
          <>
            <Link to="/creator"><Button>Ir al panel de creador</Button></Link>
            <Link to="/reader/library"><Button variant="ghost">Volver a biblioteca</Button></Link>
          </>
        )}
      >
        <p>Si el panel no se abre automáticamente, vuelve a iniciar sesión para refrescar tus permisos.</p>
      </StateCard>
    );
  }

  const applicationEmailSent = statusState.application?.email_status === 'sent';
  const shouldShowEmailSuccess = message || (statusState.status === 'pending' && applicationEmailSent);

  if (shouldShowEmailSuccess) {
    return (
      <StateCard
        variant="capp-state-ok"
        icon="📬"
        eyebrow="Correo de confirmación enviado"
        title="Revisa tu correo"
        actions={(
          <>
            <Link to="/"><Button>Volver al inicio</Button></Link>
            <Link to="/terms/creators"><Button variant="ghost">Ver términos</Button></Link>
          </>
        )}
      >
        <p>{message || 'Te enviamos un enlace para confirmar tu alta como creador. Cuando lo confirmes, tu perfil se activará automáticamente.'}</p>
      </StateCard>
    );
  }

  if (statusState.status === 'pending' || statusState.status === 'email_failed') {
    return (
      <StateCard
        variant="capp-state-warn"
        icon="📮"
        eyebrow="Confirmación pendiente"
        title="Guardamos tu solicitud"
        actions={(
          <>
            <Button onClick={handleResendEmail} disabled={resending}>
              {resending ? 'Reenviando...' : 'Reenviar correo de confirmación'}
            </Button>
            <Link to="/"><Button variant="ghost">Volver al inicio</Button></Link>
          </>
        )}
      >
        <p>Tu formulario editorial quedó registrado. Reenviaremos el correo de confirmación sin volver a enviar el formulario.</p>
        {error && <div className="rx-alert rx-alert-error">{error}</div>}
      </StateCard>
    );
  }

  const rejectedFeedback = statusState.status === 'rejected' ? getFeedback(statusState.application) : '';

  // Inline validation: only surface a field error once it has been blurred.
  const errorFor = (name) => (touched[name] && FIELD_VALIDATORS[name] ? FIELD_VALIDATORS[name](form[name]) : null);
  const markTouched = (name) => setTouched((current) => ({ ...current, [name]: true }));

  // Live completion progress across the required fields + legal checkboxes.
  const filledRequired = REQUIRED_TEXT_FIELDS.filter((name) => FIELD_VALIDATORS[name](form[name]) === null).length
    + [form.acceptedCreatorTerms, form.acceptedCreatorPrivacy, form.acceptedAuthorshipDeclaration].filter(Boolean).length;
  const totalRequired = REQUIRED_TEXT_FIELDS.length + 3;
  const progressPct = Math.round((filledRequired / totalRequired) * 100);

  function renderField(name, label, { textarea = false, type = 'text', placeholder, optional = false, colFull = false, rows = 4 } = {}) {
    const err = errorFor(name);
    const shared = {
      id: `creator-${name}`,
      value: form[name],
      onChange: (event) => updateField(name, event.target.value),
      onBlur: () => markTouched(name),
      placeholder,
      'aria-invalid': err ? 'true' : undefined,
      'aria-describedby': err ? `creator-${name}-err` : undefined,
    };
    return (
      <label className={`capp-field ${colFull ? 'capp-col-full' : ''}`} htmlFor={`creator-${name}`}>
        <span>
          {label}
          {optional ? <span className="capp-opt"> · opcional</span> : <span className="capp-req" aria-hidden="true"> *</span>}
        </span>
        {textarea ? (
          <textarea {...shared} rows={rows} className={`capp-textarea ${err ? 'capp-input-error' : ''}`} />
        ) : (
          <input {...shared} type={type} className={`capp-input ${err ? 'capp-input-error' : ''}`} />
        )}
        {err && <span className="capp-field-err" id={`creator-${name}-err`}>{err}</span>}
      </label>
    );
  }

  return (
    <section className="rx capp">
      <div className="capp-hero">
        <p className="rx-eyebrow">Solicitud editorial</p>
        <h1>Conviértete en creador</h1>
        <p className="capp-hero-lead">
          Completa tu perfil editorial. El acceso de creador se activa con correo verificado,
          formulario completo y aceptación de términos; tus obras seguirán pasando por revisión antes de publicarse.
        </p>
        <div className="capp-stepper">
          <span className="capp-step-pill"><b>1</b> Datos editoriales</span>
          <span className="capp-step-pill"><b>2</b> Perfil creativo</span>
          <span className="capp-step-pill"><b>3</b> Declaraciones</span>
        </div>
        <div className="capp-progress-wrap">
          <div className="capp-progress-head">
            <span>Progreso del formulario</span>
            <b>{progressPct}%</b>
          </div>
          <div className="capp-progress-track" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="capp-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <div className="capp-layout">
        <form className="capp-form" onSubmit={handleSubmit}>
          {statusState.status === 'rejected' && (
            <div className="rx-alert rx-alert-error">
              <strong>Solicitud rechazada.</strong>{' '}
              {rejectedFeedback ? `Comentario del administrador: ${rejectedFeedback}` : 'Revisa tu información y fortalece tu motivo antes de reenviar.'}
            </div>
          )}

          <div className="capp-panel">
            <div className="capp-panel-head">
              <span className="capp-step-badge">1</span>
              <div>
                <h2>Datos personales y editoriales</h2>
                <p>Formalizan tu alta como creador. No se piden credenciales ni documentos en esta etapa.</p>
              </div>
            </div>
            <div className="capp-grid">
              {renderField('legalFirstName', 'Nombre legal')}
              {renderField('legalLastName', 'Apellidos')}
              {renderField('penName', 'Nombre de autor / seudónimo')}
              {renderField('affiliation', 'Institución o afiliación', { optional: true, placeholder: 'Opcional' })}
              {renderField('city', 'Ciudad')}
              {renderField('stateRegion', 'Estado')}
              {renderField('country', 'País')}
              {renderField('phone', 'Teléfono', { optional: true, type: 'tel', placeholder: 'Opcional' })}
            </div>
          </div>

          <div className="capp-panel">
            <div className="capp-panel-head">
              <span className="capp-step-badge">2</span>
              <div>
                <h2>Perfil creativo</h2>
                <p>Cuéntanos quién eres y por qué quieres publicar.</p>
              </div>
            </div>
            <div className="capp-grid">
              {renderField('biography', 'Biografía breve', { textarea: true, colFull: true, rows: 4, placeholder: 'Al menos 20 caracteres' })}
              {renderField('portfolioUrl', 'Portafolio o enlace', { optional: true, colFull: true, type: 'url', placeholder: 'https://...' })}
              {renderField('reason', 'Motivo para ser creador', { textarea: true, colFull: true, rows: 5, placeholder: 'Al menos 10 caracteres' })}
            </div>
          </div>

          <div className="capp-panel">
            <div className="capp-panel-head">
              <span className="capp-step-badge">3</span>
              <div>
                <h2>Declaraciones legales</h2>
                <p>Necesarias para publicar en la plataforma.</p>
              </div>
            </div>
            <label className="capp-check">
              <input type="checkbox" checked={form.acceptedCreatorTerms} onChange={(e) => updateField('acceptedCreatorTerms', e.target.checked)} />
              <span className="capp-check-box" aria-hidden="true" />
              <span>Acepto los <Link to="/terms/creators">Términos para Creadores</Link>.</span>
            </label>
            <label className="capp-check">
              <input type="checkbox" checked={form.acceptedCreatorPrivacy} onChange={(e) => updateField('acceptedCreatorPrivacy', e.target.checked)} />
              <span className="capp-check-box" aria-hidden="true" />
              <span>Acepto el <Link to="/privacy/creators">Aviso de Privacidad para Creadores</Link>.</span>
            </label>
            <label className="capp-check">
              <input type="checkbox" checked={form.acceptedAuthorshipDeclaration} onChange={(e) => updateField('acceptedAuthorshipDeclaration', e.target.checked)} />
              <span className="capp-check-box" aria-hidden="true" />
              <span>Declaro que la información proporcionada es veraz y que cuento o contaré con los derechos necesarios sobre las obras, textos, imágenes, modelos 3D, PDFs, marcadores y recursos que publique.</span>
            </label>

            {!acceptedLegalTerms && (
              <p className="capp-hint">Debes aceptar los términos, el aviso de privacidad y la declaración de autoría para continuar.</p>
            )}
            {error && <div className="rx-alert rx-alert-error" style={{ marginTop: 12 }}>{error}</div>}

            <div className="capp-actions">
              <Button type="submit" disabled={submitting || !acceptedLegalTerms}>
                {submitting ? 'Enviando confirmación...' : 'Enviar solicitud y confirmar por correo'}
              </Button>
              <Link to="/terms/creators"><Button variant="ghost">Revisar términos</Button></Link>
            </div>
          </div>
        </form>

        <BenefitsAside />
      </div>
    </section>
  );
}

export default CreatorApplyPage;
