import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuth } from '../../hooks/useAuth.js';

function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const from = location.state?.from?.pathname ?? '/reader/library';

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn(email, password);
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    navigate(from, { replace: true });
  }

  return (
    <Card className="auth-card">
      <h1>Iniciar sesion</h1>
      <p>Accede para leer, canjear codigos y gestionar tu biblioteca.</p>
      <form className="form-stack" onSubmit={handleSubmit}>
        <Input id="email" label="Correo" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <Input id="password" label="Contrasena" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        {error && <p className="error-message">{error}</p>}
        <Button type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</Button>
      </form>
      <p>¿No tienes cuenta? <Link to="/register">Crear cuenta</Link></p>
    </Card>
  );
}

export default LoginPage;
