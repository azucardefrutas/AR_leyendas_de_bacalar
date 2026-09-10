import { useRouteError } from 'react-router-dom';
import { isChunkLoadError, reloadForNewDeployOnce } from '../lib/chunkReload.js';

// errorElement del router. Si el error es un chunk que no cargo (deploy nuevo), recarga sola
// una vez para traer la version nueva. Para cualquier otro error, muestra un aviso claro con
// boton de recarga (en vez del "Unexpected Application Error!" crudo de React Router).
export default function RouteErrorBoundary() {
  const error = useRouteError();

  if (isChunkLoadError(error) && reloadForNewDeployOnce()) {
    return null; // la pagina se esta recargando
  }

  const chunk = isChunkLoadError(error);
  return (
    <div style={{
      minHeight: '60vh', display: 'grid', placeContent: 'center', justifyItems: 'center',
      gap: 14, padding: 24, textAlign: 'center',
    }}>
      <span className="material-symbols-rounded" style={{ fontSize: 44, color: '#087f8c' }} aria-hidden="true">
        {chunk ? 'sync' : 'error'}
      </span>
      <h1 style={{ fontSize: '1.3rem', margin: 0 }}>
        {chunk ? 'Se actualizó la aplicación' : 'Algo salió mal'}
      </h1>
      <p style={{ color: '#64748b', margin: 0, maxWidth: 380 }}>
        {chunk
          ? 'Hay una versión nueva. Recarga la página para continuar.'
          : 'Ocurrió un error inesperado. Recarga la página; si persiste, vuelve a intentarlo más tarde.'}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          justifySelf: 'center', minHeight: 44, padding: '0 22px', borderRadius: 999,
          border: 0, background: '#087f8c', color: '#fff', fontWeight: 700, cursor: 'pointer',
        }}
      >
        Recargar
      </button>
    </div>
  );
}
