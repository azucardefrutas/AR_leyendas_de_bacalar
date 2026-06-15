import React, { useEffect, useRef, useState } from 'react';
import Button from '../ui/Button.jsx';
import ArJsPatternViewer from './ArJsPatternViewer.jsx';
import MindArViewer from './MindArViewer.jsx';

function ArCameraExperience({ experience }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraState, setCameraState] = useState('idle');
  const [cameraError, setCameraError] = useState('');

  const cameraAr = experience?.cameraAr || {};
  const modelAsset = experience?.modelAsset || null;
  const trackingKind = cameraAr.trackingKind;

  useEffect(() => () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  async function startCamera() {
    if (cameraState === 'running') return;
    setCameraError('');
    setCameraState('requesting');

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Este navegador no permite abrir la camara desde esta pagina.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState('running');
    } catch (error) {
      setCameraState('idle');
      setCameraError(error?.message || 'No se pudo abrir la camara.');
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraState('idle');
  }

  return (
    <section className="ar-camera-card">
      <div className="ar-camera-stage">
        <video ref={videoRef} className="ar-camera-video" muted playsInline />
        {cameraState !== 'running' && (
          <div className="ar-camera-placeholder">
            <span>AR</span>
            <strong>Camara lista para probar</strong>
            <p>La deteccion real se habilitara cuando se conecte el motor correspondiente.</p>
          </div>
        )}
      </div>

      <div className="ar-camera-controls">
        <div>
          <span className="ar-status-pill">{cameraAr.ready ? 'Configuracion AR lista' : 'Configuracion AR pendiente'}</span>
          <h2>{experience?.scene?.name || 'Escena AR'}</h2>
          <p>
            Modelo: {modelAsset?.metadata?.original_name || modelAsset?.asset_type || 'Modelo 3D'}
          </p>
        </div>

        <div className="ar-camera-actions">
          <Button type="button" onClick={startCamera} disabled={!cameraAr.ready || cameraState === 'requesting'}>
            {cameraState === 'requesting' ? 'Abriendo...' : 'Iniciar camara'}
          </Button>
          <Button type="button" variant="ghost" onClick={stopCamera} disabled={cameraState !== 'running'}>
            Detener
          </Button>
          {modelAsset?.url && (
            <a className="btn btn-ghost" href={modelAsset.url} target="_blank" rel="noreferrer">
              Abrir modelo
            </a>
          )}
        </div>

        {cameraError && <p className="error-message">{cameraError}</p>}

        {trackingKind === 'mindar' ? (
          <MindArViewer trackingUrl={cameraAr.trackingUrl} />
        ) : trackingKind === 'arjs-pattern' ? (
          <ArJsPatternViewer trackingUrl={cameraAr.trackingUrl} />
        ) : (
          <div className="ar-engine-note">
            <span>Sin motor seleccionado</span>
            <strong>Agrega .mind o .patt desde la configuracion AR</strong>
            <p>El lector CONALITEG digital no depende de esta configuracion.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default ArCameraExperience;
