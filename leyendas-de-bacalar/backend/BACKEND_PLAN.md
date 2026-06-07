# BACKEND_PLAN.md — Plan de backend complementario para Leyendas de Bacalar

## Objetivo

Agregar un backend complementario al proyecto **Leyendas de Bacalar** para evitar que el frontend cargue con procesos pesados o delicados.

El backend no reemplaza a Supabase. Supabase sigue siendo el backend principal para Auth, DB, RLS, RPC y Storage.

El backend complementario se usará para:

- Extraer texto de PDF.
- Extraer texto de Word.
- Convertir documentos en páginas.
- Exportar CSV/Excel/PDF.
- Procesar archivos pesados.
- Ejecutar tareas con claves privadas.
- Coordinar procesos largos.

---

## Diagnóstico actual

El frontend ya tiene separación básica:

- Componentes React.
- Services.
- RPC.
- Storage.

Pero aún existen operaciones sensibles repartidas en services y páginas, especialmente:

- `creatorLegendService.js`
- `assetService.js`
- `adminLegendService.js`
- `adminCodeService.js`
- páginas del módulo creador y admin.

Ya existe carpeta `/backend`, pero está incompleta:

- `backend/package.json` existe.
- `src/index.js` o estructura inicial puede estar vacía/incompleta.
- rutas backend pueden estar vacías.

RPCs reales existentes detectadas:

- `delete_legend_draft`
- `approve_content_review`
- `request_content_changes`
- `reject_content_review`
- `publish_legend_version`
- `create_code_batch`
- `redeem_access_code`
- funciones de onboarding
- compras/suscripciones simuladas

RPC crítica a crear o verificar:

- `delete_creator_legend`

Tabla útil existente:

- `document_extractions`

Esto permite planear extracción PDF/Word sobre tabla real, no inventada.

---

## Principio de arquitectura

```txt
React/Vercel = interfaz
Services frontend = coordinación
Supabase = Auth, DB, RLS, Storage, RPC
RPC = acciones críticas de base de datos
Backend/Edge = procesos pesados o privados
```

Regla:

```txt
Frontend renderiza.
Services coordinan.
RPC protege la DB.
Backend procesa lo pesado.
Supabase guarda la verdad.
```

---

## Qué se queda en frontend

- UI.
- Formularios.
- Cards.
- Modales.
- Skeletons.
- Navegación.
- Previews simples.
- Validaciones visuales.
- Estado visual de carga, error y éxito.

El frontend no debe procesar PDF/Word, exportaciones pesadas ni operaciones multi-tabla complejas.

---

## Qué se queda en frontend services

Los services coordinan y normalizan. Deben vivir en frontend, pero sin cargar reglas destructivas complejas.

Ejemplos:

- `getCreatorLegends()`
- `getLegendEditorData()`
- `createLegendDraft()`
- `uploadProjectAsset()`
- `saveLegendResource()`
- `getAdminReviews()`
- `requestDocumentExtraction()`
- llamadas RPC
- llamadas backend
- manejo de errores
- mapeo de datos para cards

---

## Qué debe ir a Supabase RPC

Toda operación multi-tabla o sensible debe ir a RPC.

### Creador

- `delete_creator_legend`
- `delete_legend_draft`, si se mantiene por compatibilidad
- enviar a revisión si toca varias tablas

### Admin

- `approve_content_review`
- `request_content_changes`
- `reject_content_review`
- `publish_legend_version`
- futura `archive_legend` o `unpublish_legend`

### Códigos

- `create_code_batch`
- `redeem_access_code`
- consultar/desbloquear accesos si requiere varias tablas

### Reglas

No usar lógica multi-tabla extensa desde componentes.
No usar DELETE directo si hay RPC.
No crear RPC sin revisión/aprobación.

---

## Qué debe ir a backend o Edge Functions

### Backend recomendado

Usar backend Node.js/Express en `/backend`, alojable en Render u otro servicio.

Ideal para:

- PDF.
- Word.
- Exportaciones.
- Procesamiento pesado.
- Operaciones con `service_role`.
- Tareas largas.

### Edge Functions

Útiles para:

- tareas pequeñas serverless.
- correos.
- integraciones ligeras.
- validaciones aisladas.

No decidir backend vs Edge sin diagnóstico técnico.

---

## Estructura backend propuesta

```txt
backend/
  package.json
  src/
    server.js
    index.js              # opcional si se usa como entrypoint
    config/
      env.js
      supabaseAdmin.js
    middleware/
      auth.js
      errorHandler.js
    routes/
      health.routes.js
      documents.routes.js
      exports.routes.js   # futuro
    services/
      documentExtraction.service.js
      supabaseStorage.service.js
      export.service.js   # futuro
    utils/
      logger.js
```

No crear otro backend paralelo.
Completar el `/backend` existente.

---

## Variables de entorno

### Frontend

Permitidas:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_BACKEND_URL=
```

Nunca usar en frontend:

```env
SUPABASE_SERVICE_ROLE_KEY=
```

### Backend

Permitidas y privadas:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_ORIGIN=
PORT=
```

No subir `.env` al repo.
No imprimir claves en consola.

---

## Seguridad backend

El backend debe:

1. Validar `Authorization: Bearer <token>` cuando la ruta sea sensible.
2. Verificar usuario contra Supabase.
3. Validar rol si aplica.
4. Usar `service_role` solo en backend.
5. Restringir CORS con `FRONTEND_ORIGIN`.
6. No aceptar operaciones sensibles anónimas.
7. No devolver datos privados innecesarios.
8. No exponer trazas internas al usuario final.

---

## Fase 0 — Estabilización previa

Antes de backend:

- `/creator/legends` debe cargar.
- `getCreatorLegends` debe existir/importarse correctamente.
- Crear leyenda debe abrir `/creator/legends/new`.
- Crear borrador debe guardar en Supabase.
- Borrador debe aparecer en Mis leyendas.
- Eliminar debe usar RPC segura.
- Admin/users debe seguir funcionando.
- `npm run build` debe pasar.
- `git diff --stat` debe estar claro.

No avanzar a backend si crear borrador o eliminar están rotos.

---

## Fase 1 — Backend mínimo

Completar `/backend` sin integrar PDF/Word todavía.

### Objetivo

Tener backend corriendo con endpoint de salud.

### Endpoint

```http
GET /health
```

Respuesta:

```json
{
  "ok": true,
  "service": "leyendas-backend"
}
```

### Debe incluir

- Express o framework equivalente ya elegido.
- CORS con `FRONTEND_ORIGIN`.
- Validación de env.
- Error handler básico.
- Logger básico.
- Supabase admin client preparado.

### No debe incluir todavía

- PDF/Word.
- Exportaciones.
- Storage completo.
- Integración frontend.
- Cambios DB.

---

## Fase 2 — Middleware de autenticación backend

Crear middleware:

```txt
middleware/auth.js
```

Responsabilidades:

1. Leer `Authorization: Bearer <token>`.
2. Validar token con Supabase.
3. Inyectar `req.user`.
4. Bloquear si falta token en rutas privadas.
5. No usar auth en `/health`.

---

## Fase 3 — PDF/Word

### Flujo objetivo

```txt
Frontend sube documento
→ Supabase Storage
→ assets
→ legend_source_documents
→ frontend llama backend con documentId/assetId
→ backend descarga archivo
→ extrae texto
→ guarda document_extractions
→ opcionalmente prepara legend_pages
```

### Endpoint futuro

```http
POST /documents/extract
```

Body:

```json
{
  "documentId": "uuid",
  "legendId": "uuid"
}
```

Respuesta exitosa:

```json
{
  "success": true,
  "extractionId": "uuid",
  "status": "completed",
  "pagesDetected": 5
}
```

No procesar PDF/Word desde React.
No fingir extracción.
No guardar texto solo en estado local.

---

## Fase 4 — Conversión documento a páginas

Después de extraer texto:

- Guardar extracción en `document_extractions`.
- Permitir revisión del texto extraído.
- Convertir a `legend_pages` solo si el usuario confirma o si el flujo lo aprueba.
- No sobrescribir páginas existentes sin confirmación.

---

## Fase 5 — Exportaciones

Posibles endpoints:

```http
POST /exports/codes
POST /exports/report
```

Usos:

- Exportar códigos a CSV/Excel.
- Reportes administrativos.
- Reportes de obras.

No implementar hasta que códigos/admin estén estables.

---

## Fase 6 — Procesamiento 3D/AR

No implementar todavía.

Pendiente futuro:

- Validar `.glb` / `.gltf`.
- Revisar peso.
- Registrar metadata.
- Relacionar escena/modelo/marcador.

---

## Fase 7 — Lector/WebGL/3D

No implementar todavía.

Primero estabilizar:

- Autor.
- Admin.
- Storage.
- PDF/Word.
- Catálogo.

Luego visor.

---

## Reglas para Codex / Claude Code

Primero diagnóstico.
Después cambio pequeño.
Después build.
Después diff.
Después smoke test.

No ejecutar SQL sin aprobación.
No tocar frontend crítico durante backend mínimo.
No mezclar backend con rediseño.
No mezclar backend con Storage completo.

---

## Checklist antes de cerrar backend mínimo

- `/backend` corre.
- `GET /health` responde.
- CORS usa `FRONTEND_ORIGIN`.
- Env validation funciona.
- `service_role` no aparece en frontend.
- Frontend build sigue pasando.
- No se tocó DB.
- No se rompió creator.
- No se rompió admin/users.
- `git diff --stat` entregado.

