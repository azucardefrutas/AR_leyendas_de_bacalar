# Editor Visual Composition Design

## Objetivo

Agregar al editor manual de historias creadas desde cero un bloque Editor.js llamado `composition` que permita componer imágenes, modelos 3D y marcadores en un lienzo libre tipo Word/Canva, sin convertir el resto del documento en posicionamiento absoluto.

El texto y los bloques actuales seguirán en el flujo normal de Editor.js. La manipulación libre quedará aislada dentro de `CompositionBlockTool`.

## Alcance

La entrega incluye:

- Insertar un bloque `composition` desde la toolbar del editor.
- Agregar imágenes, modelos 3D y marcadores registrados en `assets`.
- Subir recursos nuevos mediante los servicios y modales existentes.
- Seleccionar, mover y redimensionar capas con mouse, touch o lápiz.
- Duplicar, eliminar, bloquear, alinear y cambiar el orden visual de capas.
- Ajustar opacidad con un control básico.
- Alternar un modelo 3D entre modo mover y modo manipular.
- Persistir canvas y capas completas en `legend_pages.editor_data`.
- Reconstruir la misma composición al recargar.
- Renderizar composiciones en `EditorJsPreview`.
- Reutilizar el mismo bloque en editor normal y fullscreen.

La entrega no incluye:

- Posicionamiento absoluto de todos los bloques de Editor.js.
- Filtros de imagen, recorte, máscaras, animaciones o edición avanzada.
- Rotación gestual de capas en esta fase. El campo `rotation` se conservará en el contrato con valor inicial `0` para evolución compatible.
- Nuevas tablas, columnas, RLS, RPC, buckets o migraciones.
- Cambios de backend si el contrato actual de assets y páginas ya admite el JSON.
- Cambios en PDF, CONALITEG, hotspots, catálogo, detalle, Auth o roles.
- Deploy.

## Decisión de interacción

Se usará la opción visual aprobada: toolbar contextual flotante.

El bloque tendrá una barra superior estable para:

- Agregar imagen.
- Agregar modelo 3D.
- Agregar marcador.
- Cambiar fondo.
- Abrir o cerrar el panel temporal de capas.

Cuando una capa esté seleccionada aparecerá una barra contextual compacta cerca de ella con:

- Mover o manipular 3D, cuando aplique.
- Duplicar.
- Traer al frente.
- Enviar atrás.
- Bloquear o desbloquear.
- Alinear izquierda, centro o derecha.
- Tamaño 25%, 50% o 100%.
- Opacidad.
- Eliminar.

La barra se reposicionará dentro de los límites del canvas para no quedar cortada. En móvil se colocará en una franja inferior del bloque si no existe espacio seguro alrededor de la capa.

## Arquitectura frontend

### CompositionBlockTool

Archivo:

`frontend/src/components/creator/editor-tools/CompositionBlockTool.js`

Responsabilidades:

- Implementar el contrato Editor.js: `constructor`, `render`, `save`, `validate`, `destroy` y `sanitize`.
- Normalizar datos antiguos o incompletos.
- Montar y desmontar el componente React del lienzo mediante `createRoot`.
- Mantener una referencia mutable a los datos más recientes para que `save()` nunca dependa de un render pendiente de React.
- Notificar cambios al editor mediante `config.onDataChange`.

No manejará subidas directamente. Recibirá callbacks configurados por `EditorialRichEditor`.

### CompositionCanvas

Archivo:

`frontend/src/components/creator/editor-composition/CompositionCanvas.jsx`

Responsabilidades:

- Renderizar el canvas lógico y la toolbar.
- Administrar selección única.
- Abrir los modales existentes a través de callbacks del editor.
- Aplicar operaciones de capas mediante funciones puras.
- Medir el ancho disponible y calcular la escala visual.
- Mantener el canvas accesible mediante botones con nombres explícitos y estado seleccionado/bloqueado.

### CompositionLayer

Archivo:

`frontend/src/components/creator/editor-composition/CompositionLayer.jsx`

Responsabilidades:

- Renderizar una capa según `image`, `marker` o `model3d`.
- Gestionar drag y resize con Pointer Events.
- Usar `setPointerCapture` durante interacciones.
- Convertir deltas visuales a coordenadas lógicas dividiendo por la escala actual.
- Limitar posición y tamaño dentro del canvas lógico.
- Ignorar puntos táctiles adicionales mientras existe una interacción activa.
- Evitar drag cuando la capa está bloqueada o el modelo está en modo manipulación 3D.

### Estado y operaciones

Archivo:

`frontend/src/components/creator/editor-composition/compositionState.js`

Contendrá funciones puras y testeables:

- `normalizeCompositionData`
- `normalizeCompositionLayer`
- `moveLayer`
- `resizeLayer`
- `duplicateLayer`
- `removeLayer`
- `setLayerLocked`
- `setLayerOpacity`
- `alignLayer`
- `bringLayerForward`
- `sendLayerBackward`
- `addLayer`
- `getCompositionScale`

Las funciones devolverán nuevos objetos para mantener actualizaciones predecibles, pero el tool conservará siempre el último resultado en su referencia mutable.

## Lienzo lógico y responsive

El canvas canónico será de `900 × 560`.

Los valores persistidos siempre estarán expresados en ese sistema lógico:

- `x`
- `y`
- `width`
- `height`

El bloque medirá el ancho disponible:

```txt
scale = min(1, availableWidth / 900)
visualHeight = 560 * scale
```

El contenido interno mantendrá `900 × 560` y se mostrará con `transform: scale(scale)` y `transform-origin: top left`. El contenedor exterior reservará la altura escalada.

Esto evita reescribir posiciones al cambiar entre editor normal, fullscreen, tablet o móvil.

Límites:

- Una capa no podrá quedar completamente fuera del canvas.
- Tamaño mínimo: `48 × 48` lógico.
- Tamaño máximo: dimensiones del canvas.
- Las capas nuevas se colocarán con desplazamiento incremental para evitar superposición exacta.

## Contrato JSON

El bloque persistido tendrá esta forma:

```json
{
  "type": "composition",
  "data": {
    "canvas": {
      "width": 900,
      "height": 560,
      "background": "#ffffff"
    },
    "layers": [
      {
        "id": "layer-uuid",
        "type": "image",
        "assetId": "asset-uuid",
        "title": "cueva.jpg",
        "url": "https://url-resuelta",
        "x": 0,
        "y": 0,
        "width": 900,
        "height": 560,
        "zIndex": 1,
        "rotation": 0,
        "opacity": 1,
        "locked": false
      }
    ]
  }
}
```

Reglas:

- No se guardarán blobs, `File`, base64 ni objetos Three.js.
- `assetId` será la referencia persistente principal.
- `url` será una URL utilizable cuando el flujo actual la entregue, pero podrá resolverse de nuevo desde `assets`.
- `zIndex` se normalizará como una secuencia estable para evitar crecimiento indefinido.
- `opacity` se limitará entre `0.1` y `1`.
- `rotation` se limitará entre `-180` y `180`, aunque la UI inicial no lo modificará.
- IDs de capas se crearán con `crypto.randomUUID()` y un fallback local seguro si no está disponible.

## Integración con assets y modales

`EditorialRichEditor` continuará siendo el dueño del inventario de modelos y marcadores y de los callbacks de subida:

- `uploadEditorImage`
- `uploadEditorModel`
- `uploadEditorMarker`

Los modales existentes recibirán un contexto opcional:

```txt
target = document | composition
```

Cuando el target sea `composition`, la confirmación no insertará un bloque Editor.js independiente. Enviará el asset normalizado al `CompositionBlockTool` activo para crear una capa.

Los recursos mantendrán los tipos existentes:

- Imagen editorial: `illustration` con `metadata.kind = editor_image`.
- Modelo: `model_3d`.
- Marcador: `marker_image`.

No se duplicará ningún endpoint ni servicio de subida.

## Imagen de fondo

Una imagen puede ocupar todo el canvas mediante una acción `Usar como fondo`.

La acción:

- establece `x = 0`, `y = 0`;
- establece `width = 900`, `height = 560`;
- la envía al fondo;
- conserva la imagen como una capa normal;
- permite bloquearla.

No se copiará la URL al campo `canvas.background`. Ese campo permanecerá reservado para color sólido.

## Modelo 3D

El modelo se renderizará con `Model3DViewer` en modo `embedded`, `hideHeading` y `compactControls`.

El componente aceptará un nuevo indicador controlado para activar o desactivar OrbitControls. El comportamiento será:

- Modo mover, por defecto: el canvas 3D no captura interacción; el layer recibe drag y selección.
- Modo manipular 3D: OrbitControls recibe pointer/touch para rotación y zoom; el layer deja de moverse.
- Escape, cambio de selección o pulsar otra vez el botón devuelve el modelo a modo mover.

Los modelos se cargarán de forma diferida:

- Placeholder ligero antes de entrar en viewport.
- `IntersectionObserver` con margen de precarga.
- `Suspense` durante la descarga.
- Solo las capas visibles o activadas montarán el canvas Three.js.

El modelo no tendrá tarjeta azul, encabezado administrativo ni controles grandes.

## Preview

`EditorJsPreview` reconocerá `type: composition`.

La preview:

- reconstruirá el canvas lógico con la misma escala responsive;
- respetará posición, tamaño, orden, opacidad y fondo;
- renderizará imágenes y marcadores directamente;
- mostrará modelos como placeholder transparente en su posición;
- cargará el modelo interactivo solo al pulsar `Ver modelo`.

La preview será de solo lectura y no mostrará handles, toolbars ni selección.

`rendered_html` seguirá siendo una representación secundaria. La fuente de verdad para la composición será `editor_data`. El conversor HTML emitirá una estructura estática segura para imagen y marcador, y un placeholder descriptivo para modelo 3D. No intentará serializar un canvas WebGL.

## Persistencia y guardado

No se necesita un nuevo flujo de guardado.

`editor.save()` llamará a `CompositionBlockTool.save()`, que devolverá el canvas y las capas normalizadas. El flujo actual guardará el objeto dentro de:

```txt
legend_pages.editor_data.blocks[]
```

El guardado existente seguirá enviando:

- `editor_data`
- `rendered_html`
- `text_content`
- `content_format = editorjs`
- `editor_stats`

El texto plano de una composición incluirá únicamente nombres o captions útiles, nunca UUIDs ni URLs.

## Accesibilidad

- Botones con `aria-label` y `title`.
- Capa seleccionada con `aria-selected`.
- Capa bloqueada con estado accesible.
- Handles de resize con tamaño táctil mínimo de 44 px, aunque el indicador visual sea menor.
- Atajos básicos cuando una capa está seleccionada:
  - Flechas: mover 1 unidad lógica.
  - Shift + flechas: mover 10 unidades.
  - Delete o Backspace: eliminar si no está bloqueada.
  - Escape: salir de manipulación 3D o deseleccionar.
- El color cyan de selección se acompañará de borde y handles; no será el único indicador.
- Bajo `prefers-reduced-motion` se eliminarán transiciones no esenciales.

## Manejo de errores

- Asset sin URL: se mostrará placeholder legible y opción para eliminar la capa.
- Fallo de GLB/GLTF: el bloque no fallará; mostrará error local dentro de la capa.
- Fallo al subir: el modal conservará el mensaje actual y no agregará una capa incompleta.
- Datos inválidos al cargar: se normalizarán o descartarán únicamente las capas irrecuperables.
- Fallo al montar React: Editor.js conservará un mensaje local y permitirá eliminar el bloque.

## Archivos previstos

Crear:

- `frontend/src/components/creator/editor-tools/CompositionBlockTool.js`
- `frontend/src/components/creator/editor-composition/CompositionCanvas.jsx`
- `frontend/src/components/creator/editor-composition/CompositionLayer.jsx`
- `frontend/src/components/creator/editor-composition/compositionState.js`
- `frontend/src/components/creator/editor-composition/compositionState.test.mjs`
- `frontend/src/components/creator/editor-composition/CompositionPreview.jsx`

Modificar:

- `frontend/src/components/creator/EditorialRichEditor.jsx`
- `frontend/src/components/creator/EditorJsToolbar.jsx`
- `frontend/src/components/creator/EditorJsPreview.jsx`
- `frontend/src/components/creator/editor-modals/InsertImageModal.jsx`
- `frontend/src/components/creator/editor-modals/InsertModel3DModal.jsx`
- `frontend/src/components/creator/editor-modals/InsertMarkerModal.jsx`
- `frontend/src/components/3d/Model3DViewer.jsx`
- `frontend/src/components/3d/model3dViewerOptions.js`
- `frontend/src/utils/editorJsToHtml.js`
- `frontend/src/styles/index.css`

No se prevén cambios backend.

## Estrategia de pruebas

### Unitarias

- Normalización de canvas y capas.
- Clamp de posición y tamaño.
- Escalado entre coordenadas visuales y lógicas.
- Orden estable de `zIndex`.
- Duplicado con ID nuevo y desplazamiento.
- Bloqueo de movimiento y resize.
- Opacidad y alineación.
- Serialización completa del tool.
- Conversión HTML sin UUIDs visibles ni HTML inseguro.
- Opciones de OrbitControls según modo mover/manipular.

Las pruebas se escribirán antes de cada implementación y se verificará que fallen por la ausencia del comportamiento.

### Manuales

Editor normal y fullscreen:

1. Insertar composición.
2. Agregar imagen y usarla como fondo.
3. Agregar modelo encima.
4. Mover y redimensionar el modelo.
5. Activar manipulación 3D y rotarlo.
6. Volver a modo mover.
7. Agregar marcador.
8. Cambiar orden, opacidad y bloqueo.
9. Guardar.
10. Recargar.
11. Confirmar posiciones y propiedades.
12. Abrir preview.

Responsive:

- 375 px.
- 768 px.
- 1024 px.
- 1366 px.
- Fullscreen.

### Build y regresión

- `npm.cmd run lint`
- pruebas Node `.test.mjs`
- `npm.cmd run build`
- repetir build fuera del sandbox si OneDrive bloquea Vite
- verificar consola del navegador
- comprobar editor normal y fullscreen
- comprobar que los bloques existentes siguen insertando y guardando
- smoke visual de PDF, CONALITEG, catálogo y detalle sin modificar sus flujos
- `git status --short`
- `git diff --stat`
- `git diff --check`

## Criterio de aceptación

La entrega se acepta cuando una imagen puede ocupar el fondo de una composición, un modelo 3D puede colocarse encima, moverse, redimensionarse, traerse al frente y manipularse en 3D; un marcador puede añadirse y moverse; y después de guardar y recargar todas las capas conservan `assetId`, posición, tamaño, orden, opacidad y bloqueo dentro de `legend_pages.editor_data`.

El resto de Editor.js conserva su comportamiento por bloques y no se modifica ningún flujo PDF, CONALITEG, hotspot, Auth, RLS, Storage o deploy.
