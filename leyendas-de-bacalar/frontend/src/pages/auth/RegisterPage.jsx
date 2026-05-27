import React from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getRoleHomePath } from '../../components/auth/RedirectAuthenticatedRoute.jsx';
import { getActiveRole, getCurrentUserRoles } from '../../services/roleService.js';

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
      const [{ data: roles }, { data: activeRole }] = await Promise.all([
        getCurrentUserRoles(),
        getActiveRole(),
      ]);
      navigate(getRoleHomePath(roles ?? [], activeRole), { replace: true });
      return;
    }

    setMessage('Cuenta creada. Revisa tu correo si Supabase requiere confirmacion.');
  }

  return (
    <section className="auth-experience register-experience">
      <div className="auth-copy">
        <Link className="auth-brand" to="/">
          <img src="/assets/Logo de la Upb.png" alt="" />
          <span>Leyendas<br />de Bacalar</span>
        </Link>
        <p className="eyebrow">Biblioteca cultural</p>
        <h1>Crea tu cuenta y abre la puerta a las historias de <strong>Bacalar.</strong></h1>
        <p>Tu perfil guardara accesos, codigos canjeados y progreso de lectura cuando el contenido este disponible.</p>
      </div>

      <Card className="auth-card cinematic-card">
        <h2>Crear cuenta</h2>
        <p>Registrate con correo y contrasena para empezar tu biblioteca cultural.</p>
        <form className="form-stack" onSubmit={handleSubmit}>
          <Input
            id="name"
            icon="+"
            label="Nombre"
            placeholder="Tu nombre"
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            required
          />
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
          {error && <p className="error-message auth-alert">{error}</p>}
          {message && <p className="success-message auth-alert">{message}</p>}
          <Button className="btn-wide" type="submit" disabled={loading}>
            {loading ? 'Creando...' : 'Crear cuenta'}
          </Button>
        </form>
        <p className="auth-switch">Ya tienes cuenta? <Link to="/login">Iniciar sesion</Link></p>
      </Card>
    </section>
  );
}

export default RegisterPage;
