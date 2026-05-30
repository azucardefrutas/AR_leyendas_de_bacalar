# AGENTS.md — Leyendas de Bacalar

Este archivo contiene instrucciones obligatorias para Codex al trabajar en el proyecto **Leyendas de Bacalar**.

Antes de modificar código relacionado con Supabase, roles, panel admin, panel autor, leyendas, versiones, páginas, recursos, códigos, compras o suscripciones, leer primero:

```text
backend/docs/database-map.md
```

Si el archivo no existe en el repo local, créalo copiando el contenido del mapa de base de datos actualizado.

---

## 1. Propósito del proyecto

Leyendas de Bacalar es una plataforma cultural con tres módulos principales:

- Lector / Usuario
- Creador / Autor
- Administrador

El proyecto usa Supabase como backend principal:

- Auth
- PostgreSQL
- RLS
- RPC/functions
- Storage si aplica

La arquitectura actual debe respetarse:

```text
React components
→ services
→ Supabase client / RPC / queries
→ PostgreSQL + RLS
```

Por ahora no usar Express salvo instrucción explícita.

---

## 2. Reglas obligatorias

- No inventar tablas.
- No inventar columnas.
- No tocar SQL ni RLS salvo instrucción explícita.
- No modificar Supabase client salvo instrucción explícita.
- No usar `service_role` en frontend.
- No consultar `auth.users` desde frontend.
- No escribir lógica de permisos dispersa dentro de componentes.
- Usar servicios centralizados.
- No usar datos mock si existe tabla real.
- No mostrar errores técnicos crudos al usuario.
- Ejecutar build antes de terminar cambios.

Comando de build:

```bash
npm.cmd run build
```

---

## 3. Permisos y roles

Los permisos reales vienen de:

```text
user_roles + roles
```

No de:

```text
users_profile.active_role
```

`active_role` solo sirve para UI/switch visual.

Un usuario puede tener varios roles:

- `reader`
- `creator`
- `admin`

Un creador puede seguir siendo lector. No bloquear acceso a `/creator` solo porque `active_role = reader` si el usuario tiene rol `creator`.

---

## 4. Validación de creador

Para permitir acceso al panel creador:

```text
canAccessCreatorPanel = hasCreatorRole
```

Para permitir crear leyendas:

```text
canCreateLegend = hasCreatorRole && hasCreatorProfile
```

El perfil creador se busca así:

```js
await supabase
  .from('creator_profiles')
  .select('*')
  .eq('user_id', session.user.id)
  .maybeSingle();
```

NO usar `.eq('id', session.user.id)` sin confirmar columna real.

---

## 5. Flujo obligatorio al aprobar creador

El admin debe gestionar solicitudes desde el panel, no desde SQL manual.

Flujo:

```text
lector solicita creador
→ creator_applications status pending
→ admin aprueba desde /admin/creator-applications
→ RPC approve_creator_application()
→ creator_profiles creado/actualizado
→ user_roles obtiene creator
→ usuario puede entrar a /creator
```

Usar RPC:

```js
supabase.rpc('approve_creator_application', {
  p_application_id: applicationId,
  p_pen_name: penName,
  p_admin_feedback: feedback
});
```

No hacer inserts directos en:

- `creator_profiles`
- `user_roles`

---

## 6. Flujo obligatorio al crear leyenda

Nunca crear solo `legends`.

El flujo correcto es:

```text
1. Crear legends
2. Crear legend_versions
3. Redirigir al editor
4. Guardar páginas en legend_pages.version_id
```

Después de crear `legends`, crear `legend_versions` con:

```js
{
  legend_id: legend.id,
  version_number: 1,
  status: 'draft',
  created_by: session.user.id
}
```

`created_by` es obligatorio.

No redirigir al editor si la versión inicial no se creó.

---

## 7. Mapa crítico de columnas

### `legend_versions`

Columnas reales importantes:

- `id`
- `legend_id`
- `version_number`
- `status`
- `created_by`
- `reviewed_by`
- `review_notes`
- `created_at`
- `submitted_at`

`created_by` es NOT NULL.

### `legend_pages`

Columnas reales:

- `id`
- `version_id`
- `page_number`
- `title`
- `text_content`
- `background_asset_id`

Usar:

```js
version_id
```

NO usar:

```js
legend_version_id
```

---

## 8. Crear leyenda: access_type

En UI se puede mostrar:

- Gratis
- Compra
- Suscripción
- Código físico
- Mixto

Pero la base espera:

- `free`
- `paid`
- `subscription`
- `code_required`
- `mixed`

No mandar `gratis` a Supabase.

---

## 9. Editor de autor

La pantalla de crear leyenda debe ser flujo guiado, no una sola pantalla saturada.

Flujo deseado:

```text
/creator/legends/new
→ elegir modo: crear desde cero / cargar leyenda existente
→ datos generales
→ crear legends + legend_versions
→ /creator/legends/:id/edit
→ tabs o secciones:
   - Datos generales
   - Contenido
   - Recursos
   - 3D / AR
   - Revisión
```

No mostrar páginas ni recursos antes de tener `legendId` y `versionId` reales.

---

## 10. Editor: cargar datos

`getLegendEditorData(legendId)` debe devolver:

```js
{
  legend,
  version,
  pages,
  media,
  sourceDocuments,
  arScenes,
  arMarkers
}
```

Si no hay páginas o recursos, devolver arrays vacíos.

No romper el editor por recursos opcionales faltantes.

Si la leyenda existe pero no tiene versión, intentar crear versión draft de recuperación usando `created_by`.

---

## 11. Recursos

Usar tablas reales:

- `assets`
- `legend_media`
- `legend_source_documents`
- `ar_scenes`
- `ar_markers`

Reglas:

- Crear asset primero.
- Luego relación.
- No crear relación con `asset_id` undefined.
- Storage puede fallar; permitir URL externa si está contemplado.
- No fingir subida.
- No fingir extracción de PDF.

---

## 12. Admin UI

Menú admin que debe cubrirse:

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

No usar nombres visibles con “simulado”.

Correcto:

- Compras
- Pagos
- Suscripciones
- Accesos
- Ingresos

Incorrecto:

- Compras simuladas
- Pagos simulados
- Suscripciones simuladas

Evitar:

- IA falsa
- Data Science
- Shadowban
- Campañas Push
- Super Admin visible
- Finanzas reales exageradas
- Blockchain

---

## 13. Admin real existente

Usuario admin de desarrollo/exposición:

- email: `leyendasadminbacalar@upb.edu.mx`
- UID: `18c428e0-ada7-4aa6-8993-1a33be7be6fd`
- roles: `reader`, `admin`
- `active_role = admin`

Debe poder entrar a `/admin`.

---

## 14. Rutas protegidas

Reglas:

- Sin sesión: `/admin/*`, `/creator/*`, `/reader/*` redirigen a `/login`.
- Admin logueado: puede entrar a `/admin/*`; si entra a `/login` o `/register`, redirigir a `/admin`.
- Reader sin creator: no puede entrar a `/creator/*`.
- Creator: puede entrar a `/creator/*` aunque `active_role = reader`.
- No admin: no puede entrar a `/admin/*`.
- Evitar loops infinitos.

Usar o crear:

- `ProtectedRoute`
- `RoleGuard`
- `CreatorAccessGuard`
- `AccessDeniedPage`

---

## 15. Errores UX

No mostrar errores crudos:

- `invalid input syntax for type uuid`
- `row violates row-level security`
- `permission denied`
- `null value in column created_by`
- `undefined`

Mostrar mensajes humanos:

- “No pudimos guardar la leyenda.”
- “No pudimos crear la versión inicial.”
- “No pudimos cargar el editor.”
- “No pudimos guardar la página.”
- “No tienes permisos para acceder aquí.”
- “Completa los datos obligatorios.”

En desarrollo, sí usar:

```js
console.error('contexto', error);
```

---

## 16. Bugs reales ya detectados

### Bug: `legend_version_id`

Se usó `legend_version_id`, pero la DB tiene `version_id`.

Corregir todos los servicios de páginas.

### Bug: leyenda sin versión

Se creó `legends`, pero no `legend_versions`.

Corregir `createLegendDraft()`.

### Bug: falta `created_by`

`legend_versions.created_by` es obligatorio.

Insert correcto:

```js
{
  legend_id: legend.id,
  version_number: 1,
  status: 'draft',
  created_by: session.user.id
}
```

### Bug: mensaje incorrecto “Leyenda no encontrada”

Si la leyenda existe pero falta versión, no decir “Leyenda no encontrada”.

---

## 17. Checklist antes de terminar cambios

Antes de finalizar una tarea relacionada con leyendas:

- [ ] Build pasa.
- [ ] No hay UUID undefined.
- [ ] Se crea `legends`.
- [ ] Se crea `legend_versions` con `created_by`.
- [ ] Páginas usan `version_id`.
- [ ] Editor recarga datos al refrescar navegador.
- [ ] No se rompen rutas protegidas.
- [ ] No se usa `auth.users` desde frontend.
- [ ] No se usa `service_role`.

---

## 18. Prueba mínima de autor

Probar:

1. Entrar como creator aprobado.
2. Crear leyenda.
3. Verificar que se crea versión.
4. Abrir editor.
5. Crear página.
6. Guardar página.
7. Recargar navegador.
8. Confirmar que la página sigue ahí.
9. Enviar a revisión.
10. Ver revisión en admin.

---

## 19. Estilo visual por módulo

### Lector

- Oscuro/cinematográfico.
- Tipo streaming cultural.
- Azul/turquesa Bacalar.

### Autor

- Claro.
- Editorial.
- Profesional.
- No oscuro/gamer.
- Flujo guiado.

### Admin

- Claro/institucional.
- Header blanco con logo UPB, fecha/hora, ubicación, admin conectado.
- Sidebar azul oscuro.
- Cerrar sesión integrado en avatar/menú.

---

## 20. Backend futuro

Por ahora no usar Express.

La carpeta `backend/` puede tener:

- SQL
- docs
- seeds
- scripts
- futura API

Más adelante, Express/API puede servir para:

- exportar códigos CSV/Excel
- reportes PDF
- procesamiento de PDF
- validación de modelos 3D
- pagos reales/webhooks
- tareas programadas

Pero no agregar backend propio ahora sin instrucción.
