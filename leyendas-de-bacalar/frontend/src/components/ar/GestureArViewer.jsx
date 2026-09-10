import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bounds, Center, useGLTF } from '@react-three/drei';
import { ACESFilmicToneMapping } from 'three';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import AppIcon from '../ui/AppIcon.jsx';

// Hand tracking runs 100% in the browser (WASM + GPU). No server, no Python: the
// webcam frames never leave the device. We keep the frontend light on purpose —
// downscaled input, GPU delegate, throttled to ~24fps, paused when the tab is
// hidden, and everything torn down when the viewer closes.
// The WASM runtime and the hand model are SELF-HOSTED from our own origin
// (frontend/public/mediapipe/…). BASE_URL keeps it correct under any deploy base.
const BASE_URL = import.meta.env.BASE_URL || '/';
const WASM_PATH = `${BASE_URL}mediapipe/wasm`;
const MODEL_PATH = `${BASE_URL}mediapipe/hand_landmarker.task`;

const TARGET_FPS = 24;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
const EXTEND_RATIO = 1.55; // fingertip-to-wrist / hand-size above this ⇒ finger extended
const ROT_GAIN = Math.PI * 2.4; // base: hand sweep → rotation (scaled by calibration)
const MOVE_GAIN = 3.2; // base: hand sweep → world translation (scaled by calibration)
const MIN_SCALE = 0.35;
const MAX_SCALE = 3.4;
const POS_LIMIT = 3; // keep the model reachable on screen

const CALIB_KEY = 'leyendas.gestureAr.calibration';
const ONBOARD_KEY = 'leyendas.gestureAr.onboarded';
const DEFAULT_CALIB = { rot: 1, move: 1, zoom: 1, pinch: 0.07, smooth: 0.22 };
const GESTURE_GUIDE = [
  { key: 'rotate', emoji: '🤏', title: 'Girar', short: 'Girar', desc: 'Pellizca (pulgar + índice), con el resto de la mano abierta, y muévela.' },
  { key: 'move', emoji: '✊', title: 'Mover', short: 'Mover', desc: 'Cierra el puño y arrástralo por la pantalla.' },
  { key: 'scale', emoji: '🙌', title: 'Acercar / alejar', short: 'Zoom', desc: 'Con dos manos, júntalas o sepáralas.' },
  { key: 'idle', emoji: '✋', title: 'Soltar', short: 'Soltar', desc: 'Abre la mano para dejarlo donde está.' },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const clampNum = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? clamp(n, min, max) : fallback;
};
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// Palm center ≈ middle-finger MCP (landmark 9). x is mirrored to match the selfie view.
const palmMirrored = (hand) => ({ x: 1 - hand[9].x, y: hand[9].y });
// Cuantos de los dedos indicados apuntan lejos de la palma (extendidos). Normalizado por
// el tamano de la mano -> invariante a que tan cerca este de la camara.
function extendedFingers(hand, tips) {
  const wrist = hand[0];
  const size = distance(wrist, hand[9]) || 1e-4;
  let count = 0;
  for (const tip of tips) {
    if (distance(hand[tip], wrist) / size > EXTEND_RATIO) count += 1;
  }
  return count;
}
function loadCalibration() {
  if (typeof window === 'undefined') return { ...DEFAULT_CALIB };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CALIB_KEY) || '{}');
    return {
      rot: clampNum(parsed.rot, 0.4, 2, DEFAULT_CALIB.rot),
      move: clampNum(parsed.move, 0.4, 2, DEFAULT_CALIB.move),
      zoom: clampNum(parsed.zoom, 0.4, 2, DEFAULT_CALIB.zoom),
      pinch: clampNum(parsed.pinch, 0.04, 0.12, DEFAULT_CALIB.pinch),
      smooth: clampNum(parsed.smooth, 0.1, 0.4, DEFAULT_CALIB.smooth),
    };
  } catch {
    return { ...DEFAULT_CALIB };
  }
}

function GltfModel({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

// Renders the model and eases its position / rotation / scale toward the gesture
// targets every frame (smooth — "settles" instead of snapping). Reads a ref so the
// tracking loop updates targets 24×/s without re-rendering React.
function GestureModel({ url, gestureRef }) {
  const groupRef = useRef(null);
  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const t = gestureRef.current;
    const baseSmooth = t.smooth || 0.22;
    const k = 1 - Math.pow(1 - baseSmooth, Math.min(delta, 0.05) * 60);
    group.position.x += (t.posX - group.position.x) * k;
    group.position.y += (t.posY - group.position.y) * k;
    group.rotation.y += (t.rotY - group.rotation.y) * k;
    group.rotation.x += (t.rotX - group.rotation.x) * k;
    const s = group.scale.x + (t.scale - group.scale.x) * k;
    group.scale.setScalar(s);
  });
  return (
    <group ref={groupRef}>
      <Bounds fit clip margin={1.1}>
        <Center>
          <GltfModel url={url} />
        </Center>
      </Bounds>
    </group>
  );
}

const STATUS_COPY = {
  loading: 'Encendiendo la cámara…',
  denied: 'Necesito permiso para usar tu cámara. Actívalo en el candado de la barra de direcciones y reintenta.',
  error: 'No se pudo iniciar el seguimiento de manos. Revisa tu conexión o prueba el visor 3D.',
  unsupported: 'Tu navegador no permite abrir la cámara aquí. Usa Chrome/Edge en escritorio sobre HTTPS.',
};
const GESTURE_LABEL = { rotate: 'Girando', move: 'Moviendo', scale: 'Escalando', idle: 'Listo' };

/**
 * PC "AR con gestos": webcam de fondo + modelo 3D encima, manipulado con las manos
 * (MediaPipe HandLandmarker). Pensado para escritorio (en móvil se usa el AR nativo).
 */
export default function GestureArViewer({ modelUrl, name = 'Modelo 3D', onClose, onFallback }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);
  const hudRef = useRef({ hands: 0, gesture: 'idle' });
  const calibRef = useRef(loadCalibration());
  const gestureRef = useRef({
    rotX: 0, rotY: 0, scale: 1, posX: 0, posY: 0, smooth: calibRef.current.smooth,
    active: null,
    // Histeresis: `stable` es el gesto confirmado; `pend`/`pendN` cuentan frames del nuevo
    // gesto antes de aceptarlo (evita que puño/pellizco/mano-abierta se peleen).
    stable: 'idle', pend: null, pendN: 0,
    pinching: false, // Schmitt trigger del pellizco (ON/OFF con umbrales distintos, sin titileo).
    startCx: 0, startCy: 0, startRotX: 0, startRotY: 0, startPosX: 0, startPosY: 0, startDist: 0, startScale: 1,
  });
  const [status, setStatus] = useState('loading');
  const [hud, setHud] = useState({ hands: 0, gesture: 'idle' });
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !window.localStorage.getItem(ONBOARD_KEY);
  });

  const dismissGuide = useCallback(() => {
    setShowGuide(false);
    try { window.localStorage.setItem(ONBOARD_KEY, '1'); } catch { /* private mode */ }
  }, []);

  const processResult = useCallback((result) => {
    const hands = result?.landmarks ?? [];
    const g = gestureRef.current;
    const cal = calibRef.current;
    const count = hands.length;

    // 1) Que gesto INTENTA hacer el usuario en este frame (sin aplicarlo aun).
    let want = 'idle';
    let twoHandDist = 0;
    if (count !== 1) g.pinching = false; // el pellizco solo tiene sentido con una mano
    if (count >= 2) {
      want = 'scale';
      twoHandDist = distance(palmMirrored(hands[0]), palmMirrored(hands[1])) || 1e-3;
    } else if (count === 1) {
      const hand = hands[0];
      const size = distance(hand[0], hand[9]) || 1e-4;              // tamano de la mano
      const pinchDist = distance(hand[4], hand[8]) / size;          // pulgar-indice, normalizado
      const otherExt = extendedFingers(hand, [12, 16, 20]);         // medio/anular/menique (0-3)
      // Pellizco con histeresis (Schmitt): ENTRA cuando los dedos casi se tocan y SALE solo al
      // separarse bien -> nada de titileo entre "girar" y "soltar" en el borde.
      g.pinching = g.pinching ? pinchDist < cal.pinch * 8 : pinchDist < cal.pinch * 5;
      // Gestos MUTUAMENTE EXCLUYENTES (no pueden chocar):
      //  🤏 Girar  = pellizco (pulgar+indice) CON el resto de la mano abierta (otherExt >= 1).
      //  ✊ Mover  = puno: medio/anular/menique CERRADOS (otherExt === 0); pulgar/indice dan igual.
      //  ✋ Soltar = mano abierta (sin pellizco y con dedos extendidos).
      if (g.pinching && otherExt >= 1) want = 'rotate';
      else if (otherExt === 0) want = 'move';
      else want = 'idle';
    }

    // 2) Histeresis: un gesto nuevo debe mantenerse 2 frames para aceptarse (evita que se
    //    "peleen" pellizco/puno/mano-abierta cuando la deteccion titila). Soltar es inmediato.
    if (want === g.stable) { g.pend = null; g.pendN = 0; }
    else {
      if (want === g.pend) g.pendN += 1; else { g.pend = want; g.pendN = 1; }
      if (want === 'idle' || g.pendN >= 2) { g.stable = want; g.pend = null; g.pendN = 0; }
    }
    const gesture = g.stable;

    // 3) Aplicar la manipulacion del gesto confirmado.
    if (gesture === 'scale' && count >= 2) {
      if (g.active !== 'scale') { g.active = 'scale'; g.startDist = twoHandDist; g.startScale = g.scale; }
      else g.scale = clamp(g.startScale * (twoHandDist / g.startDist) ** cal.zoom, MIN_SCALE, MAX_SCALE);
    } else if (gesture === 'rotate' && count === 1) {
      const c = palmMirrored(hands[0]);
      if (g.active !== 'rotate') { g.active = 'rotate'; g.startCx = c.x; g.startCy = c.y; g.startRotX = g.rotX; g.startRotY = g.rotY; }
      else {
        g.rotY = g.startRotY + (c.x - g.startCx) * ROT_GAIN * cal.rot;
        g.rotX = clamp(g.startRotX + (c.y - g.startCy) * ROT_GAIN * cal.rot, -1.3, 1.3);
      }
    } else if (gesture === 'move' && count === 1) {
      const c = palmMirrored(hands[0]);
      if (g.active !== 'move') { g.active = 'move'; g.startCx = c.x; g.startCy = c.y; g.startPosX = g.posX; g.startPosY = g.posY; }
      else {
        g.posX = clamp(g.startPosX + (c.x - g.startCx) * MOVE_GAIN * cal.move, -POS_LIMIT, POS_LIMIT);
        g.posY = clamp(g.startPosY - (c.y - g.startCy) * MOVE_GAIN * cal.move, -POS_LIMIT, POS_LIMIT); // pantalla-y invertida
      }
    } else {
      g.active = null; // ✋ soltar: mantiene la pose actual
    }

    const prev = hudRef.current;
    if (prev.hands !== count || prev.gesture !== gesture) {
      hudRef.current = { hands: count, gesture };
      setHud({ hands: count, gesture });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const videoEl = videoRef.current;

    const stopLoop = () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = 0; };
    const loop = (now) => {
      rafRef.current = requestAnimationFrame(loop);
      if (now - lastFrameRef.current < FRAME_INTERVAL) return; // throttle to TARGET_FPS
      if (typeof document !== 'undefined' && document.hidden) return; // pause when tab is hidden
      lastFrameRef.current = now;
      const video = videoEl;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker || video.readyState < 2) return;
      try {
        processResult(landmarker.detectForVideo(video, now));
      } catch {
        // A transient detection error must never crash the reader.
      }
    };

    async function start() {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        if (!cancelled) setStatus('unsupported');
        return;
      }
      // 1) Webcam (downscaled to keep the pipeline light).
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: TARGET_FPS, max: 30 },
            facingMode: 'user',
          },
          audio: false,
        });
      } catch (mediaError) {
        if (!cancelled) setStatus(mediaError?.name === 'NotAllowedError' ? 'denied' : 'error');
        return;
      }
      if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const video = videoEl;
      if (video) {
        video.srcObject = stream;
        try { await video.play(); } catch { /* autoplay policies: muted+playsinline covers it */ }
      }

      // 2) MediaPipe HandLandmarker (GPU delegate, with a CPU fallback).
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
        const build = (delegate) => HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_PATH, delegate },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.6,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        landmarkerRef.current = await build('GPU').catch(() => build('CPU'));
      } catch {
        if (!cancelled) setStatus('error');
        return;
      }
      if (cancelled) return;
      setStatus('ready');
      rafRef.current = requestAnimationFrame(loop);
    }

    start();

    return () => {
      cancelled = true;
      stopLoop();
      if (landmarkerRef.current) { try { landmarkerRef.current.close(); } catch { /* ignore */ } landmarkerRef.current = null; }
      if (streamRef.current) { streamRef.current.getTracks().forEach((track) => track.stop()); streamRef.current = null; }
      if (videoEl) videoEl.srcObject = null;
    };
  }, [processResult]);

  const tracking = status === 'ready';
  const errorCopy = status !== 'ready' && status !== 'loading' ? STATUS_COPY[status] : '';
  const activeGesture = hud.hands ? hud.gesture : 'idle';

  return (
    <div className="gesture-ar" role="dialog" aria-modal="true" aria-label={`Realidad aumentada con gestos: ${name}`}>
      <video ref={videoRef} className="gesture-ar__video" autoPlay muted playsInline />
      <div className="gesture-ar__scrim" aria-hidden="true" />

      {tracking && (
        <Canvas
          className="gesture-ar__canvas"
          dpr={[1, 1.35]}
          gl={{
            alpha: true,
            antialias: false,
            stencil: false,
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance',
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 1.05,
          }}
          camera={{ position: [0, 0, 4.2], fov: 35 }}
        >
          {/* Studio-style lighting for a cleaner, more solid render over the video. */}
          <hemisphereLight args={['#ffffff', '#20252e', 0.65]} />
          <ambientLight intensity={0.28} />
          <directionalLight position={[4, 6, 5]} intensity={1.55} />
          <directionalLight position={[-6, 2, -3]} intensity={0.55} />
          <directionalLight position={[0, 3, -6]} intensity={0.7} color="#bfe9ff" />
          <Suspense fallback={null}>
            <GestureModel url={modelUrl} gestureRef={gestureRef} />
          </Suspense>
        </Canvas>
      )}

      <header className="gesture-ar__bar">
        <span className="gesture-ar__title">
          <AppIcon name="waving_hand" size={18} />
          <strong>{name}</strong>
        </span>
        <span className={`gesture-ar__status${hud.hands ? ' is-live' : ''}`}>
          {tracking
            ? (hud.hands
              ? `${hud.hands === 2 ? 'Dos manos' : 'Mano'} · ${GESTURE_LABEL[activeGesture]}`
              : 'Muestra tu mano…')
            : 'Preparando…'}
        </span>
        <div className="gesture-ar__actions">
          <button type="button" onClick={() => setShowGuide(true)} title="Cómo se usa" aria-label="Cómo se usa">
            <AppIcon name="help" size={20} />
          </button>
          <button type="button" onClick={onClose} title="Cerrar" aria-label="Cerrar">
            <AppIcon name="close" size={20} />
          </button>
        </div>
      </header>

      {/* Guia persistente COMPACTA: solo emoji + palabra (la explicacion completa vive en el
          onboarding y en el boton "?"). Resalta el gesto activo. Ocupa poco y no tapa el modelo. */}
      {tracking && !showGuide && (
        <ul className="gesture-ar__tips is-compact" aria-label="Guía de señas">
          {GESTURE_GUIDE.map((g) => (
            <li key={g.key} className={activeGesture === g.key ? 'is-active' : ''}>
              <span className="gesture-ar__emoji" aria-hidden="true">{g.emoji}</span>
              <span className="gesture-ar__tip-label">{g.short}</span>
            </li>
          ))}
        </ul>
      )}

      {showGuide && (
        <div className="gesture-ar__onboard" role="dialog" aria-modal="true" aria-label="Cómo usar los gestos">
          <div className="gesture-ar__onboard-card">
            <span className="gesture-ar__onboard-kicker">Realidad aumentada</span>
            <h2>Explora el modelo con tus manos</h2>
            <p>Colócate frente a la cámara y usa estas señas:</p>
            <ul>
              {GESTURE_GUIDE.map((g, index) => (
                <li key={g.key} style={{ '--i': index }}>
                  <span className="gesture-ar__emoji" aria-hidden="true">{g.emoji}</span>
                  <span><strong>{g.title}.</strong> {g.desc}</span>
                </li>
              ))}
            </ul>
            <button type="button" className="btn gesture-ar__onboard-cta" onClick={dismissGuide}>
              Empezar
            </button>
          </div>
        </div>
      )}

      {errorCopy && (
        <div className="gesture-ar__notice">
          <AppIcon name="videocam_off" size={30} />
          <p>{errorCopy}</p>
          <div className="gesture-ar__notice-actions">
            {onFallback && (
              <button type="button" className="btn" onClick={onFallback}>Ver visor 3D</button>
            )}
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      )}

      {status === 'loading' && (
        <div className="gesture-ar__notice is-loading">
          <span className="gesture-ar__spinner" aria-hidden="true" />
          <p>{STATUS_COPY.loading}</p>
        </div>
      )}
    </div>
  );
}
