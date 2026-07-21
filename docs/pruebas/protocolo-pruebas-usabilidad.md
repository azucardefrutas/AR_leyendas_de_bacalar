# Informe de Pruebas del Software — Fase 4: Pruebas de Usabilidad

**Proyecto:** Leyendas de Bacalar
**Fecha:** 14 de julio de 2026
**Alcance:** Protocolo formal de pruebas de usabilidad + heurística preliminar.

> "Investigar cómo se hace": las pruebas de usabilidad evalúan qué tan fácil, eficiente y
> satisfactorio es usar el sistema para usuarios reales. La técnica estándar combina
> **pruebas de usabilidad moderadas por tareas** (task-based usability testing) con métricas
> objetivas (éxito, tiempo, errores) y un cuestionario subjetivo estandarizado (**SUS**,
> System Usability Scale). Este documento entrega el protocolo listo para aplicar.

---

## 1. Cómo se hacen las pruebas de usabilidad (método)

1. **Reclutar participantes representativos.** 5 usuarios por perfil detectan ~85 % de los
   problemas de usabilidad (Nielsen). Perfiles aquí: *lector* (visitante cultural),
   *creador* (autor de leyendas), *administrador*.
2. **Definir tareas reales**, no preguntas. Cada tarea tiene un objetivo claro y un criterio
   de éxito observable.
3. **Moderación "pensar en voz alta"** (think-aloud): el participante verbaliza lo que
   intenta y espera; el moderador observa sin guiar.
4. **Medir**: tasa de éxito, tiempo por tarea, número de errores/desvíos, y solicitudes de
   ayuda.
5. **Cuestionario post-prueba SUS** (10 ítems, escala 1–5) → puntaje 0–100.
6. **Analizar y priorizar** los problemas con una escala de severidad.

---

## 2. Escenarios de tarea (guion del moderador)

### Perfil Lector
- **T1.** "Encuentra una leyenda en el catálogo y ábrela para leerla."
  *Éxito:* llega al visor de una leyenda.
- **T2.** "Tienes un código de acceso; canjéalo."
  *Éxito:* introduce el código y obtiene confirmación.
- **T3.** "Descarga la app móvil para la experiencia AR."
  *Éxito:* llega a `/descargar` e identifica el enlace de descarga.

### Perfil Creador
- **T4.** "Crea un nuevo borrador de leyenda **sin** subir documento."
  *Éxito:* llega al editor con el borrador creado.
- **T5.** "Sube tu obra en PDF a un borrador y confírmalo."
  *Éxito:* el documento queda registrado y visible en el editor (flujo crítico §5).
- **T6.** "Cambia la portada de tu leyenda."
  *Éxito:* la nueva portada se muestra.

### Perfil Administrador
- **T7.** "Revisa una leyenda pendiente y apruébala."
- **T8.** "Suspende temporalmente a un usuario."

---

## 3. Métricas a registrar (plantilla por participante)

| Tarea | ¿Éxito? (S/N) | Tiempo (mm:ss) | # Errores | # Ayudas | Observaciones |
|---|---|---|---|---|---|
| T1 | | | | | |
| T2 | | | | | |
| … | | | | | |

**Indicadores agregados:** tasa de éxito global (%), tiempo medio por tarea, tareas con
tasa de éxito < 70 % (candidatas a rediseño).

---

## 4. Cuestionario SUS (aplicar al final, escala 1=Muy en desacuerdo … 5=Muy de acuerdo)

1. Me gustaría usar este sistema con frecuencia.
2. Encontré el sistema innecesariamente complejo.
3. Pensé que el sistema era fácil de usar.
4. Necesitaría apoyo técnico para poder usar el sistema.
5. Las funciones del sistema estaban bien integradas.
6. Había demasiada inconsistencia en el sistema.
7. La mayoría aprendería a usarlo muy rápido.
8. El sistema era muy incómodo de usar.
9. Me sentí muy seguro usando el sistema.
10. Necesité aprender muchas cosas antes de poder usarlo.

**Cálculo del puntaje SUS (0–100):**
- Ítems impares (1,3,5,7,9): puntaje = (respuesta − 1).
- Ítems pares (2,4,6,8,10): puntaje = (5 − respuesta).
- Suma total × 2.5.
- Interpretación de referencia: ≥ 80 excelente · 68 promedio · < 50 deficiente.

---

## 5. Escala de severidad de problemas (Nielsen)

| Nivel | Significado | Acción |
|---|---|---|
| 0 | No es un problema | — |
| 1 | Cosmético | Corregir si sobra tiempo |
| 2 | Menor | Baja prioridad |
| 3 | Mayor | Alta prioridad |
| 4 | Catastrófico | Corregir antes de liberar |

---

## 6. Evaluación heurística preliminar (observaciones del auditor)

Sin participantes aún, se registran observaciones heurísticas iniciales (a validar con
usuarios reales):

| # | Heurística (Nielsen) | Observación | Severidad estimada |
|---|---|---|---|
| H1 | Visibilidad del estado | Las insignias de estado usan colores por tono (éxito/aviso/peligro); coherente. **Pero** ver DEF-001: estados en español multi-palabra caen al tono neutro. | 2 (Menor) |
| H2 | Prevención de errores | El backend rechaza subidas sin sesión y CORS no autorizado (verificado). Buena defensa. | 0 |
| H3 | Coincidencia sistema–mundo real | La UI usa lenguaje del dominio cultural ("Leyendas", "Canjear código", "Biblioteca"). Adecuado. | 0 |
| H4 | Estética y diseño minimalista | Estado vacío del catálogo es claro y amable. | 0 |
| H5 | Ayuda a reconocer/recuperarse de errores | Pendiente de validar los mensajes de error del flujo de subida de PDF con usuarios reales. | ⏳ |

---

## 7. Cómo ejecutarlo (siguiente paso)

1. Reclutar 3–5 participantes por perfil.
2. Preparar usuarios de prueba (lector, creador, admin) y al menos una leyenda publicada.
3. Sesiones de 20–30 min, grabando pantalla (con consentimiento).
4. Vaciar métricas en las plantillas de §3 y §4.
5. Consolidar hallazgos con la severidad de §5 en el *Informe de errores y defectos*.

> Puedo acompañarte a ejecutar estas tareas en el navegador y cronometrarlas si me
> proporcionas un usuario de prueba por rol.
