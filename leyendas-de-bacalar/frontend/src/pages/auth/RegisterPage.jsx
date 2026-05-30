import React from 'react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuth } from '../../hooks/useAuth.js';

function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!acceptedTerms) {
      setError('Debes aceptar los terminos y el aviso de privacidad para continuar.');
      return;
    }

    // TODO: guardar aceptacion de terminos cuando exista la tabla legal_acceptances.
    setLoading(true);
    const result = await signUp(form.email, form.password);
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    navigate('/auth/check-email', { replace: true, state: { email: form.email } });
  }

  const loginPath = searchParams.toString() ? `/login?${searchParams.toString()}` : '/login';

  return (
    <section className="auth-experience register-experience">
      <div className="auth-copy">
        <Link className="auth-brand" to="/">
          <img src="/assets/Logo de la Upb.png" alt="" />
          <span>Leyendas<br />de Bacalar</span>
        </Link>
        <p className="eyebrow">Biblioteca cultural</p>
        <h1>Crea tu cuenta y abre la puerta a las historias de <strong>Bacalar.</strong></h1>
        <p>Crea tu cuenta con tu correo electronico para guardar tu biblioteca, canjear codigos y acceder a funciones personalizadas.</p>
      </div>

      <Card className="auth-card cinematic-card">
        <h2>Crear cuenta</h2>
        <p>Registrate solo con correo y contrasena. Los datos editoriales se solicitan aparte si decides convertirte en creador.</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <Input
            id="email"
            icon="@"
            label="Correo electronico"
            type="email"
            placeholder="tu@email.com"
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
            required
          />
          <Input
            id="password"
            icon="*"
            label="Contrasena"
            type="password"
            placeholder="Minimo 6 caracteres"
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            required
          />
          <label className="legal-checkbox auth-legal-checkbox">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(event) => {
                setAcceptedTerms(event.target.checked);
                if (event.target.checked && error === 'Debes aceptar los terminos y el aviso de privacidad para continuar.') {
                  setError(null);
                }
              }}
            />
            <span>
              He leido y acepto los <Link to="/terms/readers">Terminos para Lectores</Link> y el <Link to="/privacy/readers">Aviso de Privacidad</Link>.
            </span>
          </label>
          {error && <p className="error-message auth-alert">{error}</p>}
          {message && <p className="success-message auth-alert">{message}</p>}
          <Button className="btn-wide" type="submit" disabled={loading}>
            {loading ? 'Creando...' : 'Crear cuenta'}
          </Button>
        </form>
        <p className="auth-switch">Ya tienes cuenta? <Link to={loginPath}>Iniciar sesion</Link></p>
      </Card>
    </section>
  );
}

export default RegisterPage;
