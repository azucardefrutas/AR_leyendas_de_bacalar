import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';

import { getPublicSystemSettings } from '../../services/backendApiService.js';
import {
  SITE_ACCESS_MODES,
  getSiteAccessDecision,
  normalizeSiteAccess,
} from '../../services/siteAccessPolicy.js';
import AppIcon from '../ui/AppIcon.jsx';
import LoadingState from '../ui/LoadingState.jsx';

const ADMIN_URL = import.meta.env.VITE_ADMIN_URL || 'https://admin.bacalarlegends-ar.com';

function RestrictedSite({ mode, message, onRetry, unavailable = false }) {
  const catalogOnly = mode === SITE_ACCESS_MODES.CATALOG_ONLY;
  const title = unavailable
    ? 'No se pudo verificar el acceso'
    : catalogOnly
      ? 'Contenido interactivo pausado'
      : 'Plataforma no disponible';
  const description = message || (catalogOnly
    ? 'El catalogo permanece visible, pero la lectura, el visor y la experiencia AR estan temporalmente deshabilitados.'
    : 'El acceso publico se encuentra temporalmente cerrado.');

  return (
    <main className="site-access-shell">
      <section className="site-access-panel" aria-labelledby="site-access-title">
        <span className="site-access-icon" aria-hidden="true">
          <AppIcon name={unavailable ? 'cloud_off' : 'lock'} size={32} />
        </span>
        <p className="site-access-kicker">Leyendas de Bacalar</p>
        <h1 id="site-access-title">{title}</h1>
        <p>{description}</p>
        <div className="site-access-actions">
          {catalogOnly && <Link to="/catalog">Volver al catalogo</Link>}
          {unavailable && (
            <button type="button" onClick={onRetry}>
              <AppIcon name="refresh" size={18} /> Reintentar
            </button>
          )}
        </div>
      </section>
    </main>
  );
}

export default function SiteAccessGuard() {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, access: null, error: '' });
  const hasLoadedRef = useRef(false);

  const loadAccess = useCallback(async ({ silent = false } = {}) => {
    // Solo la PRIMERA carga bloquea con el preloader. Las revalidaciones (al cambiar de
    // ruta) corren en silencio para no tapar la pantalla ni parpadear.
    if (!silent) setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const response = await getPublicSystemSettings();
      setState({ loading: false, access: normalizeSiteAccess(response?.settings?.site_access), error: '' });
    } catch {
      // En una revalidacion silenciosa conservamos el acceso ya conocido: un chequeo de
      // fondo que falle NO debe echar al usuario ni mostrar el error a media navegacion.
      setState((current) => ({
        loading: false,
        access: current.access,
        error: current.access ? '' : 'La plataforma no respondio. Intenta nuevamente.',
      }));
    }
  }, []);

  useEffect(() => {
    loadAccess({ silent: hasLoadedRef.current });
    hasLoadedRef.current = true;
  }, [loadAccess, location.pathname]);

  if (state.loading) return <LoadingState message="Verificando disponibilidad..." />;

  const decision = getSiteAccessDecision({
    mode: state.access?.mode,
    pathname: location.pathname,
    hostname: window.location.hostname,
    adminUrl: ADMIN_URL,
  });

  if (decision.action === 'redirect') return <Navigate to={decision.to} replace />;
  if (decision.action === 'allow' && state.access) return <Outlet />;
  if (!state.access) {
    const recoveryDecision = getSiteAccessDecision({
      mode: SITE_ACCESS_MODES.CLOSED,
      pathname: location.pathname,
      hostname: window.location.hostname,
      adminUrl: ADMIN_URL,
    });
    if (recoveryDecision.action === 'redirect') return <Navigate to={recoveryDecision.to} replace />;
    if (recoveryDecision.action === 'allow') return <Outlet />;
    return <RestrictedSite unavailable message={state.error} onRetry={loadAccess} />;
  }

  return <RestrictedSite mode={decision.mode} message={state.access.message} />;
}
