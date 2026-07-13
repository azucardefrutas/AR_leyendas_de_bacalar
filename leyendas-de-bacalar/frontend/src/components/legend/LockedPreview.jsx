import React from 'react';
import { Link } from 'react-router-dom';

// Streaming-style paywall for a locked legend. Shows ONLY safe, public metadata
// (cover + synopsis) fading out under a blurred veil with a lock and an unlock CTA
// tailored to the legend's access_type. The real story content is never fetched for
// locked legends, so nothing leaks to the client — this is presentation over an
// already-enforced gate (backend 403 + RLS).
const ACCESS_META = {
  paid: {
    title: 'Contenido premium',
    desc: 'Compra esta leyenda para leerla completa y ver sus modelos 3D y AR.',
    cta: 'Comprar leyenda',
    icon: 'shopping_cart',
  },
  subscription: {
    title: 'Solo para suscriptores',
    desc: 'Suscríbete para acceder a esta y a todas las leyendas del catálogo.',
    cta: 'Ver suscripción',
    icon: 'workspace_premium',
  },
  code_required: {
    title: 'Requiere el libro físico',
    desc: 'Activa el código de tu libro para desbloquear la lectura interactiva.',
    cta: 'Canjear código',
    icon: 'redeem',
  },
  mixed: {
    title: 'Contenido bloqueado',
    desc: 'Desbloquéala con una compra, tu suscripción o el código de tu libro físico.',
    cta: 'Ver formas de acceso',
    icon: 'lock_open',
  },
};

export default function LockedPreview({
  accessType = 'paid',
  coverUrl = '',
  synopsis = '',
  onUnlock,
  isAuthenticated = false,
  loginPath = '/auth/login',
}) {
  const meta = ACCESS_META[accessType] || ACCESS_META.paid;
  return (
    <div className="locked-preview" style={coverUrl ? { '--lp-cover': `url("${coverUrl}")` } : undefined}>
      <div className="locked-preview__peek" aria-hidden={false}>
        {synopsis && <p className="locked-preview__synopsis">{synopsis}</p>}
        <div className="locked-preview__skeleton" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => <span key={i} />)}
        </div>
        <div className="locked-preview__fade" aria-hidden="true" />
      </div>

      <div className="locked-preview__gate" role="group" aria-label="Contenido bloqueado">
        <span className="locked-preview__lock material-symbols-rounded" aria-hidden="true">lock</span>
        <strong className="locked-preview__title">{meta.title}</strong>
        <p className="locked-preview__desc">{meta.desc}</p>
        {isAuthenticated ? (
          <button type="button" className="locked-preview__cta" onClick={onUnlock}>
            <span className="material-symbols-rounded" aria-hidden="true">{meta.icon}</span>
            {meta.cta}
          </button>
        ) : (
          <Link className="locked-preview__cta" to={loginPath}>
            <span className="material-symbols-rounded" aria-hidden="true">login</span>
            Inicia sesión para desbloquear
          </Link>
        )}
      </div>
    </div>
  );
}
