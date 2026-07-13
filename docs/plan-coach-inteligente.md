# 🧠 Plan vivo — Coach inteligente ("alguien pendiente de ti")

> Nace de una idea de Camilo (2026-07-13): que AVI no solo dé rutinas, sino que **acompañe** —
> recomendaciones según cómo amaneces y seguimiento inteligente del progreso, para que el
> asesorado sienta que **hay alguien pendiente de él**. Este documento se revisa ANTES de
> construir (decisión de Camilo: diseñar el plan primero). Marcar aquí lo aprobado/hecho.

---

## 1. La promesa (qué debe SENTIR el usuario)

> "AVI me conoce, se da cuenta de cómo voy, me cuida y me habla como una persona — no como una app."

No es una feature suelta; es una **voz** que aparece en los momentos justos con el mensaje justo.
Regla de oro: **cálido, oportuno y NO cansón.** Un mensaje bueno al día vence a diez genéricos.

---

## 2. Decisión de arquitectura — REGLAS, no IA (por ahora)

**Recomendación del ingeniero (a validar):** el motor del coach son **reglas deterministas en
vanilla JS**, no un modelo de lenguaje (LLM). Por qué:

| | Reglas (recomendado) | LLM / IA generativa |
|---|---|---|
| Offline-first (invariante de AVI) | ✅ funciona sin red | ❌ exige servidor + conexión |
| Costo | ✅ $0 | ❌ costo por usuario/mensaje |
| Determinismo / testeable | ✅ entra a la suite (312 tests) | ❌ salidas variables, difícil de probar |
| Dependencias externas | ✅ cero (invariante) | ❌ API/SDK externo |
| Riesgo (decir algo dañino) | ✅ tú escribes cada mensaje | ⚠️ puede alucinar consejos |

**Camino:** motor de reglas ahora. Si más adelante queremos lenguaje más natural/variado, se
puede añadir una **capa OPCIONAL** de LLM vía Edge Function (solo premium, solo con red, con los
mensajes de reglas como respaldo). No es necesaria para arrancar y no la construimos de entrada.

Forma técnica: función PURA en `avi-core.js` (`coachInsight(client, history, prs, bw, now)` →
devuelve el insight priorizado) — igual que `retentionByDay`/`applyMood`, testeable y offline.

---

## 3. CAPA A — Ánimo → bienestar (extensión del check-in que YA existe)

Hoy el check-in "¿Cómo te sientes hoy?" (`MOOD_STATES` + `applyMood`, avi-core) ya **adapta el
entrenamiento** y muestra chips de qué cambió (`adapt.changes`). Le añadimos un bloque de
**cuidado / bienestar** (`adapt.care`) = 2-3 consejos de estilo de vida por estado, tono Sofía.

Punto de extensión exacto: `applyMood` ya devuelve `adapt{title, why, changes, tone, flagCoach}`
→ se le agrega `adapt.care = [...]`; `moodBannerHtml` pinta una sección más. Cero rediseño.

Borrador de mensajes (a pulir con Sofía / Camilo):

| Ánimo | Ajuste de entreno (ya existe) | Bienestar NUEVO (`adapt.care`) |
|---|---|---|
| 🔥 Con energía | rutina completa, busca récord | Hidrátate bien · duerme para consolidar lo de hoy |
| 😊 Bien | rutina normal | La constancia es lo que te transforma, sigue así |
| 😮‍💨 Cansado | −1 serie, +descanso, quita accesorio | Duerme 7-8h · súbele a los carbohidratos hoy · evita estresarte: el cansancio te pone más irritable, sé amable contigo |
| 😤 Estresado | + cardio de descarga | Respira: el ejercicio baja el estrés · camina un poco · evita cafeína en la tarde |
| 🩸 En mi periodo | entrena con confianza (mito derribado) | Hidrátate + hierro · muévete suave si hay cólicos, el ejercicio ayuda · escucha tu cuerpo |
| 🤕 Con dolor | avisa al coach (flagCoach) | Para si duele de verdad · hielo y descanso · si persiste, consúltalo. Ya le avisamos a tu coach |

**Límite de seguridad:** son consejos generales y cálidos, **nunca "consejo médico"** ni cifras
prescriptivas. El estado 🤕 empuja a descanso/profesional (no a entrenar a pesar del dolor).

---

## 4. CAPA B — Seguimiento del progreso → insights proactivos (lo nuevo de fondo)

Una **tarjeta del coach** que aparece con UN mensaje priorizado según señales de los datos que
**ya tenemos**. Aquí es donde el usuario siente que "alguien está pendiente".

### Señales (todas derivables de datos existentes)

| Señal | Se detecta con (ya existe) | Mensaje (borrador, tono Sofía) | Acción |
|---|---|---|---|
| 🎉 Récord reciente | `computeExerciseProgress` (hito nuevo) / `DB.prs` | "¡Récord en Sentadilla! 120 kg 🏆 Vas volando." | Ver mi progreso |
| 📈 Progreso sostenido | 3 últimos puntos suben en un ejercicio | "Llevas 3 semanas subiendo en Press. Constancia pura." | — |
| 🧗 Estancamiento | 3+ sesiones sin superar el máx de un ejercicio principal | "En Peso Muerto llevas un rato igual — probemos variar reps o técnica." | Hablar con mi coach |
| 🔥 Racha viva | rachas / `weeklyActiveCount` | "5 entrenos seguidos. Estás imparable 💪" | — |
| 😴 Inactividad | `daysSinceLastSession` > umbral | "Hace 6 días que no nos vemos, ¿todo bien? Te esperamos, sin presión." | Ir a mi entreno |
| 🪫 Necesita deload | muchas sesiones seguidas / volumen creciente sostenido | "Vas duro hace semanas. Esta semana bajemos la carga para recuperar." | — |
| 🌱 Fase de adaptación | `isInAdaptation` | "Vas empezando — la constancia importa más que el peso. Vas bien." | — |
| 💧 Hábito flojo | agua (`waterWeek`) bajo la meta varios días | "Esta semana anduvimos bajos de agua. Súbele mañana 💧" | — |
| ⚖️ Peso vs objetivo | tendencia `bodyweight` vs `goal` | (con cuidado, sin obsesión) "Vas en la dirección de tu objetivo, paso a paso." | — |

### Reglas de convivencia (para NO cansar)
- **Un solo insight a la vez**, el de mayor prioridad (orden: dolor/seguridad > inactividad >
  deload > récord/racha > estancamiento > progreso > hábitos).
- **Frecuencia controlada**: no repetir el mismo insight a diario (patrón `moodAlertKey`: guardar
  "último mostrado" por tipo/día en localStorage).
- Se puede **descartar** ("Entendido") y no vuelve a salir por unos días.

---

## 5. Integración (dónde y cuándo aparece)

- **Capa A (bienestar):** dentro del banner de ánimo actual, en la pestaña **Hoy**, al elegir cómo
  te sientes. Ya está el contenedor; solo crece.
- **Capa B (insight de progreso):** nueva tarjeta ligera del coach en **Hoy** (arriba, 1 mensaje),
  y opcionalmente un eco en **Perfil/Historial**. No satura porque es 1 a la vez.
- Consistencia visual: reusa `.checkin-card`/`.mood-chips`/tokens — cero CSS nuevo si se puede.

---

## 6. Free vs Premium (decisión de producto → pregunta a Camilo)

Propuesta: los insights que **enganchan** (racha, inactividad, bienestar por ánimo, récords) para
TODOS (incl. modo libre) — son el gancho para querer un coach de verdad. Los insights más finos
(estancamiento por ejercicio, deload, analítica de tendencias) como **premium**, coherente con que
la analítica ya está premium-gated (`isFreeClient`). A confirmar.

---

## 7. Verificación (Definition of Done)
- Motor = funciones puras en `avi-core.js` → **tests deterministas** en `avi.test.js` (una batería
  por señal: dispara/no dispara según datos sintéticos; prioridad correcta; frecuencia respetada).
- Harness visual de la tarjeta del coach en Hoy, ambos temas, tono Sofía revisado.
- Barra premium completa (móvil 360px, letra grande, offline, estados no-felices).

---

## 8. Fuera de alcance de ESTE plan (apuesta futura separada)
- 📷 **Análisis de técnica por cámara en tiempo real** (visión por computadora). Es el norte de
  mayor techo, pero rompe el modelo de AVI (single-file / sin dependencias / offline), tiene
  riesgo de seguridad/legal (corregir mal la técnica) y es un proyecto de semanas/meses. Va como
  apuesta ENFOCADA y separada, empezando por UN ejercicio (sentadilla), etiquetada "experimental,
  no es consejo médico". **Escalón intermedio barato con el mismo valor emocional:** el asesorado
  GRABA un video de su serie y se lo manda al coach para que lo corrija (o una versión futura lo
  analiza sin la presión del tiempo real). Ese escalón sí cabe en AVI y entrega "alguien me ve".

---

## 9. Preguntas abiertas para Camilo (decisiones de producto)
1. **Voz del coach:** ¿habla como "AVI" (asistente), como Sofía (cálida/CS), o como TÚ (Camilo, el
   entrenador)? Define el tono de todos los mensajes.
2. **Free vs premium:** ¿qué insights son para todos y cuáles solo premium? (propuesta en §6).
3. **¿Push también?** ¿El coach solo habla dentro de la app, o también manda una notificación (ej.
   "hace 6 días que no entrenas")? (los push server-side ya existen).
4. **¿Coach para EL COACH?** ¿Quieres que además te avise A TI sobre tus asesorados ("Samuel lleva
   6 días sin entrenar", "María rompió récord")? Es la misma máquina de reglas, del otro lado.
5. **Umbrales:** días para "inactivo", sesiones para "estancado", etc. — propongo defaults y los
   ajustas.

---

## 10. Fases de entrega propuestas
- **Fase 1 (rápida):** Capa A — bienestar por ánimo (`adapt.care`). Un mensaje por estado. Sale en
  una sesión, valor emocional inmediato, riesgo casi nulo.
- **Fase 2:** Capa B — motor `coachInsight` + tarjeta en Hoy, con 4-5 señales de arranque (récord,
  racha, inactividad, estancamiento, adaptación) + tests.
- **Fase 3:** afinar señales (deload, hábitos, peso), free/premium, push si se decide.
- **Fase 4 (opcional/futuro):** capa LLM para lenguaje natural; y — aparte — la apuesta de cámara.
