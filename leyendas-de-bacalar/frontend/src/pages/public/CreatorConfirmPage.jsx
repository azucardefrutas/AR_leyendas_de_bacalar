import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useRoles } from '../../hooks/useRoles.js';
import { confirmCreatorOnboarding } from '../../services/creatorApplicationService.js';
import { getLoginPathForRedirect } from '../../utils/authRedirect.js';

// The confirmation link works from the email regardless of session state: the RPC is
// token-only (the single-use, expiring token was emailed only to the applicant). So we
// confirm as soon as we have a token — we don't force a login first (email links often
// open logged out / after the session expired, which used to silently break the flow).
function CreatorConfirmPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { refetchRoles } = useRoles();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const attemptedRef = useRef(false);
  const [state, setState] = useState({ loading: true, status: 'idle', message: '' });

  useEffect(() => {
    let active = true;
    let redirectTimer;

    async function confirmToken() {
      // Wait for the auth state to settle only so we can pick the right post-success step
      // (redirect vs "sign in to enter"). The confirm itself needs no session.
      if (authLoading) return;
      if (attemptedRef.current) return;

      if (!token) {
        setState({ loading: false, status: 'error', message: 'El enlace de confirmacion no es valido.' });
        return;
      }

      attemptedRef.current = true;
      setState({ loading: true, status: 'idle', message: '' });

      const { error } = await confirmCreatorOnboarding(token);
      if (!active) return;

      if (error) {
        setState({ loading: false, status: 'error', message: error.message || 'No pudimos confirmar tu alta como creador.' });
        return;
      }

      if (isAuthenticated) {
        await refetchRoles();
        if (!active) return;
        setState({ loading: false, status: 'success', message: 'Tu perfil de creador fue activado correctamente.' });
        redirectTimer = setTimeout(() => navigate('/creator', { replace: true }), 1200);
      } else {
        setState({
          loading: false,
          status: 'success-login',
          message: 'Tu alta como creador fue confirmada. Inicia sesion para entrar al panel de autor.',
        });
      }
    }

    confirmToken();

    return () => {
      active = false;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [authLoading, isAuthenticated, navigate, refetchRoles, token]);

  if (authLoading || state.loading) {
    return <LoadingState message="Confirmando alta como creador..." />;
  }

  const isSuccess = state.status === 'success' || state.status === 'success-login';

  return (
    <section className="legal-page creator-apply-page">
      <Card className="creator-apply-card">
        <p className="eyebrow">{isSuccess ? 'Perfil activado' : 'No pudimos confirmar'}</p>
        <h1>{isSuccess ? 'Tu perfil de creador fue activado' : 'El enlace no pudo confirmarse.'}</h1>
        <p>{state.message}</p>
        <div className="actions-row">
          {state.status === 'success' ? (
            <Link to="/creator"><Button>Ir al panel de creador</Button></Link>
          ) : state.status === 'success-login' ? (
            <Link to={getLoginPathForRedirect('/creator')}><Button>Iniciar sesion para entrar</Button></Link>
          ) : (
            <Link to="/creator/apply"><Button>Volver a solicitud de creador</Button></Link>
          )}
          <Link to="/reader/library"><Button variant="ghost">Volver a biblioteca</Button></Link>
        </div>
      </Card>
    </section>
  );
}

export default CreatorConfirmPage;
