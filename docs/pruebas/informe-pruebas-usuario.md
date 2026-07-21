# Informe de Pruebas del Software — Fase 3: Pruebas de Usuario (Aceptación)

**Proyecto:** Leyendas de Bacalar
**Fecha:** 14 de julio de 2026
**Alcance:** Pruebas de aceptación centradas en los flujos de usuario reales por rol.

> Las Pruebas de Usuario (o de aceptación) validan que el sistema satisface las
> necesidades del usuario en un entorno realista. A diferencia de las fases anteriores,
> las ejecuta (o supervisa) una persona con el rol correspondiente, con datos y sesión
> reales. Este documento entrega el **guion de aceptación** (casos, pasos y criterios) y
> registra los que ya pudieron verificarse de forma automatizada o en el navegador.

---

## 1. Método

Se definen **casos de aceptación (CA)** derivados de los "flujos críticos que no deben
romperse" de la constitución del proyecto (§16). Cada caso tiene: precondición, pasos,
resultado esperado y una columna de resultado que el evaluador marca con la sesión real.

Estados posibles: ✅ Aprobado · ❌ Fallido · ⚠️ Con observaciones · ⏳ Pendiente (requiere
sesión/rol real).

---

## 2. Matriz de casos de aceptación

### Rol: Visitante / Lector

| ID | Caso | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| CA-01 | Cargar la página de inicio | Abrir `/` | Hero + galería 3D + navegación visibles, sin errores de consola | ✅ (verificado en navegador) |
| CA-02 | Ver el catálogo | Abrir `/catalog` | Lista de leyendas publicadas o estado vacío claro | ✅ (estado vacío correcto) |
| CA-03 | Ver formulario de acceso | Abrir `/login` | Campos correo/contraseña + accesos sociales | ✅ (verificado) |
| CA-04 | Iniciar sesión con credenciales válidas | Introducir correo/contraseña reales → "Iniciar sesión" | Redirección a home según rol; sesión activa | ⏳ (requiere credenciales reales) |
| CA-05 | Canjear un código de acceso | `/reader/redeem` → introducir código válido | Acceso concedido a la leyenda asociada | ⏳ (requiere código real) |
| CA-06 | Leer una leyenda (documento original) | Abrir una leyenda publicada → "Leer" | Visor muestra el PDF/lectura interactiva; navegación entre páginas | ⏳ (requiere leyenda publicada) |

### Rol: Creador / Autor

| ID | Caso | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| CA-07 | Crear borrador **sin** PDF | `/creator/legends/new` → completar → guardar | Se crean `legends` + `legend_versions`; abre editor | ⏳ (requiere rol creador) |
| CA-08 | Crear borrador **con** PDF (flujo crítico §5) | Nuevo borrador + adjuntar PDF | Borrador creado **y** documento registrado en `legend_source_documents`; visible en editor | ⏳ (requiere rol creador) |
| CA-09 | Ver documento original en el editor | Abrir un borrador con documento | Preview limpia + chips (tipo, páginas, tamaño) | ⏳ |
| CA-10 | Reemplazar portada/banner | Editor → cambiar portada | Nueva imagen aplicada; `legend_media`/`assets` actualizados | ⏳ |
| CA-11 | Eliminar borrador | Lista de borradores → eliminar | Borrador removido (RPC); sin dejar huérfanos | ⏳ |
| CA-12 | Enviar a revisión | Editor → enviar | Estado cambia a "En revisión" | ⏳ |

### Rol: Administrador

| ID | Caso | Pasos | Resultado esperado | Estado |
|---|---|---|---|---|
| CA-13 | Listar usuarios | Panel admin → usuarios | Lista sin error (no consulta `users_profile.email`, §16) | ⏳ (requiere rol admin) |
| CA-14 | Suspender/activar usuario | Admin → cambiar estado | Cambio server-side tras `requireRole(['admin'])` | ⏳ |
| CA-15 | Aprobar/rechazar contenido | Admin → revisión | Estado de la leyenda actualizado | ⏳ |
| CA-16 | Gestionar creadores/códigos | Admin → creadores/códigos | Alta y generación funcionan | ⏳ |

### Seguridad transversal (verificable sin sesión)

| ID | Caso | Resultado esperado | Estado |
|---|---|---|---|
| CA-17 | Subida de documentos exige sesión | `POST /documents/prepare-upload` y `register-upload` sin token → 401 | ✅ (Fase 2) |
| CA-18 | CORS por lista blanca | Origen no autorizado no recibe cabecera CORS | ✅ (Fase 2) |
| CA-19 | Cabeceras de seguridad presentes | 6 cabeceras endurecidas en toda respuesta | ✅ (Fase 2) |

---

## 3. Resumen de cobertura de aceptación

- **Verificados automáticamente / en navegador:** CA-01, CA-02, CA-03, CA-17, CA-18, CA-19 (6).
- **Pendientes de sesión/rol/datos reales:** 13 casos (CA-04 a CA-16). Requieren credenciales
  reales de lector, creador y admin, y contenido sembrado.

> **Nota metodológica:** no se fabrican resultados de aceptación. Los 13 casos pendientes
> se dejan como guion listo para que tú (o un evaluador con cada rol) los ejecutes con
> sesión real y marques el resultado. Puedo acompañarte a ejecutarlos en el navegador si me
> facilitas un usuario de prueba por rol.
