import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Visor AR de mundo real con WebXR (immersive-ar + hit-test). A diferencia de Scene Viewer,
// esto ocurre DENTRO del navegador, sin cambiar de app: el usuario mueve el telefono, ve un
// reticulo sobre las superficies reales, TOCA para colocar el modelo y luego lo agranda/gira.
// Solo esta disponible en dispositivos con soporte WebXR AR (Android Chrome). El padre lo
// detecta con isWebXrArSupported() y, si no hay soporte, cae al visor nativo (model-viewer).

async function isWebXrArSupported() {
  try {
    if (typeof navigator === 'undefined' || !navigator.xr?.isSessionSupported) return false;
    return await navigator.xr.isSessionSupported('immersive-ar');
  } catch {
    return false;
  }
}

function WebXrArViewer({ modelUrl, name = 'Modelo 3D', onClose, onUnsupported }) {
  const overlayRef = useRef(null);
  const rendererRef = useRef(null);
  const sessionRef = useRef(null);
  const holderRef = useRef(null); // Group que sostiene el modelo (posicion/escala/giro del usuario).
  const mixerRef = useRef(null);
  const reticleRef = useRef(null);
  const userScaleRef = useRef(1); // multiplicador que aplica el usuario sobre el tamano base.
  const pinchRef = useRef(0); // distancia previa entre dos dedos (para pellizcar y escalar).

  const [phase, setPhase] = useState('checking'); // checking | ready | starting | running | placed | error | unsupported
  const [error, setError] = useState('');
  const [modelReady, setModelReady] = useState(false); // el GLB termino de cargar dentro de la sesion.

  // --- Deteccion de soporte (si no hay, avisamos al padre para caer al visor nativo). ---
  useEffect(() => {
    let alive = true;
    isWebXrArSupported().then((ok) => {
      if (!alive) return;
      if (ok) setPhase('ready');
      else { setPhase('unsupported'); onUnsupported?.(); }
    });
    return () => { alive = false; };
  }, [onUnsupported]);

  const cleanup = useCallback(() => {
    try { sessionRef.current?.end?.(); } catch { /* ya terminada */ }
    sessionRef.current = null;
    const r = rendererRef.current;
    if (r) {
      try { r.setAnimationLoop(null); } catch { /* noop */ }
      try { r.dispose(); } catch { /* noop */ }
      try { r.forceContextLoss?.(); } catch { /* noop */ }
      rendererRef.current = null;
    }
    mixerRef.current = null;
    holderRef.current = null;
    reticleRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  // Cuando el usuario toca un boton del overlay (bubbling de beforexrselect), suprimimos el
  // "select" de WebXR para que ese toque NO recoloque el modelo. Los toques en el área vacía
  // (pointer-events: none) no disparan este evento y sí llegan a WebXR para colocar/mover.
  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return undefined;
    const suppress = (event) => event.preventDefault();
    el.addEventListener('beforexrselect', suppress);
    return () => el.removeEventListener('beforexrselect', suppress);
  }, []);

  // --- Escalar / girar el modelo colocado (botones del overlay). ---
  const scaleBy = useCallback((factor) => {
    const holder = holderRef.current;
    if (!holder) return;
    userScaleRef.current = Math.min(8, Math.max(0.15, userScaleRef.current * factor));
    holder.scale.setScalar(holder.userData.baseScale * userScaleRef.current);
  }, []);

  const rotateBy = useCallback((rad) => {
    const holder = holderRef.current;
    if (holder) holder.rotation.y += rad;
  }, []);

  const endSession = useCallback(() => {
    try { sessionRef.current?.end?.(); } catch { /* noop */ }
  }, []);

  // Pellizco con dos dedos sobre el overlay = escalar de forma natural.
  const onTouchMove = useCallback((event) => {
    if (event.touches?.length !== 2) return;
    const [a, b] = event.touches;
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (pinchRef.current > 0 && dist > 0) scaleBy(dist / pinchRef.current);
    pinchRef.current = dist;
  }, [scaleBy]);

  const onTouchEnd = useCallback((event) => {
    if (!event.touches || event.touches.length < 2) pinchRef.current = 0;
  }, []);

  async function startAr() {
    if (phase === 'starting' || phase === 'running' || phase === 'placed') return;
    setError('');
    setModelReady(false);
    setPhase('starting');

    if (typeof navigator === 'undefined' || !navigator.xr?.requestSession) {
      onUnsupported?.();
      return;
    }

    // 1) Pedir la sesion AR PRIMERO, con la activacion del toque aun fresca. (Si cargaramos el
    //    GLB antes, la activacion podria expirar y requestSession fallaria.) Si la configuracion
    //    no es soportada en este equipo/navegador, caemos al visor NATIVO (Scene Viewer), que
    //    tambien permite mover/agrandar con los dedos.
    let session;
    try {
      session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: overlayRef.current ? { root: overlayRef.current } : undefined,
      });
    } catch (sessionError) {
      if (onUnsupported) { onUnsupported(); return; }
      setError(sessionError?.message || 'Este dispositivo no soporta la Realidad Aumentada WebXR.');
      setPhase('error');
      return;
    }

    try {
      sessionRef.current = session;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.xr.enabled = true;
      rendererRef.current = renderer;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 40);

      // Iluminacion envolvente para que el modelo no se vea oscuro.
      scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c4c8, 1.35));
      const dir = new THREE.DirectionalLight(0xffffff, 1.15);
      dir.position.set(0.5, 1.2, 0.35);
      scene.add(dir);

      // Reticulo que se pega a las superficies detectadas (tipo QR de piso).
      const reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.075, 0.1, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x30cff2, transparent: true, opacity: 0.9 }),
      );
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);
      reticleRef.current = reticle;

      renderer.xr.setReferenceSpaceType('local');
      await renderer.xr.setSession(session);
      setPhase('running');

      const viewerSpace = await session.requestReferenceSpace('viewer');
      const localSpace = await session.requestReferenceSpace('local');
      const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

      // Tocar la pantalla = colocar/mover el modelo donde apunta el reticulo.
      const onSelect = () => {
        const ret = reticleRef.current;
        const hold = holderRef.current;
        if (ret?.visible && hold) {
          hold.position.setFromMatrixPosition(ret.matrix);
          hold.visible = true;
          setPhase('placed');
        }
      };
      session.addEventListener('select', onSelect);

      session.addEventListener('end', () => {
        cleanup();
        setModelReady(false);
        setPhase('ready');
        onClose?.();
      });

      const clock = new THREE.Clock();
      renderer.setAnimationLoop((_, frame) => {
        if (frame && hitTestSource) {
          const results = frame.getHitTestResults(hitTestSource);
          if (results.length) {
            const pose = results[0].getPose(localSpace);
            if (pose) { reticle.visible = true; reticle.matrix.fromArray(pose.transform.matrix); }
          } else {
            reticle.visible = false;
          }
        }
        const dt = clock.getDelta();
        if (mixerRef.current) mixerRef.current.update(dt);
        renderer.render(scene, camera);
      });

      // 2) Cargar el GLB con la sesion YA corriendo (mientras, el usuario ve el reticulo).
      const gltf = await new GLTFLoader().loadAsync(modelUrl);
      const model = gltf.scene;
      const holder = new THREE.Group();
      holder.add(model);
      let box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      model.scale.setScalar(0.4 / maxDim); // ~40 cm de lado mayor
      box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.set(-center.x, -box.min.y, -center.z); // base al origen del holder, centrado x/z
      holder.userData.baseScale = 1;
      holder.visible = false;
      scene.add(holder);
      holderRef.current = holder;

      if (gltf.animations?.length) {
        const mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).reset().play();
        mixerRef.current = mixer;
      }
      setModelReady(true);
    } catch (startError) {
      cleanup();
      setError(startError?.message || 'No se pudo iniciar la Realidad Aumentada.');
      setPhase('error');
    }
  }

  if (phase === 'unsupported') return null; // el padre cae al visor nativo.

  const inSession = phase === 'running' || phase === 'placed';

  return (
    <div className="webxr-ar">
      {/* Pantalla previa: pedir el gesto del usuario para arrancar la sesion AR. */}
      {!inSession && (
        <div className="webxr-ar-launch">
          <strong>{name}</strong>
          {phase === 'error' ? (
            <>
              <p className="error-message">{error}</p>
              <div className="webxr-ar-launch-actions">
                <button type="button" className="webxr-ar-btn is-primary" onClick={startAr}>Reintentar</button>
                <button type="button" className="webxr-ar-btn" onClick={onClose}>Cerrar</button>
              </div>
            </>
          ) : (
            <>
              <p>Apunta al piso o a una mesa, toca la pantalla para colocar el modelo y muévete a su alrededor.</p>
              <div className="webxr-ar-launch-actions">
                <button
                  type="button"
                  className="webxr-ar-btn is-primary"
                  onClick={startAr}
                  disabled={phase === 'checking' || phase === 'starting'}
                >
                  {phase === 'starting' ? 'Iniciando…' : 'Iniciar Realidad Aumentada'}
                </button>
                <button type="button" className="webxr-ar-btn" onClick={onClose}>Cerrar</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Overlay DOM que se ve SOBRE la cámara durante la sesión WebXR (controles). */}
      <div
        className={`webxr-ar-overlay${inSession ? ' is-active' : ''}`}
        ref={overlayRef}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="webxr-ar-top">
          <span className="webxr-ar-name">{name}</span>
          <button type="button" className="webxr-ar-close" onClick={endSession} aria-label="Cerrar AR">✕</button>
        </div>

        <p className="webxr-ar-hint">
          {!modelReady
            ? 'Cargando modelo…'
            : phase === 'placed'
              ? 'Pellizca o usa + / − para agrandar. Toca otra vez para reubicar.'
              : 'Mueve el teléfono hasta ver el círculo y toca para colocar.'}
        </p>

        <div className="webxr-ar-controls">
          <button type="button" className="webxr-ar-ctrl" onClick={() => scaleBy(1.2)} aria-label="Agrandar">+</button>
          <button type="button" className="webxr-ar-ctrl" onClick={() => scaleBy(1 / 1.2)} aria-label="Achicar">−</button>
          <button type="button" className="webxr-ar-ctrl" onClick={() => rotateBy(Math.PI / 8)} aria-label="Girar">↻</button>
        </div>
      </div>
    </div>
  );
}

export default WebXrArViewer;
