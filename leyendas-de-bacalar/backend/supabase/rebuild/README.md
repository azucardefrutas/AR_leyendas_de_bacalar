# Reconstrucción de Supabase - Leyendas de Bacalar

Objetivo: reconstruir el proyecto Supabase `ojwxchkgzywteutqxkfg` desde el contrato real del código y el catálogo recuperado del proyecto `wkkzgyhyarqwxoqcdaul`.

## Orden de ejecución

Ejecuta cada archivo por separado en **Supabase SQL Editor**, esperando éxito antes de continuar:

1. `00_reset_partial_install.sql` solo si el proyecto nuevo quedó parcialmente creado por intentos anteriores. Es destructivo para los objetos de Leyendas.
2. `01_extensions_and_types.sql`
3. `02_tables.sql`
4. `03_constraints_foreign_keys_indexes.sql`
5. `04_functions.sql`
6. `05_triggers.sql`
7. `06_rls.sql`
8. `07_privileges.sql`
9. `08_storage.sql`
10. `09_seed_reference.sql`
11. `10_verify.sql`

No ejecutes `90_recovery_data_after_auth.sql` durante la instalación inicial.

## Por qué está separado

- Las funciones se ordenan por dependencia. Esto corrige los errores `has_role(...) does not exist` y `get_legend_id_from_scene(...) does not exist`.
- RLS y privilegios se aplican después de funciones y tablas.
- Los permisos del Data API son explícitos; no dependen de los defaults del proyecto.
- Storage se reconstruye con `legend-assets` público y `legend-documents` privado.
- Los datos de referencia no incluyen usuarios, leyendas demo ni enlaces rotos.

## Datos históricos

`90_recovery_data_after_auth.sql` contiene los 35 bloques de datos recuperados, reordenados por llaves foráneas. Antes de escribir, verifica que los UUID históricos existan en `auth.users`. Si falta uno, aborta toda la transacción.

No se pueden recuperar contraseñas ni objetos de Storage desde los archivos SQL. Las 128 URLs del proyecto anterior solo vuelven a funcionar si los objetos reales se migran; cambiar únicamente el dominio produciría enlaces falsos.

## Después de verificar la base

- Desplegar la Edge Function `send-creator-onboarding-email` con JWT habilitado y configurar sus secretos.
- Cambiar en Vercel `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Cambiar en Render `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
- Actualizar el móvil: `EXPO_PUBLIC_SUPABASE_URL` y su publishable/anon key.
- Corregir las referencias públicas todavía fijadas al proyecto anterior en `frontend/index.html` y `mobile/eas.json`.

No guardes claves reales en Git ni las pegues en archivos SQL.
