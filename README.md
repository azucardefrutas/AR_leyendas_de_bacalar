# Leyendas de Bacalar

Plataforma web en construccion para Leyendas de Bacalar.

El proyecto esta separado en dos paquetes:

- `leyendas-de-bacalar/frontend`: aplicacion React con Vite.
- `leyendas-de-bacalar/backend`: API Node.js con Express, preparada para integraciones futuras.

La maqueta actual usa autenticacion temporal con React Context. Todavia no conecta Supabase, pagos ni AR.

## Requisitos

- Node.js 18 o superior.
- npm.

## Instalar dependencias

Desde la raiz del repositorio:

```powershell
cd leyendas-de-bacalar/frontend
npm install

cd ../backend
npm install
```

## Variables de entorno

Usa los archivos `.env.example` como referencia.

Frontend:

```powershell
cd leyendas-de-bacalar/frontend
Copy-Item .env.example .env
```

Backend:

```powershell
cd leyendas-de-bacalar/backend
Copy-Item .env.example .env
```

No subas archivos `.env` reales al repositorio. Deben contener solo valores locales o del servidor.

## Ejecutar en desarrollo

Frontend:

```powershell
cd leyendas-de-bacalar/frontend
npm run dev
```

Backend:

```powershell
cd leyendas-de-bacalar/backend
npm run dev
```

En el estado actual, el frontend puede ejecutarse sin backend porque la autenticacion es simulada.

## Generar build de produccion

```powershell
cd leyendas-de-bacalar/frontend
npm run build
```

El resultado se genera en:

```text
leyendas-de-bacalar/frontend/dist
```

## Previsualizar produccion

Despues de generar el build:

```powershell
cd leyendas-de-bacalar/frontend
npm run preview
```

## Despliegue basico en servidor

Para un despliegue estatico basico en un servidor de la universidad:

1. Ejecuta `npm run build` en `leyendas-de-bacalar/frontend`.
2. Sube el contenido de `leyendas-de-bacalar/frontend/dist` al directorio publico del servidor.
3. Verifica que el archivo `index.html` quede en la raiz publica del sitio.

Ejemplos de directorios publicos comunes:

- Apache: `public_html`, `htdocs` o `/var/www/html`.
- Nginx: `/usr/share/nginx/html` o el directorio configurado en `root`.

## React Router en Apache o Nginx

Esta app usa React Router. En servidores estaticos, al recargar una ruta interna como `/catalog`, `/reader` o `/admin`, el servidor puede intentar buscar esa ruta como si fuera un archivo real y devolver 404.

Para evitarlo, el servidor debe redirigir las rutas internas al `index.html`.

Ejemplo para Apache con `.htaccess` dentro de la carpeta publicada:

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

Ejemplo para Nginx:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Scripts principales

Frontend:

- `npm run dev`: servidor de desarrollo.
- `npm run build`: build de produccion.
- `npm run preview`: previsualiza el build.
- `npm run lint`: ejecuta ESLint.

Backend:

- `npm run dev`: servidor de desarrollo con nodemon.
- `npm start`: ejecuta la API con Node.
