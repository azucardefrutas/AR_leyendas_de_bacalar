import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, Center, Html, OrbitControls, useGLTF } from '@react-three/drei';
import Button from '../ui/Button.jsx';

function getModelAsset(scene = {}) {
  return scene?.assets || scene?.asset || scene?.model_asset || null;
}

function getModelUrl(scene) {
  const asset = getModelAsset(scene);
  return asset?.url || asset?.public_url || asset?.file_url || asset?.external_url || '';
}

// Catches GLTF load failures (404, CORS, invalid file) thrown during render/suspense
// and lets the parent show a clear error state instead of crashing the canvas.
class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (this.props.onError) this.props.onError(error);
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function GltfModel({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function ModelCanvas({ url, onError }) {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }} dpr={[1, 2]}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <directionalLight position={[-5, -3, -5]} intensity={0.4} />
      <ModelErrorBoundary onError={onError}>
        <Suspense
          fallback={<Html center><span className="model3d-loading">Cargando modelo 3D...</span></Html>}
        >
          <Bounds fit clip observe margin={1.2}>
            <Center>
              <GltfModel url={url} />
            </Center>
          </Bounds>
        </Suspense>
      </ModelErrorBoundary>
      <OrbitControls makeDefault enablePan enableZoom enableRotate />
    </Canvas>
  );
}

/**
 * Reusable real 3D viewer for GLB/GLTF models. Used from ArSceneModal in both the
 * creator editor and the reader. No new dependencies (three / @react-three already
 * present). The heavy three.js code is loaded lazily by the caller.
 */
function Model3DViewer({
  scene = null,
  modelUrl = '',
  title = '',
  onClose,
  hideHeading = false,
  embedded = false,
}) {
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = modelUrl || getModelUrl(scene);
  const name = title || scene?.name || 'Modelo 3D';

  // Hide the fixed navbar (and any fixed chrome) while the viewer is open so it
  // never collides with the modal. The CSS targets `body.model3d-open`.
  useEffect(() => {
    if (embedded) return undefined;
    document.body.classList.add('model3d-open');
    return () => document.body.classList.remove('model3d-open');
  }, [embedded]);

  if (embedded) {
    return (
      <div
        className="model3d-inline"
        role="group"
        aria-label={`Modelo 3D interactivo: ${name}`}
      >
        <div className="model3d-inline-stage">
          {!url ? (
            <div className="model3d-message">Esta escena todavia no tiene un modelo 3D asociado.</div>
          ) : failed ? (
            <div className="model3d-message error">
              No se pudo cargar el modelo 3D. Verifica el archivo (GLB/GLTF) o la URL.
            </div>
          ) : (
            <ModelCanvas url={url} onError={() => setFailed(true)} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`model3d-overlay ${expanded ? 'expanded' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Visor 3D: ${name}`}
    >
      <div className="model3d-panel">
        <header className={`model3d-header ${hideHeading ? 'is-bare' : ''}`}>
          {!hideHeading && (
            <div className="model3d-heading">
              <h3>{name}</h3>
              {scene?.description && <p>{scene.description}</p>}
            </div>
          )}
          <div className="model3d-actions">
            <Button type="button" variant="ghost" onClick={() => setExpanded((value) => !value)}>
              {expanded ? 'Reducir' : 'Pantalla completa'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>Cerrar</Button>
          </div>
        </header>

        <div className="model3d-stage">
          {!url ? (
            <div className="model3d-message">Esta escena todavia no tiene un modelo 3D asociado.</div>
          ) : failed ? (
            <div className="model3d-message error">
              No se pudo cargar el modelo 3D. Verifica el archivo (GLB/GLTF) o la URL.
            </div>
          ) : (
            <ModelCanvas url={url} onError={() => setFailed(true)} />
          )}
        </div>

        {url && !failed && (
          <p className="model3d-hint">Arrastra para rotar &middot; rueda o pellizco para zoom &middot; clic derecho para desplazar</p>
        )}
      </div>
    </div>
  );
}

export default Model3DViewer;
