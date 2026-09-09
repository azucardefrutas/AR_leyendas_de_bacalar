import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FloorArViewer from '../../components/ar/FloorArViewer.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';

// "Ver modelos en tu espacio": abre la cámara y proyecta el modelo 3D en el piso real
// usando el AR nativo de Google (Scene Viewer via <model-viewer>). Sin marcador, sin login.
const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'https://ar-leyendas-de-bacalar-9qki.onrender.com').replace(/\/$/, '');

// Nombre legible a partir del archivo del modelo (quita el timestamp y la extension).
function niceName(url, fallback) {
  const file = String(url || '').split('/').pop() || '';
  const base = file.replace(/\.(glb|gltf)$/i, '').replace(/^\d+-/, '').replace(/[-_]+/g, ' ').trim();
  return base || fallback || 'Modelo 3D';
}

function ArModelsPage() {
  const [models, setModels] = useState([]);
  const [selected, setSelected] = useState(null);
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
        const seen = new Set();
        const list = (Array.isArray(body?.scenes) ? body.scenes : [])
          .map((s) => ({ id: s.id, modelUrl: s.model?.url || '', name: niceName(s.model?.url, s.legend?.title) }))
          .filter((m) => m.modelUrl && !seen.has(m.modelUrl) && seen.add(m.modelUrl));
        if (!cancelled) setModels(list);
      } catch (fetchError) {
        if (!cancelled) setError(fetchError?.message || 'No se pudieron cargar los modelos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const content = useMemo(() => {
    if (loading) return <LoadingState message="Cargando modelos..." />;
    if (error) return <p className="error-message">{error}</p>;
    if (selected) {
      return (
        <div className="ar-models-viewer">
          <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>← Volver a la lista</button>
          <FloorArViewer modelUrl={selected.modelUrl} name={selected.name} />
        </div>
      );
    }
    if (!models.length) return <p className="ar-models-empty">Aún no hay modelos publicados.</p>;
    return (
      <ul className="ar-models-list">
        {models.map((m) => (
          <li key={m.id}>
            <button type="button" className="ar-models-item" onClick={() => setSelected(m)}>
              <span className="material-symbols-rounded" aria-hidden="true">view_in_ar</span>
              <span className="ar-models-item-name">{m.name}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  }, [loading, error, selected, models]);

  return (
    <main className="ar-models-page">
      <div className="scan-markers-header">
        <div>
          <h1>Ver modelos en tu espacio</h1>
          <p className="ar-models-sub">Abre la cámara y coloca el modelo 3D en el piso real. No necesita marcador ni cuenta.</p>
        </div>
        <Link className="btn btn-ghost" to="/">Salir</Link>
      </div>
      {content}
    </main>
  );
}

export default ArModelsPage;
