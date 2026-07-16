# Leyendas AR — App móvil

App móvil (Expo / React Native) de Realidad Aumentada para *Leyendas de Bacalar*:
inicias sesión, ves los modelos 3D, escaneas el marcador físico con la cámara y el
modelo aparece en AR. Guarda localmente los que ya escaneaste.

## Arquitectura

- **Datos:** Supabase directo con el token del usuario logueado (RLS permite la lectura
  a usuarios autenticados). No depende del backend Express. `src/lib/arScenes.js` replica
  el mapeo del feed `getMobileArScenes`.
- **AR de piso:** Scene Viewer nativo de Android (`src/lib/sceneViewer.js`).
- **AR de marcador:** WebView con MindAR (HTML autocontenido, `src/lib/arHtml.js`).
- **Sesión + historial:** AsyncStorage (`src/lib/supabase.js`, `src/lib/scanHistory.js`).

## Configuración

1. `npm install`
2. Copia `.env.example` a `.env.local` y pon los valores reales (los mismos que el
   frontend web: `leyendas-de-bacalar/frontend/.env`):
   ```
   EXPO_PUBLIC_SUPABASE_URL=...
   EXPO_PUBLIC_SUPABASE_ANON_KEY=...
   ```
   `.env.local` está en `.gitignore` (no se sube).

## Correr en desarrollo

```
npx expo start
```

- Escanea el QR con la app **Expo Go** en tu teléfono para probar login, lista y
  "ya escaneados".
- **Nota:** el AR de marcador usa la cámara dentro de un WebView. En **Expo Go** el
  permiso de cámara del WebView puede no funcionar; para probar el AR completo usa un
  **development build** o el APK de EAS (ver abajo).

## Generar el APK (nube, sin Android SDK local)

Requiere una cuenta gratis de Expo (https://expo.dev).

```
npm install -g eas-cli      # o usa: npx eas-cli@latest
eas login                   # tu cuenta de Expo
eas build -p android --profile preview
```

Al terminar, EAS te da un enlace para descargar el **`.apk`** (perfil `preview` en
`eas.json` genera APK instalable, no app-bundle).

## Estado

Base lista (Supabase, datos, AR, historial). Las pantallas finales (Login → Lista →
Escanear → Ya escaneados) se construyen sobre el diseño.
