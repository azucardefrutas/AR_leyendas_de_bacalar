import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, Center, Html, OrbitControls, useGLTF } from '@react-three/drei';

// Catches GLTF load failures (404, CORS, invalid file) thrown during render/suspense
// so the marker shows a clear error state instead of crashing the whole canvas tree.
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

/**
 * Lightweight embedded 3D preview rendered INSIDE a placed marker box in the editor.
 * Shows the real GLB/GLTF model, auto-fitted and auto-rotating, with a transparent
 * canvas so it sits on top of the document page. The canvas observes its container,
 * so resizing/moving the marker box re-fits the model automatically.
 *
 * Only models that are actually placed on the page should mount this component — the
 * side tray keeps light thumbnails (see SourceDocumentPreview). Memoized so dragging a
 * marker (which only changes the parent's position style) does not re-render the canvas.
 */
function MarkerModelPreview({ modelUrl, selected = false, autoRotate = true, className = '' }) {
  const [failed, setFailed] = useState(false);
  // Bumping the key remounts the error boundary + suspense subtree to retry a failed load.
  const [reloadKey, setReloadKey] = useState(0);

  const handleRetry = (event) => {
    event.stopPropagation();
    if (modelUrl) {
      try {
        useGLTF.clear(modelUrl);
      } catch {
        // Best-effort cache clear; retry still remounts the loader below.
      }
    }
    setFailed(false);
    setReloadKey((value) => value + 1);
  };

  if (!modelUrl) {
    return (
      <div className={`marker-model-preview is-empty ${className}`}>
        <span className="marker-model-message">Modelo no disponible</span>
      </div>
    );
  }

  return (
    <div className={`marker-model-preview ${selected ? 'is-selected' : ''} ${className}`}>
      {failed ? (
        <div className="marker-model-error" role="alert">
          <span>No se pudo cargar el modelo</span>
          <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={handleRetry}>
            Reintentar
          </button>
        </div>
      ) : (
        <Canvas
          key={reloadKey}
          gl={{ alpha: true, antialias: true }}
          camera={{ position: [0, 0, 5], fov: 35 }}
          dpr={[1, 2]}
          frameloop="always"
        >
          <ambientLight intensity={1.2} />
          <directionalLight position={[3, 4, 5]} intensity={1.5} />
          <directionalLight position={[-4, -2, -5]} intensity={0.5} />
          <ModelErrorBoundary onError={() => setFailed(true)}>
            <Suspense fallback={<Html center><span className="marker-model-loader">Cargando…</span></Html>}>
              <Bounds fit clip observe margin={1.1}>
                <Center>
                  <GltfModel url={modelUrl} />
                </Center>
              </Bounds>
            </Suspense>
          </ModelErrorBoundary>
          <OrbitControls
            makeDefault
            enablePan={false}
            enableZoom={false}
            enableRotate={false}
            autoRotate={autoRotate}
            autoRotateSpeed={0.8}
          />
        </Canvas>
      )}
    </div>
  );
}

export default React.memo(MarkerModelPreview);
