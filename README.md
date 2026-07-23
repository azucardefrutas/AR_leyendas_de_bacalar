# Leyendas de Bacalar

Plataforma cultural interactiva para consultar, publicar y administrar las leyendas de
Bacalar, con lectura de obras digitales y experiencias de Realidad Aumentada asociadas a
ediciones físicas.

El proyecto combina un catálogo web tipo plataforma de streaming, un editor para
autores/creadores, un panel administrativo y una app móvil que escanea marcadores
impresos para mostrar modelos 3D en AR.

## Qué incluye

**Lector**
- Catálogo público de leyendas publicadas (visible sin iniciar sesión).
- Ficha de detalle y lectura de la obra: documento original (PDF/DOCX renderizado como
  páginas) o lectura interactiva por páginas, con visor tipo libro.
- Biblioteca personal, canje de códigos de acceso, compras y suscripción.
- Experiencia AR desde el navegador (`/ar/:legendSlug`) y visor 3D de modelos.

**Creador / autor**
- Creación de leyendas en borrador y editor editorial a pantalla completa (Editor.js).
- Carga de portada, banner, documentos fuente (PDF/DOCX/DOC) y recursos multimedia
  mediante URLs firmadas generadas por el backend.
- Marcadores físicos: asociación marcador impreso ↔ modelo 3D ↔ leyenda, que consume la
  app móvil.
- Hotspots interactivos sobre páginas del documento o páginas internas.
- Solicitud de códigos de acceso y gestión de reseñas.

**Administrador**
- Dashboard con métricas, gestión de usuarios, autores y solicitudes de creador.
- Revisión y aprobación de leyendas y reseñas, gestión de assets.
- Lotes y solicitudes de códigos, órdenes, suscripciones y promociones.
- Configuración global del sistema y bitácora de actividad.

## Arquitectura

Monorepo con tres paquetes reales bajo `leyendas-de-bacalar/`:

```
leyendas-de-bacalar/
  frontend/   React 18 + Vite 5 + TailwindCSS + React Router 6
  backend/    Node.js 18+ / Express 4 (ESM) — API auxiliar con service-role de Supabase
  mobile/     Expo (React Native) — app de AR para escanear marcadores físicos
```

**Supabase es el backend principal**: Auth, PostgreSQL con RLS, Storage y RPC. Es la
fuente de verdad de los datos.

**El backend Express es auxiliar**, no reemplaza a Supabase. Se encarga de lo que no
debe vivir en el navegador:

- URLs firmadas de subida y lectura de Storage.
- Validación de archivos y registro de `assets` y documentos fuente.
- Conteo de páginas y renderizado de PDF a imágenes.
- Extracción de texto de PDF/DOCX.
- Bundles de lectura, hotspots, feed AR para la app móvil y operaciones de admin.
- Proveedor de IA (Gemini) como herramienta interna, no como flujo principal.

El frontend habla con Supabase directo (anon key, protegido por RLS) para auth y
lecturas, y con el backend (enviando el `access_token` como `Bearer`) para todo lo
sensible o pesado. Los componentes nunca acceden a tablas críticas directamente: pasan
por los servicios de `frontend/src/services/`.

**Roles**: los permisos reales salen de las tablas `roles` + `user_roles`. El campo
`active_role` es solo el interruptor visual de la interfaz, no una fuente de permisos.

## Stack

| Área | Tecnologías |
|---|---|
| Frontend | React 18, Vite 5, TailwindCSS, React Router 6, Editor.js, three / @react-three/fiber, pdfjs-dist, react-pageflip, Recharts, MediaPipe |
| Backend | Node.js, Express 4 (ESM), @supabase/supabase-js, pdf-parse, pdfjs-dist, @napi-rs/canvas, mammoth, sanitize-html, @google/genai |
| Datos | Supabase (PostgreSQL, Auth, RLS, Storage, RPC, Edge Functions) |
| Móvil | Expo SDK 57, React Native, @reactvision/react-viro, expo-camera, WebView + MindAR |
| Pruebas | `node --test` (backend y frontend), Vitest + Testing Library (frontend) |
| CI | GitHub Actions (`.github/workflows/ci.yml`): lint + build + pruebas en cada push/PR a `main` |

## Requisitos

- Node.js 18 o superior (la CI usa Node 22).
- npm.
- Un proyecto de Supabase con el esquema del proyecto aplicado.
- Para la app móvil: cuenta gratuita de Expo si se quiere generar el APK en la nube.

## Instalar dependencias

Cada paquete se instala por separado:

```powershell
cd leyendas-de-bacalar/frontend
npm install
```

```powershell
cd leyendas-de-bacalar/backend
npm install
```

```powershell
cd leyendas-de-bacalar/mobile
npm install
```

## Variables de entorno

Cada paquete trae un `.env.example` con las claves esperadas (sin valores). Cópialo y
rellena los valores reales localmente.

```powershell
cd leyendas-de-bacalar/frontend
Copy-Item .env.example .env
```

```powershell
cd leyendas-de-bacalar/backend
Copy-Item .env.example .env
```

```powershell
cd leyendas-de-bacalar/mobile
Copy-Item .env.example .env.local
```

Claves principales:

- **Frontend** (prefijo `VITE_`, quedan expuestas al navegador):
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_BACKEND_URL`,
  `VITE_SUPABASE_STORAGE_BUCKET`, `VITE_SUPABASE_DOCUMENT_BUCKET`, `VITE_SITE_URL`,
  `VITE_APK_URL`.
- **Backend**: `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_ORIGIN`
  (acepta lista separada por comas), `AI_PROVIDER`, `GEMINI_API_KEY`, `GEMINI_MODEL`.
  El backend no arranca si falta `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` o algún
  origin de frontend.
- **Móvil**: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Reglas de seguridad no negociables:

- Los archivos `.env` reales nunca se suben al repositorio.
- La `SUPABASE_SERVICE_ROLE_KEY` y la `GEMINI_API_KEY` viven **solo** en el backend.
  Nunca en el frontend ni en la app móvil.
- La anon key sí es pública por diseño; la seguridad real la aplican las políticas RLS.

## Ejecutar en desarrollo

Backend:

```powershell
cd leyendas-de-bacalar/backend
npm run dev
```

Frontend:

```powershell
cd leyendas-de-bacalar/frontend
npm run dev
```

App móvil:

```powershell
cd leyendas-de-bacalar/mobile
npx expo start
```

El frontend necesita el backend en marcha para subir documentos y recursos, ver el
documento original y usar los flujos de admin. El catálogo y la lectura básica funcionan
contra Supabase directo.

Nota sobre la app móvil: el AR de marcador usa la cámara dentro de un WebView. En Expo Go
ese permiso puede fallar; para probar el AR completo usa un *development build* o el APK
de EAS.

## Pruebas

Frontend (dos ejecutores: `node --test` para lógica pura y Vitest para componentes):

```powershell
cd leyendas-de-bacalar/frontend
npm test
```

```powershell
cd leyendas-de-bacalar/frontend
npm run test:coverage
```

Backend:

```powershell
cd leyendas-de-bacalar/backend
npm test
```

## Build

Frontend (genera `leyendas-de-bacalar/frontend/dist`):

```powershell
cd leyendas-de-bacalar/frontend
npm run build
```

Backend — no compila; `build` es una verificación de sintaxis (`node --check`) sobre cada
archivo de `src/`. Si agregas un archivo nuevo a `src/`, añádelo a la lista del script
`build` en `backend/package.json` o no se verificará:

```powershell
cd leyendas-de-bacalar/backend
npm run build
```

Previsualizar el build del frontend:

```powershell
cd leyendas-de-bacalar/frontend
npm run preview
```

## Despliegue

- **Frontend → Vercel.** `frontend/vercel.json` ya define el rewrite de SPA
  (`/(.*)` → `/index.html`) y las cabeceras de seguridad (HSTS, `X-Content-Type-Options`,
  `Permissions-Policy` con cámara habilitada para AR, CSP en modo report-only).
- **Backend → Render.** Requiere configurar las variables de entorno del backend en el
  panel del servicio, incluyendo `FRONTEND_ORIGIN` con el dominio real del frontend, o el
  CORS bloqueará las peticiones.
- **App móvil → APK por EAS Build** (`eas build -p android --profile preview`), sin
  necesidad del SDK de Android local.

Si en su lugar se publica el build estático en un servidor propio, hay que redirigir las
rutas internas al `index.html` para que React Router funcione al recargar:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Scripts principales

Frontend:

- `npm run dev` — servidor de desarrollo Vite.
- `npm run build` — build de producción.
- `npm run preview` — sirve el build.
- `npm run lint` / `npm run lint:strict` — ESLint (`lint:strict` falla con warnings).
- `npm test` — `node --test` + Vitest.
- `npm run test:coverage` — cobertura con Vitest.

Backend:

- `npm run dev` — nodemon.
- `npm start` — arranca la API con Node.
- `npm run build` — verificación de sintaxis.
- `npm test` — pruebas con `node --test`.

Móvil:

- `npm start` — Expo dev server.
- `npm run android` / `npm run ios` — build nativo local.

## Base de datos

El SQL, las migraciones y las Edge Functions viven en `leyendas-de-bacalar/backend/supabase/`.
El mapa del esquema está documentado en
[`backend/docs/database-map.md`](leyendas-de-bacalar/backend/docs/database-map.md).

Los cambios de esquema, RLS, RPC o Storage requieren autorización explícita: no se aplican
como efecto secundario de una tarea de código.

## Documentación adicional

- [`CLAUDE.md`](CLAUDE.md) — constitución del proyecto: reglas de trabajo, permisos,
  prioridades y esquema conocido. Es la referencia obligatoria antes de tocar código.
- [`docs/pruebas/`](docs/pruebas) — informes y protocolos de pruebas (software, usuario,
  usabilidad, versión).
- [`docs/superpowers/`](docs/superpowers) — especificaciones y planes de implementación.
- [`leyendas-de-bacalar/backend/docs/`](leyendas-de-bacalar/backend/docs) — mapa de base de
  datos, guía de despliegue y dominio, investigación legal.
- [`leyendas-de-bacalar/mobile/README.md`](leyendas-de-bacalar/mobile/README.md) — detalle
  de la app móvil de AR.

## Estado del proyecto

Proyecto académico tratado como desarrollo full stack real: sin datos demo, sin botones
decorativos y sin flujos simulados. La prioridad, en orden, es funcionalidad real,
estabilidad, seguridad, claridad del flujo de usuario, diseño y optimización. Ante la duda
entre agregar una función nueva o no romper un flujo existente, se elige no romper el
flujo existente.
