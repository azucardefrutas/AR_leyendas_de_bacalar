# Editor Hybrid Media Layout Design

## Estado

Esta especificación sustituye el diseño anterior basado en un bloque `composition` con canvas visible de 900×560.

La decisión aprobada es un editor híbrido tipo Word:

- recursos libres superpuestos sobre toda la hoja;
- recursos anclados con ajuste de texto a izquierda o derecha;
- sin caja exterior, fondo cuadriculado, toolbar superior permanente ni panel de capas visible;
- controles únicamente al seleccionar el recurso o abrir su menú contextual.

## Objetivo

Permitir que imágenes, modelos 3D y marcadores insertados en historias creadas desde cero se comporten como objetos editoriales de Word:

- mover libremente sobre la hoja;
- redimensionar;
- superponer sobre texto y otros recursos;
- ajustar texto a izquierda o derecha;
- cambiar orden visual;
- bloquear;
- duplicar;
- recortar imágenes y marcadores sin modificar el archivo original;
- guardar y reconstruir el diseño desde `legend_pages.editor_data`.

El texto continúa siendo administrado por Editor.js. No se convierte todo el editor en un canvas absoluto.

## Problema raíz

La implementación anterior trató la composición como una aplicación separada dentro del documento:

```txt
Editor.js
→ bloque composition
→ canvas fijo 900×560
→ borde, fondo y toolbar permanente
```

Esto provoca:

- una caja visual que no pertenece a la hoja editorial;
- límites artificiales para mover recursos;
- exceso de controles siempre visibles;
- imposibilidad de superponer un recurso sobre texto fuera del bloque;
- un flujo distinto al de insertar una imagen normal;
- recorte y ajuste de texto difíciles de integrar.

La solución no es ocultar el borde. Debe cambiar el modelo de interacción y persistencia.

## Arquitectura aprobada

Cada imagen, modelo 3D o marcador seguirá siendo un bloque Editor.js real con su propio JSON.

Los tools existentes evolucionarán:

- `ImageEditorBlockTool`
- `Model3DBlockTool`
- `MarkerBlockTool`

No se usará un `CompositionBlockTool` visible.

Cada bloque multimedia funcionará como ancla de persistencia. Según su modo:

### Modo libre

El bloque conserva un ancla mínima dentro del orden de Editor.js, pero el recurso se renderiza en una capa absoluta relativa a la hoja editorial.

```txt
editorial-editor__surface
└── codex-editor__redactor (position: relative)
    ├── bloques de texto
    ├── ancla invisible del recurso
    └── recurso libre (position: absolute)
```

El recurso puede:

- superponerse al texto;
- moverse por la hoja;
- usar z-index;
- colocarse delante o detrás del texto;
- conservar una relación lógica con su bloque ancla.

### Modo ajuste de texto

El recurso se renderiza en el flujo del documento desde su bloque ancla.

Modos:

- `wrap-left`: recurso a la izquierda, texto posterior rodeándolo;
- `wrap-right`: recurso a la derecha, texto posterior rodeándolo;
- `inline`: recurso centrado en una línea propia, compatible con bloques existentes.

El bloque ancla no tendrá una caja administrativa. El recurso será el contenido visible.

## Alcance

La entrega incluye:

- eliminar visualmente el canvas enmarcado de composición;
- retirar toolbar superior permanente y panel de capas;
- insertar imagen, modelo o marcador directamente como objeto híbrido;
- seleccionar con clic o toque;
- abrir menú contextual con selección o clic derecho;
- mover libremente con Pointer Events;
- redimensionar desde esquinas;
- cambiar entre `free`, `wrap-left`, `wrap-right` e `inline`;
- poner delante o detrás del texto;
- traer al frente o enviar atrás entre recursos;
- duplicar;
- bloquear;
- eliminar;
- recorte no destructivo de imágenes y marcadores;
- modo mover/manipular para modelos 3D;
- persistencia en `editor_data`;
- preview equivalente sin controles;
- funcionamiento en editor normal y fullscreen.

La entrega no incluye:

- edición destructiva del archivo en Storage;
- filtros, eliminación de fondo o retoque fotográfico;
- texto editable dentro de figuras;
- rotación gestual de imágenes en esta fase;
- selección múltiple;
- guías inteligentes, snapping o reglas;
- cambios de backend, DB, RLS, Storage o deploy.

## Interfaz

### Estado normal

Un recurso no seleccionado no muestra:

- borde exterior;
- fondo especial;
- nombre administrativo;
- toolbar;
- handles;
- caja de composición.

Se ve únicamente la imagen, marcador o modelo.

### Estado seleccionado

Al hacer clic o tocar:

- aparece un borde cyan fino;
- aparecen cuatro handles de resize;
- aparece un botón compacto de opciones;
- se abre una pequeña barra contextual junto al recurso cuando hay espacio.

La barra usa iconos y labels breves. No ocupa todo el ancho de la hoja.

### Clic derecho

`contextmenu` abre el mismo menú contextual en la posición del puntero.

El menú incluye:

```txt
Diseño
  En línea
  Ajustar a la izquierda
  Ajustar a la derecha
  Flotar libremente

Orden
  Delante del texto
  Detrás del texto
  Traer al frente
  Enviar atrás

Edición
  Recortar
  Duplicar
  Bloquear / desbloquear
  Eliminar
```

Para modelos 3D agrega:

```txt
Mover objeto
Manipular modelo 3D
```

### Menú compacto

El diseño seguirá la referencia proporcionada:

- superficie blanca;
- borde gris muy suave;
- radio máximo de 8–10 px;
- sombra difusa de baja opacidad;
- texto slate oscuro;
- cyan solamente para selección y estado activo;
- sin gradientes;
- sin barra horizontal sobredimensionada;
- cerrado al hacer clic fuera, Escape o elegir acción.

## Contrato JSON

Los bloques existentes mantienen sus nombres:

```txt
image
model3d
leyendaMarker
```

Cada bloque extiende `layout`:

```json
{
  "type": "image",
  "data": {
    "assetId": "asset-uuid",
    "file": {
      "url": "https://url-resuelta"
    },
    "alt": "Cueva de Bacalar",
    "caption": "",
    "layout": {
      "mode": "free",
      "anchorBlockId": "editor-block-id",
      "x": 210,
      "y": 360,
      "width": 420,
      "height": 280,
      "align": "center",
      "layer": "above-text",
      "zIndex": 3,
      "locked": false,
      "opacity": 1,
      "crop": {
        "x": 0,
        "y": 0,
        "width": 1,
        "height": 1,
        "zoom": 1
      }
    }
  }
}
```

### Campos

- `mode`: `inline | wrap-left | wrap-right | free`.
- `anchorBlockId`: ID estable del bloque Editor.js que sirve como ancla.
- `x`, `y`: coordenadas lógicas dentro de la hoja; aplican a `free`.
- `width`, `height`: tamaño visible.
- `align`: compatibilidad con layouts anteriores.
- `layer`: `behind-text | above-text`.
- `zIndex`: orden entre recursos de la misma capa.
- `locked`: bloquea movimiento, resize y recorte.
- `opacity`: `0.1..1`.
- `crop`: ventana normalizada de recorte.

No se guardarán blobs, base64, elementos DOM, estado React ni objetos Three.js.

## Migración de datos existentes

### Bloques multimedia actuales

Los layouts antiguos:

```json
{
  "width": 520,
  "height": "auto",
  "align": "center"
}
```

se interpretarán como:

```json
{
  "mode": "inline",
  "width": 520,
  "height": "auto",
  "align": "center",
  "layer": "above-text",
  "zIndex": 1,
  "locked": false,
  "opacity": 1
}
```

### Bloques composition creados durante la fase anterior

El tool anterior seguirá pudiendo leer temporalmente `type: composition`.

Al guardar de nuevo:

- cada layer se convertirá en un bloque multimedia independiente;
- se conservarán asset, posición, tamaño, z-index, opacidad y bloqueo;
- el bloque `composition` se eliminará después de una conversión exitosa.

La migración será cliente-side y no requiere SQL.

## Coordenadas de hoja

El modo libre usará como referencia la superficie editorial real, no un rectángulo independiente.

La hoja tendrá:

```css
.editorial-editor__surface,
.codex-editor__redactor {
  position: relative;
  overflow: visible;
}
```

Las coordenadas se guardarán en un espacio lógico basado en el ancho editorial canónico:

```txt
logicalWidth = 1120
scale = renderedWidth / logicalWidth
logicalX = renderedX / scale
logicalY = renderedY / scale
```

`y` se mide desde el inicio de la redactor surface, por lo que puede abarcar toda la página y no un bloque de 560 px.

En responsive:

- `x`, `width` y `height` se escalan con la hoja;
- `y` conserva relación con el contenido;
- los objetos no pueden desaparecer completamente fuera de la hoja;
- en móvil, los objetos libres se mantienen dentro del ancho visible.

## Ajuste de texto

El modo wrap usa el bloque ancla en el flujo de Editor.js.

### Wrap izquierdo

```css
float: left;
margin: 0 24px 16px 0;
```

### Wrap derecho

```css
float: right;
margin: 0 0 16px 24px;
```

El bloque ancla tendrá altura cero cuando el recurso flote, permitiendo que los bloques de texto posteriores rodeen el objeto.

Se añadirá una limpieza explícita al finalizar el área afectada para impedir que el recurso invada footer o página siguiente.

Si la estructura interna de Editor.js impide que `float` afecte bloques hermanos en algún navegador, se usará un wrapper de flujo compartido alrededor de los bloques afectados. No se simulará el ajuste con márgenes fijos.

## Superposición y texto

`layer` controla la relación:

- `above-text`: recurso sobre texto;
- `behind-text`: recurso detrás del texto.

La superficie editorial creará dos contextos:

```txt
behind-media-layer
text-block-layer
above-media-layer
```

Los eventos del recurso detrás del texto se activarán mediante el menú de objetos o una tecla modificadora para que no bloquee la escritura.

El texto siempre debe conservar cursor, selección y edición cuando el recurso no está seleccionado.

## Recorte no destructivo

El recorte aplica únicamente a imagen y marcador.

Al entrar en modo recorte:

- el marco exterior permanece fijo;
- la imagen puede desplazarse y hacer zoom dentro del marco;
- se oscurece sutilmente el área fuera del recorte;
- Enter o `Aplicar` confirma;
- Escape o `Cancelar` restaura los valores anteriores.

El archivo original no cambia.

Render:

```css
overflow: hidden;
```

La imagen interior usa los valores normalizados de `crop` para calcular tamaño y desplazamiento.

Los límites garantizan que el marco nunca muestre un área vacía.

## Modelo 3D

El modelo conserva carga lazy y `Model3DViewer`.

Estados:

- `move`: la capa recibe drag y resize;
- `interact`: OrbitControls recibe rotación y zoom.

El modo se selecciona desde el menú contextual. Doble clic puede activar temporalmente `interact`.

El modelo:

- no tendrá tarjeta azul;
- no tendrá fondo administrativo;
- podrá estar en `inline`, wrap o free;
- no admite recorte;
- mantiene placeholder local si falla la URL.

## Integración con toolbar y modales

Los botones existentes:

- Imagen
- Modelo 3D
- Marcador

insertarán directamente su bloque multimedia.

El botón `Composición visual` y su canvas se retirarán de la toolbar.

Los modales y servicios de assets actuales se reutilizan sin duplicar endpoints.

La posición inicial será:

- modo `inline`;
- ancho razonable según tipo;
- autor puede cambiar a wrap o free desde el menú contextual.

## Componentes

### MediaLayoutState

Archivo:

`frontend/src/components/creator/editor-media/mediaLayoutState.js`

Funciones puras:

- `normalizeMediaLayout`
- `setMediaMode`
- `moveFreeMedia`
- `resizeMedia`
- `setTextLayer`
- `bringMediaForward`
- `sendMediaBackward`
- `setMediaLocked`
- `setMediaOpacity`
- `normalizeCrop`
- `applyCropPan`
- `applyCropZoom`
- `migrateCompositionLayers`

### MediaObjectView

Archivo:

`frontend/src/components/creator/editor-media/MediaObjectView.jsx`

Responsabilidades:

- render compartido de imagen, modelo y marcador;
- selección;
- drag/resize;
- modo crop;
- modo modelo 3D;
- menú contextual.

### MediaContextMenu

Archivo:

`frontend/src/components/creator/editor-media/MediaContextMenu.jsx`

Responsabilidades:

- abrir por selección, botón o `contextmenu`;
- posicionarse dentro del viewport;
- agrupar Diseño, Orden y Edición;
- cerrar con click fuera o Escape;
- usar Portal para no quedar cortado por Editor.js.

### Tools Editor.js

`ImageEditorBlockTool`, `Model3DBlockTool` y `MarkerBlockTool` reutilizarán `MediaObjectView`.

Cada tool:

- conserva el último JSON;
- conoce su `anchorBlockId`;
- alterna modo inline/wrap/free;
- monta la vista React;
- devuelve metadata completa en `save()`.

## Preview y rendered_html

`EditorJsPreview` reproducirá:

- inline y wrap dentro del flujo;
- free como capas de hoja;
- z-index y delante/detrás del texto;
- recorte;
- imagen y marcador reales;
- modelo lazy bajo interacción.

No mostrará controles, bordes ni menús.

`rendered_html` emitirá:

- figuras inline y wrap seguras;
- capas libres con estilos numéricos normalizados;
- `object-position` y wrapper de recorte;
- placeholder para modelos 3D.

La fuente de verdad sigue siendo `editor_data`.

## Persistencia

El guardado actual no cambia:

```txt
editor.save()
→ editor_data
→ saveLegendPages
→ legend_pages.editor_data
```

Cada bloque guarda su `layout`.

No se necesitan:

- columnas nuevas;
- migraciones;
- endpoints nuevos;
- cambios de Storage;
- service role en frontend.

## Accesibilidad

- selección visible por borde y handles, no solo color;
- menú con roles y labels;
- cierre con Escape;
- navegación por teclado;
- flechas mueven recurso libre;
- Shift + flechas mueve 10 unidades;
- Delete elimina si no está bloqueado;
- handles con área táctil de 44 px;
- clic derecho no sustituye el acceso mediante teclado o botón;
- `prefers-reduced-motion` elimina transiciones no esenciales.

## Manejo de errores

- URL ausente: placeholder local y opción de eliminar o reemplazar.
- Fallo 3D: error dentro del objeto sin romper Editor.js.
- Crop inválido: normalización al último estado válido.
- Ancla ausente: fallback a `inline`.
- Posición fuera de hoja: clamp automático.
- Conversión de composition incompleta: conservar bloque original; no borrar datos.

## Archivos previstos

Crear:

- `frontend/src/components/creator/editor-media/mediaLayoutState.js`
- `frontend/src/components/creator/editor-media/mediaLayoutState.test.mjs`
- `frontend/src/components/creator/editor-media/MediaObjectView.jsx`
- `frontend/src/components/creator/editor-media/MediaContextMenu.jsx`
- `frontend/src/components/creator/editor-media/MediaCropOverlay.jsx`
- `frontend/src/components/creator/editor-media/FreeMediaLayer.jsx`

Modificar:

- `frontend/src/components/creator/editorBlockTools.js`
- `frontend/src/components/creator/editorBlockTools.test.mjs`
- `frontend/src/components/creator/EditorialRichEditor.jsx`
- `frontend/src/components/creator/EditorJsToolbar.jsx`
- `frontend/src/components/creator/EditorJsPreview.jsx`
- `frontend/src/components/3d/Model3DViewer.jsx`
- `frontend/src/utils/editorJsToHtml.js`
- `frontend/src/utils/editorJsToHtml.test.mjs`
- `frontend/src/styles/index.css`

Retirar después de migración y pruebas:

- `frontend/src/components/creator/editor-composition/CompositionCanvas.jsx`
- `frontend/src/components/creator/editor-composition/CompositionLayer.jsx`
- `frontend/src/components/creator/editor-composition/CompositionPreview.jsx`
- `frontend/src/components/creator/editor-composition/compositionState.js`
- `frontend/src/components/creator/editor-tools/CompositionBlockTool.js`

No se prevén cambios backend.

## Pruebas

### Unitarias

- normalización de modos;
- migración de layouts anteriores;
- migración de layers composition;
- clamp de posición libre;
- orden delante/detrás de texto;
- resize;
- bloqueo;
- crop pan/zoom;
- cancelación de crop;
- HTML seguro sin UUID visibles.

### Manuales

1. Insertar imagen normal.
2. Seleccionarla sin mostrar caja exterior.
3. Abrir menú contextual con clic y clic derecho.
4. Cambiar a `free`.
5. Moverla sobre texto.
6. Ponerla detrás y delante del texto.
7. Cambiar a wrap-left y wrap-right.
8. Confirmar que el texto rodea realmente la imagen.
9. Recortar y guardar.
10. Recargar y verificar crop y posición.
11. Repetir movimiento y wrap con marcador.
12. Insertar modelo, moverlo y activar OrbitControls.
13. Probar editor normal y fullscreen.
14. Abrir preview.

### Regresión

- bloques paragraph/header/list/checklist/quote/table;
- imagen/modelo/marcador inline existente;
- guardado de páginas;
- PDF;
- CONALITEG;
- hotspots;
- catálogo;
- detalle.

## Criterio de aceptación

La entrega se acepta cuando una imagen insertada se ve integrada en la hoja, sin canvas o caja exterior; puede moverse sobre el texto, colocarse delante o detrás, cambiar a ajuste izquierdo o derecho, redimensionarse, recortarse sin alterar el archivo original, guardarse y reconstruirse después de recargar.

El mismo patrón debe funcionar para marcador y, sin recorte, para modelo 3D.

No se modifica backend, DB, RLS, Storage, PDF, CONALITEG ni deploy.
