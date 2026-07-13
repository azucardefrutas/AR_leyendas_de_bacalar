// Carga perezosa de librerias externas por CDN (model-viewer, A-Frame, MindAR).
// Se usa CDN en vez de npm a proposito: en este repo node_modules esta trackeado
// en git (ver CLAUDE.md §13), asi que instalar dependencias ensuciaria el diff y
// puede provocar el conflicto clasico de "multiples instancias de three" con Vite.
// Cada script se inyecta una sola vez y se cachea la promesa.

const cache = new Map();

/**
 * Inyecta un <script> (clasico o modulo) una sola vez.
 * @param {string} src URL del script.
 * @param {{ module?: boolean, globalCheck?: () => any }} [options]
 *   - module: usar type="module".
 *   - globalCheck: si ya devuelve truthy, se resuelve sin recargar (ej: window.AFRAME).
 * @returns {Promise<void>}
 */
export function loadExternalScript(src, { module = false, globalCheck } = {}) {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('No hay DOM disponible para cargar el script.'));
  }
  if (globalCheck && globalCheck()) return Promise.resolve();
  if (cache.has(src)) return cache.get(src);

  const promise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-ext-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`No se pudo cargar ${src}`)));
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    if (module) script.type = 'module';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.dataset.extSrc = src;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      resolve();
    });
    script.addEventListener('error', () => {
      cache.delete(src);
      reject(new Error(`No se pudo cargar ${src}`));
    });
    document.head.appendChild(script);
  });

  cache.set(src, promise);
  return promise;
}
