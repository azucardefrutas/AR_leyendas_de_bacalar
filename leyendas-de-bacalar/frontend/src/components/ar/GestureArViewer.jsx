import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Bounds, Center, useGLTF } from '@react-three/drei';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import AppIcon from '../ui/AppIcon.jsx';

// Hand tracking runs 100% in the browser (WASM + GPU). No server, no Python: the
// webcam frames never leave the device. We keep the frontend light on purpose —
// downscaled 480p input, GPU delegate, throttled to ~24fps, everything torn down when
// the viewer closes. The version pins must match the installed @mediapipe/tasks-vision.
const MEDIAPIPE_VERSION = '0.10.14';
const WASM_PATH = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const TARGET_FPS = 24;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
const PINCH_THRESHOLD = 0.07; // normalized thumb-tip ↔ index-tip distance
const ROT_GAIN = Math.PI * 2.4; // how much a full-frame hand sweep rotates the model
const MIN_SCALE = 0.35;
const MAX_SCALE = 3.2;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// Palm center ≈ middle-finger MCP (landmark 9). x is mirrored to match the selfie view.
const palmMirrored = (hand) => ({ x: 1 - hand[9].x, y: hand[9].y });
const isPinching = (hand) => distance(hand[4], hand[8]) < PINCH_THRESHOLD;

function GltfModel({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

// Renders the model and eases its rotation/scale toward the gesture targets every
// frame (smooth, "settles" instead of snapping). Reads a ref so the tracking loop can
// update the target 24×/s without re-rendering React.
function GestureModel({ url, gestureRef }) {
  const groupRef = useRef(null);
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const target = gestureRef.current;
    group.rotation.y += (target.rotY - group.rotation.y) * 0.22;
    group.rotation.x += (target.rotX - group.rotation.x) * 0.22;
    const next = group.scale.x + (target.scale - group.scale.x) * 0.22;
    group.scale.setScalar(next);
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
  const gestureRef = useRef({
    rotX: 0, rotY: 0, scale: 1,
    active: null, startCx: 0, startCy: 0, startRotX: 0, startRotY: 0, startDist: 0, startScale: 1,
  });
  const [status, setStatus] = useState('loading');
  const [hud, setHud] = useState({ hands: 0, gesture: 'idle' });

  const resetModel = useCallback(() => {
    const g = gestureRef.current;
    g.rotX = 0; g.rotY = 0; g.scale = 1; g.active = null;
  }, []);

  const processResult = useCallback((result) => {
    const hands = result?.landmarks ?? [];
    const g = gestureRef.current;
    const count = hands.length;
    let gesture = 'idle';

    if (count >= 2) {
      // Two hands → pinch-zoom: spreading them apart enlarges the model.
      const d = distance(palmMirrored(hands[0]), palmMirrored(hands[1]));
      if (g.active !== 'scale') { g.active = 'scale'; g.startDist = d || 0.001; g.startScale = g.scale; }
      else g.scale = clamp(g.startScale * (d / g.startDist), MIN_SCALE, MAX_SCALE);
      gesture = 'scale';
    } else if (count === 1 && isPinching(hands[0])) {
      // One pinched hand → grab & turn: moving the hand rotates the model.
      const c = palmMirrored(hands[0]);
      if (g.active !== 'rotate') {
        g.active = 'rotate';
        g.startCx = c.x; g.startCy = c.y; g.startRotX = g.rotX; g.startRotY = g.rotY;
      } else {
        g.rotY = g.startRotY + (c.x - g.startCx) * ROT_GAIN;
        g.rotX = clamp(g.startRotX + (c.y - g.startCy) * ROT_GAIN, -1.3, 1.3);
      }
      gesture = 'rotate';
    } else {
      g.active = null; // open hand / no hand → release, keep the current pose
    }

    const prev = hudRef.current;
    if (prev.hands !== count || prev.gesture !== gesture) {
      hudRef.current = { hands: count, gesture };
      setHud({ hands: count, gesture });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const stopLoop = () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = 0; };
    const loop = (now) => {
      rafRef.current = requestAnimationFrame(loop);
      if (now - lastFrameRef.current < FRAME_INTERVAL) return; // throttle to TARGET_FPS
      lastFrameRef.current = now;
      const video = videoRef.current;
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
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
      } catch (mediaError) {
        if (!cancelled) setStatus(mediaError?.name === 'NotAllowedError' ? 'denied' : 'error');
        return;
      }
      if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
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
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [processResult]);

  const tracking = status === 'ready';
  const errorCopy = status !== 'ready' && status !== 'loading' ? STATUS_COPY[status] : '';

  return (
    <div className="gesture-ar" role="dialog" aria-modal="true" aria-label={`Realidad aumentada con gestos: ${name}`}>
      <video ref={videoRef} className="gesture-ar__video" autoPlay muted playsInline />
      <div className="gesture-ar__scrim" aria-hidden="true" />

      {tracking && (
        <Canvas
          className="gesture-ar__canvas"
          gl={{ alpha: true }}
          camera={{ position: [0, 0, 4.2], fov: 35 }}
          dpr={[1, 2]}
        >
          <ambientLight intensity={1.15} />
          <directionalLight position={[5, 5, 5]} intensity={1.4} />
          <directionalLight position={[-5, -3, -5]} intensity={0.5} />
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
            ? (hud.hands ? `${hud.hands === 2 ? 'Dos manos' : 'Mano'} detectada${hud.hands === 2 ? 's' : ''}` : 'Muestra tu mano…')
            : 'Preparando…'}
        </span>
        <div className="gesture-ar__actions">
          <button type="button" onClick={resetModel} title="Centrar el modelo" aria-label="Centrar el modelo">
            <AppIcon name="restart_alt" size={20} />
          </button>
          <button type="button" onClick={onClose} title="Cerrar" aria-label="Cerrar">
            <AppIcon name="close" size={20} />
          </button>
        </div>
      </header>

      {tracking && (
        <ul className="gesture-ar__tips" aria-label="Guía de señas">
          <li className={hud.gesture === 'rotate' ? 'is-active' : ''}>
            <span className="gesture-ar__emoji" aria-hidden="true">🤏</span>
            <span>Pellizca (pulgar + índice) y mueve la mano para <strong>girar</strong></span>
          </li>
          <li className={hud.gesture === 'scale' ? 'is-active' : ''}>
            <span className="gesture-ar__emoji" aria-hidden="true">🙌</span>
            <span>Con <strong>dos manos</strong>, junta o separa para <strong>acercar / alejar</strong></span>
          </li>
          <li>
            <span className="gesture-ar__emoji" aria-hidden="true">✋</span>
            <span>Abre la mano para <strong>soltar</strong></span>
          </li>
        </ul>
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
