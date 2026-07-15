import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, Center, Html, OrbitControls, useGLTF } from '@react-three/drei';
import Button from '../ui/Button.jsx';
import WebGLErrorBoundary from './WebGLErrorBoundary.jsx';
import { isWebGLAvailable } from '../../utils/webglSupport.js';
import { getOrbitControlOptions } from './model3dViewerOptions.js';

const WEBGL_UNAVAILABLE_MESSAGE =
  'No se pudo mostrar el modelo 3D. Tu dispositivo o navegador podria no soportar 3D (WebGL), o el archivo (GLB/GLTF) fallo.';

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

// A large invisible plane behind the model. It raycatches the EMPTY canvas so the
// reader can tell "cursor over empty space" (move the frame) from "cursor over the
// model" (rotate/zoom). Rendered but fully transparent, so it never shows.
function HoverCatcher({ onOver }) {
  return (
    <mesh position={[0, 0, -8]} onPointerOver={(event) => { event.stopPropagation(); onOver(); }}>
      <planeGeometry args={[400, 400]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function ModelCanvas({
  url,
  onError,
  embedded = false,
  compactControls = false,
  interactionEnabled = true,
  fullControls = false,
  onHoverModel,
  onResetReady,
}) {
  const orbitOptions = getOrbitControlOptions({ embedded, compactControls, interactionEnabled, fullControls });
  const controlsRef = useRef(null);
  // Rotate/pan only while the cursor is over the model; over the empty canvas they are
  // off so the reader's frame-drag can take over. Set imperatively (not via props) so a
  // re-render never resets them mid-gesture.
  const setOverModel = (over) => {
    const controls = controlsRef.current;
    if (controls) {
      controls.enableRotate = over;
      controls.enablePan = over;
    }
    onHoverModel?.(over);
  };
  // Hand the parent a "recenter" function (reset rotation/zoom/pan to the initial view).
  // The reader wires it to a double-click so a mis-rotated model is one gesture from home.
  useEffect(() => {
    if (!onResetReady) return undefined;
    onResetReady(() => controlsRef.current?.reset());
    return () => onResetReady(null);
  }, [onResetReady]);
  return (
    <Canvas gl={{ alpha: true }} camera={{ position: [0, 0, embedded ? 4.2 : 4], fov: embedded ? 35 : 45 }} dpr={[1, 1.75]}>
      <ambientLight intensity={embedded ? 1.1 : 0.7} />
      <directionalLight position={[5, 5, 5]} intensity={embedded ? 1.45 : 1} />
      <directionalLight position={[-5, -3, -5]} intensity={embedded ? 0.55 : 0.4} />
      {fullControls && <HoverCatcher onOver={() => setOverModel(false)} />}
      <ModelErrorBoundary onError={onError}>
        <Suspense
          fallback={<Html center><span className="model3d-loading">Cargando modelo 3D...</span></Html>}
        >
          <Bounds fit clip observe margin={embedded ? 0.95 : 1.2}>
            <Center>
              {fullControls ? (
                <group onPointerOver={(event) => { event.stopPropagation(); setOverModel(true); }}>
                  <GltfModel url={url} />
                </group>
              ) : (
                <GltfModel url={url} />
              )}
            </Center>
          </Bounds>
        </Suspense>
      </ModelErrorBoundary>
      <OrbitControls
        ref={controlsRef}
        makeDefault
        {...orbitOptions}
        autoRotateSpeed={0.8}
      />
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
  compactControls = false,
  interactionEnabled = true,
  fullControls = false,
  onHoverModel,
  onResetReady,
}) {
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = modelUrl || getModelUrl(scene);
  const name = title || scene?.name || 'Modelo 3D';
  // Gate on real WebGL support so we never mount a canvas that would throw and
  // crash the page; the boundary below is the runtime safety net.
  const canRender3D = Boolean(url) && !failed && isWebGLAvailable();

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
        className={`model3d-inline ${compactControls ? 'is-editor-inline' : ''} ${interactionEnabled ? 'is-interactive' : 'is-passive'}`}
        role="group"
        aria-label={`Modelo 3D interactivo: ${name}`}
      >
        <div className="model3d-inline-stage">
          {!url ? (
            <div className="model3d-message">Esta escena todavia no tiene un modelo 3D asociado.</div>
          ) : !canRender3D ? (
            <div className="model3d-message error">{WEBGL_UNAVAILABLE_MESSAGE}</div>
          ) : (
            <WebGLErrorBoundary onError={() => setFailed(true)}>
              <ModelCanvas
                url={url}
                onError={() => setFailed(true)}
                embedded
                compactControls={compactControls}
                interactionEnabled={interactionEnabled}
                fullControls={fullControls}
                onHoverModel={onHoverModel}
                onResetReady={onResetReady}
              />
            </WebGLErrorBoundary>
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
          ) : !canRender3D ? (
            <div className="model3d-message error">{WEBGL_UNAVAILABLE_MESSAGE}</div>
          ) : (
            <WebGLErrorBoundary onError={() => setFailed(true)}>
              <ModelCanvas url={url} onError={() => setFailed(true)} />
            </WebGLErrorBoundary>
          )}
        </div>

        {canRender3D && (
          <p className="model3d-hint">Arrastra para rotar &middot; rueda o pellizco para zoom &middot; clic derecho para desplazar</p>
        )}
      </div>
    </div>
  );
}

export default Model3DViewer;
