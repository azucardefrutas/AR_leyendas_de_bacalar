import React, { Component, Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Center, Float, Html, OrbitControls, useGLTF } from '@react-three/drei';
import WebGLErrorBoundary from './WebGLErrorBoundary.jsx';
import { isWebGLAvailable } from '../../utils/webglSupport.js';

const BOOK_MODEL_PATH = '/assets/models/Libro_bacalar.glb';

class BookErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

function BookModel({ isInteracting }) {
  const group = useRef(null);
  const { scene } = useGLTF(BOOK_MODEL_PATH);

  useFrame((state) => {
    if (!group.current) return;
    const idleRotation = isInteracting ? 0.04 : 0.16;
    group.current.rotation.y = -0.9 + Math.sin(state.clock.elapsedTime * 0.45) * idleRotation;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.08;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.18} floatIntensity={0.45}>
      <Center>
        <primitive ref={group} object={scene} scale={2.15} />
      </Center>
    </Float>
  );
}

function BookFallback3D() {
  return (
    <Html center>
      <div className="book-fallback-card">
        <span>LIBRO</span>
        <strong>Leyendas de Bacalar</strong>
      </div>
    </Html>
  );
}

// Static, WebGL-free version of the hero used when the device can't create a
// WebGL context (unsupported/disabled, or the renderer fails at runtime). Keeps
// the landing page intact instead of crashing it.
function FloatingBookFallback() {
  return (
    <div className="floating-book-shell floating-book-shell--fallback" aria-label="Leyendas de Bacalar">
      <div className="book-fallback-card">
        <span>LIBRO</span>
        <strong>Leyendas de Bacalar</strong>
      </div>
      <div className="floating-book-glow" />
    </div>
  );
}

function FloatingBook() {
  const [isInteracting, setIsInteracting] = useState(false);
  const [failed, setFailed] = useState(false);

  // Don't even mount the canvas where WebGL is unavailable — three.js would throw
  // "Error creating WebGL context." and take the whole page down with it.
  if (failed || !isWebGLAvailable()) {
    return <FloatingBookFallback />;
  }

  return (
    <div className="floating-book-shell" aria-label="Libro 3D de Leyendas de Bacalar">
      <WebGLErrorBoundary fallback={null} onError={() => setFailed(true)}>
        <Canvas camera={{ position: [0, 0.55, 5.1], fov: 34 }} dpr={[1, 1.65]}>
          <ambientLight intensity={0.75} />
          <directionalLight position={[3, 4, 4]} intensity={1.55} color="#30CFF2" />
          <pointLight position={[-2, 1.4, 3]} intensity={1.25} color="#049DD9" />
          <BookErrorBoundary fallback={<BookFallback3D />}>
            <Suspense fallback={<BookFallback3D />}>
              <BookModel isInteracting={isInteracting} />
            </Suspense>
          </BookErrorBoundary>
          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            enablePan={false}
            enableZoom
            minDistance={3}
            maxDistance={6}
            minPolarAngle={Math.PI / 3.6}
            maxPolarAngle={Math.PI / 1.65}
            rotateSpeed={0.75}
            zoomSpeed={0.65}
            onStart={() => setIsInteracting(true)}
            onEnd={() => setIsInteracting(false)}
          />
        </Canvas>
      </WebGLErrorBoundary>
      <div className="floating-book-glow" />
      <div className="book-interaction-hint">Arrastra para explorar el libro</div>
    </div>
  );
}

useGLTF.preload(BOOK_MODEL_PATH);

export default FloatingBook;
