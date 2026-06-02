import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useRoles } from '../../hooks/useRoles.js';
import { confirmCreatorOnboarding } from '../../services/creatorApplicationService.js';
import { getLoginPathForRedirect } from '../../utils/authRedirect.js';

function CreatorConfirmPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { refetchRoles } = useRoles();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [state, setState] = useState({
    loading: Boolean(isAuthenticated),
    status: 'idle',
    message: '',
  });

  useEffect(() => {
    let active = true;
    let redirectTimer;

    async function confirmToken() {
      if (authLoading || !isAuthenticated) return;

      if (!token) {
        setState({
          loading: false,
          status: 'error',
          message: 'El enlace de confirmacion no es valido.',
        });
        return;
      }

      setState({ loading: true, status: 'idle', message: '' });
      const { error } = await confirmCreatorOnboarding(token);

      if (!active) return;

      if (error) {
        setState({
          loading: false,
          status: 'error',
          message: error.message || 'No pudimos confirmar tu alta como creador.',
        });
        return;
      }

      await refetchRoles();
      if (!active) return;

      setState({
        loading: false,
        status: 'success',
        message: 'Tu perfil de creador fue activado correctamente.',
      });
      redirectTimer = setTimeout(() => navigate('/creator', { replace: true }), 1200);
    }

    confirmToken();

    return () => {
      active = false;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [authLoading, isAuthenticated, navigate, refetchRoles, token]);

  if (authLoading) {
    return <LoadingState message="Validando sesion..." />;
  }

  if (!isAuthenticated) {
    const redirectPath = `${location.pathname}${location.search}`;
    return (
      <section className="legal-page creator-apply-page">
        <Card className="creator-apply-card">
          <p className="eyebrow">Inicia sesion</p>
          <h1>Confirma tu alta como creador</h1>
          <p>Para usar este enlace necesitas iniciar sesion con la misma cuenta que envio el formulario editorial.</p>
          <Link to={getLoginPathForRedirect(redirectPath)}>
            <Button>Iniciar sesion para confirmar</Button>
          </Link>
        </Card>
      </section>
    );
  }

  if (state.loading) {
    return <LoadingState message="Confirmando alta como creador..." />;
  }

  return (
    <section className="legal-page creator-apply-page">
      <Card className="creator-apply-card">
        <p className="eyebrow">{state.status === 'success' ? 'Perfil activado' : 'No pudimos confirmar'}</p>
        <h1>{state.status === 'success' ? 'Tu perfil de creador fue activado correctamente.' : 'El enlace no pudo confirmarse.'}</h1>
        <p>{state.message}</p>
        <div className="actions-row">
          {state.status === 'success' ? (
            <Link to="/creator">
              <Button>Ir al panel de creador</Button>
            </Link>
          ) : (
            <Link to="/creator/apply">
              <Button>Volver a solicitud de creador</Button>
            </Link>
          )}
          <Link to="/reader/library">
            <Button variant="ghost">Volver a biblioteca</Button>
          </Link>
        </div>
      </Card>
    </section>
  );
}

export default CreatorConfirmPage;
