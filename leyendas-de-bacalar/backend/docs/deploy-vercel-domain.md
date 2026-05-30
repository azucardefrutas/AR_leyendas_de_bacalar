# Despliegue en Vercel con dominio Cloudflare

Proyecto: Leyendas de Bacalar

Dominio de produccion:

```text
https://bacalarlegends-ar.com
```

Este documento prepara el despliegue del frontend React/Vite en Vercel y la conexion del dominio comprado en Cloudflare. No incluye configuracion SMTP ni cambios de base de datos.

## 1. Vercel

1. Importar el repositorio desde GitHub en Vercel.
2. En proyectos tipo monorepo, seleccionar como Root Directory:

```text
leyendas-de-bacalar/frontend
```

3. Framework Preset:

```text
Vite
```

4. Build Command:

```text
npm run build
```

5. Output Directory:

```text
dist
```

6. Variables de entorno en Vercel:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SITE_URL=https://bacalarlegends-ar.com
```

No usar `service_role` en Vercel ni en el frontend.

## 2. React Router en Vercel

El frontend usa React Router. Para evitar errores 404 al recargar rutas como `/admin`, `/login`, `/register`, `/reader/library`, `/creator/apply` o `/auth/callback`, el archivo `frontend/vercel.json` debe mantener este rewrite:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## 3. Dominios en Vercel

Agregar en Vercel, seccion Domains:

```text
bacalarlegends-ar.com
www.bacalarlegends-ar.com
```

Vercel mostrara los registros DNS exactos que deben configurarse en Cloudflare. Usar siempre los valores exactos que muestre Vercel.

## 4. Cloudflare DNS

Configurar los registros DNS que indique Vercel. Normalmente son:

```text
A      @      76.76.21.21
CNAME  www    cname.vercel-dns.com
```

Pero la regla principal es:

```text
Usar los valores exactos que muestre Vercel.
```

Si Vercel no valida el dominio con el proxy activo, dejar temporalmente los registros como DNS only en Cloudflare. Despues de validar, se puede revisar si conviene activar el proxy.

## 5. Supabase Auth

En Supabase Dashboard:

```text
Authentication -> URL Configuration
```

Configurar:

```text
Site URL:
https://bacalarlegends-ar.com
```

Agregar Redirect URLs:

```text
https://bacalarlegends-ar.com/auth/callback
https://bacalarlegends-ar.com/**
http://localhost:5173/**
```

El frontend ya usa `VITE_SITE_URL` para construir:

```text
https://bacalarlegends-ar.com/auth/callback
```

en `emailRedirectTo`.

## 6. Desarrollo local

Para trabajar en local, usar:

```text
VITE_SITE_URL=http://localhost:5173
```

El archivo `frontend/.env.example` no debe contener claves reales. Cada entorno debe tener sus variables privadas configuradas fuera del repositorio.

## 7. SMTP

Pendiente para una fase posterior.

Cuando se configure correo real, se recomienda preparar una cuenta como:

```text
no-reply@bacalarlegends-ar.com
```

No activar SMTP ni confirmacion obligatoria de correo desde este documento. Ese paso se hara despues, cuando el dominio y los registros de correo esten listos.

## 8. Validacion

Antes de desplegar:

```text
npm run build
```

Rutas que deben funcionar al recargar en produccion:

```text
/
/login
/register
/auth/check-email
/auth/callback
/reader/library
/creator/apply
/admin
```
