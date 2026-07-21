# Informe de Pruebas del Software — Leyendas de Bacalar

**Proyecto:** Leyendas de Bacalar — plataforma web cultural interactiva (catálogo, editor de
autores, panel administrativo, lectura de documentos, AR/3D).
**Fecha del informe:** 14 de julio de 2026
**Tipo:** Auditoría técnica de pruebas del software (ejecución real, no simulada).

> **Marco de referencia (Sommerville).** La prueba del software se limita a demostrar que
> las interfaces de los elementos estructurales operan correctamente y satisfacen las
> restricciones establecidas. Este documento integra los cuatro apartados requeridos:
> **Pruebas de Desarrollo**, **Pruebas de Versión**, **Pruebas de Usuario** e **Informe de
> errores y defectos**, más un apartado de **Pruebas de Usabilidad** (con su protocolo).

---

## Índice

1. Resumen ejecutivo
2. Contexto y estado inicial
3. Herramientas y estrategia de pruebas
4. Integración continua (CI/CD)
5. **Apartado A — Pruebas de Desarrollo**
6. **Apartado B — Pruebas de Versión**
7. **Apartado C — Pruebas de Usuario (Aceptación)**
8. **Apartado D — Pruebas de Usabilidad**
9. **Apartado E — Informe de errores y defectos**
10. Confirmaciones, archivos y pendientes

---

## 1. Resumen ejecutivo

Se construyó, desde cero, la infraestructura de pruebas automatizadas del proyecto (antes
inexistente como suite ejecutable) y su pipeline de integración continua. Se ejecutaron las
tres fases automatizables de prueba y se entregan los protocolos de las fases que requieren
usuarios reales.

| Indicador | Antes | Después |
|---|---|---|
| Suite ejecutable | ❌ | ✅ (`npm test` en backend y frontend) |
| Pruebas automatizadas | 7 (no ejecutables por script) | **139** |
| Resultado | — | **138 aprobadas · 1 fallida (DEF-002, regresión externa)** |
| CI/CD | ❌ | ✅ GitHub Actions |
| Defectos documentados | — | **2** (DEF-001, DEF-002) |

**Distribución de las 139 pruebas:**

| Suite | Pruebas | Estado |
|---|---|---|
| Backend — unitarias (`node:test`) | 16 | ✅ 16/16 |
| Backend — integración de API (`node:test`) | 14 | ✅ 14/14 |
| Frontend — unitarias de lógica pura (`node:test`) | 66 | ⚠️ 65/66 (1 fallo = DEF-002) |
| Frontend — unitarias + de componentes (Vitest) | 43 | ✅ 43/43 |

---

## 2. Contexto y estado inicial

Al iniciar la auditoría:
- No existía ningún comando para ejecutar pruebas (había 3 archivos `*.test.mjs` sueltos sin
  script que los corriera).
- No existía integración continua (`.github/workflows` no estaba en el repositorio).
- `node_modules` del backend está versionado por herencia (decisión previa del proyecto),
  lo que condicionó la estrategia para no contaminar el repositorio.

---

## 3. Herramientas y estrategia de pruebas

Estrategia de **dos runners complementarios**:

### Backend — runner nativo de Node (`node --test`)
- **Cero dependencias nuevas.** Se respetó y amplió la convención `node:test`/`*.test.mjs`
  ya presente. Cobertura con `--experimental-test-coverage` (Node 22+).

### Frontend — Vitest + Testing Library (instalado) **y** `node:test`
Paquetes instalados como `devDependencies` (`node_modules` ignorado en git; no contamina):

| Paquete | Uso |
|---|---|
| `vitest`, `@vitest/coverage-v8` | Runner + cobertura V8 |
| `jsdom` | Entorno DOM para componentes React |
| `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` | Render, aserciones e interacción centradas en el usuario |

- El frontend usa `node:test` para la lógica pura (`*.test.mjs`, no dependen de
  `import.meta.env`) y **Vitest** para lo que necesita el entorno de Vite o el DOM
  (componentes) y para la cobertura. `npm test` ejecuta ambos.

### Comandos
```bash
# Backend (leyendas-de-bacalar/backend)
npm test               # node --test "src/**/*.test.mjs"
npm run test:coverage  # + cobertura nativa V8

# Frontend (leyendas-de-bacalar/frontend)
npm test               # node --test (.mjs) && vitest run
npm run test:coverage  # Vitest con cobertura
npm run test:watch     # Vitest en modo observador
```

---

## 4. Integración continua (CI/CD)

Pipeline `.github/workflows/ci.yml` (GitHub Actions), disparado en `push` y `pull_request`
a `main`, con dos *jobs* paralelos:

| Job | Pasos |
|---|---|
| **backend** | `npm ci` → `npm run build` (verificación de sintaxis) → `npm test` |
| **frontend** | `npm ci` → `npm run lint` → `npm test` → `npm run test:coverage` → `npm run build` → publica cobertura como artefacto |

Es **CI** (integración/calidad), no **CD** (no despliega; el despliegue Vercel/Render queda
fuera de alcance por decisión del proyecto). Todos los pasos se validaron localmente
(equivalente a lo que correrá en GitHub Actions).

---

## 5. Apartado A — Pruebas de Desarrollo

Pruebas unitarias y de componentes ejecutadas por el equipo de desarrollo.

### A.1 Unitarias del backend (16) — validación de archivos
Módulo `services/fileValidation.service.js`, puerta del **flujo crítico de subida de
documentos** (Prioridad 1 del proyecto). Cubre caminos felices (PDF, DOCX, PNG, GLB por
extensión, GLTF+JSON), fronteras (normalización de mimeType, `octet-stream`) y errores
(propósito no soportado, tamaño excedido, tamaño cero, metadatos malformados, tipo no
permitido). **Cobertura del módulo: 100 % líneas / 84.85 % ramas.**

### A.2 Unitarias del frontend — lógica pura (`node:test`, 66)
16 archivos que cubren serialización Editor.js→HTML (sanitización de `javascript:`, no
exposición de UUIDs), geometría/estado de medios, clipboard, selección, gestos, migración
de composiciones, tipografía/paleta y política de subida.

### A.3 Unitarias y de componentes del frontend (Vitest, 43)
| Archivo | Qué prueba | Tipo |
|---|---|---|
| `utils/validators.test.js` | `isEmail`, `isRequired` | Unitaria |
| `utils/formatters.test.js` | moneda, fecha, precio, título | Unitaria |
| `services/roleService.test.js` | normalización de roles (base de permisos reales) | Unitaria |
| `utils/readerPages.test.js` | páginas del lector + filtrado de hotspots (PDF vs manual) | Unitaria |
| `components/ui/uiComponents.test.jsx` | render e interacción de `Button`, `EmptyState` | Componente |
| `shared/status/StatusBadge.test.jsx` | render de `StatusBadge` + estados | Componente |

**Cobertura (módulos bajo prueba con Vitest): 77.44 % líneas / 78.88 % ramas.**

---

## 6. Apartado B — Pruebas de Versión

Pruebas del **sistema integrado** (detalle completo en `informe-pruebas-version.md`).

### B.1 Integración de la API (14)
`api.integration.test.mjs` levanta la app Express **real** en un puerto efímero y ejerce el
contrato HTTP de extremo a extremo: salud, 6 cabeceras de seguridad, `X-Powered-By`
deshabilitado, 404 JSON, CORS por lista blanca (permite el origen del frontend, rechaza uno
no autorizado, responde el preflight), autenticación obligatoria (401 en `/auth/me`,
esquema no-Bearer, Bearer sin token, y en `prepare-upload`/`register-upload`), y robustez
ante JSON malformado. **14/14 ✅**

> Cambio mínimo de código: exportar la app y condicionar `app.listen()` a
> `NODE_ENV !== 'test'`. Sin impacto en producción.

### B.2 Verificación de sistema del frontend (navegador)
Con ambos servidores reales y sus `.env`: backend `/health` sano; Home, Catálogo (estado
vacío) y Login renderizan correctamente; **sin errores de consola** con el backend
conectado. **✅**

---

## 7. Apartado C — Pruebas de Usuario (Aceptación)

Guion de aceptación por rol derivado de los flujos críticos §16 (detalle y matriz completa
en `informe-pruebas-usuario.md`). 19 casos definidos (CA-01…CA-19).

- **Verificados (automatizado/navegador):** CA-01 (home), CA-02 (catálogo), CA-03 (login),
  CA-17 (subida exige sesión), CA-18 (CORS), CA-19 (cabeceras) → **6 aprobados**.
- **Pendientes de sesión/rol/datos reales:** 13 casos (crear borrador con/sin PDF,
  portada/banner, eliminar borrador, admin/usuarios, aprobación de contenido, canje de
  código, lectura de leyenda).

> **Honestidad metodológica:** no se fabrican resultados de aceptación con usuarios. Los 13
> casos pendientes quedan como guion listo para ejecutarse con credenciales reales de
> lector, creador y admin.

---

## 8. Apartado D — Pruebas de Usabilidad

Protocolo formal completo en `protocolo-pruebas-usabilidad.md`. Método estándar:

1. **Pruebas moderadas por tareas** (task-based) con "pensar en voz alta", 3–5 participantes
   por perfil (lector, creador, admin) — con ~5 usuarios se detecta el ~85 % de problemas.
2. **Métricas objetivas:** tasa de éxito, tiempo por tarea, errores, ayudas solicitadas.
3. **Cuestionario SUS** (System Usability Scale, 10 ítems, puntaje 0–100).
4. **Severidad de problemas** (escala 0–4 de Nielsen).

Incluye escenarios de tarea (T1–T8), plantillas de métricas, el cuestionario SUS con su
fórmula de cálculo, y una **evaluación heurística preliminar** (Nielsen) que ya señala,
entre otros, el impacto de DEF-001 en la visibilidad del estado.

---

## 9. Apartado E — Informe de errores y defectos

### DEF-001 — Alias de estado multi-palabra en español nunca se resuelven

| Campo | Detalle |
|---|---|
| **Severidad** | Media |
| **Estado** | Abierto (documentado; corrección no aplicada por requerir autorización, §11) |
| **Módulo** | `frontend/src/shared/status/statusMeta.js` → `normalizeStatus()` |
| **Detectado por** | Prueba unitaria `StatusBadge.test.jsx` |

`normalizeStatus()` reemplaza espacios por `_` **antes** de consultar el diccionario de
alias, cuyas claves multi-palabra usan espacios (`'en revisión'`). Por eso nunca coinciden:
```js
normalizeStatus('En revisión') // Esperado 'in_review' — Obtenido 'en_revisión'
getStatusTone('En revisión')   // Esperado 'warning'   — Obtenido 'info' (por defecto)
```
**Impacto:** una insignia de estado en español con espacios muestra tono neutro en vez de
advertencia. Los alias de una sola palabra sí funcionan. **Fix propuesto:** normalizar las
claves del diccionario (una línea); pendiente de autorización.

### DEF-002 — Prueba desincronizada tras cambios concurrentes (regresión de suite)

| Campo | Detalle |
|---|---|
| **Severidad** | Baja |
| **Estado** | Abierto (trabajo concurrente de otro agente; no modificado, §20) |
| **Módulo** | `frontend/src/components/creator/editorBlockTools.test.mjs` (prueba) vs. su fuente |
| **Detectado por** | Suite `node:test` del frontend |

Durante la auditoría, el código de `editorBlockTools` empezó a emitir campos adicionales
(`markerAssetId`, `markerImageUrl`, `markerTitle`, `modelAssetId`, `modelTitle`, todos `''`)
en el objeto normalizado, pero su prueba **no se actualizó** para esperarlos, por lo que
ahora falla:
```text
+ actual - expected
+   markerAssetId: ''
+   markerImageUrl: ''
+   markerTitle: ''
+   modelAssetId: ''
+   modelTitle: ''
```
**Origen:** cambios concurrentes (commits de otro agente/Codex) que dejaron la prueba
desalineada con la fuente. **Es precisamente lo que esta infraestructura debe atrapar.**
**Acción recomendada:** si las nuevas claves son intencionales, actualizar el objeto
esperado en la prueba (cambio de una sola prueba). No se aplicó por respetar el trabajo en
curso de otro agente (§20) y por requerir confirmar la intención del cambio.

### Falso positivo descartado
- `npm run lint` fallaba inicialmente por 2 "Unused eslint-disable directive" que provenían
  de los **archivos generados** del reporte de cobertura (`coverage/*.js`), no del código
  fuente. Se corrigió añadiendo `coverage` a `ignorePatterns` de ESLint y a `.gitignore`.
  No era un defecto de producto.

---

## 10. Confirmaciones, archivos y pendientes

### Confirmaciones
- No se tocó base de datos, esquema, RLS, RPC ni migraciones.
- No se tocó `.env` ni se imprimieron secretos.
- No se modificó ningún `node_modules` versionado.
- Cambios de código de producto **mínimos**: solo exportar la app Express y condicionar
  `listen()` (testabilidad; sin impacto en producción).
- Se respetó el trabajo concurrente de otro agente (no se modificó; se documentó DEF-002).

### Archivos entregados (pruebas, CI y documentación)
- `.github/workflows/ci.yml`
- `backend/src/services/fileValidation.rules.test.mjs` (13 pruebas)
- `backend/src/api.integration.test.mjs` (14 pruebas)
- `frontend/vitest.config.js`, `frontend/src/test/setup.js`
- `frontend/src/utils/{validators,formatters,readerPages}.test.js`
- `frontend/src/services/roleService.test.js`
- `frontend/src/components/ui/uiComponents.test.jsx`
- `frontend/src/shared/status/StatusBadge.test.jsx`
- `docs/pruebas/` — este informe + los informes por fase.

### Modificados (mínimos)
- `backend/src/index.js` (export + listen condicional)
- `backend/package.json`, `frontend/package.json`, `frontend/package-lock.json`
- `frontend/.eslintrc.cjs`, `.gitignore`

### Pendientes recomendados
1. Decidir sobre **DEF-001** (corrección de 1 línea) y **DEF-002** (actualizar prueba).
2. Ampliar cobertura de `services/*` del frontend y de servicios del backend.
3. Ejecutar los 13 casos de aceptación pendientes (Apartado C) con sesiones reales.
4. Ejecutar la sesión de usabilidad (Apartado D) con 3–5 usuarios por perfil.
5. Autorizar el `push` para ver el CI corriendo en GitHub.

---

## Anexo — Evidencia de ejecución

```text
BACKEND  (node --test)      → tests 30  | pass 30  | fail 0
  fileValidation.service.js → 100.00 % líneas | 84.85 % ramas
FRONTEND (node --test .mjs) → tests 66  | pass 65  | fail 1  (DEF-002)
FRONTEND (Vitest)           → 7 archivos | 43 pass
  Cobertura módulos bajo prueba → 77.44 % líneas | 78.88 % ramas
TOTAL: 139 pruebas | 138 aprobadas | 1 fallida (regresión externa DEF-002)
```
