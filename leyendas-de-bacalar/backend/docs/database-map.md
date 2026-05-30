# Leyendas de Bacalar — Database Map

Este documento describe el contrato real entre el frontend de **Leyendas de Bacalar** y la base de datos Supabase/PostgreSQL.

Codex debe revisar este archivo antes de modificar servicios relacionados con:

- autenticación
- roles
- permisos
- panel lector
- panel creador/autor
- panel administrador
- leyendas
- versiones
- páginas
- recursos
- códigos físicos
- compras
- suscripciones
- revisiones

La regla principal es simple: **no inventar tablas, columnas ni relaciones**. Si hay duda, inspeccionar la base primero.

---

## 1. Arquitectura actual

El backend principal actual es Supabase.

```text
React
→ services
→ Supabase client / RPC / queries
→ PostgreSQL + RLS
```

Por ahora no se usa Express como backend activo.

La carpeta `backend/` se usa para organizar:

- SQL
- documentación técnica
- mapa de base de datos
- scripts de prueba
- seeds
- futura API si algún día se requiere

El frontend no debe tener consultas dispersas por todos los componentes. Las pantallas deben consumir servicios centralizados.

---

## 2. Reglas críticas para Codex

- No inventar tablas.
- No inventar columnas.
- No usar `service_role` en frontend.
- No consultar `auth.users` desde frontend.
- No depender de `users_profile.active_role` para permisos reales.
- Los permisos reales vienen de `user_roles + roles`.
- `active_role` solo sirve para UI/switch visual.
- Un usuario puede tener varios roles: `reader`, `creator`, `admin`.
- Un creador también puede seguir actuando como lector.
- `creator_profiles` se consulta por `user_id`.
- `legends.creator_id` debe coincidir con el creador aprobado según la FK real.
- En la base actual, `legends.creator_id` está funcionando con `creator_profiles.user_id`.
- `legend_versions.created_by` es obligatorio.
- `legend_pages` usa `version_id`, NO `legend_version_id`.
- La UI puede decir “Gratis”, pero la base espera `free`.
- No mostrar la palabra “simulado” en UI. Usar nombres normales como “Compras”, “Pagos”, “Suscripciones”, “Accesos”.
- Nunca mostrar `code_hash` en UI.
- No aprobar creadores manualmente desde frontend con inserts directos; usar RPC.

---

## 3. Roles y permisos

### Tablas

- `users_profile`
- `roles`
- `user_roles`

### Roles principales

- `reader`
- `creator`
- `admin`

### Regla de permisos

`active_role` NO define permisos reales.

Correcto:

```text
user_roles + roles = permisos reales
users_profile.active_role = modo visual / switch UI
```

Un usuario con roles `reader` y `creator` debe poder entrar a `/creator`, aunque `active_role = reader`.

---

## 4. Flujo de solicitud de creador

### Tablas

- `creator_applications`
- `creator_profiles`
- `user_roles`
- `roles`

### RPC existentes

- `approve_creator_application(p_application_id, p_pen_name, p_admin_feedback)`
- `reject_creator_application(p_application_id, p_admin_feedback)`

### Flujo correcto

```text
Usuario lector
→ solicita convertirse en creador
→ se crea creator_applications status pending
→ admin revisa desde /admin/creator-applications
→ admin aprueba con RPC approve_creator_application()
→ RPC crea/actualiza creator_profiles
→ RPC asigna rol creator en user_roles
→ usuario puede entrar a /creator
```

### Reglas

- No insertar manualmente en `creator_profiles` desde frontend.
- No insertar manualmente en `user_roles` desde frontend.
- No consultar `auth.users` desde frontend.
- Si el correo no está disponible, mostrar “No disponible”.
- Si la tabla carga, no mostrar error global por falta de correo.

---

## 5. Tabla: `creator_profiles`

Uso: representa al usuario aprobado como autor/creador.

Columnas importantes:

- `user_id`
- `pen_name`
- `status` si existe
- fechas de creación/actualización si existen

Consulta correcta:

```js
const { data: creatorProfile } = await supabase
  .from('creator_profiles')
  .select('*')
  .eq('user_id', session.user.id)
  .maybeSingle();
```

NO usar:

```js
.eq('id', session.user.id)
```

A menos que se confirme que la tabla tiene una columna `id` relacionada así. En este proyecto se debe partir de `user_id`.

---

## 6. Flujo principal de creación de leyenda

Este es uno de los flujos más importantes del proyecto.

```text
creator_profiles
→ legends
→ legend_versions
→ legend_pages
→ assets / legend_media / legend_source_documents
→ ar_scenes / ar_markers
→ content_reviews
```

Nunca crear una leyenda sin crear su versión inicial.

---

## 7. Tabla: `legends`

Uso: guarda la obra base.

Columnas importantes:

- `id`
- `creator_id`
- `title`
- `slug`
- `short_synopsis`
- `synopsis`
- `origin_place`
- `language`
- `age_rating`
- `access_type`
- `status`
- `is_featured`
- `published_at`
- `created_at`
- `updated_at` si existe

### Valores internos para `access_type`

La interfaz puede mostrar textos amigables, pero la base debe recibir valores internos.

| UI | Valor en DB |
|---|---|
| Gratis | `free` |
| Compra | `paid` |
| Suscripción | `subscription` |
| Código físico | `code_required` |
| Mixto | `mixed` |

No mandar:

- `gratis`
- `compra`
- `suscripcion`
- `premium`
- `codigo`
- `undefined`

### Crear leyenda

Después de crear un registro en `legends`, se debe crear inmediatamente una fila en `legend_versions`.

---

## 8. Tabla: `legend_versions`

Uso: guarda versiones/borradores de una leyenda.

Columnas reales inspeccionadas:

| Columna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `legend_id` | uuid | NO | NULL |
| `version_number` | integer | NO | NULL |
| `status` | enum/user-defined | NO | `'draft'::legend_version_status` |
| `created_by` | uuid | NO | NULL |
| `reviewed_by` | uuid | YES | NULL |
| `review_notes` | text | YES | NULL |
| `created_at` | timestamptz | NO | `now()` |
| `submitted_at` | timestamptz | YES | NULL |

### Restricciones inspeccionadas

- `legend_versions_pkey`: primary key (`id`)
- `legend_versions_legend_id_fkey`: `legend_id` references `legends(id)` on delete cascade
- `legend_versions_created_by_fkey`: `created_by` references `users_profile(id)`
- `legend_versions_reviewed_by_fkey`: `reviewed_by` references `users_profile(id)` on delete set null
- `unique_legend_version_number`: unique (`legend_id`, `version_number`)
- `valid_version_number`: check (`version_number > 0`)

### Insert correcto

```js
const { data: version, error: versionError } = await supabase
  .from('legend_versions')
  .insert({
    legend_id: legend.id,
    version_number: 1,
    status: 'draft',
    created_by: session.user.id
  })
  .select()
  .single();
```

### Error detectado

Codex creó `legends`, pero no creó `legend_versions` porque faltaba `created_by`.

Esto provoca errores como:

```text
Leyenda no encontrada
No pudimos preparar esta leyenda
No pudimos crear la versión inicial
```

La leyenda sí existe; lo que falta es su versión inicial.

### Recuperación

Si una leyenda propia existe pero no tiene versión, `getLegendEditorData(legendId)` puede crear una versión draft de recuperación:

```js
{
  legend_id: legend.id,
  version_number: 1,
  status: 'draft',
  created_by: session.user.id
}
```

Antes de insertar, verificar que no exista ya una versión para evitar romper el unique constraint.

---

## 9. Tabla: `legend_pages`

Uso: guarda páginas de una versión.

Columnas reales inspeccionadas:

| Columna | Tipo |
|---|---|
| `id` | uuid |
| `version_id` | uuid |
| `page_number` | integer |
| `title` | varchar |
| `text_content` | text |
| `background_asset_id` | uuid |

### Regla crítica

La columna correcta es:

```text
version_id
```

NO existe:

```text
legend_version_id
```

### Insert correcto

```js
await supabase.from('legend_pages').insert({
  version_id: version.id,
  page_number,
  title,
  text_content
});
```

### Consulta correcta

```js
await supabase
  .from('legend_pages')
  .select('*')
  .eq('version_id', version.id)
  .order('page_number', { ascending: true });
```

---

## 10. Géneros

### Tablas

- `genres`
- `legend_genres`

### Reglas

- Los géneros no deben romper la creación principal de la leyenda.
- Primero crear `legends`.
- Luego crear `legend_versions`.
- Después procesar géneros.
- No insertar en `legend_genres` si no existe `legend.id`.
- Si falla un género, mostrar warning o dejarlo para edición posterior, pero no perder el borrador.

---

## 11. Recursos de leyenda

### Tablas

- `assets`
- `legend_media`
- `legend_source_documents`
- `document_extractions`

### Tipos de recursos esperados

- portada
- banner
- imagen de fondo/backdrop
- PDF opcional
- documentos fuente

### Reglas

- Crear primero un `asset`.
- Luego relacionarlo con `legend_media` o `legend_source_documents`.
- No crear relación si `asset_id` es `undefined`.
- Los recursos son opcionales.
- Si no existen recursos, el editor debe devolver arrays vacíos, no romper.
- Si Storage no está configurado, permitir URL externa como alternativa funcional.
- No fingir subida de archivo.
- No fingir extracción de PDF.

---

## 12. 3D / AR

### Tablas

- `assets`
- `ar_scenes`
- `ar_markers`

### Reglas

- Modelo 3D y marcador AR son conceptos separados.
- Modelo 3D puede ser asset tipo `model_3d` o el valor real que exista en la base.
- Marcador AR puede ser asset tipo `marker_image` o el valor real que exista en la base.
- `ar_scenes` relaciona la leyenda/página/modelo.
- `ar_markers` relaciona marcador con escena.
- No crear `ar_marker` si no existe `ar_scene`.
- Si no hay AR todavía, no romper el editor.

---

## 13. Revisiones

### Tabla

- `content_reviews`

### RPC

- `submit_legend_version_for_review(p_version_id)`
- `approve_content_review(p_review_id, p_feedback)`
- `reject_content_review(p_review_id, p_feedback)`
- `request_content_changes(p_review_id, p_feedback)`
- `publish_legend_version(p_version_id)`

### Flujo

```text
Autor crea versión draft
→ agrega páginas
→ envía a revisión
→ se crea/actualiza content_reviews
→ admin revisa
→ admin aprueba/rechaza/pide cambios/publica
```

### Validaciones antes de enviar

- existe `legendId`
- existe `versionId`
- existe título
- existe sinopsis
- hay al menos una página con `text_content`

---

## 14. Panel administrador

### Menú visible

- Dashboard
- Usuarios
- Solicitudes de autor
- Autores
- Leyendas
- Revisiones
- Recursos
- Códigos
- Lotes de códigos
- Compras
- Suscripciones
- Actividad
- Configuración

### Reglas de UI

- No mostrar “simulado/simulada” en nombres visibles.
- Usar “Compras”, “Pagos”, “Suscripciones”, “Accesos”, “Ingresos”.
- Evitar IA falsa, Data Science, shadowban, campañas push, super admin, blockchain, reportes exagerados.

### Mapeo de secciones

#### Dashboard

Usar:

- `users_profile`
- `creator_applications`
- `creator_profiles`
- `legends`
- `content_reviews`
- `code_batches`
- `access_codes`
- `orders`
- `subscriptions`
- `admin_audit_logs`

#### Usuarios

Usar:

- `users_profile`
- `roles`
- `user_roles`

#### Solicitudes de autor

Usar:

- `creator_applications`
- RPC `approve_creator_application()`
- RPC `reject_creator_application()`

#### Autores

Usar:

- `creator_profiles`
- `users_profile`
- `legends`

#### Leyendas

Usar:

- `legends`
- `legend_versions`
- `legend_pages`
- `creator_profiles`
- `legend_media`
- `assets`

#### Revisiones

Usar:

- `content_reviews`
- `legend_versions`
- `legends`
- `legend_pages`

#### Recursos

Usar:

- `assets`
- `legend_media`
- `legend_source_documents`
- `ar_scenes`
- `ar_markers`

#### Códigos

Usar:

- `code_requests`

#### Lotes de códigos

Usar:

- `code_batches`
- `access_codes`
- `code_redemptions`
- `physical_editions`
- RPC `create_code_batch()`

#### Compras

Usar:

- `orders`
- `order_items`
- `payments`
- `products`
- `user_legend_access`

#### Suscripciones

Usar:

- `subscription_plans`
- `subscriptions`
- `user_legend_access`

#### Actividad

Usar:

- `admin_audit_logs`

#### Configuración

Si no existe tabla de configuración, dejar UI preparada. No inventar tabla.

---

## 15. Códigos físicos

### Tablas

- `code_requests`
- `code_batches`
- `access_codes`
- `code_redemptions`
- `physical_editions`

### RPC

- `create_code_batch(p_edition_id, p_quantity, p_prefix, p_notes, p_code_request_id)`

### Reglas

- Autor solicita códigos.
- Admin genera códigos.
- Autor NO genera códigos directamente.
- No mostrar `code_hash` en UI.
- Mostrar `display_code`, status, lote, usados/disponibles.

---

## 16. Compras y suscripciones

Aunque internamente sean simuladas para estadía, la UI debe usar nombres normales.

### Tablas

- `products`
- `orders`
- `order_items`
- `payments`
- `user_legend_access`
- `subscription_plans`
- `subscriptions`

### UI

Usar:

- Compras
- Pagos
- Suscripciones
- Accesos
- Ingresos

No usar:

- Compras simuladas
- Pagos simulados
- Suscripciones simuladas

---

## 17. Rutas protegidas

### Reglas

Si no hay sesión:

- permitir `/`, `/login`, `/register`
- redirigir `/admin/*`, `/creator/*`, `/reader/*` a `/login`

Si hay sesión admin:

- permitir `/admin/*`
- si entra a `/login` o `/register`, redirigir a `/admin`

Si hay sesión reader:

- no permitir `/admin/*`
- no permitir `/creator/*` si no tiene rol creator

Si hay sesión creator:

- permitir `/creator/*`
- no permitir `/admin/*` salvo que también tenga rol admin

---

## 18. Servicios recomendados

Los componentes deben usar servicios. No meter consultas complejas en JSX.

### Servicios de creador

- `creatorAccessService.js`
- `creatorLegendService.js`
- `creatorApplicationService.js`
- `assetService.js`
- `arService.js`

### Servicios admin

- `adminService.js`
- `adminUserService.js`
- `adminCreatorService.js`
- `adminLegendService.js`
- `adminAssetService.js`
- `adminCodeService.js`
- `adminPurchaseService.js`
- `adminSubscriptionService.js`
- `adminActivityService.js`

### Regla de retorno

Los servicios deben retornar objetos consistentes:

```js
{ data, error }
```

---

## 19. Errores a evitar

No mostrar al usuario errores técnicos crudos como:

- `invalid input syntax for type uuid`
- `row violates row-level security`
- `permission denied`
- `undefined`
- `null value in column created_by`

Mostrar mensajes humanos:

- “No pudimos guardar la leyenda.”
- “No pudimos crear la versión inicial.”
- “No pudimos cargar el editor.”
- “No pudimos guardar la página.”
- “No tienes permisos para acceder aquí.”
- “Completa los datos obligatorios.”

En desarrollo, sí dejar:

```js
console.error('contexto del error', error);
```

---

## 20. Checklist de creación de leyenda

Al crear leyenda nueva:

1. Validar sesión.
2. Validar rol creator.
3. Validar `creator_profiles.user_id`.
4. Validar datos obligatorios.
5. Mapear `access_type` a valor interno.
6. Insertar `legends`.
7. Obtener `legend.id`.
8. Insertar `legend_versions` con `created_by`.
9. Procesar géneros si aplica.
10. Redirigir a `/creator/legends/:id/edit`.
11. En editor, cargar versión.
12. Guardar páginas en `legend_pages.version_id`.

---

## 21. Bugs reales detectados

### Bug 1: `legend_version_id`

Se usó `legend_version_id`, pero la DB usa `version_id`.

Corrección:

```js
.eq('version_id', version.id)
```

### Bug 2: no se creaba `legend_versions`

Se creaba `legends`, pero no `legend_versions`.

Corrección:

crear versión inicial siempre.

### Bug 3: faltaba `created_by`

`legend_versions.created_by` es obligatorio.

Corrección:

```js
created_by: session.user.id
```

### Bug 4: mensaje engañoso “Leyenda no encontrada”

La leyenda sí existía, pero faltaba la versión.

Corrección:

- si no existe `legends.id`: “Leyenda no encontrada”
- si existe leyenda pero falta versión: “No pudimos preparar esta leyenda” o crear versión automáticamente

---

## 22. Prueba mínima obligatoria

Antes de cerrar cambios, probar:

1. Crear usuario creador aprobado.
2. Entrar a `/creator/legends/new`.
3. Crear leyenda con datos generales.
4. Confirmar que existen:
   - `legends`
   - `legend_versions`
5. Abrir editor.
6. Crear página.
7. Confirmar que existe `legend_pages.version_id`.
8. Recargar navegador.
9. Verificar que la página sigue ahí.
10. Enviar a revisión.
11. Ver revisión en admin.

---

## 23. Estado actual del admin conocido

Usuario admin creado en Supabase Auth:

- correo: `leyendasadminbacalar@upb.edu.mx`
- UID: `18c428e0-ada7-4aa6-8993-1a33be7be6fd`
- roles verificados: `reader`, `admin`
- `active_role = admin`

Este usuario debe poder entrar a `/admin`.

---

## 24. Estado actual del diseño esperado

### Admin

- Barra superior blanca institucional.
- Logo UPB visible.
- Fecha/hora.
- Ubicación: “Bacalar, Q. Roo.”
- Admin conectado.
- Avatar circular con inicial.
- Cerrar sesión dentro de avatar/menú, no como botón feo.
- Sidebar azul oscuro institucional.

### Autor

- Panel claro, editorial, profesional.
- No fondo oscuro tipo lector.
- Crear leyenda debe ser flujo guiado:

```text
Datos generales
→ Empezar a crear
→ Editor
→ Contenido
→ Recursos
→ 3D/AR
→ Revisión
```

### Lector

- Diseño oscuro/cinematográfico tipo streaming.
- No mezclar estética lector con autor/admin.
