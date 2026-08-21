import React, { useEffect, useState } from 'react';
import {
  ViroARScene,
  ViroARImageMarker,
  ViroARTrackingTargets,
  Viro3DObject,
  ViroAmbientLight,
  ViroSpotLight,
} from '@reactvision/react-viro';

// Normaliza la escala del modelo (ar_scenes.scale puede venir número, array o null).
function toScale(scale) {
  if (Array.isArray(scale) && scale.length === 3) return scale.map(Number);
  const n = Number(scale);
  if (n > 0) return [n, n, n];
  return [0.06, 0.06, 0.06]; // default prudente; se afina en dispositivo
}

/**
 * Escena AR de ViroReact. Recibe por `sceneNavigator.viroAppProps`:
 *   { scenes: Array<{id, markerImageUrl, modelUrl, name, scale}>, onFound: (scene)=>void }
 * Registra cada imagen de marcador como target y, al detectarla, ancla su modelo GLB.
 */
export default function ArScene(props) {
  const appProps = props?.sceneNavigator?.viroAppProps || {};
  const scenes = (appProps.scenes || []).filter((s) => s.markerImageUrl && s.modelUrl);
  const [ready, setReady] = useState(false);
  const [foundSceneIds, setFoundSceneIds] = useState(() => new Set());
  const [suppressedPlaybackToken, setSuppressedPlaybackToken] = useState(null);

  useEffect(() => {
    if (!scenes.length) { setReady(false); return; }
    const targets = {};
    scenes.forEach((s, i) => {
      targets[`target_${i}`] = {
        source: { uri: s.markerImageUrl },
        orientation: 'Up',
        physicalWidth: Number(s.physicalWidth) || 0.15, // ancho real impreso (m)
      };
    });
    ViroARTrackingTargets.createTargets(targets);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes.length]);

  useEffect(() => {
    const token = appProps.playback?.token;
    if (!token) return undefined;
    setSuppressedPlaybackToken(token);
    const frame = requestAnimationFrame(() => setSuppressedPlaybackToken(null));
    return () => cancelAnimationFrame(frame);
  }, [appProps.playback?.token]);

  return (
    <ViroARScene>
      <ViroAmbientLight color="#ffffff" intensity={900} />
      <ViroSpotLight
        innerAngle={5}
        outerAngle={45}
        direction={[0, -1, -0.2]}
        position={[0, 3, 1]}
        color="#ffffff"
        castsShadow
      />

      {ready && scenes.map((s, i) => (
        <ViroARImageMarker
          key={s.id}
          target={`target_${i}`}
          onAnchorFound={() => {
            setFoundSceneIds((current) => new Set(current).add(s.id));
            if (appProps.onFound) appProps.onFound(s);
          }}
          onAnchorRemoved={() => {
            setFoundSceneIds((current) => {
              const next = new Set(current);
              next.delete(s.id);
              return next;
            });
            if (appProps.onLost) appProps.onLost(s);
          }}
        >
          {foundSceneIds.has(s.id) && (
            <Viro3DObject
              source={{ uri: s.modelUrl }}
              type="GLB"
              position={[0, 0, 0]}
              rotation={[0, 0, 0]}
              scale={toScale(s.scale)}
              dragType="FixedToWorld"
              onDrag={() => {}}
              animation={(() => {
                const config = s.animationConfig || {};
                const requested = appProps.playback?.sceneId === s.id ? appProps.playback.clip : null;
                const name = requested || config.defaultClip || config.clips?.[0];
                if (!name) return undefined;
                const requestedRun = requested
                  ? appProps.playback?.token !== suppressedPlaybackToken
                  : config.autoplay !== false;
                return {
                  name,
                  run: requestedRun,
                  loop: requested ? false : config.loop !== 'once',
                };
              })()}
            />
          )}
        </ViroARImageMarker>
      ))}
    </ViroARScene>
  );
}
