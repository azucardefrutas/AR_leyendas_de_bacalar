// Detects whether the browser can actually create a WebGL context. Cached after
// the first probe so repeated 3D mounts don't each spin up a throwaway context.
//
// Used to decide UP FRONT whether to mount a react-three-fiber <Canvas> at all:
// on devices/browsers where WebGL is unsupported or disabled, three.js throws
// "Error creating WebGL context." while building its WebGLRenderer. That throw
// originates at the <Canvas> boundary itself, so it escaped the in-canvas error
// boundaries and crashed the whole page ("Unexpected Application Error!"). We
// avoid the throw by rendering a static fallback when this returns false, and a
// WebGLErrorBoundary above the canvas catches any remaining runtime failure
// (e.g. too many live contexts on mobile, or a lost context).
let cachedSupport = null;

export function isWebGLAvailable() {
  if (cachedSupport !== null) return cachedSupport;
  if (typeof document === 'undefined') {
    cachedSupport = false;
    return cachedSupport;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    cachedSupport = Boolean(gl && typeof gl.getParameter === 'function');
    // Free the probe context immediately so it never counts against the small
    // per-page WebGL context budget on mobile browsers.
    if (gl && typeof gl.getExtension === 'function') {
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    }
  } catch {
    cachedSupport = false;
  }
  return cachedSupport;
}

// Test seam: lets a manual/automated check reset the memoized result after
// monkey-patching canvas.getContext. Not used by app code.
export function __resetWebGLSupportCache() {
  cachedSupport = null;
}
