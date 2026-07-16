import { Linking, Platform } from 'react-native';

// AR de piso NATIVO. En Android usa Google Scene Viewer (abre el GLB en AR real,
// colocándolo en el piso) vía un intent. iOS no soporta Scene Viewer (usaría AR
// Quick Look con .usdz, que no tenemos), así que ahí caemos al visor web.
export async function openFloorAr(modelUrl, name = 'Modelo 3D') {
  if (!modelUrl) return false;

  if (Platform.OS === 'android') {
    const fallback = 'https://arvr.google.com/scene-viewer';
    const intentUrl =
      `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(modelUrl)}` +
      `&mode=ar_preferred&title=${encodeURIComponent(name)}` +
      `#Intent;scheme=https;package=com.google.android.googlequicksearchbox;` +
      `action=android.intent.action.VIEW;` +
      `S.browser_fallback_url=${encodeURIComponent(fallback)};end;`;
    try {
      await Linking.openURL(intentUrl);
      return true;
    } catch {
      // Si el intent falla, intentamos la URL directa abajo.
    }
  }

  try {
    await Linking.openURL(
      `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(modelUrl)}&mode=ar_preferred`,
    );
    return true;
  } catch {
    return false;
  }
}
