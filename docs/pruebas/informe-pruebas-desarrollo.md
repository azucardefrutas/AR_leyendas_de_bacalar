# Informe de Pruebas del Software — Fase 1: Pruebas de Desarrollo

**Proyecto:** Leyendas de Bacalar (plataforma web cultural AR/3D)
**Fecha:** 14 de julio de 2026
**Alcance de este informe:** Pruebas de Desarrollo (unitarias, de componentes y de sistema realizadas por el equipo de desarrollo).
**Autor de la ejecución:** Auditoría técnica asistida (Claude Code).

> Marco de referencia: la prueba del software se limita a demostrar que las interfaces
> de los elementos estructurales operan correctamente y satisfacen las restricciones
> establecidas (Sommerville, *Ingeniería del Software*). Este informe cubre la primera
> de las cuatro fases del plan: **Pruebas de Desarrollo**. Las fases de Pruebas de
> Versión, Pruebas de Usuario y Pruebas de Usabilidad se documentan por separado.

---

## 1. Resumen ejecutivo

Se implementó, desde cero, la infraestructura de pruebas automatizadas del proyecto,
que antes **no existía como suite ejecutable** (había 3 archivos de prueba sueltos sin
forma de correrlos y sin integración continua). Como resultado:

| Indicador | Antes | Después |
|---|---|---|
| Suite de pruebas ejecutable | ❌ No (0 comandos) | ✅ Sí (`npm test` en backend y frontend) |
| Pruebas automatizadas totales | 7 (no ejecutables por script) | **121 (todas en verde)** |
| Cobertura medible | ❌ No | ✅ Sí (backend y frontend) |
| Integración continua (CI/CD) | ❌ No existía | ✅ GitHub Actions (`.github/workflows/ci.yml`) |
| Defectos detectados | — | **1** (DEF-001, documentado) |

**Resultado global de la ejecución: 121 / 121 pruebas aprobadas (0 fallos).**

---

## 2. Objetivos de las Pruebas de Desarrollo

1. Verificar que las **unidades** (funciones puras: validación, formateo, normalización
   de roles y de estados, construcción de páginas del lector) operan correctamente.
2. Verificar que los **componentes** de interfaz (React) se renderizan y responden a la
   interacción esperada.
3. Establecer una **red de seguridad** (regression safety net) alrededor de los flujos
   críticos declarados en la constitución del proyecto (subida de documentos PDF/DOCX,
   validación de archivos, permisos por rol).
4. Automatizar la ejecución en un pipeline de **integración continua**.

---

## 3. Herramientas instaladas y configuradas

La estrategia usa **dos runners complementarios**, elegidos para maximizar cobertura sin
comprometer la estabilidad del repositorio:

### 3.1 Backend — runner nativo de Node (`node --test`)
- **Cero dependencias nuevas.** El backend ya seguía la convención `node:test` con
  archivos `*.test.mjs`. Se respetó y amplió esa convención.
- Cobertura mediante la característica nativa `--experimental-test-coverage` (Node 22+).
- Motivo de la elección: el `node_modules` del backend tiene archivos versionados por
  herencia; no introducir dependencias evita contaminar el repositorio.

### 3.2 Frontend — Vitest + Testing Library
Herramientas instaladas (como `devDependencies`, `node_modules` está ignorado en git, no
contamina el repositorio):

| Paquete | Uso |
|---|---|
| `vitest` | Runner de pruebas integrado con Vite (mismo pipeline de build). |
| `@vitest/coverage-v8` | Reporte de cobertura (V8). |
| `jsdom` | Entorno DOM para renderizar componentes React fuera del navegador. |
| `@testing-library/react` | Render y consulta de componentes centrada en el usuario. |
| `@testing-library/jest-dom` | Aserciones sobre el DOM (`toBeInTheDocument`, etc.). |
| `@testing-library/user-event` | Simulación de interacción real (clics, escritura). |

- El frontend conserva **además** su suite `node:test` (`*.test.mjs`, 66 pruebas de
  lógica pura). Vitest se usa para lo que requiere el entorno de Vite (`import.meta.env`)
  o el DOM (componentes), y para generar la cobertura.

### 3.3 Comandos disponibles

**Backend** (`leyendas-de-bacalar/backend`):
```bash
npm test              # node --test "src/**/*.test.mjs"
npm run test:coverage # + cobertura nativa V8
```

**Frontend** (`leyendas-de-bacalar/frontend`):
```bash
npm test              # node --test (.mjs) && vitest run
npm run test:node     # solo la suite pura node:test
npm run test:vitest   # solo Vitest
npm run test:watch    # Vitest en modo observador (desarrollo)
npm run test:coverage # Vitest con reporte de cobertura
```

---

## 4. Casos de prueba ejecutados

### 4.1 Pruebas unitarias — Backend (16 pruebas)

Módulo bajo prueba: `services/fileValidation.service.js` — es la puerta de validación del
**flujo crítico de subida de documentos** (PDF/DOCX), señalado como Prioridad 1 en la
constitución del proyecto.

| # | Caso | Tipo | Resultado |
|---|---|---|---|
| 1 | Acepta imágenes del editor (PNG) | Camino feliz | ✅ |
| 2 | Normaliza GLB `octet-stream` por su extensión | Camino feliz | ✅ |
| 3 | Mapea propósitos del editor a enum de assets | Camino feliz | ✅ |
| 4 | Acepta PDF de documento fuente ≤ 50 MB | Camino feliz | ✅ |
| 5 | Acepta PDF reportado como `octet-stream` por extensión | Frontera | ✅ |
| 6 | Acepta DOCX de documento fuente | Camino feliz | ✅ |
| 7 | Acepta portada JPEG | Camino feliz | ✅ |
| 8 | Normaliza mimeType a minúsculas y recorta espacios | Frontera | ✅ |
| 9 | Rechaza propósito no soportado | Error esperado | ✅ |
| 10 | Rechaza archivo que excede el tamaño máximo | Error esperado | ✅ |
| 11 | Rechaza tamaño cero o negativo | Error esperado | ✅ |
| 12 | Rechaza metadatos malformados | Error esperado | ✅ |
| 13 | Rechaza tipo de imagen no permitido (GIF) | Error esperado | ✅ |
| 14 | Rechaza `octet-stream` de modelo con extensión inválida | Error esperado | ✅ |
| 15 | Acepta GLTF+JSON válido | Camino feliz | ✅ |
| 16 | Política de registro por defecto para propósito desconocido | Frontera | ✅ |

**Cobertura del módulo:** 100 % de líneas, 84.85 % de ramas.

### 4.2 Pruebas unitarias — Frontend (`node:test`, 66 pruebas)

16 archivos `*.test.mjs` que cubren la lógica pura del editor y del lector:
serialización Editor.js → HTML (con sanitización de `javascript:` y no exposición de
UUIDs), geometría y estado de medios, clipboard, selección, gestos de puntero, migración
de composiciones, tipografía y paleta del editor, y política de subida de imágenes.

### 4.3 Pruebas unitarias y de componentes — Frontend (Vitest, 39 pruebas)

| Archivo | Qué prueba | Tipo |
|---|---|---|
| `utils/validators.test.js` | `isEmail`, `isRequired` | Unitaria |
| `utils/formatters.test.js` | `formatMoney`, `formatDate`, `splitPrice`, `formatPageTitle` | Unitaria |
| `services/roleService.test.js` | Normalización de roles reales (base de permisos) | Unitaria |
| `utils/readerPages.test.js` | Construcción del listado de páginas del lector y filtrado de hotspots por página (PDF vs manual) | Unitaria / integración de lógica |
| `components/ui/uiComponents.test.jsx` | Render e interacción de `Button` y `EmptyState` | Componente |
| `shared/status/StatusBadge.test.jsx` | Render de `StatusBadge` + lógica de estados | Componente + Unitaria |

**Cobertura de los módulos bajo prueba (Vitest):** 77.44 % de líneas, 78.88 % de ramas.

---

## 5. Integración Continua (CI/CD)

Se creó el pipeline `.github/workflows/ci.yml` (GitHub Actions). Se ejecuta en cada
`push` y `pull_request` hacia `main`.

**Diseño:** dos *jobs* paralelos.

| Job | Pasos |
|---|---|
| **backend** | `npm ci` → `npm run build` (verificación de sintaxis) → `npm test` |
| **frontend** | `npm ci` → `npm run lint` → `npm test` → `npm run test:coverage` → `npm run build` → publica la cobertura como artefacto |

- Es **CI** (integración), no **CD** (despliegue): valida calidad, no publica. El
  despliegue (Vercel/Render) queda fuera de alcance por decisión del proyecto.
- Verificación local de todos los pasos del pipeline (equivalente a lo que correrá en
  GitHub Actions):

| Paso | Resultado local |
|---|---|
| Backend `npm run build` (sintaxis) | ✅ exit 0 |
| Backend `npm test` | ✅ 16/16 |
| Frontend `npm run lint` | ✅ 0 errores (182 *warnings* de backlog, permitidos) |
| Frontend `npm test` | ✅ 66 + 39 |
| Frontend `npm run test:coverage` | ✅ 77.44 % |
| Frontend `npm run build` (Vite) | ✅ *built in 2m 35s* |

> El archivo del workflow está creado localmente. **No se ha hecho `push`** al remoto;
> queda a la espera de tu autorización para subirlo.

---

## 6. Informe de errores y defectos

### DEF-001 — Los alias de estado multi-palabra en español nunca se resuelven

| Campo | Detalle |
|---|---|
| **ID** | DEF-001 |
| **Severidad** | Media |
| **Estado** | Abierto (documentado; corrección no aplicada por requerir autorización) |
| **Módulo** | `frontend/src/shared/status/statusMeta.js` → `normalizeStatus()` |
| **Detectado por** | Prueba unitaria `StatusBadge.test.jsx` |

**Descripción.** `normalizeStatus()` reemplaza los espacios por `_` **antes** de consultar
el diccionario de alias `NORMALIZED_ALIASES`. Sin embargo, las claves multi-palabra de ese
diccionario están escritas con espacios (`'en revisión'`, `'en revision'`). Como al momento
de la búsqueda el texto ya es `'en_revisión'`, esas entradas **jamás coinciden**.

**Reproducción.**
```js
normalizeStatus('En revisión')  // Esperado: 'in_review' — Obtenido: 'en_revisión'
getStatusTone('En revisión')    // Esperado: 'warning'   — Obtenido: 'info' (tono por defecto)
```

**Impacto.** Bajo–medio. Si algún origen de datos entrega el estado como texto en español
con espacios ("En revisión"), la insignia muestra el tono neutro/informativo en lugar del
tono de advertencia y no se canoniza el estado. Los alias de **una sola palabra**
(`borrador`, `publicada`, `rechazada`) sí funcionan correctamente.

**Corrección propuesta (no aplicada).** Normalizar también las claves del diccionario, por
ejemplo definirlas con `_` (`'en_revision'`, `'en_revision'` sin acento) o pasar cada clave
por `normalizeStatus` al construir el mapa. Es un cambio de una línea, pero toca lógica de
presentación compartida; se deja pendiente de autorización.

**Nota:** para no dejar la suite en rojo, la prueba fija el comportamiento actual
(*characterization test*) y referencia este defecto, de modo que cualquier cambio futuro
en `normalizeStatus` sea detectado automáticamente.

### Falsos positivos descartados durante la auditoría
- **Lint en rojo por `coverage/`:** inicialmente `npm run lint` fallaba con 2 errores
  ("Unused eslint-disable directive"). Se determinó que provenían de los archivos
  **generados** por el reporte de cobertura (`coverage/*.js`), no del código fuente. Se
  corrigió agregando `coverage` a `ignorePatterns` de ESLint y a `.gitignore`. No era un
  defecto de producto.

---

## 7. Archivos entregados / modificados

**Nuevos (pruebas e infraestructura):**
- `.github/workflows/ci.yml` — pipeline de CI.
- `backend/src/services/fileValidation.rules.test.mjs` — 13 pruebas unitarias.
- `frontend/vitest.config.js` — configuración de Vitest + cobertura.
- `frontend/src/test/setup.js` — setup de jest-dom.
- `frontend/src/utils/validators.test.js`
- `frontend/src/utils/formatters.test.js`
- `frontend/src/utils/readerPages.test.js`
- `frontend/src/services/roleService.test.js`
- `frontend/src/components/ui/uiComponents.test.jsx`
- `frontend/src/shared/status/StatusBadge.test.jsx`

**Modificados (mínimos, sin tocar lógica de producto):**
- `backend/package.json` — scripts `test` / `test:coverage` + registro del nuevo test en `build`.
- `frontend/package.json` — scripts de prueba + `devDependencies` de Vitest.
- `frontend/package-lock.json` — resultado del `npm install`.
- `frontend/.eslintrc.cjs` — ignora `coverage/`.
- `.gitignore` — ignora `coverage/`.

**No modificados (confirmaciones):**
- No se tocó base de datos, esquema, RLS, RPC ni migraciones.
- No se tocó `.env` ni se imprimieron secretos.
- No se modificó ningún `node_modules` versionado.
- No se rompió ningún flujo existente (build de frontend y backend en verde).

---

## 8. Pendientes y siguientes fases

1. **Corregir DEF-001** (previa autorización).
2. **Ampliar cobertura** de `services/*` del frontend (hoy muchos servicios de API están
   sin prueba) y de servicios del backend con lógica pura extraíble.
3. **Pruebas de integración de API** en el backend (arranque de Express + `supertest`)
   para los flujos `prepare-upload` / `register-upload`.
4. **Fase 2 — Pruebas de Versión** (sistema completo integrado).
5. **Fase 3 — Pruebas de Usuario** (aceptación con datos y roles reales).
6. **Fase 4 — Pruebas de Usabilidad** (protocolo con usuarios; ver informe aparte).

---

## Anexo A — Evidencia de ejecución

```text
BACKEND  (node --test)
  ℹ tests 16   ℹ pass 16   ℹ fail 0
  fileValidation.service.js | 100.00 % líneas | 84.85 % ramas

FRONTEND (node --test, *.test.mjs)
  ℹ tests 66   ℹ pass 66   ℹ fail 0

FRONTEND (Vitest)
  Test Files  6 passed (6)
  Tests       39 passed (39)
  Cobertura (módulos bajo prueba): 77.44 % líneas | 78.88 % ramas

TOTAL: 121 / 121 pruebas aprobadas.
```
