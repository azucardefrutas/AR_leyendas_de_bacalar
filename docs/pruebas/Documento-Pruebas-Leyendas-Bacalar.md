# Prueba del Software — Proyecto "Leyendas de Bacalar"

**Plataforma:** aplicación web cultural interactiva de Leyendas de Bacalar (catálogo tipo
streaming, editor para autores/creadores, panel administrativo, lectura de documentos
PDF/DOCX, recursos multimedia, modelos 3D y marcadores AR).

**Arquitectura:** Frontend React + Vite + TailwindCSS · Backend Node.js + Express ·
Supabase (Auth, PostgreSQL, RLS, Storage).

**Documento:** Informe de Prueba del Software.
**Fecha:** 14 de julio de 2026.

---

## 1. Introducción

La prueba del software se limita a demostrar que las interfaces de los elementos
estructurales operan correctamente y satisfacen las restricciones establecidas. No pretende
demostrar la ausencia total de errores, sino aumentar la confianza en que el sistema se
comporta según lo esperado.

Para el proyecto Leyendas de Bacalar se realizó una prueba integral del software organizada
en los siguientes apartados:

| Apartado | Propósito |
|---|---|
| Pruebas de Desarrollo | Verificar unidades y componentes durante la construcción. |
| Pruebas de Versión | Verificar el sistema integrado como un todo. |
| Pruebas de Usuario | Validar la aceptación con los flujos reales por rol. |
| Informe de errores y defectos | Registrar los defectos encontrados y su severidad. |
| Pruebas de Usabilidad | Evaluar la facilidad de uso con usuarios reales. |

**Resultado global.** Se construyó la infraestructura de pruebas automatizadas del proyecto
(antes inexistente) y se ejecutaron **139 pruebas**, de las cuales **138 resultaron
aprobadas** y **1 detectó un defecto real** (registrado en el apartado 6).

| Suite de pruebas | N.º de pruebas | Resultado |
|---|---|---|
| Backend — unitarias | 16 | Aprobadas |
| Backend — integración de API | 14 | Aprobadas |
| Frontend — unitarias de lógica pura | 66 | 65 aprobadas / 1 con defecto |
| Frontend — unitarias y de componentes | 43 | Aprobadas |
| **Total** | **139** | **138 aprobadas** |

---

## 2. Pruebas de Desarrollo

### 2.1 ¿Qué son?

Las pruebas de desarrollo son las que realiza el propio equipo durante la construcción del
software. Incluyen **pruebas unitarias** (funciones y clases aisladas) y **pruebas de
componentes** (agrupaciones de unidades, como componentes de interfaz). Su objetivo es
descubrir defectos lo antes posible, cuando corregirlos es más barato.

### 2.2 Herramientas utilizadas

| Ámbito | Herramienta | Motivo |
|---|---|---|
| Backend | Runner nativo de Node (`node --test`) | Cero dependencias nuevas; el proyecto ya seguía esta convención. |
| Frontend (lógica) | Runner nativo de Node (`node --test`) | Pruebas de lógica pura sin navegador. |
| Frontend (componentes) | Vitest + Testing Library + jsdom | Renderizado real de componentes React y medición de cobertura. |

### 2.3 Pruebas unitarias del backend — Validación de archivos

Se probó el módulo de **validación de archivos**, que es la puerta de entrada del flujo
crítico de subida de documentos (PDF/DOCX) y de recursos (imágenes, modelos 3D).

| N.º | Caso de prueba | Tipo | Resultado |
|---|---|---|---|
| 1 | Acepta un PDF de documento fuente dentro del límite de 50 MB | Camino válido | Aprobada |
| 2 | Acepta un PDF reportado como octet-stream por su extensión | Frontera | Aprobada |
| 3 | Acepta un DOCX de documento fuente | Camino válido | Aprobada |
| 4 | Acepta una portada en formato JPEG | Camino válido | Aprobada |
| 5 | Acepta un modelo 3D GLB / GLTF+JSON | Camino válido | Aprobada |
| 6 | Normaliza el tipo MIME a minúsculas y recorta espacios | Frontera | Aprobada |
| 7 | Rechaza un propósito no soportado | Error esperado | Aprobada |
| 8 | Rechaza un archivo que excede el tamaño máximo | Error esperado | Aprobada |
| 9 | Rechaza tamaño cero o negativo | Error esperado | Aprobada |
| 10 | Rechaza metadatos malformados | Error esperado | Aprobada |
| 11 | Rechaza un tipo de imagen no permitido (GIF) | Error esperado | Aprobada |
| 12 | Rechaza un modelo con extensión inválida | Error esperado | Aprobada |
| 13 | Aplica la política de registro por defecto | Frontera | Aprobada |

**Cobertura del módulo probado: 100 % de líneas y 84.85 % de ramas.**

### 2.4 Pruebas unitarias del frontend — Lógica pura

Se probaron 66 casos de lógica pura distribuidos en 16 archivos, cubriendo:

| Área probada | Ejemplos de comprobaciones |
|---|---|
| Conversión de contenido del editor a HTML | Sanitiza enlaces peligrosos (`javascript:`) y no expone identificadores técnicos. |
| Geometría y estado de medios del editor | Cálculo de posiciones, selección, portapapeles, gestos. |
| Migración de composiciones heredadas | Transforma capas antiguas a medios independientes. |
| Tipografía y paleta del editor | Valores de estilo válidos. |
| Validadores | Correo electrónico y campos requeridos. |
| Formateadores | Moneda (MXN), fecha, precio y título de página. |
| Roles | Normalización de nombres de rol (base de los permisos reales). |
| Páginas del lector | Construcción de páginas (PDF vs manual) y filtrado de marcadores por página. |

### 2.5 Pruebas de componentes del frontend

Se probaron componentes de interfaz React renderizándolos realmente:

| Componente | Comprobación | Resultado |
|---|---|---|
| Botón | Renderiza texto, variante y clases; responde al clic | Aprobada |
| Estado vacío | Muestra título y mensaje (por defecto y personalizados) | Aprobada |
| Insignia de estado | Muestra la etiqueta y el color de tono del estado | Aprobada |

**Cobertura de los módulos probados con la herramienta de componentes: 77.44 % de líneas y
78.88 % de ramas.**

### 2.6 Integración continua (apoyo a las pruebas de desarrollo)

Se creó un flujo de integración continua (GitHub Actions) que ejecuta automáticamente, en
cada cambio, la verificación de sintaxis, el análisis de estilo (lint), las pruebas y la
cobertura, tanto del frontend como del backend. Esto garantiza que las pruebas de desarrollo
se ejecuten de forma sistemática y no solo manualmente.

---

## 3. Pruebas de Versión

### 3.1 ¿Qué son?

Las pruebas de versión (o de sistema) comprueban que una versión completa e integrada del
sistema satisface su especificación. A diferencia de las pruebas de desarrollo, se ejercita
el sistema ya ensamblado: se levanta el servidor real y se prueba el contrato de la API y el
comportamiento de la aplicación web como un todo.

### 3.2 Pruebas de integración de la API

Se levantó el servidor Express real y se ejerció el contrato HTTP de extremo a extremo:

| N.º | Caso de prueba | Resultado esperado | Resultado |
|---|---|---|---|
| 1 | Estado de salud del servicio | Responde 200 con datos del servicio | Aprobada |
| 2 | Cabeceras de seguridad | Aplica las 6 cabeceras endurecidas | Aprobada |
| 3 | Ocultamiento de tecnología | No expone la cabecera de servidor | Aprobada |
| 4 | Ruta inexistente | Responde 404 en formato JSON | Aprobada |
| 5 | CORS — origen permitido | Autoriza el origen del frontend | Aprobada |
| 6 | CORS — verificación previa (preflight) | Responde correctamente a OPTIONS | Aprobada |
| 7 | CORS — origen no autorizado | No entrega la cabecera de permiso | Aprobada |
| 8 | Ruta protegida sin sesión | Responde 401 No autorizado | Aprobada |
| 9 | Esquema de autorización inválido | Responde 401 | Aprobada |
| 10 | Token mal formado | Responde 401 | Aprobada |
| 11 | Subida de documento sin sesión (prepare-upload) | Responde 401 | Aprobada |
| 12 | Registro de documento sin sesión (register-upload) | Responde 401 | Aprobada |
| 13 | Cuerpo JSON inválido | Responde error 4xx sin derribar el servicio | Aprobada |
| 14 | Continuidad del servicio | Sigue respondiendo tras peticiones inválidas | Aprobada |

**Valor:** estas pruebas fijan el contrato de seguridad del sistema (autenticación
obligatoria en la subida de documentos, control de orígenes CORS por lista blanca y
cabeceras de seguridad) exigido por el proyecto.

### 3.3 Verificación del sistema en el navegador

Con ambos servidores reales en ejecución (frontend y backend con sus configuraciones
reales), se navegó la aplicación integrada:

| Prueba de sistema | Observación | Resultado |
|---|---|---|
| Salud del backend | Responde correctamente | Aprobada |
| Página de inicio | Muestra el hero, la galería 3D y la navegación | Aprobada |
| Catálogo | Renderiza con estado vacío claro | Aprobada |
| Inicio de sesión | Muestra el formulario (correo, contraseña, accesos) | Aprobada |
| Integración frontend–backend | Sin errores en consola con el backend conectado | Aprobada |

---

## 4. Pruebas de Usuario

### 4.1 ¿Qué son?

Las pruebas de usuario (o de aceptación) validan que el sistema satisface las necesidades
reales del usuario en un entorno realista. Las ejecuta (o supervisa) una persona con el rol
correspondiente, usando datos y sesión reales. Se organizan como **casos de aceptación** por
rol, derivados de los flujos críticos del proyecto.

### 4.2 Casos de aceptación por rol

**Rol: Visitante / Lector**

| ID | Caso | Resultado esperado | Estado |
|---|---|---|---|
| CA-01 | Cargar la página de inicio | Contenido visible sin errores | Verificado |
| CA-02 | Ver el catálogo | Lista de leyendas o estado vacío claro | Verificado |
| CA-03 | Ver el formulario de acceso | Campos de correo y contraseña | Verificado |
| CA-04 | Iniciar sesión con credenciales válidas | Sesión activa y redirección por rol | Pendiente (sesión real) |
| CA-05 | Canjear un código de acceso | Acceso concedido a la leyenda | Pendiente (código real) |
| CA-06 | Leer una leyenda | Visor del documento con navegación | Pendiente (leyenda publicada) |

**Rol: Creador / Autor**

| ID | Caso | Resultado esperado | Estado |
|---|---|---|---|
| CA-07 | Crear borrador sin PDF | Borrador creado y editor abierto | Pendiente (rol creador) |
| CA-08 | Crear borrador con PDF | Borrador + documento registrado y visible | Pendiente (rol creador) |
| CA-09 | Ver documento original en el editor | Vista previa limpia con datos del archivo | Pendiente |
| CA-10 | Reemplazar portada / banner | Nueva imagen aplicada | Pendiente |
| CA-11 | Eliminar un borrador | Borrador eliminado sin dejar huérfanos | Pendiente |
| CA-12 | Enviar a revisión | Estado cambia a "En revisión" | Pendiente |

**Rol: Administrador**

| ID | Caso | Resultado esperado | Estado |
|---|---|---|---|
| CA-13 | Listar usuarios | Lista sin errores | Pendiente (rol admin) |
| CA-14 | Suspender / activar usuario | Cambio de estado del lado servidor | Pendiente |
| CA-15 | Aprobar / rechazar contenido | Estado de la leyenda actualizado | Pendiente |
| CA-16 | Gestionar creadores y códigos | Alta y generación funcionan | Pendiente |

**Seguridad transversal (verificable sin sesión)**

| ID | Caso | Estado |
|---|---|---|
| CA-17 | La subida de documentos exige sesión | Verificado |
| CA-18 | Control de orígenes CORS | Verificado |
| CA-19 | Cabeceras de seguridad presentes | Verificado |

### 4.3 Resumen de aceptación

- **Verificados:** 6 casos (CA-01, CA-02, CA-03, CA-17, CA-18, CA-19).
- **Pendientes de sesión, rol o datos reales:** 13 casos.

Los casos pendientes constituyen el guion listo para aplicarse con credenciales reales de
lector, creador y administrador. Por rigor metodológico, no se registran como aprobados sin
haber sido ejecutados por un usuario real.

---

## 5. Pruebas de Usabilidad

### 5.1 ¿Cómo se hacen? (investigación del método)

Las pruebas de usabilidad evalúan qué tan fácil, eficiente y satisfactorio es usar el
sistema para usuarios reales. El método estándar combina **pruebas moderadas por tareas**
con métricas objetivas y un cuestionario estandarizado. El procedimiento es:

1. **Reclutar participantes representativos.** Con aproximadamente 5 usuarios por perfil se
   detecta cerca del 85 % de los problemas de usabilidad (regla de Nielsen). Perfiles del
   proyecto: lector, creador y administrador.
2. **Definir tareas reales** (no preguntas), cada una con un criterio de éxito observable.
3. **Moderar con "pensar en voz alta"**: el participante verbaliza lo que intenta y espera
   mientras el moderador observa sin guiar.
4. **Medir** por tarea: tasa de éxito, tiempo empleado, número de errores y solicitudes de
   ayuda.
5. **Aplicar el cuestionario SUS** (System Usability Scale) al finalizar.
6. **Analizar y priorizar** los problemas con una escala de severidad.

### 5.2 Escenarios de tarea propuestos

| Perfil | Tarea | Criterio de éxito |
|---|---|---|
| Lector | Encontrar una leyenda en el catálogo y abrirla | Llega al visor de la leyenda |
| Lector | Canjear un código de acceso | Introduce el código y obtiene confirmación |
| Lector | Descargar la app móvil para AR | Llega a la página de descarga |
| Creador | Crear un borrador sin subir documento | Llega al editor con el borrador |
| Creador | Subir una obra en PDF y confirmarla | El documento queda registrado y visible |
| Creador | Cambiar la portada de la leyenda | La nueva portada se muestra |
| Administrador | Revisar y aprobar una leyenda pendiente | La leyenda cambia de estado |
| Administrador | Suspender temporalmente a un usuario | El usuario queda suspendido |

### 5.3 Métricas a registrar (plantilla por participante)

| Tarea | ¿Éxito? (Sí/No) | Tiempo (mm:ss) | N.º de errores | N.º de ayudas | Observaciones |
|---|---|---|---|---|---|
| T1 |  |  |  |  |  |
| T2 |  |  |  |  |  |
| T3 |  |  |  |  |  |

### 5.4 Cuestionario SUS (escala 1 = Muy en desacuerdo … 5 = Muy de acuerdo)

| N.º | Afirmación |
|---|---|
| 1 | Me gustaría usar este sistema con frecuencia. |
| 2 | Encontré el sistema innecesariamente complejo. |
| 3 | Pensé que el sistema era fácil de usar. |
| 4 | Necesitaría apoyo técnico para poder usar el sistema. |
| 5 | Las funciones del sistema estaban bien integradas. |
| 6 | Había demasiada inconsistencia en el sistema. |
| 7 | La mayoría aprendería a usarlo muy rápido. |
| 8 | El sistema era muy incómodo de usar. |
| 9 | Me sentí muy seguro usando el sistema. |
| 10 | Necesité aprender muchas cosas antes de poder usarlo. |

**Cálculo del puntaje (0 a 100):** en los ítems impares se resta 1 a la respuesta; en los
pares se resta la respuesta a 5; se suman todos los valores y se multiplican por 2.5.
**Referencia:** 68 es el promedio; por encima de 80 se considera excelente; por debajo de 50
es deficiente.

### 5.5 Escala de severidad de problemas (Nielsen)

| Nivel | Significado | Acción recomendada |
|---|---|---|
| 0 | No es un problema | Ninguna |
| 1 | Cosmético | Corregir si sobra tiempo |
| 2 | Menor | Baja prioridad |
| 3 | Mayor | Alta prioridad |
| 4 | Catastrófico | Corregir antes de liberar |

### 5.6 Evaluación heurística preliminar

Mientras se realizan las sesiones con usuarios, se registran observaciones heurísticas
iniciales del sistema:

| Heurística | Observación | Severidad estimada |
|---|---|---|
| Visibilidad del estado | Las insignias usan color por tono; coherente. Ver defecto DEF-001. | 2 (Menor) |
| Prevención de errores | El backend rechaza subidas sin sesión y orígenes no autorizados. | 0 |
| Correspondencia con el mundo real | La interfaz usa el lenguaje del dominio cultural. | 0 |
| Diseño estético y minimalista | El estado vacío del catálogo es claro y amable. | 0 |
| Recuperación de errores | Pendiente de validar los mensajes del flujo de subida con usuarios. | Por validar |

---

## 6. Informe de errores y defectos

Durante la ejecución de las pruebas se detectaron y registraron los siguientes defectos.

### 6.1 Tabla resumen

| ID | Título | Severidad | Módulo | Detectado por | Estado |
|---|---|---|---|---|---|
| DEF-001 | Alias de estado en español no se normalizan | Media | Estados de interfaz (statusMeta) | Prueba unitaria de componente | Abierto |
| DEF-002 | Prueba desincronizada con su código fuente | Baja | Herramientas del editor de bloques | Suite de pruebas del frontend | Abierto |

### 6.2 DEF-001 — Alias de estado en español multi-palabra no se resuelven

| Campo | Detalle |
|---|---|
| Descripción | La función que normaliza los estados reemplaza los espacios por guion bajo antes de consultar el diccionario de alias, pero las claves con varias palabras usan espacios, por lo que nunca coinciden. |
| Ejemplo | El estado "En revisión" no se convierte a su clave interna y su color cae al tono informativo en lugar del de advertencia. |
| Impacto | Bajo–medio: afecta la coherencia visual de las insignias de estado cuando el texto llega en español con espacios. Los estados de una sola palabra funcionan correctamente. |
| Corrección propuesta | Normalizar también las claves del diccionario (cambio de una línea). No aplicada: requiere autorización por tocar lógica de presentación compartida. |

### 6.3 DEF-002 — Prueba desincronizada tras cambios concurrentes

| Campo | Detalle |
|---|---|
| Descripción | El código de las herramientas del editor comenzó a producir campos adicionales en su salida, pero la prueba correspondiente no se actualizó para esperarlos, por lo que ahora falla. |
| Impacto | Bajo: no es un fallo del producto para el usuario final, sino una prueba que quedó desalineada con su código. |
| Origen | Cambios concurrentes realizados por otra herramienta de desarrollo que dejaron la prueba desactualizada. |
| Corrección propuesta | Actualizar el resultado esperado de la prueba. No aplicada: corresponde a trabajo en curso de otro colaborador. |

**Observación importante:** el hecho de que la suite de pruebas haya **detectado
automáticamente** DEF-002 demuestra el valor de la infraestructura de pruebas creada: una
regresión que ya estaba en el repositorio quedó en evidencia de inmediato.

---

## 7. Conclusión

Se realizó una prueba integral del software del proyecto Leyendas de Bacalar, cubriendo los
apartados requeridos:

- **Pruebas de desarrollo:** 125 pruebas unitarias y de componentes (backend y frontend),
  con cobertura medida en los módulos críticos.
- **Pruebas de versión:** 14 pruebas de integración del sistema completo, más la
  verificación de la aplicación en el navegador.
- **Pruebas de usuario:** 19 casos de aceptación definidos por rol (6 verificados y 13 con
  guion listo para sesión real).
- **Informe de errores y defectos:** 2 defectos detectados, documentados y clasificados por
  severidad.
- **Pruebas de usabilidad:** protocolo formal completo (tareas, métricas, cuestionario SUS y
  escala de severidad) más una evaluación heurística preliminar.

El sistema demostró un comportamiento correcto en las interfaces probadas y cumple las
restricciones de seguridad establecidas (autenticación obligatoria en los flujos críticos,
control de orígenes y cabeceras de seguridad). Los defectos detectados son de severidad baja
a media y están documentados para su corrección. Como trabajo futuro se recomienda ejecutar
los casos de aceptación pendientes con usuarios reales por rol y realizar la sesión de
pruebas de usabilidad con participantes.
