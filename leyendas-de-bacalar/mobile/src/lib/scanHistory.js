import AsyncStorage from '@react-native-async-storage/async-storage';

// Colección local "ya escaneados" (AsyncStorage), POR CUENTA. Cumple el requisito de
// que cada lector solo tenga los modelos que ÉL escaneó, sin tocar la base de datos.
// La llave incluye el uid del usuario -> cuentas independientes en el mismo teléfono.
// (v2: la v1 usaba una llave global compartida entre todas las cuentas del dispositivo.)
const PREFIX = 'leyendas.ar.scanned.v2.';
const MAX = 100;

function keyFor(uid) {
  return PREFIX + (uid || 'guest');
}

export async function getScanHistory(uid) {
  try {
    const raw = await AsyncStorage.getItem(keyFor(uid));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function recordScan(uid, scene) {
  if (!scene?.id) return getScanHistory(uid);
  const rest = (await getScanHistory(uid)).filter((item) => item.id !== scene.id);
  const next = [
    {
      id: scene.id,
      name: scene.name || 'Modelo 3D',
      modelUrl: scene.modelUrl || '',
      markerImageUrl: scene.markerImageUrl || '',
      legendTitle: scene.legend?.title || '',
      animationConfig: scene.animationConfig || null,
      scannedAt: Date.now(),
    },
    ...rest,
  ].slice(0, MAX);
  try {
    await AsyncStorage.setItem(keyFor(uid), JSON.stringify(next));
  } catch {
    // Cuota llena u otro error: no es crítico.
  }
  return next;
}

export async function clearScanHistory(uid) {
  try {
    await AsyncStorage.removeItem(keyFor(uid));
  } catch {
    // Ignorar.
  }
}
