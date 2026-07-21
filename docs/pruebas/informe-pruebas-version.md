# Informe de Pruebas del Software — Fase 2: Pruebas de Versión

**Proyecto:** Leyendas de Bacalar
**Fecha:** 14 de julio de 2026
**Alcance:** Pruebas de Versión (del sistema integrado): pruebas de integración de la API y
verificación de sistema del frontend con el backend conectado.

> Las Pruebas de Versión comprueban que una versión completa e integrada del sistema
> cumple su especificación, ejercitando los componentes ya ensamblados (no unidades
> aisladas). Aquí se prueba el sistema como un todo: contrato HTTP real de la API y
> renderizado real de la aplicación web.

---

## 1. Resumen

| Bloque | Pruebas | Resultado |
|---|---|---|
| Integración de la API (Express real en puerto efímero) | 14 | ✅ 14/14 |
| Verificación de sistema del frontend (navegador) | 4 rutas + consola | ✅ correcto |

**Cambio de código necesario (mínimo):** se exportó la app de Express y se condicionó
`app.listen()` a `NODE_ENV !== 'test'` en `backend/src/index.js`, para poder levantar el
sistema real dentro de las pruebas sin abrir un puerto fijo. No cambia el comportamiento
en producción (`npm start` sigue escuchando igual).

---

## 2. Pruebas de integración de la API (14)

Archivo: `backend/src/api.integration.test.mjs`. Levanta la **aplicación Express real** en
un puerto efímero (`app.listen(0)`) y ejerce el contrato HTTP de extremo a extremo con
`fetch` nativo (sin dependencias nuevas).

| Grupo | Caso | Resultado |
|---|---|---|
| Salud | `GET /health` responde 200 con `{ok, service, version}` | ✅ |
| Seguridad | Aplica las 6 cabeceras endurecidas (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, etc.) | ✅ |
| Seguridad | No expone `X-Powered-By` | ✅ |
| Rutas | Ruta desconocida → 404 JSON con mensaje | ✅ |
| CORS | Permite el origen configurado del frontend | ✅ |
| CORS | Responde el *preflight* `OPTIONS` (204) del origen permitido | ✅ |
| CORS | **No** entrega `Access-Control-Allow-Origin` a un origen no autorizado | ✅ |
| Auth | `GET /api/v1/auth/me` sin `Authorization` → 401 | ✅ |
| Auth | Rechaza esquema distinto de `Bearer` → 401 | ✅ |
| Auth | Rechaza `Bearer` sin token → 401 | ✅ |
| Auth | `POST /documents/prepare-upload` sin sesión → 401 (flujo crítico §16) | ✅ |
| Auth | `POST /documents/register-upload` sin sesión → 401 (flujo crítico §16) | ✅ |
| Robustez | JSON malformado → responde 4xx, no derriba el servicio | ✅ |
| Robustez | El servicio sigue respondiendo tras las peticiones inválidas | ✅ |

**Valor:** estas pruebas fijan el contrato de seguridad del backend (autenticación
obligatoria en subida de documentos, CORS por lista blanca, cabeceras endurecidas) que la
constitución del proyecto exige (§10, §15, §16).

---

## 3. Verificación de sistema del frontend (navegador)

Se levantaron ambos servidores reales (`frontend` en :5173, `backend` en :3000, con sus
`.env` reales) y se navegó la aplicación:

| Prueba de sistema | Evidencia observada | Resultado |
|---|---|---|
| Backend sano | `GET /health` → `{"ok":true,"service":"leyendas-backend","version":"1.0.0"}` | ✅ |
| Home (`/`) | Renderiza hero "BIENVENIDO A LEYENDAS DE BACALAR", galería 3D (El Sismité, La Bruja, La Serpiente del Mar…) | ✅ |
| Catálogo (`/catalog`) | Renderiza con estado vacío correcto ("Aún no hay historias publicadas") | ✅ |
| Login (`/login`) | Formulario con correo, contraseña, botón "INICIAR SESIÓN" y accesos sociales | ✅ |
| Integración front↔back | **Sin errores de consola** con el backend conectado (antes, con el backend caído, había errores `[BackendAPI] Error real`) | ✅ |

---

## 4. Defecto detectado en esta fase

Durante la ejecución se detectó **DEF-002** (regresión de suite por cambios concurrentes):
ver el *Informe de errores y defectos* en el documento consolidado. En resumen, el código
de `editorBlockTools` comenzó a emitir campos adicionales de marcador/modelo y su prueba
`editorBlockTools.test.mjs` no se actualizó, por lo que ahora falla. Detectarlo automática-
mente **es exactamente el objetivo** de esta infraestructura.

---

## 5. Pendientes de la fase

- Pruebas de integración de los flujos **con** sesión válida (requieren un usuario/JWT de
  prueba de Supabase): `prepare-upload` → `PUT` → `register-upload` de extremo a extremo.
- Pruebas de sistema autenticadas (paneles de creador/admin) con datos sembrados.
