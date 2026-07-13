// Historial LOCAL de modelos AR ya vistos/escaneados por el usuario en este
// navegador. Cumple el requisito "ver cuales ya escaneaste y traerlos" sin tocar
// la base de datos. Si mas adelante se quiere persistencia entre dispositivos,
// esto se puede sincronizar con una tabla en Supabase (requiere autorizacion).

const STORAGE_KEY = 'ldb:ar:scanned:v1';
const MAX_ENTRIES = 60;

function safeParse(raw) {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    // JSON corrupto en localStorage: se ignora y se trata como vacio.
    return [];
  }
}

export function getScanHistory() {
  if (typeof localStorage === 'undefined') return [];
  return safeParse(localStorage.getItem(STORAGE_KEY));
}

/**
 * Registra (o mueve al frente) un modelo visto. Idempotente por id.
 * @param {{ id: string, name?: string, modelUrl?: string, legendSlug?: string, mode?: string }} entry
 * @returns {Array} historial actualizado
 */
export function recordScan(entry) {
  if (!entry?.id || typeof localStorage === 'undefined') return getScanHistory();
  const rest = getScanHistory().filter((item) => item.id !== entry.id);
  const next = [
    {
      id: entry.id,
      name: entry.name || 'Modelo 3D',
      modelUrl: entry.modelUrl || '',
      legendSlug: entry.legendSlug || '',
      mode: entry.mode || 'marker',
      scannedAt: Date.now(),
    },
    ...rest,
  ].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Cuota de localStorage llena u otro error: no es critico.
  }
  return next;
}

export function clearScanHistory() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin acceso a localStorage: no es critico.
  }
}
