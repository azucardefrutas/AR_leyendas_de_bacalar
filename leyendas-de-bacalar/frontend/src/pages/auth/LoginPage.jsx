import React from 'react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getPostLoginPath } from '../../components/auth/RedirectAuthenticatedRoute.jsx';
import { getActiveRole, getCurrentUserRoles } from '../../services/roleService.js';
import { getSafeRedirect } from '../../utils/authRedirect.js';

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function getFriendlyLoginError(authError) {
    const message = String(authError?.message || '').toLowerCase();
    if (message.includes('email not confirmed') || message.includes('not confirmed') || message.includes('confirm')) {
      return 'Debes confirmar tu correo antes de iniciar sesion. Revisa tu bandeja de entrada.';
    }
    return authError?.message || 'No pudimos iniciar sesion. Intenta nuevamente.';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn(email, password);
    setLoading(false);

    if (result.error) {
      setError(getFriendlyLoginError(result.error));
      return;
    }

    const [{ data: roles }, { data: activeRole }] = await Promise.all([
      getCurrentUserRoles(),
      getActiveRole(),
    ]);
    navigate(getPostLoginPath(roles ?? [], activeRole, getSafeRedirect(searchParams)), { replace: true });
  }

  const registerPath = searchParams.toString() ? `/register?${searchParams.toString()}` : '/register';

  return (
    <section className="auth-experience">
      <div className="auth-copy">
        <Link className="auth-brand" to="/">
          <img src="/assets/Logo de la Upb.png" alt="" />
          <span>Leyendas<br />de Bacalar</span>
        </Link>
        <p className="eyebrow">Descubre nuestra cultura</p>
        <h1>Explora las leyendas, mitos y relatos que dan vida a <strong>Bacalar.</strong></h1>
        <p>Inicia sesion para continuar tu aventura o crea una cuenta para descubrir mas.</p>
      </div>

      <Card className="auth-card cinematic-card">
        <h2>Iniciar sesion</h2>
        <p>Accede con tu correo para leer, canjear codigos y gestionar tu biblioteca.</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <Input
            id="email"
            icon="@"
            label="Correo electronico"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Input
            id="password"
            icon="*"
            label="Contrasena"
            type="password"
            placeholder="********"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && <p className="error-message auth-alert">{error}</p>}
          <Button className="btn-wide" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Iniciar sesion'}
          </Button>
        </form>

        <div className="social-divider"><span>o continua con</span></div>
        <div className="social-row">
          <button type="button" disabled title="Proximamente">Google</button>
          <button type="button" disabled title="Proximamente">Facebook</button>
          <button type="button" disabled title="Proximamente">Apple</button>
        </div>

        <p className="auth-switch">No tienes cuenta? <Link to={registerPath}>Registrate aqui</Link></p>
      </Card>
    </section>
  );
}

export default LoginPage;
