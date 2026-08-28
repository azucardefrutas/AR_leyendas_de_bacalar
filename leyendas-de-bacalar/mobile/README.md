# Leyendas AR — App móvil

App móvil (Expo / React Native) de Realidad Aumentada para *Leyendas de Bacalar*:
inicias sesión, ves los modelos 3D, escaneas el marcador físico con la cámara y el
modelo aparece en AR. Guarda localmente los que ya escaneaste.

## Arquitectura

- **Datos:** Supabase directo con el token del usuario logueado (RLS permite la lectura
  a usuarios autenticados). No depende del backend Express. `src/lib/arScenes.js` replica
  el mapeo del feed `getMobileArScenes`.
- **AR de piso:** Scene Viewer nativo de Android (`src/lib/sceneViewer.js`).
- **AR de marcador:** Viro nativo (`@reactvision/react-viro`), con
  `ViroARSceneNavigator`, reconocimiento de imágenes y modelos GLB en `src/screens/ArScene.js`.
- **Animaciones:** los clips del GLB se configuran en Marcadores para la app. La rueda
  `src/components/EmoteWheel.js` permite elegir un clip del modelo reconocido.
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

```powershell
npm.cmd run android
```

- Requiere Android SDK, Java y un Android conectado con depuración USB, o un emulador
  para las comprobaciones que no requieren cámara real.
- El comando compila e instala la app nativa de desarrollo e inicia Metro.
- **Expo Go no incluye Viro.** Esta app necesita su propio binario nativo; escanear
  solamente el QR de Expo Go no prueba la experiencia AR.
- Para verificar marcadores y animaciones usa un teléfono compatible con ARCore.

Referencia: [código nativo y development builds de Expo](https://docs.expo.dev/workflow/customizing/).

## APK local de pruebas

Con el proyecto `android/` ya generado y sus herramientas disponibles, desde esa carpeta:

```powershell
$env:NODE_ENV = 'production'
.\gradlew.bat :app:assembleRelease --no-daemon --console=plain
```

La salida esperada es `android/app/build/outputs/apk/release/app-release.apk`.
Comprueba que la compilación finalice correctamente antes de distribuir ese archivo.
La configuración Android local revisada usa la **firma de desarrollo también en
release**: no es una firma de producción ni una publicación en Google Play.

En Windows/OneDrive pueden bloquearse carpetas generadas de Kotlin. No borres
dependencias ni cambies sus atributos a ciegas; una copia local aislada fuera de
OneDrive permite comprobar la compilación sin alterar el original.
Mantén también una ruta corta para CMake/Ninja. Si usas una unidad temporal,
el proyecto debe estar en una subcarpeta (por ejemplo `R:\app`), no directamente
en la raíz de la unidad: el descubrimiento de paquetes de Expo requiere esa carpeta.

`expo export --platform android` valida el empaquetado JavaScript/Hermes, pero
**no genera una APK ni demuestra que la cámara funcione**.

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

La app consulta únicamente asociaciones publicadas de tipo `physical_edition`,
con una leyenda también publicada. No usa los hotspots del lector digital.
Una leyenda puede tener varios pares; cada marcador apunta a un GLB y cada GLB
puede contener varios clips. Importar un ZIP crea modelos separados: no fusiona
animaciones de distintos archivos.

Comprobación en dispositivo:

1. Iniciar sesión con una cuenta real y cargar los marcadores publicados.
2. Escanear un marcador vinculado a un GLB con varios clips.
3. Abrir Emotes, elegir un clip y comprobar su reproducción y el retorno a la
   animación inicial, según su configuración.
4. Repetir el mismo emote, cambiar a otro y perder/recuperar el marcador.
5. Probar también un GLB estático: debe verse sin ofrecer clips inexistentes.

Consulta el [informe de verificación](../../docs/verification/modelos-animados.md)
para separar las pruebas realizadas de las pendientes.
