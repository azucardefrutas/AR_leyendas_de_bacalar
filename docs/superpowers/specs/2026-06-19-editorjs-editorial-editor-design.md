# Diseño — Editor editorial con Editor.js (Increment 1)

> Fecha: 2026-06-19
> Fase: "FASE NUEVA — Editor editorial con Editor.js para Crear desde cero".
> Este documento cubre **solo el Increment 1** (el editor Editor.js para el flujo
> "Crear desde cero"). Los demás workstreams se diseñan/implementan después, uno por uno.

## Contexto y decisiones tomadas

- **Secuencia:** trabajar por incrementos, uno a la vez. Roadmap:
  1. Editor.js editorial (este documento).
  2. Bugfix de subida "Invalid file metadata" + preview de documento (Flujo B, Prioridad 1 de CLAUDE.md).
  3. Modo doble página (Flujo B).
  4. Render de páginas editoriales en el lector (`rendered_html`).
- **Persistencia:** se autorizó agregar columnas a `legend_pages` vía migración.
- **No hacer commit** (regla explícita de la fase). El doc se escribe pero no se commitea.

## Estado actual relevante (diagnóstico)

- `frontend/src/pages/creator/CreateLegendPage.jsx` maneja **ambos** flujos con
  `stepsByMode`. El modo `scratch` ya **excluye** los pasos `source` y `documentPreview`
  (no muestra secciones de PDF). El paso **Contenido** usa hoy un `<textarea>` plano.
- `saveLegendPages` (en `frontend/src/services/creatorLegendService.js:1547`) escribe
  directo a `legend_pages` solo `version_id`, `page_number`, `title`, `text_content`,
  bajo RLS (el flujo actual ya funciona, así que RLS permite estas escrituras).
- El esquema conocido de `legend_pages` (CLAUDE.md §17) no tiene columnas para JSON
  estructurado. Por eso se requiere la migración aditiva.

## Objetivo del Increment 1

Reemplazar el `<textarea>` del paso **Contenido** (solo en modo `scratch`) por un editor
Editor.js que guarde contenido estructurado en JSON, con pestaña de Vista previa y modo
Expandir, persistiendo a `legend_pages` sin romper el flujo "Subir leyenda existente",
el render CONALITEG, el lector, los hotspots ni los modelos 3D.

## Arquitectura

### Componentes nuevos
- `frontend/src/components/creator/EditorialRichEditor.jsx`
  - Envuelve una instancia de Editor.js.
  - `useRef` para la instancia; `useEffect` para inicializar una sola vez;
    guarda anti doble inicialización (React StrictMode); `destroy()` al desmontar.
  - Herramientas: `paragraph` (nativa), `header`, `list`, `quote`, `delimiter`,
    `checklist`, `table`. (`image` queda fuera de este increment: requiere subida.)
  - API expuesta al padre vía `ref` imperativo (`save()` -> `{ blocks }`) o callback
    `onReady(instance)`; el padre llama `save()` antes de cambiar de página o guardar.
- `frontend/src/utils/editorBlocksToHtml.js`
  - Convierte bloques Editor.js -> HTML para: (a) la pestaña Vista previa y
    (b) el campo `rendered_html` persistido.
  - Soporta: paragraph, header, list (ordered/unordered), quote, delimiter,
    checklist, table. Escapa HTML del contenido de texto (sin renderizador de terceros).

### Modelo de estado de páginas (en CreateLegendPage)
```js
{
  client_id: string,
  page_number: number,
  title: string,
  editor_data: { blocks: [] },   // JSON de Editor.js
  text_content: string,          // aplanado de texto plano (back-compat / búsqueda)
  content_format: 'editorjs' | 'plain',
  id?: string,                   // tras guardar
}
```

### Ciclo de vida del editor
1. Montar componente -> inicializar Editor.js una vez con `editor_data` de la página activa.
2. Al cambiar de página: `editor.save()` -> guardar `editor_data` + recalcular
   `text_content`/`rendered_html` en state -> cambiar página activa -> `editor.render(data)`.
3. Páginas legacy (solo `text_content`, `content_format` nulo/`plain`): al cargar se
   siembra un bloque `paragraph` por párrafo a partir de `text_content`.
4. Al guardar: `editor.save()` de la página activa -> empaquetar todas -> persistir.

### Persistencia (decisión A — recomendada y aprobada)
Extender el path directo existente `saveLegendPages` para incluir las nuevas columnas:
```js
const payload = {
  version_id, page_number, title, text_content,
  editor_data: page.editor_data ?? null,
  rendered_html: page.rendered_html ?? null,
  content_format: page.content_format ?? 'plain',
};
```
- RLS ya permite estas escrituras (el flujo actual funciona); no se toca RLS.
- No se crea endpoint backend nuevo (innecesario; el path directo ya opera bajo RLS).
- `normalizePages` debe preservar `editor_data`/`rendered_html`/`content_format`.

### Render a HTML (decisión A — recomendada y aprobada)
`editorBlocksToHtml` local, hecho a mano para el set de herramientas limitado.
- Sin dependencia de terceros -> menor superficie de XSS y de build.

## Migración (autorizada) — aditiva y segura
Archivo nuevo en `backend/supabase/migrations/` (fecha en el nombre):
```sql
alter table public.legend_pages
  add column if not exists editor_data jsonb,
  add column if not exists rendered_html text,
  add column if not exists content_format text not null default 'plain';
```
- `ADD COLUMN IF NOT EXISTS` -> idempotente y no destructivo.
- Default `'plain'` mantiene compatibilidad con páginas existentes.
- Aplicación: el usuario decide en su momento si Claude la corre vía Supabase MCP o
  la corre él mismo. No se ejecuta durante diseño/plan.

## UI del paso Contenido (solo scratch)
- Sidebar de páginas a la izquierda (ya existe el patrón `creator-page-rail`).
- Área central: título opcional + Editor.js grande (más alto/ancho que el textarea actual).
- Pestañas: **Edición** / **Vista previa** (renderiza `editorBlocksToHtml`).
- Botón **Expandir escritura** (modal grande / modo amplio) que conserva editor activo,
  título, guardar, vista previa y estadísticas.
- Estadísticas (palabras/caracteres) reubicadas cerca del editor.
- Botón **Guardar páginas**.
- Sin bloques redundantes de "Texto extraído", "Documento/libro/marcadores", "TXT", etc.
  (esos solo aplican al flujo Subir existente y no aparecen en scratch).

## Archivos afectados
- Nuevos: `EditorialRichEditor.jsx`, `editorBlocksToHtml.js`, migración SQL.
- Modificados: `CreateLegendPage.jsx` (paso Contenido + estado de páginas),
  `creatorLegendService.js` (`saveLegendPages` + `normalizePages`),
  `frontend/package.json` (deps Editor.js).
- **No** tocados: pasos `source`/`documentPreview`, render CONALITEG, lector,
  hotspots, modelos 3D, RLS/RPC, `.env`, `node_modules`.

## Dependencias a instalar (frontend)
```
@editorjs/editorjs @editorjs/header @editorjs/list @editorjs/quote
@editorjs/checklist @editorjs/delimiter @editorjs/table
```
Si alguna rompe el build, caer al mínimo: header, paragraph, list, quote, delimiter.

## Pruebas
- Build: `npm run build` (frontend). Lint: `npm run lint` (`--max-warnings 0`).
- Backend `npm run build` solo si se toca backend (este increment no toca backend salvo
  el archivo de migración, que no entra al lint de `src/`).
- Manual (Crear desde cero): escribir párrafo/encabezado/lista -> Vista previa renderiza
  HTML -> agregar Página 2 -> volver a Página 1 conserva contenido -> Guardar páginas ->
  recargar editor muestra contenido -> resumen de revisión correcto.
- Regresión: pasos de Subir existente intactos; catálogo, detalle, lector CONALITEG,
  3D desde hotspot y login sin cambios.

## Fuera de alcance (otros increments)
- Bugfix "Invalid file metadata" y preview de documento (Increment 2).
- Modo doble página (Increment 3).
- Render de `rendered_html` en el lector universal (Increment 4).
- Adaptar `LegendEditor.jsx` (editor completo) al Editor.js — evaluar tras Increment 1.
- Herramienta `image` en Editor.js.
- Reordenar páginas (drag).

## Riesgos
- Doble inicialización de Editor.js bajo StrictMode -> mitigado con guarda de ref.
- Páginas legacy sin `editor_data` -> sembrado desde `text_content` al cargar.
- La migración debe aplicarse antes de que el guardado escriba las nuevas columnas; si no
  se aplica, el insert/update fallaría. Mitigación: aplicar migración antes de probar el
  guardado; el código puede degradar a solo `text_content` si las columnas no existen
  (opcional, se decide en el plan).
