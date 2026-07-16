# Diseño — Sección "Cargar modelo y marcador (app móvil / libro físico)"

Fecha: 2026-07-16
Estado: aprobado para escribir plan (pendiente revisión del spec por el usuario)

## 1. Objetivo

Agregar una sección nueva en el **panel de creador** para que el autor registre pares
**marcador (imagen) ↔ modelo 3D** pensados para su **libro físico**, de forma **independiente
de página** y **por leyenda**. Cada leyenda tiene su propia tabla; nunca se mezclan.
Cada par marcador→modelo es único.

Es un **PLUS**. No reemplaza ni modifica el flujo actual (marcadores sobre PDF/página con
coordenadas). Todo lo ya construido se queda igual.

Resultado esperado: cuando el lector escanee el marcador físico impreso con la **app móvil**
que ya existe, aparece el modelo 3D correspondiente — **sin recompilar el APK**.

## 2. Estado actual (verificado en código + DB en vivo)

- La app móvil (`leyendas-de-bacalar/mobile/src/lib/arScenes.js`) y el feed backend
  (`backend/src/services/mobileAr.service.js`) leen la **misma** tabla:
  `interactive_hotspots`, filtrando `status='published'` + leyenda `published` + modelo con URL.
  Cadena: `interactive_hotspots.marker_asset_id` (imagen) + `ar_scene_id` →
  `ar_scenes.model_asset_id` → asset GLB. `marker_code` sale de `ar_markers` por `ar_scene_id`.
- La app lee Supabase **directo** con el token del usuario (RLS lo permite). No depende del
  backend para leer. El backend solo se usa para que el creador **escriba**.
- Ya existen y se reutilizan: tablas `ar_scenes`, `ar_markers`, `physical_editions`,
  `physical_edition_markers`; y funciones backend `createScene`, `createMarker`,
  `linkPhysicalEditionMarker`, `assertAssetInLegend` en `interactiveHotspots.service.js`.
- Subida de assets: `frontend/src/services/assetService.js` → `uploadLegendAsset({ file,
  legendId, assetType })` soporta `assetType: 'marker_image'` y `'model_3d'`, sube vía backend
  (signed upload) y registra el asset con `metadata.legend_id`. Devuelve `{ data: asset, error }`.

## 3. El único hueco (por qué hace falta un cambio de DB)

`interactive_hotspots` tiene dos CHECK que **obligan** a que todo marcador esté atado a una
página:

- `interactive_hotspots_target_type_check`: `target_type ∈ {'source_document','legend_page'}`.
- `hotspot_target_coherent`:
  - `source_document` ⇒ `source_document_id` y `source_page_number` NOT NULL, `page_id` NULL.
  - `legend_page` ⇒ `page_id` NOT NULL, `source_document_id` NULL.

No hay forma de guardar un marcador "sin página", que es justo lo que el libro físico necesita
("no importa en qué página se vincula"). **Decisión aprobada:** agregar un tercer
`target_type = 'physical_edition'` que permita `page_id` y `source_document_id` ambos nulos.

Como la app ya lee `interactive_hotspots` **sin filtrar por `target_type`**, los marcadores
físicos nuevos aparecen automáticamente en el escáner. **Cero cambios en la app móvil.**

## 4. Arquitectura de la solución

### 4.1 Base de datos (migración aditiva, bajo riesgo)

Se aplica en Supabase en vivo (fuente de verdad) **y** se guarda como archivo de migración para
el historial del repo: `backend/supabase/migrations/20260716_hotspots_physical_edition.sql`.

```sql
begin;

alter table public.interactive_hotspots
  drop constraint interactive_hotspots_target_type_check;
alter table public.interactive_hotspots
  add constraint interactive_hotspots_target_type_check
  check (target_type = any (array['source_document','legend_page','physical_edition']));

alter table public.interactive_hotspots
  drop constraint hotspot_target_coherent;
alter table public.interactive_hotspots
  add constraint hotspot_target_coherent check (
    (target_type = 'source_document'
       and source_document_id is not null
       and source_page_number is not null
       and page_id is null)
    or (target_type = 'legend_page'
       and page_id is not null
       and source_document_id is null)
    or (target_type = 'physical_edition'
       and page_id is null
       and source_document_id is null
       and source_page_number is null)
  );

commit;
```

- Aditiva: las filas existentes (`source_document` / `legend_page`) siguen cumpliendo ambos CHECK.
- No se tocan RLS, triggers, ni otras tablas. No se crean tablas nuevas.
- Se reutilizan `ar_scenes`, `ar_markers`, `physical_editions`, `physical_edition_markers`.

### 4.2 Backend (extiende, no duplica)

**Servicio** — se agregan funciones en `backend/src/services/interactiveHotspots.service.js`
(reutiliza los helpers privados `assertAssetInLegend`, `createScene`, `linkPhysicalEditionMarker`):

- `createPhysicalMarker({ legendId, userId, roles, payload })`
  1. `getLegendAccessContext` (ownership) + `assertAssetInLegend` para marcador y modelo.
  2. **Unicidad:** si ya existe un hotspot `physical_edition` de esa leyenda con el mismo
     `marker_asset_id`, rechaza con 409 y mensaje claro ("Ese marcador ya está vinculado a un
     modelo en esta leyenda").
  3. `createScene({ model_asset_id })` → escena (idempotente por modelo).
  4. Inserta la fila `interactive_hotspots` con service-role (bypassa RLS y la restricción de
     `normalizeStatus` que impide a un creador publicar): `target_type='physical_edition'`,
     `hotspot_type='model'`, `marker_asset_id`, `ar_scene_id=scene.id`, `x=0.5`, `y=0.5`
     (defaults; la app los ignora), `label`, **`status='published'`**, `created_by=userId`.
  5. `linkPhysicalEditionMarker({ marker_asset_id, ar_scene_id, page_reference })` — registra
     `physical_edition_markers` (best-effort; si falla, no rompe la creación del hotspot).
  6. Devuelve la fila compuesta (hotspot + urls de marcador/modelo).
- `listPhysicalMarkers({ legendId, userId, roles })`: hotspots `physical_edition` de la leyenda,
  con `marker.file_url`, `scene.model.file_url` y nombre del modelo, ordenados por `created_at`.
- `deletePhysicalMarker({ legendId, hotspotId, userId, roles })`: valida ownership y borra la
  fila `interactive_hotspots` (sale del feed de la app). El registro `physical_edition_markers`
  se limpia best-effort.

Publicación instantánea es **segura**: el feed móvil igual exige `legend.status='published'`,
así que el modelo solo se vuelve escaneable cuando la leyenda ya está publicada.

**Rutas** — se agregan en `backend/src/routes/legendHotspots.routes.js` (ya montado en
`/api/v1/legends`, ya en la lista `build` de `package.json` → no hay archivo nuevo que registrar):

- `GET    /api/v1/legends/:legendId/physical-markers`
- `POST   /api/v1/legends/:legendId/physical-markers`
- `DELETE /api/v1/legends/:legendId/physical-markers/:hotspotId`

Todas con `requireCreatorOrAdmin` (igual que el resto de hotspots).

### 4.3 Frontend

**Servicio** — en `frontend/src/services/backendApiService.js`:
`listLegendPhysicalMarkers(legendId)`, `createLegendPhysicalMarker(legendId, payload)`,
`deleteLegendPhysicalMarker(legendId, hotspotId)`.

**Página** — `frontend/src/pages/creator/PhysicalMarkersPage.jsx`, ruta `/creator/physical-markers`:

- **Selector de leyenda** (dropdown de las leyendas del creador; reutiliza el servicio de
  listado de leyendas del creador).
- Al elegir leyenda → **tabla independiente** de esa leyenda:
  `Marcador (miniatura) | Modelo (nombre) | Estado | Eliminar`.
- Panel **"Agregar par marcador ↔ modelo"**:
  - input imagen del marcador (`assetType='marker_image'`),
  - input GLB del modelo (`assetType='model_3d'`),
  - opcional: etiqueta y "referencia de página del libro" (`page_reference`),
  - **Guardar**: `uploadLegendAsset(marker)` → `uploadLegendAsset(model)` →
    `createLegendPhysicalMarker(legendId, { marker_asset_id, model_asset_id, label, page_reference })`
    → refresca la tabla. Estados de carga/éxito/error claros (sin stack traces).
- **Empty state** por leyenda. Si la leyenda **no** está publicada, aviso no-bloqueante:
  "Se activará en la app cuando publiques esta leyenda."
- La UI se construirá con los tokens/estilos existentes del panel de creador (skill
  `frontend-design` en implementación). Nada de datos demo ni botones decorativos.

**Router** — `frontend/src/app/router.jsx`: import lazy + ruta hija
`{ path: 'physical-markers', element: <PhysicalMarkersPage /> }` dentro de `/creator`.

**Sidebar** — `frontend/src/layouts/CreatorLayout.jsx`: nuevo item
`{ label: 'Marcadores para app', to: '/creator/physical-markers', icon: 'add_to_home_screen' }`
(ícono Material Symbols: teléfono con +).

### 4.4 App móvil

**Cero cambios de código.** Solo requiere: (a) la migración aplicada en Supabase, (b) que el
creador guarde el par (escribe el hotspot `published`), y (c) que la leyenda esté publicada.
No hay recompilación de APK.

## 5. Flujo de datos (resumen)

```
Autor: elige leyenda → sube marcador (imagen) → sube modelo (GLB) → Guardar
  → assetService.uploadLegendAsset x2 (metadata.legend_id)
  → backend createPhysicalMarker:
      createScene(model) → interactive_hotspots(target_type='physical_edition', published)
      → linkPhysicalEditionMarker (physical_edition_markers)
App móvil: lee interactive_hotspots (published) → reconoce imagen del marcador → muestra modelo
```

## 6. Aislamiento, unicidad e invariantes

- **Por leyenda:** la tabla filtra por `legend_id`; nunca combina leyendas.
- **Unicidad marcador→modelo:** un `marker_asset_id` no puede vincularse a dos modelos dentro de
  la misma leyenda (check en `createPhysicalMarker`, 409). `createScene` es idempotente por modelo
  y `createMarker` por (marcador, escena).
- **Primary source:** no se toca `legend_source_documents` (ver invariante de primary único).

## 7. Manejo de errores

- Front: estados claros (subiendo, guardando, ok, error), sin exponer detalles técnicos.
- Back: `linkPhysicalEditionMarker` best-effort — si falla, el hotspot igual queda creado.
- La migración va en transacción (`begin/commit`); si algún CHECK fallara por datos previos,
  aborta sin dejar estado a medias (no debería: es aditiva).

## 8. Qué NO se toca

- Flujo de marcadores sobre PDF/página (`SourceDocumentPreview`, `ManualMarkerCanvas`).
- `mobileAr.service.js`, `arScenes.js` (la app), `readerBundle.service.js` (solo se verifica
  que no truene con hotspots `physical_edition` de `page_id` nulo — simplemente no hacen match).
- RLS, RPC, otras tablas, `.env`, deploy, `node_modules`.
- `normalizeStatus` y el `createHotspot` genérico (el flujo digital de revisión queda intacto).

## 9. Verificación

- Backend: `npm.cmd run build` (node --check).
- Frontend: `npm.cmd run build` (si falla por OneDrive/Vite en sandbox, reintentar fuera).
- DB: confirmar que los dos CHECK aceptan `physical_edition` y siguen rechazando combinaciones
  inválidas (insert de prueba + rollback).
- E2E manual: crear un par en la UI → verificar fila `interactive_hotspots`
  (`target_type='physical_edition'`, `status='published'`) → correr el SELECT del feed móvil y
  confirmar que aparece (con leyenda publicada) → confirmar que el lector web no se rompe.

## 10. Riesgos

- Cambio de CHECK en tabla viva: aditivo, filas existentes cumplen. Riesgo bajo.
- La app dedupe por URL de modelo: si dos marcadores apuntan al mismo GLB, el segundo no se ve.
  Aceptable (cada par debe ser único). Se documenta.
- Publicación instantánea del autor: consciente y aprobada; la visibilidad real la sigue
  gobernando el estado de la leyenda.

## 11. Fuera de alcance (YAGNI)

- No se agrega revisión/aprobación admin específica para marcadores físicos.
- No se agrega edición in-place del par (se elimina y se recrea).
- No se compila `.mind` ni se cambia el motor de tracking de la app.
- No se agregan códigos/QR ni impresión de hojas de marcadores (posible fase futura).
