// Manejo de chunks obsoletos tras un despliegue nuevo.
//
// Vite parte la app en archivos con hash (ej. CreatorLegendsPage-D7e7Y9cU.js). Cada deploy
// genera hashes NUEVOS y BORRA los viejos del servidor. Si la app quedo abierta desde un deploy
// anterior y navega a una ruta cuyo chunk cambio, el import dinamico falla con "Failed to fetch
// dynamically imported module". La solucion estandar: recargar UNA vez para traer el index.html
// + los chunks nuevos. El guard por timestamp evita un bucle si el fallo persistiera.
const KEY = 'ldb:chunk-reloaded';

export function isChunkLoadError(error) {
  const msg = String(error?.message || error?.reason?.message || error || '');
  return /dynamically imported module|Failed to fetch dynamically|Importing a module script failed|error loading dynamically imported module|ChunkLoadError|Loading chunk [\w-]+ failed/i.test(msg);
}

// Recarga la pagina una sola vez (si no lo hizo en los ultimos 10s). Devuelve true si recargo.
export function reloadForNewDeployOnce() {
  if (typeof window === 'undefined') return false;
  try {
    const last = Number(window.sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last > 10000) {
      window.sessionStorage.setItem(KEY, String(Date.now()));
      window.location.reload();
      return true;
    }
    return false;
  } catch {
    // sessionStorage bloqueado: recargamos igual (sin guard) — es preferible a quedar rotos.
    window.location.reload();
    return true;
  }
}
