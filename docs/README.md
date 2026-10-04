# 📚 Índice de `docs/`

Un mapa de lo que hay en esta carpeta, para saber **qué se consulta hoy y qué ya es historia**.
Los archivos **no se movieron** de sitio: la bitácora, CLAUDE.md y el código los citan por su ruta.

**Estados**
- 🟢 **Vigente**: se consulta y manda (reglas, dictámenes, referencias).
- 🔵 **Vivo**: plan en curso, con pasos pendientes.
- ⚪ **Cerrado**: ejecutado. Queda como registro de por qué se hizo así.
- 🧊 **Congelado**: el PO decidió no construir más ahí. Lo que está en producción se mantiene.
- 📝 **Borrador**: sin terminar o esperando a alguien de fuera.

> Ordenado el 4-oct-2026. Al cerrar o abrir un plan, actualiza su fila aquí.

---

## 🟢 Reglas de trabajo (leer antes de tocar código)

| Documento | Qué es | Estado |
|---|---|---|
| [`reglas-opus.md`](reglas-opus.md) | Contrato de ejecución: cómo verificar, el sabotaje obligatorio y el ciclo con Fable | 🟢 |
| [`metodologia.md`](metodologia.md) | Cómo se caza un bug, cómo se mata de raíz y cómo se piensa cada área | 🟢 |
| [`bitacora.md`](bitacora.md) | Historial de versiones y sesiones, lo más reciente primero | 🟢 se escribe en cada versión |
| [`runbook-restore.md`](runbook-restore.md) | Cómo restaurar AVI desde un respaldo (simulacro aprobado el 12-jul) | 🟢 |

## 🟢 Referencia técnica y de producto

| Documento | Qué es | Estado |
|---|---|---|
| [`arquitectura-y-escalabilidad.md`](arquitectura-y-escalabilidad.md) | Cómo está armada la app y dónde aprieta al crecer | 🟢 |
| [`auto-generador-rutinas.md`](auto-generador-rutinas.md) | Diseño del generador de rutinas (`generarRutinas`) | 🟢 referencia |
| [`modalidades-entrenamiento.md`](modalidades-entrenamiento.md) | Las 5 modalidades por ejercicio (kg, reps, tiempo, cardio, HIIT) | 🟢 referencia |
| [`estilos-y-entornos.md`](estilos-y-entornos.md) | Estilos de entrenamiento y entornos (gym, casa, parque, peso corporal) | 🟢 referencia |
| [`CREDITS-muscle-map.md`](CREDITS-muscle-map.md) | Licencia y origen del mapa muscular | 🟢 obligatorio conservarlo |
| [`setup-login-google.md`](setup-login-google.md) | Cómo se configuró el login con Google y correo | ⚪ hecho, sirve si hay que rehacerlo |
| [`email-templates/`](email-templates/) | Plantillas de correo de Supabase Auth (confirmar cuenta) | 🟢 |
| [`videos-faltantes.json`](videos-faltantes.json) · [`.csv`](videos-faltantes.csv) | Lista de ejercicios sin video | 🟢 dato |

## 🟢 Dictámenes de especialistas

Las decisiones clínicas y nutricionales. **Lo que dicta Laura es vinculante en seguridad.**

| Documento | Qué es | Estado |
|---|---|---|
| [`dictamen-laura-dolor-2026-08-08.md`](dictamen-laura-dolor-2026-08-08.md) | Qué se quita del plan según la zona de dolor | 🟢 vinculante |
| [`bloques-recuperacion-coachpro-2026-08-08.md`](bloques-recuperacion-coachpro-2026-08-08.md) | Bloques de recuperación por zona (Coach Pro) | 🟢 |
| [`dictamen-andres-macros-2026-08-05.md`](dictamen-andres-macros-2026-08-05.md) | Proteína, recomposición y menores | 🟢 ver qué puntos quedan dentro |
| [`dictamen-andres-menores-2026-08-15.md`](dictamen-andres-menores-2026-08-15.md) | El piso de los menores y el de proteína | 🟢 |
| [`entrenamiento-femenino.md`](entrenamiento-femenino.md) | Ciclo menstrual: evidencia y cómo lo aplica AVI | 🟢 |
| [`veredictos-grasa-2026-09-11.md`](veredictos-grasa-2026-09-11.md) | Veredictos del equipo sobre la grasa corporal estimada | ⚪ ejecutados (v607, v609) |
| [`evaluacion-grasa-2026-09-11.md`](evaluacion-grasa-2026-09-11.md) | Evaluación previa de la grasa corporal estimada | ⚪ cerrada (v609) |

## 🔵 Planes vivos

| Documento | Qué es | Estado |
|---|---|---|
| [`plan-profesional.md`](plan-profesional.md) | «AVI no la hizo un novato»: frentes de calidad con su estado | 🔵 |
| [`plan-migracion-moderna.md`](plan-migracion-moderna.md) | Migración a un stack moderno | 🔵 paso 0 hecho, paso 1 siguiente |
| [`plan-diseno-premium.md`](plan-diseno-premium.md) | Elevación premium pantalla por pantalla | 🔵 fundación hecha, falta por superficie |
| [`plan-iconos-svg.md`](plan-iconos-svg.md) | Íconos SVG de marca por fases | 🔵 F1 hecha, F2-F5 pendientes |
| [`plan-coach-inteligente.md`](plan-coach-inteligente.md) | «Alguien pendiente de ti»: insights, pulso y plan de choque | 🔵 fases 1-4.2 hechas, falta lo opcional |
| [`plan-barra-rir.md`](plan-barra-rir.md) | La barra y las reps en reserva | 🔵 hecho hasta v695, la curva queda para después |
| [`videos-plan.md`](videos-plan.md) | Producción de los videos que faltan | 🔵 pendiente |
| [`plan-sesiones.md`](plan-sesiones.md) | Plan de sesiones de julio (H → M) | ⚪ en su mayoría ejecutado; revisar antes de usarlo |

## 🧊 Congelado por decisión del PO

| Documento | Qué es | Estado |
|---|---|---|
| [`plan-comunidad.md`](plan-comunidad.md) | Diseño de Comunidad (la cabecera dice por qué se congeló) | 🧊 desde el 2-sep |
| [`plan-comunidad-reforma.md`](plan-comunidad-reforma.md) | Re-forma de la pestaña tras el benchmark | 🧊 |
| [`plan-comunidad-v3.md`](plan-comunidad-v3.md) | Análisis de Comunidad v3 | 🧊 |
| [`plan-registro-alimentos.md`](plan-registro-alimentos.md) | Registro de alimentos (criterio de corte en §8.4) | 🧊 desde el 27-ago |

## ⚪ Planes cerrados

| Documento | Qué es |
|---|---|
| [`plan-diseno-B-compromiso.md`](plan-diseno-B-compromiso.md) | Dirección «B · El Compromiso»: héroe, tira de hábitos y tope de tarjetas (cerrado el 20-ago) |
| [`plan-estancamiento-descarga.md`](plan-estancamiento-descarga.md) | Detector de estancamiento y semana de descarga (v433, v434) |
| [`plan-unificacion-guiado.md`](plan-unificacion-guiado.md) | El modo guiado como pantalla principal de «Hoy» (F0 → F5) |
| [`plan-correcciones-adopcion.md`](plan-correcciones-adopcion.md) | Correcciones del lote de adopción A1-A4 (ejecutado el 26-jul) |
| [`plan-correcciones-auditoria.md`](plan-correcciones-auditoria.md) | Correcciones de la auditoría del 13-jul |
| [`mejoras-android-2026-06-17.md`](mejoras-android-2026-06-17.md) | Mejoras Android / PWA de junio |

## ⚪ Estudios

| Documento | Qué es |
|---|---|
| [`estudio-interfaz-primera-sesion.md`](estudio-interfaz-primera-sesion.md) | La primera sesión del asesorado (variante C en producción) |
| [`estudio-retencion-2026-08-21.md`](estudio-retencion-2026-08-21.md) | Dónde se fuga la gente: el escalón de la primera semana |
| [`estudio-fitia-mfp-2026-08-12.md`](estudio-fitia-mfp-2026-08-12.md) | Fitia y MyFitnessPal: qué copiar y qué no (sus 6 patrones, ejecutados) |
| [`preview-primera-sesion.html`](preview-primera-sesion.html) | Maqueta del estudio de la primera sesión |

## ⚪ Auditorías

Cada carpeta trae su `README.md` con el veredicto. Lo pendiente de cada una se lee ahí.

| Carpeta / documento | Tema |
|---|---|
| [`auditoria-2026-06-01.md`](auditoria-2026-06-01.md) | Auditoría de equipo de junio |
| [`auditoria-interfaz-fase2.md`](auditoria-interfaz-fase2.md) | Interfaz, fase 2: las 12 pantallas |
| [`auditoria-areas-2026-07-31/`](auditoria-areas-2026-07-31/) | Por áreas, julio (lleva el briefing reutilizable) |
| [`auditoria-nutricion-2026-08-15.md`](auditoria-nutricion-2026-08-15.md) | Nutrición independiente |
| [`auditoria-v507-2026-08-21/`](auditoria-v507-2026-08-21/) | 4 agentes sobre v507 |
| [`auditoria-areas-2026-08-22/`](auditoria-areas-2026-08-22/) | Por áreas, agosto |
| [`auditoria-areas-2026-09-01/`](auditoria-areas-2026-09-01/) | Por áreas, septiembre |
| [`auditoria-app-instalada-2026-09-05/`](auditoria-app-instalada-2026-09-05/) | AVI como app instalada: push y service worker |
| [`auditoria-entreno-y-arranque-2026-09-06/`](auditoria-entreno-y-arranque-2026-09-06/) | Entreno en vivo, arranque y panel |
| [`auditoria-herramientas-coach-2026-09-07/`](auditoria-herramientas-coach-2026-09-07/) | Herramientas de trabajo del coach |
| [`auditoria-rapidos-2026-09-08/`](auditoria-rapidos-2026-09-08/) | Entrenamientos rápidos |
| [`auditoria-calentamiento-2026-09-20/`](auditoria-calentamiento-2026-09-20/) | El calentamiento |
| [`auditoria-semana-2026-09-25/`](auditoria-semana-2026-09-25/) | Lo construido esa semana (12.ª ronda) |
| [`auditoria-lesiones-2026-09-25/`](auditoria-lesiones-2026-09-25/) | R13 · Lesiones, matriz completa |
| [`auditoria-cuentas-2026-09-27/`](auditoria-cuentas-2026-09-27/) | R14 · Cuentas y servidor |
| [`auditoria-web-2026-09-27/`](auditoria-web-2026-09-27/) | R15 · La web en su dominio nuevo |
| [`auditoria-velocidad-2026-09-28/`](auditoria-velocidad-2026-09-28/) | R16 · Peso y velocidad |
| [`auditoria-construido-2026-09-30/`](auditoria-construido-2026-09-30/) | R17 · Lo construido del 28 al 30-sep |
| [`auditoria-web-nueva-2026-09-30/`](auditoria-web-nueva-2026-09-30/) | R18 · La web nueva |
| [`auditoria-diseno-web-2026-10-03/`](auditoria-diseno-web-2026-10-03/) | R19 · Diseño de la web de venta |

## ⚪ QA y revisiones puntuales

| Documento | Qué es |
|---|---|
| [`qa-v484-v485.md`](qa-v484-v485.md) | QA de puerta de v484 y v485 |
| [`verificacion-v484-v485.md`](verificacion-v484-v485.md) | Verificación adversarial de v484 y v485 |
| [`revision-sofia-v485.md`](revision-sofia-v485.md) | Revisión de tono de v485 |

## 📝 Borradores

| Documento | Qué es | Estado |
|---|---|---|
| [`carta-icbf-tcac.md`](carta-icbf-tcac.md) | Carta al ICBF sobre las condiciones de uso de la TCAC | 📝 con datos por llenar |

---

**Fuera de esta carpeta:** los textos legales viven en [`../legal/`](../legal/) (empieza por
`LEEME-IMPORTANTE.md`) y las reglas permanentes del proyecto en [`../CLAUDE.md`](../CLAUDE.md).
