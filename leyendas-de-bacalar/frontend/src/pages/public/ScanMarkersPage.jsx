import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import MarkerScanner from '../../components/ar/MarkerScanner.jsx';
import ArPermissionHelp from '../../components/ar/ArPermissionHelp.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';

// Escaner de marcadores desde la WEB (para cualquiera, sin iniciar sesion). Usa el mismo
// feed publico que la app movil, asi que ve los mismos marcadores fisicos publicados.
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'https://ar-leyendas-de-bacalar-9qki.onrender.com').replace(/\/$/, '');

function mapScene(s) {
  return {
    id: s.id,
    name: s.legend?.title || 'Modelo 3D',
    markerImageUrl: s.marker?.imageUrl || '',
    modelUrl: s.model?.url || '',
    scale: s.model?.scale ?? null,
    animationConfig: s.model?.animationConfig || {},
  };
}

function ScanMarkersPage() {
  const [scenes, setScenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof document !== 'undefined') document.body.classList.add('ar-viewer-open');
    return () => { if (typeof document !== 'undefined') document.body.classList.remove('ar-viewer-open'); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/mobile/ar/scenes`, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`El servidor respondió ${res.status}.`);
        const body = await res.json();
        if (!cancelled) setScenes(Array.isArray(body?.scenes) ? body.scenes.map(mapScene) : []);
      } catch (fetchError) {
        if (!cancelled) setError(fetchError?.message || 'No se pudieron cargar los marcadores.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="scan-markers-page">
      <div className="scan-markers-header">
        <div>
          <p className="creator-kicker">Realidad aumentada · sin cuenta</p>
          <h1>Escanear marcadores</h1>
          <p>Apunta la cámara a un marcador impreso del libro y el modelo cobra vida. Funciona desde el navegador del celular.</p>
        </div>
        <Link className="btn btn-ghost" to="/">Salir</Link>
      </div>

      {loading ? (
        <LoadingState message="Cargando marcadores..." />
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : (
        <div className="scan-markers-grid">
          <MarkerScanner scenes={scenes} />
          <ArPermissionHelp />
        </div>
      )}

      <p className="scan-markers-tip">
        Consejo: usa buena luz, apunta de frente y sostén firme 1-2 segundos. Los modelos con
        animación pesan más y pueden tardar unos segundos en aparecer.
      </p>
    </main>
  );
}

export default ScanMarkersPage;
