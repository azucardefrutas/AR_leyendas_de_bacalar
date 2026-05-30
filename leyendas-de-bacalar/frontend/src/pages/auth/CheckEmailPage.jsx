import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';

function CheckEmailPage() {
  const location = useLocation();
  const email = location.state?.email;

  return (
    <section className="auth-experience">
      <div className="auth-copy">
        <Link className="auth-brand" to="/">
          <img src="/assets/Logo de la Upb.png" alt="" />
          <span>Leyendas<br />de Bacalar</span>
        </Link>
        <p className="eyebrow">Cuenta creada</p>
        <h1>Confirma tu correo</h1>
        <p>Te enviamos un enlace para activar tu cuenta. Revisa tu bandeja de entrada o spam.</p>
      </div>

      <Card className="auth-card cinematic-card">
        <h2>Revisa tu correo</h2>
        <p>
          {email
            ? `Enviamos el enlace de confirmacion a ${email}.`
            : 'Enviamos un enlace de confirmacion a tu correo.'}
        </p>
        <p>Cuando confirmes tu cuenta, podras iniciar sesion y continuar explorando Leyendas de Bacalar.</p>
        <Link to="/login">
          <Button className="btn-wide">Volver a iniciar sesion</Button>
        </Link>
      </Card>
    </section>
  );
}

export default CheckEmailPage;
