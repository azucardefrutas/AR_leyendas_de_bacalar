import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { getPostLoginPath } from '../../components/auth/RedirectAuthenticatedRoute.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { exchangeCodeForSession, getSession } from '../../services/authService.js';
import { getActiveRole, getCurrentUserRoles } from '../../services/roleService.js';

function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function completeAuthCallback() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const { error: exchangeError } = await exchangeCodeForSession(code);
        if (exchangeError) {
          if (import.meta.env.DEV) console.error('auth callback exchange error', exchangeError);
          if (active) setError('No pudimos confirmar tu correo. Intenta iniciar sesion nuevamente.');
          return;
        }
      }

      await refreshSession();
      const { data: sessionData, error: sessionError } = await getSession();
      if (sessionError) {
        if (import.meta.env.DEV) console.error('auth callback session error', sessionError);
      }

      const session = sessionData?.session;
      if (!session) {
        if (active) setError('Tu correo fue procesado. Inicia sesion para continuar.');
        return;
      }

      const [{ data: roles }, { data: activeRole }] = await Promise.all([
        getCurrentUserRoles(),
        getActiveRole(),
      ]);

      if (active) navigate(getPostLoginPath(roles ?? [], activeRole), { replace: true });
    }

    completeAuthCallback();

    return () => {
      active = false;
    };
  }, [navigate]);

  if (!error) {
    return <LoadingState message="Confirmando tu correo..." />;
  }

  return (
    <section className="auth-experience">
      <Card className="auth-card cinematic-card">
        <h2>Confirmacion de correo</h2>
        <p>{error}</p>
        <Link to="/login">
          <Button>Volver a iniciar sesion</Button>
        </Link>
      </Card>
    </section>
  );
}

export default AuthCallbackPage;
