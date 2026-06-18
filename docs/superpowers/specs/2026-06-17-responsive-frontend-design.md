# Responsive Frontend Design

## Objetivo

Corregir la responsividad del frontend activo de Leyendas de Bacalar en movil, tablet, laptop y desktop, con prioridad en una navbar movil que cambie de comportamiento y en un hero legible, sin modificar datos, autenticacion, permisos, rutas, backend, Supabase, Storage ni experiencias 3D.

## Alcance

La entrega incluye:

- Navbar publica reutilizable con modo horizontal y modo movil.
- Drawer movil accesible con navegacion, redes, perfil y sesion.
- Hero principal adaptable y sin desbordamiento horizontal.
- Auditoria correctiva de Home, Catalogo, detalle, lector, Auth, biblioteca, canje, creador y admin.
- Ajustes compartidos de contenedores, grids, medios, tipografia, botones y sidebars.

La entrega no incluye:

- Cambios de Supabase, Auth, roles, RLS, RPC, Storage o base de datos.
- Cambios de backend, variables de entorno o despliegue.
- Cambios de rutas o contratos de servicios.
- Reescritura visual completa, eliminacion de codigo legacy o modificacion de `node_modules`.
- Cambios funcionales en modelos 3D, lector, borradores o acciones administrativas.

## Arquitectura de navegacion

`SiteNavbar` seguira siendo la entrada unica del shell publico. Se conservaran las decisiones actuales de autenticacion, roles, rutas y cierre de sesion. La presentacion se separara en componentes pequenos:

- `SiteNavbar.jsx`: obtiene Auth, roles y ubicacion; construye los destinos permitidos; controla apertura y cierre.
- `MobileNavDrawer.jsx`: presenta el panel, backdrop, enlaces, redes y bloque de sesion.
- `AppIcon.jsx`: se reutiliza como fuente canonica de Material Symbols.
- `IconButton.jsx`: se creara solo si evita duplicar el patron accesible de botones de icono.

Los enlaces y acciones se describiran una sola vez y se reutilizaran en desktop y drawer. No se duplicara logica de permisos. Los enlaces condicionales actuales, incluido Admin cuando corresponde, se conservaran aunque la lista principal solicitada se mantenga como Inicio, Biblioteca, Acerca de, Creador y Canjear codigo.

## Comportamiento por ancho

El CSS sera mobile-first, pero el cambio de modo se activara por capacidad real del header, no por intentar comprimir todos los controles.

- Movil: logo visible, avatar pequeno opcional y hamburguesa; enlaces y acciones dentro del drawer.
- Tablet: modo compacto. Se mantendra horizontal solo cuando los elementos quepan sin saltos; en anchos inseguros usara el mismo drawer.
- Laptop y desktop: navegacion horizontal, sin saltos de linea, con espacios y tipografia fluidos mediante `clamp()`.

El punto exacto de colapso se elegira durante la implementacion a partir de pruebas visuales; inicialmente se evaluara alrededor de 1024 px porque la navbar autenticada contiene mas controles que la anonima.

## Drawer movil

El drawer aparecera desde la derecha sobre un backdrop oscuro y tendra superficie azul profunda translusida, borde sutil, blur y sombras coherentes con la estetica Bacalar.

Requisitos de interaccion:

- Boton hamburguesa con `aria-expanded`, `aria-controls` y nombre accesible.
- Panel identificado como dialogo de navegacion y titulo accesible.
- Cierre con boton, backdrop, enlace seleccionado y tecla Escape.
- Bloqueo reversible del scroll del documento mientras esta abierto.
- Restauracion de foco al disparador al cerrar y foco inicial en el boton de cierre.
- Objetivos tactiles de al menos 44 por 44 px.
- Transiciones de 180 a 240 ms y anulacion bajo `prefers-reduced-motion`.

El bloqueo de scroll no ocultara errores ni usara temporizadores. El cleanup del efecto restaurara el estado previo del body.

## Hero principal

El hero conservara su composicion cinematografica, gradientes y libro 3D. Se ajustaran:

- Contenedor con gutters fluidos y ancho seguro.
- Titulo con `clamp()` y medida que evite cortes agresivos.
- Copia con ancho legible y espaciado vertical reducido en movil.
- Acciones apiladas y de ancho completo en movil.
- Escenario 3D dimensionado con limites relativos al viewport.
- Fondo `cover` con posicion especifica por breakpoint.
- Espacio superior coordinado con la navbar fija.

No se alterara la carga diferida ni el comportamiento del componente 3D.

## Auditoria responsive general

La auditoria seguira el router activo y corregira solo problemas demostrables. Para cada superficie se revisaran:

- Anchuras fijas, `min-width`, grids y flex items que producen overflow.
- Titulos, tablas, formularios, botones y barras de acciones.
- Imagenes, video, canvas y SVG que excedan su contenedor.
- Sidebars de lector, creador y admin en pantallas estrechas.
- Modales, controles del lector y editor de creador.
- Areas tactiles, estados de foco y contenido tapado por elementos fijos.

Los arreglos compartidos se implementaran primero en primitivas y shells. Los overrides por pagina se usaran solo cuando la estructura lo requiera. No se haran refactors globales ni cambios funcionales.

## Estilos globales

Se verificaran o incorporaran de forma compatible:

- `box-sizing: border-box` global.
- Anchura y altura minima correctas para `html`, `body` y `#root`.
- Prevencion de overflow horizontal en el documento sin usarla para ocultar componentes rotos.
- Medios con `max-width: 100%` cuando no interfiera con canvas o visores especializados.
- Contenedor responsive y grid autoajustable reutilizables cuando sustituyan patrones repetidos reales.
- Safe areas para drawer y controles fijos.

## Manejo de errores y regresiones

Este trabajo no cambia llamadas de datos ni manejo de errores. Los componentes conservaran los flujos reales de login, logout, roles, catalogo, lector, creador y admin.

Regresiones a evitar:

- Ocultar destinos permitidos por Auth o roles.
- Alterar la redireccion de login o el cierre de sesion.
- Tapar el contenido con navbar, drawer o sidebars.
- Romper la experiencia inmersiva que oculta la navbar durante la lectura.
- Interferir con modales 3D o con el overlay de introduccion.

## Verificacion

La entrega se verificara con:

- `npm.cmd run lint` en frontend.
- `npm.cmd run build` en frontend; si OneDrive bloquea Vite dentro del sandbox, se repetira fuera.
- Inspeccion visual en 375, 640, 768, 1024, 1366 y 1440 px.
- Pruebas del drawer: abrir, cerrar, backdrop, Escape, navegacion, scroll lock y foco.
- Rutas principales publicas, Auth, lector, creador y admin sin overflow horizontal.
- Comprobacion de consola durante el smoke visual.
- `git status --short` y `git diff --stat` al cierre.

Las pruebas con sesion autenticada real se reportaran como no realizadas si el entorno no proporciona una sesion valida. No se afirmara funcionamiento no observado.

## Estrategia de entrega

Aunque se entregue como una sola tarea, la implementacion se organizara en bloques verificables:

1. Navbar y drawer.
2. Hero y estilos globales seguros.
3. Shells de Auth, lector, creador y admin.
4. Correcciones puntuales de paginas principales.
5. Build, smoke visual y revision de regresiones.

Cada bloque debera mantener la aplicacion compilable y evitar cambios no relacionados.
