# Editor Visual por Páginas — Diseño aprobado

## Estado

Diseño aprobado el 21 de junio de 2026.

Esta especificación reemplaza las propuestas anteriores de:

- un bloque `composition` con canvas fijo;
- una caja de composición visible dentro del documento;
- multimedia limitada al flujo normal de Editor.js.

La decisión final es:

```txt
Cada página existente de la historia
→ es una hoja editorial completa
→ el texto se edita con Editor.js
→ imágenes, modelos 3D y marcadores se mueven libremente sobre esa hoja
```

No se crea una pantalla paralela ni un editor distinto.

---

## Objetivo

El autor debe poder construir una página como en un documento visual:

```txt
Escribe texto
→ inserta una imagen de una cueva
→ inserta un modelo 3D encima
→ mueve y redimensiona ambos con el mouse o touch
→ cambia el orden de capas
→ guarda
→ recarga
→ la página conserva exactamente la composición
```

El mismo comportamiento aplica en:

- editor normal;
- editor fullscreen;
- vista previa.

---

## Principios obligatorios

1. Editor.js continúa siendo el motor de texto y persistencia.
2. La hoja completa de la página es el sistema de coordenadas visual.
3. No existe una caja administrativa alrededor de la composición.
4. Un recurso sin seleccionar muestra únicamente su contenido.
5. Los controles aparecen al seleccionar o hacer clic derecho.
6. Cada recurso pertenece a una página concreta.
7. Se conserva el navegador actual `Pág. X / + Página`.
8. La hoja tiene una altura mínima editorial y crece cuando el texto lo requiere.
9. No se guardan blobs ni base64 en JSON.
10. No se modifica backend, DB, RLS, Storage, PDF, CONALITEG ni deploy.

---

## Arquitectura

### Página como hoja-lienzo

Cada `legend_page` mantiene su Editor.js propio:

```txt
legend_pages.editor_data
```

La superficie visual será:

```txt
editorial-editor__canvas
└── editorjs-surface
    └── codex-editor__redactor
        ├── bloques de texto Editor.js
        ├── anclas multimedia
        └── capa visual de recursos libres
```

La redactor surface será el contenedor relativo:

```css
position: relative;
min-height: var(--editor-page-min-height);
overflow: visible;
```

La altura real será:

```txt
max(altura mínima de hoja, altura del contenido textual, límite inferior de recursos)
```

Esto evita cortar texto o multimedia.

### Texto

Los bloques normales permanecen en flujo:

- paragraph;
- header;
- list;
- checklist;
- quote;
- delimiter;
- table.

No se convierten a posición absoluta.

### Multimedia

Los tools existentes siguen siendo la fuente de persistencia:

- `image`;
- `model3d`;
- `leyendaMarker`.

Cada bloque conserva un ancla Editor.js, pero su vista puede renderizarse libremente sobre la hoja.

No se introduce un `CompositionCanvasBlockTool`.

---

## Contrato JSON

### Imagen

```json
{
  "type": "image",
  "data": {
    "assetId": "uuid",
    "file": {
      "url": "https://url-resuelta"
    },
    "alt": "Entrada de una cueva",
    "caption": "",
    "link": "",
    "layout": {
      "mode": "free",
      "x": 96,
      "y": 220,
      "width": 720,
      "height": 420,
      "rotation": 0,
      "opacity": 1,
      "zIndex": 1,
      "locked": false,
      "anchorBlockId": "editor-block-id"
    },
    "crop": {
      "x": 0,
      "y": 0,
      "width": 1,
      "height": 1,
      "zoom": 1
    }
  }
}
```

### Modelo 3D

```json
{
  "type": "model3d",
  "data": {
    "assetId": "uuid",
    "modelUrl": "https://url-resuelta",
    "title": "oso.glb",
    "caption": "",
    "layout": {
      "mode": "free",
      "x": 410,
      "y": 300,
      "width": 280,
      "height": 280,
      "rotation": 0,
      "opacity": 1,
      "zIndex": 2,
      "locked": false,
      "anchorBlockId": "editor-block-id"
    }
  }
}
```

### Marcador

Usa el mismo contrato de imagen con:

```txt
type = leyendaMarker
imageUrl
assetId
layout
crop
```

### Coordenadas

El ancho lógico canónico será:

```txt
1120 unidades
```

Conversión responsive:

```txt
scale = renderedSheetWidth / 1120
renderedX = logicalX * scale
renderedY = logicalY * scale
```

La altura lógica es dinámica.

Los recursos se limitan para que al menos su área seleccionable permanezca dentro de la hoja.

---

## Inserción de recursos

### Barra vertical minimalista

Se mostrará junto al lateral izquierdo de la hoja activa.

Herramientas visibles:

- agregar;
- texto;
- imagen;
- modelo 3D;
- marcador;
- tabla;
- separador.

El botón `+` abre un panel compacto con búsqueda y herramientas disponibles.

La barra:

- no ocupa el ancho del documento;
- usa iconos Lucide existentes;
- muestra tooltip;
- tiene controles táctiles de al menos 44 px;
- se oculta o colapsa en móvil;
- no aparece en preview.

### Inserción inicial

Los recursos nuevos se insertan:

- en modo `free`;
- dentro del viewport visible de la hoja;
- con tamaño razonable según tipo;
- por encima del contenido existente;
- seleccionados inmediatamente.

Imagen:

```txt
ancho inicial 520
alto según proporción natural
```

Modelo:

```txt
520 × 360
```

Marcador:

```txt
180 × 180
```

---

## Selección y manipulación

### Estado sin selección

No muestra:

- borde;
- fondo;
- tarjeta;
- título administrativo;
- handles;
- toolbar;
- caja exterior.

### Estado seleccionado

Muestra:

- borde fino cyan/violeta;
- ocho handles: cuatro esquinas y cuatro laterales;
- control de rotación bajo el objeto;
- barra rápida pequeña junto al objeto.

Los handles visuales pueden ser pequeños, pero su área interactiva debe ser de al menos 32–44 px.

### Drag

Pointer Events unificados para mouse y touch:

- umbral mínimo antes de iniciar drag;
- movimiento en tiempo real mediante `transform`;
- persistencia lógica al finalizar;
- clamp dentro de la página;
- deshabilitado cuando `locked = true`.

### Resize

Esquinas:

- cambian ancho y alto;
- mantienen proporción con Shift o según configuración del recurso.

Laterales:

- modifican una sola dimensión.

El tamaño mínimo evita que el objeto desaparezca.

### Rotación

El control inferior:

- rota alrededor del centro;
- guarda grados entre `-180` y `180`;
- usa transformación visual durante el gesto;
- persiste al finalizar.

### Z-index

Acciones:

- traer al frente;
- enviar atrás;
- subir una capa;
- bajar una capa.

Los z-index se normalizan para evitar crecimiento ilimitado.

---

## Barra rápida del objeto

Aparece al seleccionar.

Acciones mínimas:

- duplicar;
- traer al frente;
- enviar atrás;
- bloquear/desbloquear;
- eliminar;
- más opciones.

Estilo:

```txt
fondo blanco
borde slate suave
radio 10 px
sombra sutil
iconos compactos
sin gradientes
```

Debe mantenerse dentro del viewport y cambiar de lado si no hay espacio.

---

## Menú contextual

Se abre con:

- clic derecho;
- botón “Más opciones”;
- tecla de menú contextual;
- Shift + F10.

Opciones funcionales:

```txt
Copiar
Pegar
Duplicar
Eliminar
Alinear a la página
Traer al frente
Enviar atrás
Bloquear / desbloquear
Enlace
Texto alternativo
Recortar, solo imagen y marcador
Manipular 3D / Mover capa, solo modelo
```

No se mostrarán:

- copiar estilo;
- comentarios;
- duración;
- componentes;

salvo que se implementen realmente en una fase posterior.

### Copiar y pegar

Usa un portapapeles interno del editor para metadata:

```txt
tipo
assetId
URL resuelta
título
caption
alt
crop
layout
```

Pegar crea un bloque nuevo que referencia el mismo asset y aplica un desplazamiento visible.

No duplica archivos en Storage.

---

## Modelo 3D

El modelo se renderiza con `Model3DViewer` existente:

- fondo transparente;
- sin tarjeta azul;
- sin título administrativo;
- carga lazy;
- tamaño controlado por el frame del recurso.

Estados:

### Mover capa

- drag mueve el objeto completo;
- OrbitControls no recibe eventos.

### Manipular 3D

- drag rota el modelo;
- wheel/pinch controla zoom;
- el frame no se mueve accidentalmente;
- Escape vuelve a modo mover.

La preferencia de interacción es estado de UI, no necesita persistirse.

---

## Imagen y marcador

Render real mediante `<img>`.

Opciones:

- contain;
- cover/recorte;
- ajustar al ancho;
- ajustar a la página;
- usar como fondo;
- opacidad;
- texto alternativo;
- enlace.

### Recorte

Es no destructivo:

- no modifica Storage;
- conserva URL y assetId;
- guarda crop normalizado;
- permite mover y hacer zoom dentro del frame;
- Aplicar confirma;
- Cancelar o Escape restaura.

---

## Botón `+` de Editor.js

### Causa actual

La combinación de:

- ancho del `.ce-block__content`;
- offsets de `.ce-toolbar`;
- centrado del contenedor;
- overrides del fullscreen;

puede colocar el botón `+` sobre el centro del bloque.

### Corrección

El `+` se alinea al margen izquierdo real del contenido:

```txt
+ texto comienza aquí
```

Nunca debe:

- aparecer centrado;
- cubrir texto;
- colocarse sobre un recurso seleccionado;
- abrir la toolbar horizontal sobre el lienzo.

La barra vertical será la vía principal para insertar multimedia.

---

## Toolbar de texto

La toolbar horizontal superior se conserva para:

- H1/H2/H3;
- párrafo;
- bold;
- italic;
- underline;
- listas;
- checklist;
- quote;
- tabla;
- link.

Cuando hay multimedia seleccionada:

- la toolbar textual pierde protagonismo;
- no se desplaza al centro de la hoja;
- los controles del recurso se muestran de forma contextual.

No se usa una toolbar horizontal gigante encima del objeto.

---

## Fullscreen

### Header

Barra completa:

```txt
width: 100%
height: 56–64 px
sticky top: 0
background: white/90
backdrop blur
border-bottom
shadow-sm
```

Contenido:

- título de leyenda: 18–20 px;
- subtítulo: 12 px;
- editar/vista previa;
- estadísticas;
- cerrar.

No debe verse como una tarjeta recortada.

### Workspace

```txt
header completo
barra vertical de inserción
navegador de páginas
hoja blanca centrada
footer de guardado
```

La hoja:

- usa el ancho editorial disponible;
- tiene sombra tenue;
- mantiene márgenes de trabajo;
- crece verticalmente;
- no tiene un borde de canvas interno.

---

## Páginas

Se conserva el flujo actual:

```txt
Pág. 1
+ Página
```

Cambiar de página:

1. guarda el Editor.js actual;
2. guarda layout multimedia actual;
3. cambia la hoja;
4. reconstruye texto y recursos.

Agregar página:

- crea una hoja limpia;
- mantiene navegador y numeración;
- no comparte posiciones con otra página.

Quitar página:

- conserva la regla existente de mínimo una página;
- elimina únicamente la página activa tras la confirmación existente.

---

## Preview

Reproduce:

- texto;
- posiciones;
- tamaños;
- rotaciones;
- opacidad;
- z-index;
- crop;
- imagen real;
- marcador real;
- modelo 3D lazy.

No muestra:

- borde de selección;
- handles;
- toolbar;
- menú contextual;
- barra vertical.

El preview usa la misma geometría normalizada, sin duplicar reglas.

---

## Persistencia

El guardado existente se conserva:

```txt
editor.save()
→ page.editor_data
→ Guardar páginas
→ legend_pages.editor_data
```

Cada tool debe devolver metadata completa.

La página también debe recalcular su altura mínima usando:

```txt
último bloque textual
último recurso visual
padding inferior
```

No se requieren:

- columnas nuevas;
- migraciones;
- endpoints nuevos;
- cambios de bucket;
- service role en frontend.

---

## Compatibilidad

### Layout multimedia existente

Los modos actuales `inline`, `wrap-left` y `wrap-right` siguen siendo legibles.

Al seleccionar “Libre”, el recurso obtiene coordenadas equivalentes a su posición visual actual.

Los recursos nuevos usarán `free` por defecto.

### Bloques composition antiguos

La migración existente se conserva:

- convierte layers soportados en bloques independientes;
- mantiene assetId, URL, posición, tamaño, rotación, opacidad y z-index;
- conserva el bloque original si la conversión no es segura.

No se pierden datos.

---

## Accesibilidad

- selección por borde y handles, no solo color;
- botones con `aria-label`;
- toolbar y menú navegables por teclado;
- Escape cierra menús y modo 3D;
- flechas mueven el objeto seleccionado;
- Shift + flechas mueve 10 unidades;
- Delete elimina si no está bloqueado;
- Shift + F10 abre menú contextual;
- acciones de drag tienen alternativas mediante botones;
- `prefers-reduced-motion` elimina transiciones no esenciales.

---

## Rendimiento

- no usar `react-rnd`; la solución Pointer Events actual es suficiente;
- usar `transform` durante drag/resize;
- persistir en `pointerup`, no en cada pixel;
- batch de lecturas/escrituras DOM;
- lazy load de modelos;
- un solo listener global de selección por editor;
- cerrar portals y observers en `destroy()`.

No se añade Motion si el proyecto no lo tiene instalado.

Las animaciones necesarias serán CSS, 120–180 ms, transform/opacity.

---

## Manejo de errores

- URL ausente: placeholder local con opción eliminar/reemplazar.
- Modelo inválido: error dentro del frame sin romper Editor.js.
- Asset sin URL: resolver desde lista existente antes de renderizar.
- Coordenadas inválidas: normalización y clamp.
- Recurso fuera de hoja: recuperar al área visible.
- Ancla ausente: recrear ancla o fallback inline.
- Migración incompleta: conservar JSON original.

---

## Componentes previstos

### Crear

- `frontend/src/components/creator/editor-media/MediaSelectionOverlay.js`
- `frontend/src/components/creator/editor-media/MediaQuickToolbar.js`
- `frontend/src/components/creator/editor-media/MediaContextMenu.js`
- `frontend/src/components/creator/editor-media/EditorInsertRail.jsx`
- `frontend/src/components/creator/editor-media/mediaClipboard.js`
- pruebas `.test.mjs` para estado, geometría, clipboard y migración.

### Modificar

- `frontend/src/components/creator/editor-media/MediaObjectView.js`
- `frontend/src/components/creator/editor-media/mediaLayoutState.js`
- `frontend/src/components/creator/editor-media/mediaDomLayout.js`
- `frontend/src/components/creator/editorBlockTools.js`
- `frontend/src/components/creator/EditorialRichEditor.jsx`
- `frontend/src/components/creator/EditorJsToolbar.jsx`
- `frontend/src/components/creator/EditorJsPreview.jsx`
- `frontend/src/pages/creator/FullscreenEditorialEditorPage.jsx`
- `frontend/src/utils/editorJsToHtml.js`
- `frontend/src/styles/index.css`

### Reutilizar

- modales de imagen, modelo y marcador;
- servicios reales de assets;
- `Model3DViewer`;
- estado real de páginas;
- guardado actual.

### No tocar

- backend;
- SQL/RLS/RPC;
- Storage;
- `.env`;
- deploy;
- PDF;
- CONALITEG;
- hotspots;
- catálogo;
- detalle;
- autenticación y roles.

---

## Pruebas

### Unitarias

- normalización de geometría;
- resize por ocho handles;
- rotación;
- clamp a la hoja;
- z-index;
- bloqueo;
- duplicación;
- clipboard interno;
- migración composition;
- crop;
- resolución de altura mínima.

### Manuales

1. Crear o abrir página.
2. Insertar imagen.
3. Moverla libremente.
4. Redimensionarla con esquina y lateral.
5. Rotarla.
6. Insertar modelo 3D encima.
7. Alternar mover/manipular.
8. Insertar marcador.
9. Cambiar capas.
10. Abrir menú con clic derecho.
11. Duplicar, bloquear y eliminar.
12. Guardar.
13. Recargar.
14. Confirmar persistencia.
15. Agregar una página nueva.
16. Confirmar que empieza limpia.
17. Probar preview.
18. Repetir en fullscreen.

### Responsive

- desktop;
- tablet;
- móvil;
- touch drag/resize;
- barra vertical colapsada;
- menú contextual dentro del viewport.

### Regresión

- editor normal;
- fullscreen;
- cambio/agregado/eliminado de páginas;
- bloques de texto;
- subida de assets;
- PDF;
- CONALITEG;
- hotspots/modelos PDF;
- catálogo;
- detalle;
- panel creador.

---

## Criterio de aceptación

La entrega se acepta cuando:

```txt
Pág. 1
→ escribo texto
→ inserto imagen de una cueva
→ inserto modelo 3D encima
→ muevo, redimensiono y roto ambos
→ clic derecho abre menú contextual
→ guardo
→ recargo
→ todo conserva posición y orden
→ agrego Pág. 2
→ obtengo una hoja nueva independiente
```

Sin caja de composición.
Sin tarjeta azul.
Sin toolbar invasiva.
Sin botón `+` centrado.
Sin romper Editor.js ni los flujos protegidos.
