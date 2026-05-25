import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuth } from '../../hooks/useAuth.js';

function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await signUp(form.email, form.password, { full_name: form.name });
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (result.data?.session) {
      navigate('/reader/library', { replace: true });
      return;
    }

    setMessage('Cuenta creada. Revisa tu correo si Supabase requiere confirmacion.');
  }

  return (
    <Card className="auth-card">
      <h1>Crear cuenta</h1>
      <p>Registrate para empezar tu biblioteca cultural.</p>
      <form className="form-stack" onSubmit={handleSubmit}>
        <Input id="name" label="Nombre" value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
        <Input id="email" label="Correo" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} required />
        <Input id="password" label="Contrasena" type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} required />
        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}
        <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Registrarme'}</Button>
      </form>
      <p>¿Ya tienes cuenta? <Link to="/login">Iniciar sesion</Link></p>
    </Card>
  );
}

export default RegisterPage;
