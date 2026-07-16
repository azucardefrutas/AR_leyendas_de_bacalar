import AsyncStorage from '@react-native-async-storage/async-storage';

// Historial local "ya escaneados" (AsyncStorage). Cumple el requisito de ver cuáles
// modelos ya escaneaste y volver a abrirlos, sin tocar la base de datos.
const KEY = 'leyendas.ar.scanned.v1';
const MAX = 100;

export async function getScanHistory() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function recordScan(scene) {
  if (!scene?.id) return getScanHistory();
  const rest = (await getScanHistory()).filter((item) => item.id !== scene.id);
  const next = [
    {
      id: scene.id,
      name: scene.name || 'Modelo 3D',
      modelUrl: scene.modelUrl || '',
      markerImageUrl: scene.markerImageUrl || '',
      legendTitle: scene.legend?.title || '',
      scannedAt: Date.now(),
    },
    ...rest,
  ].slice(0, MAX);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Cuota llena u otro error: no es crítico.
  }
  return next;
}

export async function clearScanHistory() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Ignorar.
  }
}
