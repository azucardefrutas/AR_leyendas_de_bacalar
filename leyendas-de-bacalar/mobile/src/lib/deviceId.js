import AsyncStorage from '@react-native-async-storage/async-storage';

// ID anonimo y persistente del dispositivo. Da una identidad estable al INVITADO (sin
// cuenta) para separar su coleccion escaneada de la de otras cuentas del mismo telefono,
// sin tocar la base de datos ni exigir inicio de sesion.
const KEY = 'leyendas.ar.deviceId.v1';
let cached = null;

function uuidV4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getDeviceId() {
  if (cached) return cached;
  try {
    let id = await AsyncStorage.getItem(KEY);
    if (!id) {
      id = `guest-${uuidV4()}`;
      await AsyncStorage.setItem(KEY, id);
    }
    cached = id;
    return id;
  } catch {
    // Sin almacenamiento: usamos un id en memoria (dura lo que la sesion de la app).
    if (!cached) cached = `guest-${uuidV4()}`;
    return cached;
  }
}
