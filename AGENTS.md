# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

> Las secciones 1–26 (en español) son la "constitución" del proyecto: reglas de trabajo,
> permisos, esquema de DB conocido y prioridades. Léelas. La sección 0 de abajo es una
> referencia rápida de comandos y arquitectura derivada del código real.

---

## 0. Quick reference (comandos + arquitectura)

### Layout del monorepo

El repo raíz contiene una sola app real en `leyendas-de-bacalar/`:

```
leyendas-de-bacalar/
  frontend/   # React 18 + Vite 5 + TailwindCSS, React Router 6, Supabase JS, three / @react-three/fiber
  backend/    # Node 18+, Express 4 (ESM, "type":"module"), Supabase service-role, pdfjs/pdf-parse/mammoth, Gemini
```

`.agents/`, `.codex/`, `.mcp.json`, `skills-lock.json` en la raíz son tooling de agentes, no la app.

### Comandos (ejecutar dentro de cada paquete; en PowerShell usar `npm.cmd`)

Frontend (`leyendas-de-bacalar/frontend`):
- `npm run dev` — servidor Vite.
- `npm run build` — build de producción (invoca `node ./node_modules/vite/bin/vite.js build`; ver §13 sobre OneDrive/Vite).
- `npm run preview` — sirve el build.
- `npm run lint` — ESLint (`--max-warnings 0`). No hay framework de tests configurado.

Backend (`leyendas-de-bacalar/backend`):
- `npm run dev` — nodemon.
- `npm start` — `node src/index.js`.
- `npm run build` — **no compila**; es un lint de sintaxis (`node --check` sobre cada archivo de `src/`). Si agregas un archivo nuevo a `src/`, añádelo a la lista de `build` en `backend/package.json` o no se verificará. No hay tests.

### Env vars (ver `.env.example` en cada paquete)

- Frontend (prefijo `VITE_`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND_URL`, `VITE_SUPABASE_STORAGE_BUCKET` (`legend-assets`), `VITE_SUPABASE_DOCUMENT_BUCKET` (`legend-documents`).
- Backend: `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_ORIGIN` (acepta lista CSV; alias `FRONTEND_URL`/`CLIENT_URL`), `AI_PROVIDER` (`disabled`|`gemini`), `GEMINI_API_KEY`, `GEMINI_MODEL`. `backend/src/config/env.js` falla al arrancar si faltan `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` o algún origin de frontend.

### Arquitectura frontend — IMPORTANTE: árbol activo vs. legacy

`main.jsx` → `src/app/App.jsx` → **`src/app/router.jsx`** es la app real. El router (`createBrowserRouter`) usa:
- Layouts: `src/layouts/{Public,Auth,Reader,Creator,Admin}Layout.jsx`.
- Guards: `src/components/auth/{ProtectedRoute,RoleGuard,CreatorAccessGuard,RedirectAuthenticatedRoute,RoleAwareHomeRoute}.jsx`.
- Páginas reales en subcarpetas: `src/pages/{public,auth,reader,creator,admin}/*.jsx`.

Existe un **árbol legacy sin usar** (nada lo importa): `src/App.jsx`, `src/routes/` (`AppRoutes.jsx`, `ProtectedRoute.jsx`, `paths.js`), `src/lib/roles.js`, `src/pages/*.jsx` de nivel superior (`Home.jsx`, `Catalog.jsx`, `AdminDashboard.jsx`, etc.) y todo `src/views/*`. Al editar páginas, confirma que tocas la versión en subcarpeta (la del router), no la legacy homónima. No borrar sin verificar (ver §11/§12).

Datos: los componentes llaman a **services** en `src/services/*` — nunca acceden a tablas críticas directo si hay backend. Dos rutas de datos:
- Supabase directo (anon key) vía `src/lib/supabaseClient.js`: auth, lecturas con RLS, roles (`roleService.js` lee `user_roles` + `roles`).
- Backend auxiliar vía `src/services/backendApiService.js` (envía el `access_token` de Supabase como `Bearer`): subida de documentos, render PDF, hotspots, reader-bundle.

Auth/roles: sesión en `src/context/AuthContext.jsx` (`AuthProvider` envuelve la app en `main.jsx`). Los permisos reales salen de `user_roles`+`roles`; `active_role` (en `roleService.js`, vía localStorage) es solo el switch visual de UI (ver §5/§17).

### Arquitectura backend

Express ESM. `src/index.js` (CORS por allowlist de origins + `express.json`) monta `src/routes/index.js`, que agrupa:
- `src/routes/health.routes.js`, `auth.routes.js`
- `/api/v1/documents` → `documents.routes.js`
- `/api/v1/legends` → `readerBundle.routes.js` + `legendHotspots.routes.js`
- `/api/v1/reader/legends` → `readerLegends.routes.js`

(Hay archivos sueltos `authRoutes.js`, `bookRoutes.js`, `codeRoutes.js` que **no** están montados en `index.js`.)

Patrón: las rutas son delgadas (validan auth/rol y serializan); la lógica vive en `src/services/*`. Middlewares clave: `requireAuth` (valida el JWT con `supabaseAdmin.auth.getUser`), `requireRole`, `optionalAuth`. Cliente service-role en `src/config/supabaseAdmin.js` (solo backend — nunca exponer en frontend).

**Flujo de subida de documentos** (el bug crítico de §5/§19 vive aquí): el frontend hace `prepare-upload` (backend devuelve signed upload URL) → `PUT` a la signed URL → `register-upload` (backend verifica el objeto, registra `assets` + `legend_source_documents`, intenta `page_count` best-effort). `page_count` nunca debe romper `register-upload`. Servicios involucrados: `storage.service.js`, `fileValidation.service.js`, `assetRegistry.service.js`, `documentExtraction.service.js`, `documentRender.service.js` (PDF→imágenes con `@napi-rs/canvas`/`pdfjs`).

IA: detrás de `aiProvider.service.js` (provider `disabled` o `geminiProvider`); endpoint `propose-ai`. No es flujo principal (ver §7/§18); no eliminar.

### Supabase / migraciones

SQL y edge functions viven en `backend/supabase/` (`migrations/`, `functions/`). El esquema conocido está documentado en §17 y en `backend/docs/database-map.md`. **No** tocar SQL/RLS/RPC/schema/Storage sin autorización explícita (ver §11) — si una tarea lo requiere, detente y entrega diagnóstico + SQL propuesto + riesgos.

### Notas de plataforma

`node_modules/` está trackeado en git (heredado; ver §13). No lo modifiques y mantenlo fuera de tus diffs. El build de Vite puede fallar dentro del sandbox por OneDrive — reintentar fuera del sandbox antes de concluir que es error de código.

---

## 1. Identidad del proyecto

Este repositorio corresponde al proyecto **Leyendas de Bacalar**.

El objetivo es desarrollar una plataforma web cultural e interactiva para consultar, publicar y administrar leyendas de Bacalar, combinando:

* Catálogo web tipo plataforma de streamingsimilar Disney , netflix etc.
* Editor para autores/creadores.
* Panel administrativo.
* Carga de obras ya hechas en PDF/DOCX.
* Preview del documento original.
* Lectura interactiva opcional mediante páginas internas.
* Recursos multimedia.
* Modelos 3D.
* Marcadores AR.
* Futuro visor tipo libro/WebGL con efecto físico de cambio de página.
* Backend auxiliar para procesos pesados y seguros.
* Supabase como backend principal para Auth, DB, RLS y Storage.

Este proyecto es académico, pero debe tratarse como un proyecto full stack real. No usar soluciones falsas, datos demo, botones decorativos ni flujos simulados salvo que el usuario lo autorice explícitamente. debe ser funcional 

---

## 2. Regla principal

Antes de cambiar cualquier cosa:

1. Diagnosticar.
2. Leer el código relacionado.
3. Ejecutar `git status --short`.
4. Entender el flujo actual.
5. Hacer cambios mínimos.
6. Ejecutar build.
7. Reportar archivos modificados y `git diff --stat`.

No cambiar arquitectura, base de datos, RLS, RPC, deploy, variables de entorno ni Storage sin autorización explícita.

---

## 3. Tecnología base

### Frontend

* React.
* Vite.
* TailwindCSS / CSS propio.
* Supabase client con anon key.
* Rutas/paneles:

  * lector/usuario.
  * creador/autor.
  * administrador.

### Backend

* Node.js.
* Express.
* Backend auxiliar.
* No reemplaza Supabase.
* Sirve para:

  * signed uploads.
  * signed read URLs.
  * validaciones sensibles.
  * registro de assets.
  * registro de documentos fuente.
  * conteo de páginas PDF.
  * extracción PDF/DOCX.
  * IA backend.
  * futuras exportaciones/procesos pesados.
  * futuras rutas AR/3D seguras.

### Supabase

* Auth.
* PostgreSQL.
* RLS.
* Storage.
* RPC.
* Fuente de verdad del proyecto.

### IA

* Gemini API integrada en backend.
* La IA NO debe ser flujo principal visible por ahora.
* La IA queda como herramienta interna/futura para:

  * limpiar texto.
  * resumir.
  * apoyar accesibilidad.
  * sugerir escenas.
  * ayudar en extracción/organización.
* No debe publicar, modificar o sobrescribir contenido sin aprobación humana.

---

## 4. Filosofía del proyecto

La prioridad es:

1. Funcionalidad real.
2. Estabilidad.
3. Seguridad.
4. Flujo de usuario claro.
5. Diseño profesional.
6. Optimización.
7. Experimentos visuales.

No sacrificar flujos ya funcionales por agregar features nuevas.

Si una feature nueva rompe:

* crear borrador.
* subir PDF.
* registrar source_document.
* cargar portada/banner.
* login.
* roles.
* admin/users.
* eliminación de borradores.
* preview PDF.

Entonces la feature no está terminada.

---

## 5. Estado actual importante

### Ya existe y debe conservarse

* Auth con Supabase.
* Roles reales mediante `roles` + `user_roles`.
* `active_role` es UI/switch visual, no fuente real de permisos.
* Panel autor.
* Panel admin.
* Carga de portada/banner mediante backend signed upload.
* Carga de PDF/DOCX como `source_document`.
* Preview de documento original.
* Extracción PDF/DOCX sin IA.
* `document_extractions`.
* Generación básica de `legend_pages`.
* Backend Gemini como provider interno.
* IA visible en Contenido fue retirada/ocultada del flujo principal.
* `page_count` existe en `legend_source_documents`.
* Para PDFs nuevos, backend debe intentar contar páginas y guardar `page_count`.
* `page_count` debe ser best-effort: si falla, no bloquea registro del documento.

### Bloqueo crítico actual

No avanzar a AR/3D ni crear `interactive_hotspots` hasta corregir completamente:

```txt
Crear borrador con PDF
```

El estado observado:

* El botón “Crear borrador” ya crea la leyenda draft.
* Después intenta cargar/registrar el PDF.
* El PDF falla.
* La UI muestra: “El borrador se creó, pero no se pudo cargar el documento.”
* El editor abre la leyenda, pero sin documento registrado.
* `legend_source_documents` queda vacío o sin el documento nuevo.

Por tanto, el flujo actual está así:

```txt
Crear borrador ✅
Registrar PDF/source_document ❌
```

Antes de AR-1 debe quedar así:

```txt
Crear borrador sin PDF ✅
Crear borrador con PDF ✅
PDF registrado en legend_source_documents ✅
Documento original visible en editor ✅
page_count no bloquea ✅
Preview PDF funciona ✅
```

---

## 6. Arquitectura deseada para documentos

Hay dos modos de contenido.

### Modo A — Documento original

El autor sube una obra ya hecha:

* PDF.
* DOCX.
* DOC.

El documento original se conserva como fuente canónica.

El frontend debe mostrar:

* preview.
* abrir completo.
* chips compactos:

  * PDF/DOCX.
  * extraído/pendiente/fallido.
  * número de páginas si existe.
  * tamaño.

No mostrar como elemento principal:

* storage path largo.
* MIME en caja gigante.
* ids técnicos.

Eso debe ir en “Detalles técnicos”.

### Modo B — Lectura interactiva

Se usa `legend_pages`.

Puede venir de:

* crear desde cero.
* conversión manual/opcional desde documento.
* generación básica desde texto extraído.
* IA futura, solo si se acepta explícitamente.

### Modo C — Híbrido

PDF original + texto extraído para:

* búsqueda.
* resumen.
* accesibilidad.
* IA auxiliar.
* asociación futura por página.
* lectura interactiva opcional.

---

## 7. Decisión sobre IA

No mostrar “Generar propuesta con IA” como acción principal del editor.

No mostrar paneles de propuesta IA en la UI principal de Contenido por ahora.

La IA queda en backend como herramienta opcional. No eliminar:

* provider Gemini.
* endpoint `propose-ai`.
* servicios IA.
* prompts.

Pero no debe estorbar el flujo principal.

El foco actual es:

```txt
Documento original → preview → page_count → marcadores/modelos por página
```

No:

```txt
Documento original → propuesta editorial IA visible
```

---

## 8. Decisión sobre AR/3D

El diagnóstico confirmó:

* `ar_scenes.page_id` solo sirve para `legend_pages`.
* `ar_markers` se asocia a `ar_scenes`.
* No existe forma limpia de asociar:

  * `source_document_id`.
  * `source_page_number`.
  * coordenadas x/y.
  * marcador.
  * modelo.
* `legend_source_documents.page_count` existe y sirve para el futuro selector de página PDF.

Conclusión técnica:

Se necesitará una tabla nueva tipo:

```txt
interactive_hotspots
```

o:

```txt
page_anchors
```

Nombre recomendado:

```txt
interactive_hotspots
```

Pero NO crear esta tabla hasta corregir el bug crítico de crear borrador con PDF.

---

## 9. Tabla futura recomendada: interactive_hotspots

Esta tabla permitirá guardar:

```txt
PDF página 7
→ marcador
→ escena/modelo 3D
→ posición x/y default
```

También permitirá:

```txt
legend_page
→ marcador
→ escena/modelo 3D
→ posición x/y
```

Estructura conceptual:

```sql
public.interactive_hotspots (
  id uuid primary key default gen_random_uuid(),

  legend_id uuid not null references public.legends(id) on delete cascade,

  version_id uuid null references public.legend_versions(id) on delete cascade,

  target_type text not null,
  -- 'source_document' | 'legend_page'

  source_document_id uuid null references public.legend_source_documents(id) on delete cascade,

  source_page_number integer null,

  page_id uuid null references public.legend_pages(id) on delete cascade,

  marker_asset_id uuid null references public.assets(id) on delete restrict,

  ar_scene_id uuid null references public.ar_scenes(id) on delete set null,

  hotspot_type text not null default 'marker',
  -- 'marker' | 'model' | 'info' | 'ar_scene'

  label text null,

  description text null,

  x numeric not null default 0.85,
  y numeric not null default 0.15,
  width numeric null default 0.12,
  height numeric null default 0.12,

  metadata jsonb not null default '{}',

  status text not null default 'draft',
  -- draft | in_review | published | archived

  created_by uuid null references public.users_profile(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)
```

Coordenadas deben ser normalizadas entre 0 y 1 para que funcionen con distintos tamaños de visor.

Pero reiteración:

```txt
No crear interactive_hotspots hasta que crear borrador con PDF funcione.
```

---

## 10. Seguridad

Nunca hacer esto:

* poner `service_role` en frontend.
* imprimir access tokens.
* imprimir refresh tokens.
* imprimir `process.env`.
* imprimir `GEMINI_API_KEY`.
* subir `.env`.
* exponer claves Supabase.
* usar claves privadas en React.
* hacer buckets privados públicos sin autorización.
* saltarse RLS con hacks.
* borrar datos reales sin autorización.

Archivos `.env` deben mantenerse fuera de Git.

Variables frontend esperadas:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_BACKEND_URL=
```

Variables backend esperadas:

```env
PORT=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_ORIGIN=
AI_PROVIDER=
GEMINI_API_KEY=
GEMINI_MODEL=
```

No asumir valores. Leer `.env.example` si existe. No abrir ni copiar secretos en reportes.

---

## 11. Permisos para Codex

Codex puede:

* leer el repo.
* inspeccionar frontend/backend.
* buscar referencias con `rg`.
* ejecutar builds.
* ejecutar tests si existen.
* proponer cambios.
* modificar archivos de frontend.
* modificar archivos de backend.
* crear componentes.
* crear servicios.
* mejorar UI.
* corregir bugs.
* hacer refactors pequeños y justificados.

Codex NO puede sin autorización explícita:

* tocar SQL/RLS/RPC/migraciones.
* crear tablas.
* modificar schema.
* tocar `.env`.
* tocar deploy.
* tocar Cloudflare/Vercel/Render config.
* borrar datos.
* limpiar Storage.
* cambiar buckets/policies.
* introducir dependencias nuevas grandes.
* reestructurar carpetas enteras.
* cambiar autenticación.
* cambiar modelo de roles.
* eliminar servicios existentes.
* borrar backend IA.
* borrar flujos existentes.
* modificar `node_modules`.

Si Codex detecta que necesita una migración, debe detenerse y entregar:

1. diagnóstico.
2. SQL propuesto.
3. riesgos.
4. impacto.
5. pruebas.
6. pedir autorización.

---

## 12. Protocolo obligatorio de trabajo

Para cualquier tarea:

### Inicio

Ejecutar:

```bash
git status --short
```

Leer archivos relacionados.

Buscar con:

```bash
rg "nombreFuncion"
rg "endpoint"
rg "tabla"
```

No cambiar nada hasta entender.

### Durante cambios

* cambios mínimos.
* no mezclar features.
* no arreglar cosas no pedidas salvo bug directo.
* no tocar código muerto sin verificar.
* no eliminar archivos sin demostrar que no se usan.
* no cambiar nombres públicos sin actualizar imports.

### Fin

Ejecutar builds:

Frontend:

```bash
npm.cmd run build
```

Backend:

```bash
npm.cmd run build
```

Si el build frontend falla por el problema conocido de OneDrive/Vite sandbox, repetir fuera del sandbox y reportar claramente.

Ejecutar:

```bash
git status --short
git diff --stat
```

Reportar:

1. causa exacta.
2. archivos modificados.
3. qué se cambió.
4. qué no se tocó.
5. build.
6. pruebas.
7. pendientes.
8. riesgos.

---

## 13. Problema conocido: OneDrive/Vite

En este proyecto, el build frontend a veces falla dentro de sandbox por permisos de OneDrive/Vite.

Eso no siempre significa error de código.

Si ocurre:

1. reportar el error.
2. repetir fuera del sandbox.
3. confirmar si pasa fuera.
4. no modificar `node_modules`.
5. no tocar `frontend/node_modules/vite/bin/vite.js`.

`node_modules` no debe aparecer en `git status`.

Si aparece modificado:

```txt
frontend/node_modules/...
```

Hay que revertirlo o reportar que está trackeado indebidamente.

---

## 14. Reglas de frontend

El frontend debe:

* ser UI limpia.
* llamar servicios.
* mostrar estados claros.
* no procesar PDF pesado.
* no contar páginas.
* no hacer validaciones sensibles.
* no usar service_role.
* no escribir directo en tablas críticas si ya existe backend para ello.
* no ocultar errores.
* no mostrar stack traces al usuario.
* no mostrar datos técnicos excesivos en UI principal.

Para documentos, frontend debe:

1. seleccionar archivo.
2. llamar backend `prepare-upload`.
3. subir a signed URL.
4. llamar backend `register-upload`.
5. mostrar resultado.

No debe contar páginas ni extraer PDF.

---

## 15. Reglas de backend

El backend debe:

* validar JWT.
* validar roles.
* validar acceso a leyendas.
* generar signed URLs.
* registrar assets.
* registrar source_documents.
* contar `page_count` de PDF si es posible.
* manejar page_count como best-effort.
* hacer extracción PDF/DOCX.
* manejar IA.
* proteger documentos privados.
* no devolver secrets.
* no devolver stack traces al cliente.

Si una operación secundaria falla, no debe romper la operación principal salvo que sea crítica.

Ejemplo:

```txt
page_count falla → source_document se registra con page_count = null.
```

No:

```txt
page_count falla → register-upload devuelve 500.
```

---

## 16. Flujos críticos que no deben romperse

### Crear borrador sin PDF

Debe:

1. crear `legends`.
2. crear `legend_versions`.
3. abrir editor.
4. no depender de documento.
5. no depender de `page_count`.

### Crear borrador con PDF

Debe:

1. crear draft.
2. crear version.
3. subir PDF.
4. registrar asset.
5. registrar `legend_source_documents`.
6. intentar `page_count`.
7. abrir editor.
8. mostrar documento original.

Si falla PDF:

* conservar borrador.
* mostrar error claro.
* permitir reintentar.
* no dejar UI congelada.

### Portada/banner

Ya fue corregido antes.

No romper:

* reemplazo de portada.
* reemplazo de banner.
* `legend_media`.
* `assets`.
* Storage.

### Eliminar borrador

Ya fue corregido con RPC.

No cambiar sin autorización.

### Admin/users

Ya fue corregido.

No volver a consultar `users_profile.email`, porque esa columna no existe.

---

## 17. Esquema relevante conocido

### users_profile

Columnas conocidas:

* id
* full_name
* username
* avatar_url
* bio
* status
* active_role
* created_at
* updated_at

No existe:

```txt
users_profile.email
```

### roles / user_roles

Roles reales vienen de:

```txt
roles + user_roles
```

No usar `active_role` como permiso real.

### legends

Tiene `creator_id`.

Relación confirmada:

```txt
legends.creator_id -> creator_profiles.user_id
```

### legend_source_documents

Columnas conocidas:

* id
* legend_id
* version_id
* asset_id
* uploaded_by
* document_type
* is_primary_source
* extraction_status
* page_count
* created_at

`page_count` existe:

```txt
integer nullable default null
check page_count is null or page_count >= 0
```

### document_extractions

Columnas conocidas:

* id
* source_document_id
* extracted_text
* status
* error_message
* created_at

No asumir columnas extra como `legend_id`, `asset_id`, `metadata`, `updated_at`.

### legend_pages

Columnas conocidas:

* id
* version_id
* page_number
* title
* text_content
* background_asset_id
* created_at
* updated_at

### ar_scenes

Columnas conocidas:

* id
* page_id
* name
* description
* model_asset_id
* scale
* position
* rotation
* interaction_config
* status
* created_by
* created_at
* updated_at

No tiene `legend_id`.

### ar_markers

Columnas conocidas:

* id
* marker_code
* marker_asset_id
* ar_scene_id
* marker_type
* status
* created_by
* approved_by
* approved_at
* created_at
* updated_at

No tiene `legend_id`.

Si existe código filtrando `ar_markers.legend_id`, está mal.

---

## 18. Estado de IA/Gemini

Gemini ya está integrado en backend.

Provider soporta:

* disabled.
* gemini.

El contrato de error fue mejorado.

Errores conocidos:

* `503 UNAVAILABLE` puede ocurrir por alta demanda del modelo.
* No es necesariamente error de API key ni código.

No mostrar IA como panel principal de Contenido.

No borrar backend IA.

No usar Gemini desde frontend.

---

## 19. Prioridad inmediata para Codex

### Prioridad 1 — Bugfix crítico

Reparar:

```txt
Crear borrador con PDF
```

Problema actual:

```txt
El borrador se crea, pero no se pudo cargar el documento.
```

Objetivo:

```txt
Crear borrador con PDF → source_document registrado.
```

Diagnosticar exactamente:

* prepare-upload.
* signed upload.
* register-upload.
* token.
* VITE_BACKEND_URL.
* backend port.
* page_count/pdf-parse.
* Storage path.
* insert asset/source_document.

No avanzar a AR/3D hasta cerrar esto.

### Prioridad 2 — Validar DOC-1

Después del bugfix:

* subir PDF nuevo.
* confirmar `page_count`.
* confirmar preview.
* confirmar abrir completo.
* confirmar UI compacta.
* confirmar IA visible oculta.

### Prioridad 3 — interactive_hotspots

Solo después de regresión cero.

Crear tabla, RLS, backend service, routes y UI mínima.

### Prioridad 4 — overlay en preview PDF

Mostrar hotspot sobre preview.

### Prioridad 5 — visor 3D/modelo

Al presionar hotspot, abrir modelo 3D básico.

### Prioridad 6 — visor WebGL/flipbook

Codex puede ayudar especialmente aquí:

* PDF como páginas.
* efecto libro.
* físicas de página.
* sombras.
* zoom.
* pantalla completa.
* overlays.
* marcadores/modelos por página.

Pero no empezar esto antes de que el flujo de datos esté estable.

---

## 20. Colaboración con Codex

Codex y Codex colaborarán.

Reglas:

* No pisar cambios sin revisar `git status`.
* Si hay cambios no commiteados, tratarlos con cuidado.
* No reescribir archivos enteros si solo se requiere bugfix.
* No duplicar servicios.
* No crear backend paralelo.
* No crear componentes alternativos sin integrar.
* No borrar trabajo de Codex sin explicar.
* Si hay conflicto conceptual, reportar y pedir decisión.

Cuando Codex reciba una tarea, debe indicar:

```txt
Archivos que pienso revisar:
Archivos que probablemente tocaré:
Riesgos:
Validaciones:
```

---

## 21. Comandos útiles

Buscar referencias:

```bash
rg "createLegendDraft"
rg "register-upload"
rg "prepare-upload"
rg "legend_source_documents"
rg "page_count"
rg "source_document"
rg "ar_markers"
rg "ar_scenes"
rg "legend_id"
```

Build backend:

```bash
cd backend
npm.cmd run build
```

Build frontend:

```bash
cd frontend
npm.cmd run build
```

Ver estado:

```bash
git status --short
git diff --stat
```

No usar comandos destructivos sin autorización:

```bash
git reset --hard
git clean -fd
rm -rf
```

---

## 22. Formato de respuesta esperado de Codex

Al terminar cualquier tarea, responder así:

```txt
Resumen:
...

Causa exacta:
...

Archivos modificados:
...

Cambios realizados:
...

Confirmaciones:
- No toqué DB/schema/RLS/RPC: sí/no
- No toqué .env: sí/no
- No imprimí secrets: sí/no
- No rompí flujo X: sí/no

Build:
Backend:
Frontend:

Pruebas:
...

SQL si aplica:
...

git status --short:
...

git diff --stat:
...

Pendientes:
...
```

No decir “funciona” si no se probó. Decir:

```txt
No pude probar con sesión real.
```

cuando aplique.

---

## 23. Qué no debe hacer Codex

No hacer esto:

* “arreglé varias cosas de paso”.
* “refactoricé todo el editor”.
* “moví toda la arquitectura”.
* “cambié el schema porque me pareció mejor”.
* “hice público el bucket para que funcionara”.
* “puse la service_role en frontend”.
* “borré el backend IA”.
* “eliminé flujos legacy sin verificar”.
* “cambié roles”.
* “limpié Storage”.
* “eliminé borradores”.
* “cambié deploy”.
* “actualicé dependencias masivamente”.
* “modifiqué node_modules”.

---

## 24. Objetivo final

El flujo final esperado del proyecto es:

### Autor carga obra ya hecha

```txt
Sube PDF/DOCX
→ backend registra documento
→ backend detecta page_count si es PDF
→ frontend muestra preview limpia
→ autor puede abrir completo
→ autor asocia marcadores/modelos a páginas
→ lector ve documento como libro interactivo
```

### Autor crea desde cero

```txt
Crea páginas manualmente
→ agrega texto
→ agrega recursos
→ asocia 3D/AR por página
→ envía a revisión
```

### Lector

```txt
Catálogo
→ detalle de leyenda
→ leer documento original o lectura interactiva
→ ver marcadores/modelos
→ usar app AR si corresponde
```

### Admin

```txt
Revisa contenido
→ aprueba/rechaza
→ gestiona creadores
→ genera códigos
→ revisa assets
```

---

## 25. Estado de entrega recomendado

Antes de considerar el proyecto presentable:

* login estable.
* roles estables.
* crear borrador estable.
* cargar PDF estable.
* preview documento estable.
* portada/banner estable.
* admin/users estable.
* creator panel estable.
* AR/3D mínimo funcional.
* seguridad revisada.
* deploy probado.
* `.env` fuera de Git.
* Storage limpio al final, no antes.

---

## 26. Última instrucción

Si hay duda entre:

```txt
hacer feature nueva
```

y:

```txt
no romper flujo existente
```

elegir siempre:

```txt
no romper flujo existente
```

Primero estabilidad. Después diseño. Después magia.
