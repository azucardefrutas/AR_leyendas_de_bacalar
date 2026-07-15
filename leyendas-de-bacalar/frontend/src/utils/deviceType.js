// Detección de tipo de dispositivo. El modo de gestos con webcam es EXCLUSIVO de PC:
// en móvil/tablet se conserva el AR nativo (model-viewer "Ver en tu espacio"), que ya
// funciona. El tipo de dispositivo no cambia durante la sesión, así que basta evaluarlo
// una vez donde se use.

/**
 * ¿Es un escritorio "de verdad"? Exige puntero fino (mouse/trackpad) + hover, y excluye
 * user-agents móviles y el iPad en modo escritorio (iPadOS 13+ se hace pasar por Mac).
 * @returns {boolean}
 */
export function isDesktopDevice() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;

  const ua = window.navigator?.userAgent || '';
  const maxTouchPoints = window.navigator?.maxTouchPoints || 0;

  const mobileUa = /Mobi|Android|iPhone|iPod|Windows Phone|IEMobile|BlackBerry|Opera Mini/i.test(ua);
  const iPadClassic = /iPad/i.test(ua);
  const iPadDesktopMode = /Macintosh/i.test(ua) && maxTouchPoints > 1; // iPadOS se disfraza de Mac
  if (mobileUa || iPadClassic || iPadDesktopMode) return false;

  // Un PC tiene puntero fino y capacidad de hover. Un laptop táctil sigue contando como
  // PC (tiene trackpad + webcam), y así queda incluido correctamente.
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const canHover = window.matchMedia('(any-hover: hover)').matches;
  return finePointer && canHover;
}

/**
 * ¿El dispositivo es PC Y el navegador permite abrir la webcam? Condición para ofrecer
 * la manipulación por gestos.
 * @returns {boolean}
 */
export function supportsWebcamGestures() {
  return (
    isDesktopDevice()
    && typeof navigator !== 'undefined'
    && Boolean(navigator.mediaDevices?.getUserMedia)
  );
}
