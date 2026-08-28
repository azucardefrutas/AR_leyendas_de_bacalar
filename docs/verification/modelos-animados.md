# Modelos animados: integracion y verificacion

## Alcance

- Una leyenda puede tener varios modelos y varias asociaciones de marcador.
- Cada marcador fisico apunta a un modelo GLB; el GLB puede contener varios clips.
- Distintos marcadores pueden compartir el mismo modelo sin desaparecer de la app.
- La biblioteca movil y la historia digital usan escenas separadas mediante el campo JSON existente `interaction_config.scope`.
- Una sola carga detecta clips internos. Los modelos estaticos siguen siendo validos.
- En Marcadores para la app se admiten GLB individuales, varios GLB o ZIP con GLB. Se importan como modelos separados; no se fusionan esqueletos ni animaciones de archivos diferentes.
- Limites del importador: 40 modelos, 100 MB por GLB, 250 MB por lote y 256 entradas por ZIP. Solo se extraen GLB, sin escribir las rutas internas del ZIP al disco.
- La rueda movil ofrece los clips del modelo reconocido, seis por pagina, y reproduce el emote elegido antes de volver a la animacion inicial.

## Causas corregidas

1. Los visores usaban distintas formas de la relacion del modelo y de su URL; una escena valida podia aparecer sin modelo.
2. La configuracion antigua sin clips desactivaba la reproduccion automatica, aunque el archivo si tuviera animaciones.
3. El encuadre del GLB de Meshy se calculaba antes de actualizar sus huesos. El archivo cargaba, pero quedaba fuera de cuadro.
4. Las miniaturas compartian el objeto de Three.js en vez de clonar el esqueleto por instancia.
5. La app eliminaba asociaciones distintas cuando compartian la URL del modelo, y resolvia el codigo solo por escena.
6. El modo de documento no conservaba la configuracion de animacion al guardar el recurso.
7. Guardar antes de terminar el analisis, o volver a seleccionar un modelo recien subido, podia perder los clips detectados.
8. Cambiar identidades de paginas podia hacer que PageFlip y React intentaran eliminar el mismo nodo movido.

## Verificacion realizada

- GLB real de Meshy: `Meshy_AI_pirata_flakita_biped_Animation_Walking_withSkin.glb`.
- Clip real encontrado: `Armature|walking_man|baselayer`, conservado sin renombrarlo.
- Render visible y animado en la configuracion, en el lector manual y en el lector de documento, usando los componentes reales en una prueba local aislada.
- Cambios medidos entre fotogramas: 4119 pixeles en la configuracion y 11610 en el lector de documento; al pausar, 0 pixeles cambiados en la comprobacion estable.
- El mismo modelo sin configuracion guardada tambien aparece y reproduce su clip.
- Frontend: build de produccion correcto. Pruebas de deteccion, ZIP, clonacion de huesos, asociaciones, reintentos e insercion en el editor.
- Backend: build de sintaxis y pruebas correctos, incluidas separacion de bibliotecas y dos marcadores para un modelo.
- Movil: pruebas de datos y geometria de la rueda correctas; exportacion Android/Hermes correcta (878 modulos). Ademas, se genero y verifico una APK local de pruebas; no se ha instalado ni probado con camara.
- Bateria completa repetida: 181 pruebas correctas (frontend Node 87, frontend Vitest 50, backend 39 y movil 5). Builds web y backend repetidos correctamente.
- ESLint de archivos modificados: sin errores; quedan avisos previos de imports/variables y dependencias de hooks.
- No se cambiaron versiones ni codigo de dependencias, autenticacion, roles, archivos de variables de entorno, schema, RLS, RPC, migraciones ni despliegue. Gradle genera caches de compilacion; el empaquetado Android final se realizo en una copia temporal separada.

## APK local de pruebas

Verificacion del 28 de agosto de 2026:

- Archivo: `leyendas-de-bacalar/mobile/output/animation-smoke/Leyendas-AR-emotes-pruebas.apk` (excluido de Git).
- Tamano: 138945449 bytes. Registro final de Gradle: `BUILD SUCCESSFUL in 15m 13s`.
- SHA-256: `F796E17CE991C88F9A763F27F946862F84AE2184B62A2C147A3948EC691E4DE8`.
- Paquete: `mx.bacalar.leyendasar`; version nativa `1.0.0`, codigo `1`; Android minimo API 24, destino API 36.
- Firma APK v2 verificada con `apksigner`. Usa la firma de desarrollo existente, no una firma de produccion.
- El bundle incluido tiene 2503468 bytes y contiene los identificadores de Emotes, cierre de rueda, configuracion de animaciones y filtro `physical_edition`.
- Se confirmaron `libviro_renderer.so` y `libviro_arcore.so` para ARM64 y ARM de 32 bits. Aunque el paquete enumera tambien x86/x86_64, esas arquitecturas no contienen el motor Viro completo; no se afirma compatibilidad AR con emuladores x86.
- Los 17 archivos de `mobile/src` coinciden por hash con la copia usada para compilar.
- La APK publicada anteriormente no se sustituyo. No se instalo ni desinstalo ninguna app.
- El proyecto Android generado conserva version `1.0.0`, mientras `app.json` declara `1.1.0`. Se mantuvieron ambos intactos; al preparar una distribucion oficial hay que alinear version y firma. No desinstalar una app existente para forzar esta APK de pruebas, porque podria perderse el historial local.

Condiciones del empaquetado:

1. Se reutilizaron las versiones instaladas y el proyecto Android existente, con Gradle 9.3.1 y Java 21 de Android Studio.
2. OneDrive bloqueo la limpieza de directorios Kotlin de solo lectura. Se compilo una copia temporal fuera de OneDrive, quitando ese atributo solo de sus directorios.
3. CMake/Ninja excedio el limite de rutas de Windows. Se uso una unidad temporal con una subcarpeta del proyecto, no la raiz de la unidad.
4. La primera copia omitio carpetas internas llamadas `output`; se repusieron desde las dependencias originales sin reinstalar ni actualizar paquetes. No excluir ese nombre globalmente al copiar dependencias.
5. Para evitar caches Kotlin con raices C:/R: diferentes se pasaron `-Pkotlin.incremental=false` y `-Pkotlin.compiler.execution.strategy=in-process` solo al comando de compilacion.
6. Se ejecuto `:app:assembleRelease --no-daemon --no-parallel --console=plain`, con `NODE_ENV=production` y `JAVA_HOME` limitados al proceso. No se cambiaron archivos `.env` ni ajustes globales de Java.

## Auditoria de datos

Lectura de 64 assets, 4 escenas, 1 hotspot, 3 marcadores y 1 pagina. No se encontraron referencias rotas ni candidatos confirmados a modelos huerfanos. No se borro ningun registro ni archivo de Storage.

De los cuatro GLB registrados, tres no tenian clips y el de Meshy contenia el clip indicado arriba. No habia asociaciones `physical_edition` en el momento de la auditoria; la app necesita una asociacion real para poder escanearla.

## Pendiente de comprobacion real

1. Guardar y volver a abrir los modelos con una sesion real de autor, en ambos modos de historia. Las pruebas de escritura de esta tarea usan dobles de los servicios y no publican datos de prueba en la base real.
2. Repetir la revision visual en pantalla movil. La politica de la herramienta de navegador bloqueo la comprobacion local final; no se intento eludirla.
3. Elegir un marcador real, vincularlo a un GLB con varios clips y probar reconocimiento, rueda, cambio/repeticion de emote y perdida/recuperacion del marcador en Android. La comprobacion del 28 de agosto no encontro dispositivo conectado ni emulador configurado.
4. Confirmar un archivo de Tripo real. La inspeccion usa el formato GLB/glTF, pero esta tarea solo verifico visualmente el archivo de Meshy.
5. Commit/push y despliegue web/backend no realizados en este paso. La nueva APK solo esta disponible localmente para pruebas.

## Archivos principales

- Frontend 3D: `Model3DViewer.jsx`, `ModelAnimationSettings.jsx`, `ArSceneModal.jsx`, `MarkerModelPreview.jsx`, `modelScene.js`, `cloneModelScene.js`, `modelFileInspection.js`, `modelArchive.js`, `modelAnimationConfig.js`.
- Autor y lector: `LegendEditor.jsx`, `EditorialRichEditor.jsx`, `InsertModel3DModal.jsx`, `ConalitegStyleReader.jsx`, `PhysicalMarkersPage.jsx`.
- Servicios web: `assetService.js`, `backendApiService.js`, estilos en `index.css`.
- Backend: `legendHotspots.routes.js`, `interactiveHotspots.service.js`, `mobileAr.service.js`, `modelAnimationConfig.js` y lista de verificacion de sintaxis en `package.json`.
- Movil: `arScenes.js`, `arSceneData.js`, `emoteWheelLayout.js`, `EmoteWheel.js`, `ArScene.js`, `ScanScreen.js`.
- Guia movil: `mobile/README.md`, corregida para Viro nativo, compilacion local y pruebas de emotes; no indica Expo Go como ruta valida para esta app.
- Pruebas de regresion junto a los modulos; salidas temporales excluidas de Git.
