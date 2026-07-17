# 🧠 Plan vivo — Coach inteligente ("alguien pendiente de ti")

> Nace de una idea de Camilo (2026-07-13): que AVI no solo dé rutinas, sino que **acompañe** —
> recomendaciones según cómo amaneces y seguimiento inteligente del progreso, para que el
> asesorado sienta que **hay alguien pendiente de él**. Este documento se revisa ANTES de
> construir (decisión de Camilo: diseñar el plan primero). Marcar aquí lo aprobado/hecho.
>
> **2026-07-15 — DESBLOQUEADO.** Camilo respondió las 5 decisiones de producto (§9, resueltas).
> Flujo acordado: **Fable estipuló el plan de ejecución (§11) · Opus ejecuta EXACTAMENTE lo
> estipulado · Fable verifica con el protocolo (§12).** Igual que la auditoría C1-C6 (v350/v351).

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

## 9. Preguntas abiertas para Camilo — ✅ RESUELTAS (2026-07-15)
1. **Voz del coach → AVI, cálida (tono Sofía).** La app habla como AVI. Funciona igual para
   libres (que NO tienen coach humano) y no se confunde con los mensajes reales del chat de
   Camilo. Camilo sigue siendo la voz humana; AVI es la que acompaña a diario.
2. **Free vs premium → gancho gratis, fino premium** (la propuesta de §6, confirmada):
   bienestar por ánimo, racha, récords e inactividad para TODOS; estancamiento por ejercicio,
   deload y tendencias solo PREMIUM (coherente con el gating de analítica existente).
3. **Push → solo dentro de la app, por ahora.** El push de inactividad ya existe (daily-notifs).
   Cuando la adopción de push suba, se conectan las señales sin rehacer nada.
4. **Coach para EL COACH → sí, en fase posterior** (Fase 3): primero el asesorado.
5. **Umbrales → defaults del ingeniero** (estipulados en §11.E3), Camilo los ajusta después
   de verlos en vivo.

---

## 10. Fases de entrega propuestas
- **Fase 1 (rápida):** Capa A — bienestar por ánimo (`adapt.care`). Un mensaje por estado. Sale en
  una sesión, valor emocional inmediato, riesgo casi nulo.
- **Fase 2:** Capa B — motor `coachInsight` + tarjeta en Hoy, con 4-5 señales de arranque (récord,
  racha, inactividad, estancamiento, adaptación) + tests.
- **Fase 3:** afinar señales (deload, hábitos, peso), coach-para-el-coach, push si se decide.
- **Fase 4 (opcional/futuro):** capa LLM para lenguaje natural; y — aparte — la apuesta de cámara.

---

## 11. 📋 PLAN DE EJECUCIÓN ESTIPULADO — Fases 1+2 (Opus ejecuta)

> **Estipulado por Fable el 2026-07-15 tras leer el código real** (líneas verificadas contra
> avi-v351). La sesión que ejecuta (Opus) implementa EXACTAMENTE esto y marca cada checkbox.
> Si algo resulta imposible o revela un problema mayor: **PARAR y documentarlo en §13
> (Desviaciones)** — no inventar un fix alternativo en silencio.

### Línea base (2026-07-15, avi-v351 en prod)
- Suite unit: **314/314** · Hook: **11/11** · `_prodcheck.mjs 351` verde · árbol limpio (`4d2567f`).

### 🛡️ Reglas obligatorias para la sesión que ejecuta
1. **Leer primero** `CLAUDE.md` completo (DOCTRINA + GOTCHAS VIGENTES) y `docs/metodologia.md`.
2. **Un bloque = un commit** (E1+E2 juntos = Capa A; E3 = Capa B core; E4+E5+E6 = Capa B UI+news+harness;
   deploy aparte). Prohibido mezclar o "aprovechar" para refactors no estipulados.
3. **Edit tool o python utf-8** — jamás perl/sed (tildes/emojis se corrompen en Windows).
4. Suite (`node avi.test.js`) **antes y después** de cada commit; no puede bajar de 314 (sube con
   los tests nuevos; actualizar `_baseline.txt` si el check 11 del hook lo exige).
5. Los tests estipulados **deben fallar sin el código nuevo y pasar con él** (probarlo).
6. Todo texto visible al asesorado = **voz AVI cálida (tono Sofía)**, español colombiano, cero
   jerga, cero consejo médico, cero cifras prescriptivas de nutrición/medicación.
7. `esc()` en TODO dato interpolado en innerHTML (el nombre de ejercicio en los insights es
   DATO DE USUARIO). Tokens CSS existentes, nada hardcodeado. Táctil ≥36px. Ambos temas.
8. Zona CALIENTE: esto toca `renderClientToday`/banner de ánimo/guiado embebido →
   **`_guiado-suite.mjs` 53/53 obligatoria** antes del deploy.
9. Al final: **UN deploy** con bump del PAR `?v=352` (index.html, TODAS las refs) + `CACHE_NAME`
   `avi-v352` (sw.js) + Lucas y Julián 🟢 + curl a Pages + `node scripts/e2e/_prodcheck.mjs 352`.

---

### E1 — Capa A core: `adapt.care` en `applyMood` (avi-core.js) — commit 1 (con E2)

- [x] implementado · [x] tests (suite 314→317) · [x] verificado

**Dónde:** `avi-core.js` — `applyMood` (línea ~1503). El objeto `adapt` se crea en ~1509:
`{ mood, title, why, tone, changes, flagCoach }`. **Agregar `care: []`** al literal inicial y
poblarlo en cada rama del `switch` (los 6 estados + default comparten la rama 'bien').

**Contrato:** `adapt.care` = array de **1 a 3 strings** de bienestar, SIEMPRE presente (también
en 'bien'/'energia'/default). Consejos generales y cálidos, nunca médicos.

**Textos estipulados** (base §3; Opus puede pulir la redacción SIN cambiar el sentido ni el límite
de seguridad; voz AVI):

| Estado | `adapt.care` |
|---|---|
| `energia` | «Aprovecha el día: hidrátate bien durante la sesión» · «Esta noche duerme 7-8 horas — ahí se consolida lo que entrenas hoy» |
| `bien` | «La constancia es lo que te transforma — hoy suma un día más» |
| `cansado` | «Duerme 7-8 horas esta noche: el descanso también entrena» · «Súbele hoy a los carbohidratos, son tu gasolina» · «Sé amable contigo: el cansancio pone irritable a cualquiera» |
| `estres` | «Respira profundo entre series — el ejercicio es tu descarga» · «Al terminar, camina un poco sin afán» · «Evita la cafeína en la tarde para dormir mejor» |
| `periodo` | «Hidrátate más de lo normal estos días» · «Si hay cólicos, el movimiento suave ayuda — escucha tu cuerpo» |
| `dolor` | «Si algo duele de verdad, para — no es negociable» · «Al llegar a casa: hielo y descanso en la zona» · «Si sigue igual en unos días, consúltalo con un profesional» |

**Tests estipulados (avi.test.js):** batería «adapt.care»: para CADA id de `MOOD_STATES` + el
default (mood desconocido), afirmar: (a) `Array.isArray(adapt.care)`, (b) 1 ≤ length ≤ 3,
(c) todos strings no vacíos, (d) el care de `dolor` contiene «para» (seguridad: empuja a parar,
no a aguantar), (e) `applyMood` sigue devolviendo `changes`/`flagCoach` intactos (no regresión).

---

### E2 — Capa A UI: bloque de cuidado en `moodBannerHtml` (app-4-entreno.js) — commit 1 (con E1)

- [x] implementado (+ ícono `heart` en AVI_ICONS) · [x] verificado visual (harness E6-A)

**Dónde:** `app-4-entreno.js` — `moodBannerHtml` (línea ~679). Esta función la usan las DOS
vistas (clásica vía `pickMood` y guiado embebido vía app-6-extra.js:417-418
`moodBannerHtml(GM.routine.adapt,'gmChangeMood')`) → **un solo cambio cubre ambas**. NO tocar
app-6.

**Qué:** después de los `chips` y antes del botón «Cambiar cómo me siento», si
`adapt.care && adapt.care.length`, pintar un bloque:
- Encabezado pequeño «Para cuidarte hoy» con ícono `heart` (ver nota) — mismo color `t[2]` del tono.
- Los consejos como lista compacta (una línea por consejo, `esc()` en cada uno aunque hoy sean
  estáticos — regla de la casa), `font-size:12px`, `color:var(--t1)`, `line-height:1.5`.
- Sin animaciones nuevas. Sin CSS nuevo si se puede inline con tokens (patrón del propio banner).

**Ícono `heart`:** NO existe como clave de `AVI_ICONS` (app-1-infra.js:1561). Existe el path
`_ICON_HEART` (app-1-infra.js:79) usado por otro sistema. Estipulado: **agregar clave `heart`
a `AVI_ICONS`** con un path monolínea coherente (puede derivar de `_ICON_HEART`), patrón de los
íconos `trenddown`/`flat` agregados en v347. Fallback `typeof aviIcon==='function'` como en el
resto de app-4.

**Verificación:** harness E6 escenario (a) + shots ambos temas mirados a ojo.

---

### E3 — Capa B core: motor `coachInsight` (avi-core.js) — commit 2

- [x] implementado · [x] tests (10 nuevos, suite 317→327) · [x] verificado

**Qué:** función PURA nueva en avi-core.js (junto a los agregados por fecha, ~línea 900) +
export en el bloque final (~2028):

```js
// coachInsight(client, sessions, prs, now, opts) → insight | null
// sessions = DB.history[cid] (array, nuevo→viejo) · prs = DB.prs[cid] (mapa key→{val,unit,reps,date,name,…})
// opts = { isFree: bool, muted: {tipo: ts_hasta_ms} }
// Devuelve { type, icon, title, msg, cta } del insight de MAYOR prioridad no silenciado, o null.
```

**Señales, umbrales DEFAULT y prioridad** (orden = prioridad; el primero que dispara gana;
un tipo en `opts.muted` con `now < ts` se SALTA y se evalúa el siguiente):

| # | `type` | Dispara cuando (defaults) | Gating | Mensaje (voz AVI; pulir sin cambiar sentido) | `cta` |
|---|---|---|---|---|---|
| 1 | `inactivo` | `daysSinceLastSession(sessions,now)` es finito y **≥ 4** | todos | title «Te extrañamos por aquí» · msg «Hace {d} días que no entrenas. ¿Todo bien? Sin presión — tu plan te espera para cuando quieras retomar.» | — |
| 2 | `record` | algún PR de `prs` con `date` en las últimas **48 h** (tomar el más reciente) | todos | title «¡Récord en {name}!» · msg «{val} {unit} — tu mejor marca hasta hoy. Vas volando 🏆» | — |
| 3 | `racha` | `weekStreak(sessions, planDays(client), now).weeks ≥ 2` | todos | title «¡{weeks} semanas cumpliendo tu plan!» · msg «Constancia pura. Esto es lo que te transforma 💪» | — |
| 4 | `estancado` | `computeExerciseProgress(sessions)`: algún ejercicio con `unit==='kg'` y **≥6 puntos** cuyo máximo de los **últimos 4 puntos** NO supera el máximo de los puntos anteriores (tomar el de más puntos) | **solo premium** (`opts.isFree` → saltar) | title «{name} se estancó un poquito» · msg «Llevas varias sesiones en la misma marca. Un cambio de reps o de técnica lo destraba — coméntalo con tu coach.» | `{label:'Hablar con mi coach', action:'msgs'}` |
| 5 | `adaptacion` | `isInAdaptation(client, sessions, now)` **y** `sessions.length ≥ 1` (sin sesiones, el onboarding ya habla) | todos | title «Vas empezando, y vas bien» · msg «En estas primeras semanas la constancia importa más que el peso. Tu cuerpo se está adaptando.» | — |

**Ícono por tipo** (claves EXISTENTES de `AVI_ICONS`; verificar nombre exacto al implementar):
`inactivo`→`moon` · `record`→`trend` · `racha`→`flame` · `estancado`→`flat` (v347) ·
`adaptacion`→`leaf`. Si alguna clave no existe, elegir la existente más cercana y documentarlo.

**Candados de pureza:** recibe `now` SIEMPRE (jamás `Date.now()` adentro); sin DOM, sin
localStorage, sin `DB`; `client`/`sessions`/`prs` nulos o vacíos → `null` sin lanzar; los
umbrales como constantes nombradas arriba de la función (`INSIGHT_INACTIVE_DAYS = 4`, etc.)
para que Camilo los ajuste fácil.

**Tests estipulados (avi.test.js), batería por señal con datos sintéticos:**
- Por cada señal: caso que DISPARA y caso que NO (p. ej. 3 días inactivo → null/otra señal;
  PR de hace 3 días → no record; 1 semana de racha → no racha; 5 puntos → no estancado;
  intermedio → no adaptación).
- Prioridad: datos que disparan `inactivo`+`record` a la vez → gana `inactivo`; `record`+`racha`
  → gana `record`.
- Muted: con `muted:{inactivo: now+1}` y ambas señales → devuelve `record`.
- Free: datos de estancamiento con `isFree:true` → NO devuelve `estancado` (cae a la siguiente o null).
- Bordes: sin argumentos → null; historial vacío → null o `adaptacion` según nivel/fechas (fijar
  el esperado en el test); determinismo con `now` fijo.

---

### E4 — Capa B UI: tarjeta del coach en «Hoy» — commit 3 (con E5+E6)

- [x] implementado · [x] verificado visual ambos temas × free/premium (harness E6 shots)

**Contenedor:** div nuevo `<div id="cn-coach-card"></div>` en index.html dentro de `#cn-today`,
junto a `#pr-banners` (línea ~588).

**Orden (v313 — el entreno arriba del pliegue es decisión de Camilo, NO romperla):** agregar
`'cn-coach-card'` a los DOS arrays de `_todayOrder` (app-4-entreno.js:570-571):
- día de ENTRENO: `[...,'pr-banners','cn-today-body','cn-coach-card','cn-habits',...]` — la
  tarjeta va DESPUÉS del entreno (no empuja el guiado bajo el pliegue).
- descanso/sin rutina: `['cn-today-head','cn-coach-card','qw-entry',...]` — arriba, ahí sí es
  el contenido principal del día.

**Render:** función `renderCoachCard(client)` en app-4-entreno.js (junto al check-in, ~línea 650),
llamada desde `renderClientToday` al lado de `renderHabitsCard` (~596, ANTES de los
early-returns → sale también en descanso y sin rutinas). Guard `typeof coachInsight==='function'`
(caché vieja de avi-core, patrón `_moodOK`).
- Construye `muted` leyendo `localStorage['coachmute_'+cid+'_'+type]` (ts hasta) por los 5 tipos.
- `coachInsight(client, DB.history[c.id]||[], (DB.prs&&DB.prs[c.id])||{}, Date.now(),
  {isFree:isFreeClient(client), muted})`.
- `null` → `el.innerHTML=''` (la tarjeta desaparece sola cuando la señal expira).
- Con insight → tarjeta `.card` compacta: ícono del tipo (aviIcon, 20px, color `var(--g2)`) +
  título (`--fs` de tarjeta, peso 800) + msg (12.5px, `--t1`) + fila de acciones: cta si existe
  (`action:'msgs'` → `cnTab('cn-messages',document.getElementById('tab-msgs'))`; recordar que
  solo premium tiene chat — el cta solo llega en insight premium, coherente) + botón fantasma
  **«Entendido»** (≥36px táctil).
- **Entendido** → `localStorage['coachmute_'+cid+'_'+type] = Date.now() + días×86400000` con
  días por tipo: `inactivo` 2 · `record` 2 · `racha` 3 · `estancado` 7 · `adaptacion` 5 —
  y re-llama `renderCoachCard` (la tarjeta se oculta o muestra el siguiente insight).
- `data-insight="{type}"` en el root de la tarjeta (ancla para el harness).
- `esc()` en título y msg (llevan `{name}` de ejercicio = dato de usuario). Sin animación de
  entrada (o con `prefers-reduced-motion` respetado si se agrega).
- NO tocar `pr-banners` (huérfano, ver §13-radar). NO tocar el poll de 15s.

### E5 — AVI_NEWS (regla v302) — commit 3

- [x] entrada nueva (v352, coach:false) · [x] poda de v313 · [x] `_verify-news.mjs` actualizado (N1/N2/N5/N9)

Capacidad nueva VISIBLE al asesorado → entrada en `AVI_NEWS` (app-6-extra.js) anunciando que
AVI ahora acompaña («AVI está pendiente de ti: consejos según cómo amaneces y mensajes cuando
rompes récords, cumples tu plan o te perdemos de vista»; redacción final voz AVI) + poda de las
entradas más viejas + **actualizar las expectativas ATADAS de `_verify-news.mjs` en el MISMO
commit** (regla de oro de los harness). `coach:false` (aplica también a libres).

### E6 — Harness E2E `_verify-coach.mjs` (nuevo) — commit 3

- [x] escrito · [x] verde (8 checks A-F, cero jsErrors) · [x] shots ambos temas mirados a ojo

Patrón `_verify-v315`/gamif: `s-client` forzado con `CUR`/`DB` fake SIN login real, poll de
nube CONGELADO tras inyectar (gotcha v347: clearInterval + stub — si no, la nube borra los
fixtures a los 15 s), puertos limpios antes de arrancar (zombis). Checks nombrados:
- **A (Capa A):** elegir ánimo `cansado` en el chooser → el banner muestra el bloque «Para
  cuidarte hoy» con ≥2 consejos; check también en el guiado embebido (misma función, pero
  verificar RENDER real); `dolor` → el care de seguridad presente.
- **B (récord):** fixture con PR `date=now-1h` → tarjeta `data-insight="record"` con el nombre
  del ejercicio; XSS-probe: PR con `name` `<img src=x onerror=...>` NO ejecuta (patrón
  `_verify-xss.mjs`, con control negativo).
- **C (inactivo + prioridad):** fixture 6 días sin sesión Y racha de 3 semanas → gana `inactivo`.
- **D (Entendido):** tap en «Entendido» → la tarjeta se oculta y en el siguiente
  `renderClientToday` NO vuelve (muted); si había segunda señal, aparece la segunda.
- **E (free/premium):** fixture de estancamiento (7 puntos planos) con `tier:'libre'` → NO sale
  `estancado`; sin tier (cliente de coach) → SÍ.
- **F (descanso):** día sin rutina → la tarjeta sale ARRIBA (orden `_todayOrder` no-training).
- Shots de la tarjeta y el banner de ánimo en AMBOS temas (revisar a ojo, no solo asserts).

---

### Secuencia de cierre (después de E1-E6) — ✅ EJECUTADA (Opus, 2026-07-15)
1. [x] Suite **327/327** · `node -c` de cada módulo · `_guiado-suite.mjs` 53/53 ·
   `_verify-modals.mjs` 12/12 · `_verify-news.mjs` 10/10 · `_verify-coach.mjs` 8/8 · cero jsErrors.
2. [x] QA estático (Julián) = los 11 checks del pre-commit hook por commit (sintaxis, duplicados,
   IDs, handlers, SB_KEYS, secretos, tests) + auto-revisión de esc()/IDs/mute-fuera-de-SB_KEYS;
   QA funcional (Lucas) = los 8 checks A-F del harness + revisión de sobrepromesas (el cta solo
   llega en insight premium → el libre nunca choca con un chat bloqueado) y tono. Ambos 🟢.
   *(Nota de proceso: no se spawnearon subagentes por la restricción del harness "no spawn salvo
   pedido"; el pase se hizo inline con el hook + harnesses + auto-auditoría, cubriendo su intención.)*
3. [x] Deploy único `1022456`: bump PAR `?v=352` + `CACHE_NAME avi-v352` → push → curl Pages
   (v352 servido) → `_prodcheck.mjs 352` ✅ (arranca limpio, cero jsErrors).
4. [x] Documentado: hito parte 57 en `docs/bitacora.md` · CLAUDE.md (backlog `[~]` Fases 1-2 +
   funciones clave `coachInsight`/`adapt.care` + gotcha del BOM en el bump) · checkboxes marcados.

**Commits:** plan `86dd302` · Capa A `de8825a` · Capa B core `83be183` · Capa B UI+news+harness
`370b63b` · deploy `1022456`. **Queda solo la VERIFICACIÓN de Fable (§12).**

## 12. 🔍 Protocolo de verificación (Fable, después de Opus)
1. `git log` desde `4d2567f`: commits = los estipulados, sin scope creep (diff completo leído).
2. Re-correr: suite · `_verify-coach.mjs` · `_guiado-suite.mjs` · `_verify-news.mjs` · shots a ojo.
3. Greps: `transition:all` sigue en 0 real · `esc(` presente en el render de la tarjeta ·
   umbrales como constantes nombradas · `coachmute_` no está en SB_KEYS ni claves de sesión.
4. Probar que ≥2 tests nuevos FALLAN al revertir su código (sanity anti-test-decorativo).
5. Prod: curl `?v=352` + `avi-v352` + `_prodcheck.mjs 352` re-corrido.
6. Tono: leer cada texto nuevo como el asesorado nervioso del primer día (§3.6 metodología).
7. Veredicto en §13 + memoria de sesión + RADAR.

## 13. Desviaciones y radar de la ejecución
*(la sesión que ejecuta documenta aquí cualquier desviación; Fable agrega el veredicto)*
- Radar pre-anotado por Fable (2026-07-15): `#pr-banners` (index.html:588) es un contenedor
  HUÉRFANO — está en los arrays de `_todayOrder` pero NADA le escribe (la celebración de PRs
  vive en el cierre del entreno). Candidato a limpieza en commit propio FUERA de esta feature.

### ✅ VEREDICTO DE FABLE (verificación §12 EJECUTADA, 2026-07-15) — APROBADO

1. **Diff completo leído** (`4d2567f..842f8f3`): 5 commits + docs, archivos = exactamente los
   estipulados; cero scope creep (ni un cambio fuera de E1-E6 + deploy + docs). Textos de care,
   señales, umbrales `INSIGHT_*`, prioridad, mute y gating calcan §11.
2. **Re-corrido por Fable** (no confiado a la corrida de Opus): suite **327/327** ·
   `_verify-coach.mjs` **8/8** · `_guiado-suite.mjs` TODO OK · `_verify-news.mjs` TODO OK ·
   cero jsErrors. Shots re-mirados a ojo (récord claro/oscuro, banner "Para cuidarte hoy"
   claro/oscuro): premium, tokens correctos en ambos temas.
3. **Greps limpios:** `transition:all` reales = 0 (solo el comentario-guía) · `coachmute_` NO
   está en SB_KEYS ni en claves de sesión · 5 umbrales como constantes nombradas · 4× `esc(`
   en `renderCoachCard` · cero secretos en el diff.
4. **Anti-test-decorativo probado:** saboteé el código (umbral de inactividad a 999 + quité el
   "para" de seguridad del dolor) → **4 tests fallaron** (323/327); restaurado → 327/327.
   Los tests muerden.
5. **Prod re-verificada por Fable:** curl v352 + `#cn-coach-card` en el HTML servido + sw.js
   sin BOM + `_prodcheck.mjs 352` verde.
6. **Tono:** todos los textos nuevos leídos como el asesorado del primer día — cálidos, sin
   jerga, sin consejo médico; el de 🤕 empuja a PARAR (protegido por test).

**Desviación aceptada (documentada por Opus, no silenciosa):** no se spawnearon los subagentes
Lucas/Julián; su intención se cubrió con el hook de 11 checks por commit (pase estático) + los
8 checks del harness + auto-auditoría de sobrepromesas/tono (pase funcional). ACEPTADA para esta
entrega porque la cobertura es equivalente y quedó transparente — pero NO sienta precedente: el
pipeline §🤖 sigue vigente para futuros deploys.

**Observaciones menores (no bloquean, quedan anotadas):**
- El shot `E-estancado-premium` quedó tapado por el tour de novedades (el harness lo silencia
  DESPUÉS); el check funcional E sí validó el DOM y la tarjeta comparte plantilla con la de
  récord (verificada a ojo). Mejora futura del harness: silenciar el tour ANTES del primer shot.
- `coachInsight` récord: un PR legacy sin `.val` mostraría "undefined kg", pero es inalcanzable
  en la práctica (la ventana de 48 h solo deja pasar PRs recientes, que siempre llevan la forma
  moderna de `checkAndUpdatePRs`). Endurecer con fallback `val ?? kg` si algún día se amplía la
  ventana.

**Ciclo planificar → ejecutar → verificar CERRADO. Fases 1+2 del Coach Inteligente APROBADAS
en producción (avi-v352).** Siguiente: Fase 3 (estipulada en §14, Camilo la aprobó el 2026-07-15).

---

## 14. 📋 PLAN DE EJECUCIÓN ESTIPULADO — FASE 3 (Opus ejecuta, Fable verifica)

> **Estipulado por Fable el 2026-07-15 tras verificar la Fase 1+2 y leer el código real de
> avi-v352.** Camilo aprobó continuar con el mismo flujo. Alcance de la Fase 3 según las
> decisiones ya tomadas (§9): **3 señales finas del asesorado (deload, agua, peso) + el pulso
> para EL COACH**. SIN push (decisión #3: esperar adopción). La sesión que ejecuta (Opus)
> implementa EXACTAMENTE esto y marca cada checkbox; desviaciones → §16, sin fixes inventados.

### Línea base (2026-07-15, tras la verificación)
- Prod: **avi-v352** · HEAD `3ba343c` · Suite **327/327** · Hook 11/11 · `_verify-coach.mjs` 8/8.

### 🛡️ Reglas obligatorias (las de §11 + lecciones de la Fase 1+2)
1. Leer `CLAUDE.md` (DOCTRINA + GOTCHAS) y `docs/metodologia.md` PRIMERO.
2. **Un bloque = un commit** (F0, F1, F2, F3, deploy). Nada fuera de lo estipulado.
3. Edit tool o **python a ARCHIVO** (jamás inline con comillas en PowerShell, jamás perl/sed).
4. Suite antes/después de cada commit (≥327, sube); tests nuevos DEBEN fallar sin su código.
5. **Bump de versión SIN BOM**: tras el replace de `?v=`, re-guardar con
   `[System.Text.UTF8Encoding]::new($false)` y **verificar los 3 primeros bytes** de
   index.html y sw.js (gotcha cazado en v352).
6. En harnesses con shots: **silenciar el tour de novedades ANTES del PRIMER shot**
   (`ax_news_seen` al máximo + `#news-tour` hidden — lección del shot E tapado en v352).
7. Textos visibles = voz AVI cálida; cero consejo médico; el peso SIN obsesión (ver F1.c).
8. Zona caliente: se toca `renderClientToday`/tarjeta → `_guiado-suite.mjs` 53/53 antes del
   deploy. Se toca el home del COACH → `_test-coach-back.mjs` 20/20 también.
9. Cierre: deploy único `?v=353` + `CACHE_NAME avi-v353` + curl + `_prodcheck.mjs 353`;
   pase estático = hook 11/11 por commit + auto-auditoría; pase funcional = harnesses
   (la equivalencia Lucas/Julián aceptada en §13 aplica igual aquí, documentada).

---

### F0 — Limpieza `#pr-banners` (radar §13) — commit 0, PROPIO

- [x] borrado · [x] verificado (0 refs activas, hook 11/11) — commit `806f9da`

Borrar el div huérfano `#pr-banners` (index.html:~588) y su entrada en los DOS arrays de
`_todayOrder` (app-4). ANTES de borrar: `grep -n "pr-banners"` en *.js, index.html y
scripts/e2e/ → confirmar que SOLO existen esas 3 referencias (2 arrays + div). El check 3 del
hook (IDs JS sin HTML) valida el borrado. La celebración real de PRs vive en el cierre del
entreno (`newPRs` en workout-finish) — NO se toca.

### F1 — Core: 3 señales nuevas en `coachInsight` + hardening — commit 1 (con sus tests)

- [x] deload · [x] agua · [x] peso · [x] hardening `val ?? kg` · [x] tests (5 nuevos, suite 327→332) · [x] verificado (sabotaje → 5 fallan)

**Firma:** se conserva `coachInsight(client, sessions, prs, now, opts)`. `opts` crece con dos
campos OPCIONALES (back-compat total): `opts.bw` = `DB.bodyweight[cid]` (array `[{date,kg}]`)
y `opts.waterGoal` = meta de vasos (número). Sin ellos, las señales de peso/agua no disparan
(o agua cae a `waterGoalGlasses(client.weight)` — ver b).

**Constantes nuevas** (mismo patrón `INSIGHT_*`):
`INSIGHT_DELOAD_WEEKS = 4` · `INSIGHT_WATER_MIN_LOGGED = 3` · `INSIGHT_WATER_MET_MAX = 1` ·
`INSIGHT_BW_MIN_ENTRIES = 3` · `INSIGHT_BW_WINDOW_DAYS = 45` · `INSIGHT_BW_MIN_DELTA = 0.5`.

**a) `deload` (SOLO premium — decisión #2).** Dispara cuando
`weekStreak(sessions, planDays(client), now).weeks >= INSIGHT_DELOAD_WEEKS`. Ícono **`wind`**
(existe en AVI_ICONS, verificado; `moon` NO — ya es el de inactivo). title «Vas duro hace semanas» ·
msg «Llevas {weeks} semanas a tope. Una semana más suave ayuda a crecer — coméntalo con tu
coach.» · cta `{label:'Hablar con mi coach', action:'msgs'}`.

**b) `agua` (para TODOS — es hábito/gancho).** Meta = `opts.waterGoal` o
`waterGoalGlasses(client.weight)`. Sobre `waterWeek(client.habits, new Date(nowTs))`
(shape `[{day,n}]`, hoy de último): sea `logged` = días con `n>0` y `met` = días con
`n>=meta`, **excluyendo HOY de ambos** (el día en curso no cuenta — a las 8am nadie ha
cumplido). Dispara si `logged >= INSIGHT_WATER_MIN_LOGGED && met <= INSIGHT_WATER_MET_MAX`.
Ícono `droplet`. title «Esta semana anduvimos bajos de agua» · msg «Tu cuerpo rinde mejor
hidratado. Mañana súbele un vasito a la vez 💧». Sin cta (la tarjeta de agua está ahí mismo).
**Candado anti-regaño:** si `logged` es 0-2 (no usa la feature) → NO disparar jamás.

**c) `peso` (SOLO premium — decisión #2). SOLO en positivo, NUNCA regaña.** Con `opts.bw`:
filtrar entradas de los últimos `INSIGHT_BW_WINDOW_DAYS` días con `kg` numérico, ordenar por
fecha; si hay `>= INSIGHT_BW_MIN_ENTRIES`, `delta = último.kg - primero.kg`. Dirección del
objetivo con los regex de `weekEditorial`: `/grasa|perder|baj|adelgaz/` → bajar;
`/m[uú]sculo|muscul|ganar|hipertrof/` → subir; **cualquier otro objetivo (recomp/vacío) → NO
disparar**. Dispara SOLO si la dirección coincide y `|delta| >= INSIGHT_BW_MIN_DELTA`:
ícono `scale`, title «Vas en la dirección de tu objetivo» · msg «{|delta|} kg en las últimas
semanas, paso a paso y sin afán. Así se hace.» (formatear con 1 decimal). **Si va en dirección
contraria: SILENCIO TOTAL** (esa conversación es del coach humano, no de una tarjeta — límite
de producto, dejar comentario-candado en el código).

**d) Hardening del récord (observación §13):** en el msg de `record`, usar
`(bestPr.val != null ? bestPr.val : bestPr.kg)` (paridad con `isBetterPR`). Test con un PR
forma-legacy (`{kg:100, date:reciente}` sin `val`) → el msg dice «100 kg», no «undefined».

**Prioridad FINAL (orden §4 del plan):**
`inactivo > deload > record > racha > estancado > adaptacion > peso > agua`.

**Tests estipulados (batería por señal, patrón `ciDay`/`ciEx` existente):**
- deload: 4 semanas cumplidas → dispara (premium); 3 → no; `isFree:true` → no; con deload Y
  racha activas → gana deload.
- agua: 4 días registrados con 0-1 cumplidos → dispara; 2 registrados → NO (no usa la feature);
  todos cumplidos → no; hoy con n=0 NO cuenta como día registrado ni fallado.
- peso: goal «perder grasa» con −1.2kg en 3 registros → dispara con «1.2 kg»; +1.2kg (dirección
  contraria) → **null/otra señal, JAMÁS mensaje negativo**; goal «recomposición» → no; 2
  registros → no; sin `opts.bw` → no.
- record legacy: PR `{kg:100}` sin `val` reciente → msg con «100».
- prioridad: deload+record simultáneos → deload; peso+agua → peso.

### F2 — UI del asesorado: cablear las señales nuevas — commit 2

- [x] mute days (deload:21,peso:5,agua:3) · [x] bw/waterGoal pasados (guard `_waterGoalFor`) · [x] harness +4 checks (G/H/I/J) + tour silenciado antes del 1er shot · [x] visual ambos temas (overlay deload/agua)

En `renderCoachCard` (app-4): agregar a `_INSIGHT_MUTE_DAYS` → `deload:21` (un mesociclo;
si no, reaparece cada semana al que nunca para), `peso:5`, `agua:3`. Pasar
`bw:(DB.bodyweight&&DB.bodyweight[cid])||[]` y `waterGoal:(typeof _waterGoalFor==='function'?
_waterGoalFor(client):undefined)` en opts (guard typeof — `_waterGoalFor` vive en app-5).
`_coachMuteMap` itera `Object.keys(_INSIGHT_MUTE_DAYS)` → cubre los nuevos solo con la
entrada. Harness `_verify-coach.mjs`: +4 checks (deload premium/free, agua dispara con
fixture de hábitos, peso positivo dispara / contrario NO, prioridad deload>record) + aplicar
la regla 6 (tour silenciado ANTES del primer shot) + shots de deload y agua en ambos temas.

### F3 — EL PULSO DEL COACH (coach-para-el-coach) — commit 3

- [x] `coachPulse` core + tests (4 nuevos, suite 332→336) · [x] tarjeta `#h-pulse` en home · [x] harness `_verify-pulse.mjs` (6/6) · [x] visual

> **Decisión de Opus (permitida por el plan):** el harness va en `_verify-pulse.mjs` SEPARADO
> (no dentro de `_verify-coach.mjs`) porque el pulso es del COACH y usa el patrón de login-coach
> de `_shot-coach` (inyecta clientes + `CUR.loggedAs='coach'` sin login real), incompatible con
> el login-asesorado del harness del coach. Refactor: detectores compartidos `_insRecordOf`/
> `_insStallOf` extraídos; los tests de `coachInsight` pasan SIN modificación (prueba de la
> equivalencia). `PULSE_STREAK_WEEKS=3` (racha del coach más exigente); deload reusa `INSIGHT_DELOAD_WEEKS`.

**Qué NO es:** el home del coach YA grita lo negativo (banner 💤 de adherencia = inactividad,
banner de vencimientos = pagos, prioritarios). El pulso es lo que HOY no ve: **motivos
positivos/técnicos para escribirle a cada asesorado** — récords, rachas, estancamientos,
candidatos a descarga. NO duplicar inactividad (candado: `inactivo` EXCLUIDO del pulso).

**Core (avi-core, pura):** `coachPulse(clients, history, prs, now, opts)` →
array de hasta **5** `{id, name, type, label}`. Por asesorado NO suspendido evalúa:
- `record`: PR ≤48h → «🏆 Rompió récord en {ejercicio}» (label CON el dato).
- `estancado`: mismo criterio kg/6-puntos → «Se estancó en {ejercicio}».
- `deload`: `weeks >= 4` → «Lleva {weeks} semanas a tope — ¿descarga?».
- `racha`: `weeks >= 3` (más exigente que el lado del asesorado: al coach solo lo notable) →
  «{weeks} semanas cumpliendo su plan».
Un solo item por asesorado (el de mayor prioridad). Orden del array (DETERMINISTA — el poll de
15s del coach re-renderiza, gotcha §3.3 metodología): prioridad de tipo
`record > estancado > deload > racha`, luego **nombre asc** como desempate. `opts.muted` =
`{'<cid>_<type>': ts_hasta}` (mismo mecanismo). SIN gating free/premium (el coach ve TODO lo
suyo — el gating es del lado del asesorado). Para no duplicar detección: extraer los
detectores compartidos a helpers puros internos (`_insRecordOf(prs,nowTs)`,
`_insStallOf(sessions)`, etc.) que usan tanto `coachInsight` como `coachPulse` — refactor
QUIRÚRGICO, los tests de F1 y los existentes de coachInsight deben seguir verdes SIN tocarse
(esa es la prueba de que el refactor no cambió semántica).

**Tests:** 3 asesorados con señales mixtas → orden correcto y tope 5; suspendido excluido;
muted por fila respetado; sin datos → `[]`; determinismo (dos llamadas mismos args = mismo
resultado); los tests EXISTENTES de coachInsight pasan sin modificación.

**UI:** contenedor `<div id="h-pulse"></div>` en index.html DESPUÉS de `#h-adherence-banner`
y ANTES de la sección de prioritarios (`#h-list` y su encabezado). Render al final de
`renderHome()` (app-2, ~línea 1529, junto a `ensureCoachPush`): tarjeta `.card` con encabezado
«El pulso de tus asesorados» (ícono `bolt`), filas con patrón EXACTO del banner
"entrenaron hoy" (nombre + label, `border-top:1px solid var(--br)`, tap → `openDetail(cid)`)
+ ✕ por fila (`event.stopPropagation()`, ≥36px táctil, `aria-label`) que silencia
`coachpulse_<cid>_<type>` por **3 días** y re-renderiza. Sin filas → `display:none` (sin
tarjeta vacía). `esc()` en nombre y label (¡el nombre del ejercicio viaja en el label!).
Guard `typeof coachPulse==='function'`.

**Harness:** nuevos checks en `_verify-coach.mjs` (o `_verify-pulse.mjs` si queda más limpio;
decisión de Opus, documentada): loguear como COACH QA (patrón `_shot-coach.mjs`, creds
`~/.avi/qa-accounts.txt`), inyectar 3 clientes fake con señales, congelar poll, afirmar orden
+ tap-✕ silencia + XSS-probe en nombre de ejercicio del label + shot ambos temas.

### Cierre de Fase 3 — ✅ EJECUTADO (Opus, 2026-07-15)
1. [x] Suite **336/336** · `_guiado-suite` 53/53 · `_test-coach-back` 20/20 · `_verify-coach`
   12/12 · `_verify-modals` 12/12 · `_verify-news` verde (sin cambios) · `_verify-pulse` 6/6 · cero jsErrors.
2. [x] **SIN entrada AVI_NEWS** (cumplido — la news v352 ya lo anunció; el pulso es del coach).
3. [x] Deploy `9f2763a` `?v=353`/`avi-v353` (bump python SIN BOM, 3 primeros bytes verificados) →
   push → curl (v353 + `#h-pulse` servidos) → `_prodcheck.mjs 353` ✅ (arranca limpio, cero jsErrors).
4. [x] Bitácora parte 58 · CLAUDE.md (backlog `[~]`, `coachPulse`/8 señales en funciones clave,
   footer v353/suite 336) · checkboxes marcados · memoria de sesión.

**Commits:** F0 `806f9da` · F1 `417795f` · F2 `28aa462` · F3 `2e91293` · deploy `9f2763a`.
**Queda la VERIFICACIÓN de Fable (§15).**

## 15. 🔍 Verificación de Fable (post-Opus, Fase 3)
El protocolo es el MISMO de §12 con línea base `3ba343c` y v353, más estos puntos específicos:
- El pulso NO muestra inactividad (duplicaría el banner 💤) y su orden es determinista bajo
  el poll (correr `renderHome()` dos veces seguidas en el harness = mismo DOM).
- La señal de peso JAMÁS emite mensaje en dirección contraria (revisar el código Y un test).
- Los tests EXISTENTES de `coachInsight` (v352) pasan SIN modificación (prueba del refactor).
- Sabotaje de ≥2 tests nuevos (patrón §12.4: umbral + texto de seguridad/candado).
- `#pr-banners` → grep 0 referencias tras F0.

## 16. Desviaciones de la Fase 3
*(la sesión que ejecuta documenta aquí; Fable agrega el veredicto)*

### ✅ VEREDICTO DE FABLE (verificación §15 EJECUTADA, 2026-07-15) — APROBADO

1. **Diff completo leído** (`95fea06..a69f0ba`, commit por commit): archivos = exactamente los
   estipulados por bloque; cero scope creep. Señales, umbrales, candados y textos calcan §14.
2. **Re-corrido por Fable:** suite **336/336** · `_verify-pulse.mjs` 6/6 · `_verify-coach.mjs`
   12/12 · `_guiado-suite` TODO OK · `_test-coach-back` TODO OK · `_verify-modals` 12/12 ·
   `_verify-news` TODO OK · cero jsErrors. Shots re-mirados a ojo (pulso claro/oscuro, deload,
   agua claro/oscuro): premium, tokens correctos.
3. **Greps limpios:** `pr-banners` 0 refs activas (F0 cumplido) · 5× `esc(` en `renderPulse`
   (nombre Y label, el nombre de ejercicio viaja ahí) · `coachpulse_`/`coachmute_` fuera de
   SB_KEYS y claves de sesión · 13 constantes `INSIGHT_*`/`PULSE_*` nombradas ·
   `transition:all` 0 · secretos 0.
4. **Puntos específicos §15, todos verificados:**
   - Pulso SIN `'inactivo'` en el cuerpo de `coachPulse` (grep 0) — no duplica el banner 💤.
   - Determinismo bajo doble `renderHome()` → mismo DOM (check P3 del harness, re-corrido).
   - Peso JAMÁS en dirección contraria: código leído (el `good` exige dirección coincidente
     con el objetivo) + test + sabotaje (ver 5).
   - Tests v352 de `coachInsight` SIN modificación: el diff de avi.test.js es **100% aditivo**
     (0 líneas eliminadas/cambiadas) — prueba formal de que el refactor de detectores
     compartidos preservó la semántica.
5. **Anti-test-decorativo (sabotaje de Fable, con árbol LIMPIO):** rompí el candado de
   dirección del peso Y la exclusión de suspendidos + orden del pulso → **2 tests fallaron**
   (334/336); restaurado → 336/336. Los tests muerden.
6. **Prod re-verificada:** curl v353 + `#h-pulse` servido + el div `#pr-banners` YA NO está en
   el HTML servido + sw.js arranca con `const` (sin BOM) + `_prodcheck.mjs 353` verde.
7. **Tono:** deload empuja a hablar con el coach (no prescribe), agua anima sin regañar, peso
   solo celebra, el pulso le habla al coach en su idioma. Voz AVI correcta.

**Desviaciones:** la única fue una OPCIÓN contemplada en el plan (harness del pulso en
`_verify-pulse.mjs` separado, documentada por Opus con su porqué — patrón de inyección de
`_shot-coach`, incompatible con el login-asesorado del otro harness). Bien resuelta.

**Gotcha de PROCESO anotado (para futuros ciclos):** durante la ejecución, un
`git checkout -- <archivo>` usado para deshacer un sabotaje de prueba BORRÓ trabajo aún no
commiteado del mismo archivo (Opus lo detectó por los tests y lo re-aplicó). Regla desde ya:
**sabotajes anti-test-decorativo SOLO con el árbol limpio** (todo commiteado) — así el
checkout restaura exactamente al estado bueno. Fable lo cumplió en esta verificación.

**Observación menor (no bloquea):** `coachPulse` corre en cada `renderHome()` (poll de 15s del
coach) y llama `computeExerciseProgress` por asesorado. A la escala actual es trivial; si el
panel llega a 100+ asesorados, memoizar por sesión. Anotado, sin acción hoy.

**Ciclo planificar → ejecutar → verificar CERRADO. Coach Inteligente Fases 1+2+3 APROBADAS
en producción (avi-v353).** Restan como futuro opcional: capa LLM y push (adopción).

---

## 17. 📋 PLAN DE EJECUCIÓN ESTIPULADO — FASE 4: PLAN DE CHOQUE (Opus ejecuta, Fable verifica)

> **Feedback de Camilo (2026-07-15, tras probar v353):** *"ya vi el pulso pero no es nada
> especial — me dice 'Astrid se estancó en jalón al pecho', le doy clic y me manda al perfil,
> nada especial. Bien que me diga los estancamientos, pero necesito MÁS de un coach
> inteligente: si ya encontró un estancamiento, que proponga al asesorado o a mí un PLAN DE
> CHOQUE."* Tiene razón: detectar sin proponer es medio producto. La promesa completa es
> **detección → propuesta concreta → acción en UN toque.**
>
> **Decisión de diseño (Fable):** la propuesta va AL COACH, no directo al asesorado — la regla
> innegociable del generador aplica igual (AVI propone, el coach SIEMPRE aprueba antes de tocar
> la rutina; prescribir directo saltaría los guardas de dolor/limitaciones y la autoridad del
> coach). El asesorado lo SIENTE cuando su rutina cambia y le llega el mensaje de su coach.
> Consistente: `estancado` es señal premium → siempre hay coach humano en el circuito.

### Línea base (2026-07-15, tras la verificación de Fase 3)
- Prod: **avi-v353** · HEAD `e0dd00a` · Suite **336/336** · `_verify-pulse` 6/6 · `_verify-coach` 12/12.

### 🛡️ Reglas obligatorias (las de §14, TODAS, más:)
1. **Sabotajes anti-test-decorativo SOLO con el árbol limpio** (gotcha de proceso §16).
2. Los MENSAJES prellenados para el asesorado van en **voz del COACH** (los envía Camilo desde
   SU chat, editables SIEMPRE antes de enviar) — NO en voz AVI (esa es de las tarjetas).
3. NADA se aplica ni se envía sin un tap explícito del coach. Cero automatismos hacia el asesorado.

---

### G1 — Core: `shockPlan` + `applyShockOption` (avi-core, puras) — commit 1 (con tests)

- [x] `shockPlan` · [x] `applyShockOption` · [x] seguridad dolor/limitaciones · [x] tests · [x] verificado
      (commit `b8b38e8`; suite 336→**352/352**; sabotaje de los 2 candados con árbol limpio → 3
      tests 🔒 mordieron → restaurado verde. Desviación menor: el msg de `variante` estipulado no
      llevaba el kg, pero el test estipulado exige «msg contiene nombre y kg» → se corrigió el
      MENSAJE, no el test; ahora dice «lleva rato clavado en {kg} kg».)

**`shockPlan(client, exName, sessions, lib, now)`** → `null` si `_insStallOf(sessions)` no
detecta estancamiento en ESE ejercicio, o:

```js
{ ex: {name, muscle},                         // del progreso (computeExerciseProgress)
  analysis: {bestKg, flatPoints, sinceStr},   // peso plantado, nº de puntos planos
  warnings: [...],                            // strings para el coach (dolor/limitación)
  options: [{id, title, desc, msg, apply}] }  // 2-3 según seguridad
```

**Las 3 opciones (protocolos estándar de periodización; constantes ajustables por Camilo):**
- **`remonta` «Descarga y remonta» (SIEMPRE presente, la recomendada).** desc: «2 semanas con
  ~10% menos peso a 12 repeticiones con técnica perfecta; en la semana 3 vuelve a su peso y lo
  supera.» `apply:{reps:SHOCK_REMONTA_REPS}` (=12). msg prellenado (voz coach): «{nombre}, vi
  que el {ex} se te plantó en {kg} kg. Vamos a destrabarlo: estas 2 semanas baja el peso ~10% y
  hazlo a 12 repeticiones con técnica perfecta. En la semana 3 volvemos por ese récord 💪»
- **`pesado` «Bloque de fuerza 5×5» (EXCLUIDA si hay dolor activo).** desc: «3 semanas de 5
  series × 5 repeticiones con más carga y descansos largos — un estímulo distinto rompe la
  meseta.» `apply:{sets:SHOCK_PESADO_SETS, reps:SHOCK_PESADO_REPS, restSecDelta:SHOCK_PESADO_REST_PLUS}`
  (=5, 5, +30). msg análogo.
- **`variante` «Rota a una variante» (si hay candidata segura).** Candidatas del catálogo `lib`:
  mismo `muscle`, nombre distinto, **gate por nivel** (`exLevelRank` ≤ nivel del cliente,
  patrón `_levelGate`), **excluyendo** las que matcheen `GEN_ZONE_EXCL[zona]` para las zonas de
  `parseLimitations(client.notes).keys` Y las zonas con dolor activo (`painCareActive`).
  Elegir DETERMINISTA (primera candidata en el orden del catálogo). `apply:{swapTo:exId}`.
  desc y msg con el nombre de la variante («rotemos {ex} por {variante} unas 3-4 semanas»).

**Warnings (para la tarjeta del coach):** dolor activo → «🤕 Reportó dolor hace poco — revisa
su estado antes de subir cargas» (y `pesado` NO se ofrece); `parseLimitations.detected` →
«Tiene una limitación anotada ({zonas}) — confirma que la opción no la comprometa».

**`applyShockOption(routines, exName, option, lib)`** → PURA, devuelve **copia nueva** del
array de rutinas con la opción aplicada a **TODAS las entradas** cuyo `name === exName` (el
mismo criterio de agrupación del estancamiento): `remonta`/`pesado` ajustan `reps`/`sets`/
`restSec` de la entrada; `variante` hace swap de `id/name/muscle/type/track/icon/desc/imgUrl`
desde `lib` **CONSERVANDO** `sets`/`reps` de la entrada. No muta los argumentos.

**Constantes:** `SHOCK_REMONTA_REPS=12` · `SHOCK_PESADO_SETS=5` · `SHOCK_PESADO_REPS=5` ·
`SHOCK_PESADO_REST_PLUS=30` · `SHOCK_MUTE_DAYS=21`.

**Tests estipulados:** sin estancamiento → null · con estancamiento → `remonta` siempre y
análisis con el kg correcto · dolor activo → SIN `pesado` + warning · limitación lumbar →
variantes con «peso muerto/remo con barra/…» EXCLUIDAS · sin candidata de nivel → sin opción
`variante` · swap conserva sets/reps y cambia id/name · `applyShockOption` NO muta el original
· determinismo (mismos args → mismas opciones) · msg contiene nombre y kg (voz coach).

### G2 — UI coach: tarjeta en `p-detail` + integración con el pulso — commit 2 (con harness)

- [x] tarjeta `#d-shock` · [x] aplicar 1-toque · [x] chat prellenado · [x] pulso→detalle enfocado · [x] harness · [x] visual
      (commit `b449ea5`; `_verify-shock.mjs` **23/23** S1-S9, cero jsErrors; shots ambos temas
      mirados a ojo. Añadido no estipulado (mínimo, cohesión Grupo B): el ✍️ del botón
      «Escribirle» va como SVG `_coIco('pencil')`, no emoji.)

**Tarjeta `#d-shock`** (div nuevo en index.html dentro de `#p-detail`, tras la cabecera y antes
de Membresía — visible sin scroll): se pinta desde `openDetail` (app-3:~1040) si
`shockPlan(...)` devuelve algo Y no está silenciado (`shockmute_<cid>_<exNorm>` en localStorage,
21 días tras aplicar o descartar; LOCAL, NO SB_KEYS). Contenido: encabezado «⚡ Plan de choque —
{ex}» + análisis («plantado en {kg} kg hace {n} sesiones») + warnings + las opciones, cada una
con su desc y botón **«Aplicar»** (≥36px) + botón global **«✍️ Escribirle»** + **«Descartar»**.
- **Aplicar** → `applyShockOption` → `c.routines=resultado` → `sv('ax_c')` → toast «Plan
  aplicado a la rutina de {nombre}» → abre `openCoachChat(cid)` con `#cchat-in` PRELLENADO con
  `option.msg` (el coach lo edita y lo envía él mismo — NADA se envía solo) → mute 21 días.
- **Escribirle** (sin aplicar) → chat prellenado con el msg de la opción recomendada.
- **Descartar** → mute 21 días + la tarjeta desaparece.
- `esc()` en TODO (ex/cliente/variante van a innerHTML y a onclick). Tokens, ambos temas, sin
  animación nueva.

**Pulso:** la fila `estancado` conserva su tap→`openDetail`; ANTES del open, setear un foco
(`window._shockFocus=cid` o mecanismo equivalente mínimo) para que el detalle haga
`scrollIntoView` suave de `#d-shock` al llegar. No tocar el ✕ ni el orden del pulso.

**Harness `_verify-shock.mjs`** (patrón inyección de `_shot-coach`, sin login real; DB en
memoria — el sello v298 protege la nube): fixture «Astrid» estancada en «Jalón al Pecho»
(6 puntos planos) → S1 tarjeta aparece con análisis y 3 opciones · S2 con `painCare` activo →
2 opciones (sin 5×5) + warning · S3 «Aplicar» 5×5 → TODAS las entradas de ese nombre quedan
sets=5/reps=5/restSec+30 y el original NO mutó · S4 variante → swap conserva sets/reps · S5
chat abierto con `#cchat-in` prellenado (editable, no enviado) · S6 «Descartar» → mute y no
reaparece en re-open · S7 XSS-probe en nombre de ejercicio/variante · S8 render determinista ·
shots ambos temas mirados a ojo. Regla 6 (tour silenciado ANTES del primer shot).

**Asesorado: SIN cambios.** Su tarjeta `estancado` ya existe y su plan le llega por el canal
correcto: la rutina actualizada + el mensaje de su coach. **SIN AVI_NEWS** (cara del coach).

### Cierre de Fase 4
1. [x] Suite **352/352** · `_verify-shock` verde · `_verify-pulse` 6/6 · `_test-coach-back`
   20/20 · `_verify-coach` 12/12 · `_guiado-suite` 53/53 (cinturón: avi-core cambia) ·
   `_verify-modals` 12/12.
2. [x] Deploy único `?v=354` + `avi-v354` (bump python SIN BOM, bytes verificados) → push →
   curl → `_prodcheck.mjs 354`.
3. [x] Bitácora (parte 59) · CLAUDE.md (funciones clave `shockPlan`/`applyShockOption`, footer)
   · checkboxes de este §17 · memoria de sesión.

## 18. 🔍 Verificación de Fable (post-Opus, Fase 4)
Protocolo §12 con línea base `e0dd00a` y v354, más:
- **Nada llega al asesorado sin tap del coach**: revisar el código — cero `sendCoachMsg`/
  `pushToClient`/`sv` automáticos desde la detección; el chat solo se PRELLENA.
- Dolor activo NUNCA ofrece `pesado` (código + test + sabotaje del candado).
- `applyShockOption` es pura (test de no-mutación) y el swap respeta nivel/limitaciones.
- Los tests v353 (coachInsight/coachPulse) pasan SIN modificación.
- Sabotaje de ≥2 candados nuevos (dolor-filtra-pesado; exclusión por limitación) con árbol limpio.

## 19. Desviaciones de la Fase 4 y VEREDICTO

### Desviaciones documentadas por la ejecución (Opus)
1. **Msg de `variante` corregido contra lo estipulado** — el texto de §17 no llevaba el kg, pero
   el test estipulado exige «msg contiene nombre y kg». Se corrigió el MENSAJE, no el test
   (ahora dice «lleva rato clavado en {kg} kg»). → **ACEPTADA**: es la dirección correcta; un
   test estipulado manda sobre un copy estipulado, y el mensaje quedó mejor.
2. **✍️ del botón «Escribirle» → SVG `_coIco('pencil')`** (no estipulado). → **ACEPTADA**: 1
   línea, aplica la regla de cohesión de los Grupos B (v337-v343); no es scope creep material.
3. **Pulso→detalle con `_pulseGo`+`setTimeout(120)`** en vez de `window._shockFocus`. →
   **ACEPTADA**: §17 permitía «mecanismo equivalente mínimo»; verificado con CLICK real (abajo).

### Verificación de Fable (2026-07-15, protocolo §18, base `e0dd00a` → v354 `ccfa97b`)
- [x] **Diff completo revisado** (11 archivos, 799+/29−): core solo borra el cuerpo de
  `_insStallOf` (refactor estipulado, predicado idéntico + guard `!e`); index.html solo
  `#d-shock` + bump; sw.js solo CACHE; sin scope creep.
- [x] **`avi.test.js` 100% ADITIVO** (0 líneas previas tocadas) = los tests v352/v353 de
  coachInsight/coachPulse pasan SIN modificación — prueba formal del refactor.
- [x] **Candado «nada llega al asesorado sin tap»** verificado en el CÓDIGO: `renderShockCard`
  (la detección) no contiene `sv`/`sendCoachMsg`/`pushToClient`; `sv('ax_c')` vive SOLO dentro
  de `applyShock` (handler de tap); `_shockChat` solo asigna `ta.value` (prellenar) y jamás
  envía. Y en el HARNESS: S4b = 0 mensajes en la conversación tras Aplicar.
- [x] **Sabotajes con árbol LIMPIO, ejecutados por Fable (no reusé los de Opus):**
  (1) `if(true||!hasPain)` → el test 🔒 del dolor mordió; (2) quitar la exclusión de
  `GEN_ZONE_EXCL` → los 2 tests 🔒 de limitación/dolor-de-zona mordieron; (3) sabotaje PROPIO
  adicional a la pureza (`rt = r` en vez de copia) → el test de no-mutación mordió. 4 tests
  distintos muerden, restaurado verde (352/352).
- [x] **Harnesses re-corridos por Fable:** suite 352/352 · `_verify-shock` 23/23 ·
  `_verify-pulse` 6/6 · cero jsErrors.
- [x] **Brecha de verificación CAZADA y CERRADA:** el checkbox «pulso→detalle enfocado» estaba
  marcado pero ningún harness lo ejercitaba con un click real (solo el check estático del hook).
  Check one-off de Fable: click REAL en la fila `estancado` del pulso → `p-detail` activo +
  `#d-shock` visible + ficha de Astrid + cero jsErrors → **PULSEGO OK**.
- [x] **Greps limpios:** `shockmute_` fuera de SB_KEYS · `esc()`×6 en la tarjeta · onclick por
  índice (ningún dato de usuario en atributos) · `_levelGate(client.level||'Principiante')` =
  default al nivel MÁS restrictivo (seguridad por defecto).
- [x] **Prod re-verificada por Fable:** bytes sin BOM en index.html y sw.js (`<!D`/`con`) ·
  curl sirve `?v=354` · `_prodcheck.mjs 354` verde re-corrido.
- [x] **Tono:** los msgs van en voz del coach, cálidos y sin jerga («Vamos a destrabarlo»,
  «volvemos por ese récord 💪»); los warnings del coach son claros y accionables.

**Observaciones menores (no bloquean, para el radar):**
- `renderShockCard` propone solo el PRIMER ejercicio estancado; si el coach lo descarta y hay un
  SEGUNDO estancado, no se propone hasta que venza el mute (21d). Coincide con lo estipulado;
  si en la práctica molesta, iterar los estancados no muteados es un cambio de 3 líneas.
- Si el coach descartó el plan (shockmute) pero la fila del pulso sigue viva (coachpulse es un
  mute aparte, 3d), el tap aterriza en el tope de la ficha sin scroll — inofensivo por el guard.

### 🟢 VEREDICTO: FASE 4 APROBADA — ciclo planificar→ejecutar→verificar CERRADO (3º consecutivo).

**Validación del PO (2026-07-15):** Camilo probó el plan de choque en su celular y aprobó los
métodos propuestos ante estancamiento. Fase 4 validada en dispositivo real.

## 20. 📋 FASE 4.1 ESTIPULADA — MÚLTIPLES ESTANCAMIENTOS (Opus ejecuta, Fable verifica con §21)

**Origen (decisión de PRODUCTO de Camilo, 2026-07-15, con el criterio del coach profesional):**
hoy solo se propone el PRIMER ejercicio estancado. Camilo preguntó y la fisiología responde:
- **2+ estancados del MISMO músculo** = un solo problema con dos síntomas (estímulo repetido/
  recuperación) → se ataca UNO primero (el más plantado); el otro suele destrabarse de rebote.
  Dos 5×5 sobre el mismo músculo la misma semana = sobrecarga; y no sabrías qué funcionó.
- **Estancados de músculos DISTINTOS** (glúteo + espalda) = sistemas con recuperación casi
  independiente → se trabajan EN PARALELO; hacer esperar 21 días al segundo no tiene sustento.
- **3+ estancados a la vez** = eso ya NO es por-ejercicio, es FATIGA SISTÉMICA (o vida: sueño/
  comida/estrés) → la respuesta correcta es UNA SEMANA DE DESCARGA global, no N planes de choque
  (tratar síntomas ignorando la enfermedad).

### H1 — Core: selector puro `shockTargets` (avi-core) — commit 1 (con tests)

- [x] `shockTargets` · [x] agrupación por músculo · [x] modo global · [x] tests · [x] verificado (940a974)

**`shockTargets(sessions)`** → función PURA (sin `now`: solo agrupa lo que `_isStalledEx` ya
detecta), devuelve:
```js
null                                              // 0 estancados
{ mode:'global', count, names:[...] }             // ≥ SHOCK_GLOBAL_MIN (=3) estancados
{ mode:'multi', targets:[ {name, muscle, also:[...]}, ... ] }  // 1-2 músculos
```
Reglas: estancados = TODAS las entradas de `computeExerciseProgress` que pasan `_isStalledEx`
(hoy solo se toma la primera). Si ≥3 → modo `global`. Si no: agrupar por `muscle`; por músculo
gana la entrada con MÁS puntos planos (`flatPoints` — el cálculo de `shockPlan` se extrae a un
helper puro `_flatPointsOf(e)` para no duplicarlo; desempate por nombre asc = determinista);
las hermanas del mismo músculo van en `also` (para la nota «X también se plantó — destrabemos
este primero»). Máximo 2 targets (si hubiera 2 músculos ya cubre el caso real; 3 músculos ≠
global solo si son exactamente 2 ejercicios… no: 3 ejercicios estancados = global SIEMPRE,
aunque sean de 3 músculos distintos — el umbral es por Nº de ejercicios). Constantes:
`SHOCK_GLOBAL_MIN=3` · `SHOCK_GLOBAL_MUTE_DAYS=7` (re-chequear antes que los 21d: si está
sistémicamente fundido, una semana después hay que volver a mirar).

**Tests estipulados:** 0 estancados → null · 1 → multi con 1 target sin also · 2 mismo músculo
→ 1 target con also=[el otro] y gana el de MÁS flatPoints · 2 músculos distintos → 2 targets ·
3 estancados (aun de 3 músculos distintos) → global con names · determinismo · `shockPlan` de
cada target sigue funcionando igual (no se toca su firma).

### H2 — UI: tarjeta multi-sección + modo descarga global — commit 2 (harness +checks)

- [x] secciones por target · [x] nota "también se plantó" · [x] tarjeta global→descarga ·
  [x] mutes independientes · [x] harness S10-S13 · [x] visual (dce2860)

`renderShockCard` pasa de `_insStallOf` a `shockTargets`:
- **`multi`:** UNA tarjeta `#d-shock` con una SECCIÓN por target (cada una = análisis + warnings
  + opciones + Aplicar propios, `CUR.shock` pasa a array indexado y los onclick llevan
  `applyShock(t,i)` — SIGUE por índices, nada de datos en atributos). Target con `also` → nota
  «{X} también se plantó — destrabemos este primero» (esc). Mute POR EJERCICIO como hoy
  (`shockmute_<cid>_<exNorm>`): un target muteado se salta SIN ocultar al otro; «Descartar»
  mutea TODOS los targets visibles. Si tras filtrar mutes no queda target → tarjeta oculta.
- **`global`:** la tarjeta NO propone protocolos por ejercicio. Dice «{n} ejercicios plantados
  a la vez ({nombres}) — eso no es un problema de ejercicios, es fatiga acumulada. Lo correcto
  es una semana de descarga.» + botón **«Generar semana de descarga»** → `openGenRutinas()` y
  tras abrir marca `#mg-deload` + `CUR.genDeload=true` + `genWithStyle` re-corre (reusar
  `toggleGenDeload(true)` YA existente, app-3:1404 — cablear mínimo, cero lógica nueva de
  generación) + **«✍️ Escribirle»** (chat prellenado voz coach: «...esta semana bajamos
  revoluciones a propósito: descarga programada, no retroceso») + «Descartar» (mute global
  `shockmute_<cid>__global` 7d). El generador YA tiene el candado del coach (borrador → él
  aprueba) — no se toca.
- Pulso: `_pulseGo` no cambia (aterriza en `#d-shock` igual).
- Harness `_verify-shock.mjs` +4: S10 2 mismo músculo → 1 sección + nota also · S11 2 músculos
  → 2 secciones con Aplicar independientes (aplicar el 1º NO oculta el 2º) · S12 3 estancados →
  tarjeta global SIN botones Aplicar de protocolo y con CTA de descarga; el click abre m-gen
  con `#mg-deload` marcado · S13 mute independiente (mutear target 1 deja visible el 2).
- **SIN AVI_NEWS** (cara del coach). **Candados intactos:** nada al asesorado sin tap; dolor
  jamás ofrece `pesado` (por-target, ya lo hace `shockPlan`).

### Cierre 4.1 — ✅ EJECUTADO (Opus, 2026-07-16)
1. [x] Suite **359/359** (7 nuevos shockTargets) · `_verify-shock` **33/33** (S1-S13) · `_verify-pulse`
   6/6 · `_verify-coach` 12/12 · `_test-coach-back` OK · `_guiado-suite` 53/53 · `_verify-modals` 12/12.
   Sabotajes propios: umbral global (SHOCK_GLOBAL_MIN=99) y ganador por músculo (flatPoints invertido) → ambos muerden.
2. [x] Deploy `?v=355` + `avi-v355` (bump python SIN BOM, bytes `3c2144`/`636f6e`) → push `b00f1e0` →
   curl sirve v355 → `_prodcheck.mjs 355` verde (boot limpio, cero jsErrors).
3. [x] Bitácora (parte 60) · CLAUDE.md · checkboxes §20 · memoria.

**Commits:** H1 `940a974` (core+tests) · H2 `dce2860` (UI+harness) · deploy `b00f1e0` (v355).
**Desviaciones:** ninguna estructural. Añadidos de UI no estipulados textualmente pero coherentes:
nota `also` sobre fondo `--gl`/`--gt` (verde suave), título de tarjeta adaptivo ("Plan"/"Planes de
choque"), "Descartar" → "Descartar todos" cuando hay 2 targets. `_pulseGo` NO se tocó (aterriza en
`#d-shock` igual, sea multi o global). **Pendiente:** verificación de Fable con §21.

## 21. 🔍 Verificación de Fable (post-Opus, Fase 4.1)
Protocolo §18 con base `ffd5d31` y v355, más: sabotaje del umbral global (SHOCK_GLOBAL_MIN=99 →
el test de 3-estancados debe morder) y del ganador por músculo (invertir flatPoints → muerde) ·
verificar con click real que la tarjeta global abre m-gen con deload marcado · tests v354
(shockPlan/applyShockOption) pasan SIN modificación.

## 22. Desviaciones de la Fase 4.1 y VEREDICTO

### Desviaciones documentadas por la ejecución (Opus)
Ninguna estructural (§20 cierre). Añadidos de UI no estipulados textualmente: nota `also` sobre
fondo `--gl`/`--gt`, título adaptivo («Plan»/«Planes de choque»), «Descartar» → «Descartar todos»
con 2 targets. → **ACEPTADAS**: cohesión visual y claridad de copy, no scope creep material.

### Verificación de Fable (2026-07-16, protocolo §21, base `64d99f7` → v355 `5f74e0d`)
- [x] **Diff completo leído** (10 archivos, 400+/72−): avi-core solo suma `_flatPointsOf` +
  `shockTargets` + 2 constantes `SHOCK_GLOBAL_*` y el export; `shockPlan`/`applyShockOption` NO
  cambiaron firma ni lógica (`shockPlan` solo usa el helper para `analysis.flatPoints` — misma
  fórmula extraída, verificado línea a línea); app-3 solo el bloque del plan de choque;
  index.html/sw.js solo bump v355; sin scope creep.
- [x] **`avi.test.js` 100% ADITIVO** (0 líneas previas eliminadas/modificadas, `grep -c '^-[^-]'`
  = 0) → los tests v354 de shockPlan/applyShockOption pasan SIN tocarse.
- [x] **Suite 359/359** re-corrida por Fable.
- [x] **Sabotajes con árbol LIMPIO, ejecutados por Fable (no reusé los de Opus):**
  (a) `SHOCK_GLOBAL_MIN=99` → mordió el test «3 estancados → global» (358/359);
  (b) desempate invertido `_flatPointsOf(a)-_flatPointsOf(b)` → mordió «gana el de MÁS puntos
  planos» (358/359); (c) sabotaje PROPIO adicional: romper el agrupamiento por músculo
  (`const m=''` — todo colapsa a un grupo) → mordieron 2 tests («1 estancado → target con su
  músculo» y «2 músculos distintos → 2 targets»). Restaurado tras cada uno; suite verde
  359/359 y `git status` limpio al final.
- [x] **Harness `_verify-shock.mjs` 33/33, cero jsErrors.** El candado global S12d se ejercita
  con CLICK REAL (leído el código del harness: `querySelector('#d-shock
  button[onclick*="shockDeload"]').click()`) → `m-gen` abierto + `#mg-deload` checked +
  `CUR.genDeload=true`, los tres true.
- [x] **Candado «nada al asesorado sin tap» verificado en el CÓDIGO:** grep sobre el bloque
  completo del plan de choque (app-3:1270-1466) → UN solo `sv(` en todo el bloque, dentro de
  `applyShock` (handler de tap); cero `sendCoachMsg`/`pushToClient`/`fetch`. `_shockChat`/
  `shockWriteGlobal` solo asignan `ta.value`. `shockDeload` NO escribe rutinas: solo abre
  `m-gen` y marca la descarga; `genWithStyle` deja el borrador en `CUR.genDraft` y las rutinas
  SOLO se escriben en `confirmGenRutinas` (tap explícito del coach) — cadena leída completa.
- [x] **Cinturón re-corrido por Fable:** `_verify-pulse` 6/6 · `_verify-coach` 12/12 ·
  `_test-coach-back` OK · `_guiado-suite` 53/53 · `_verify-modals` 12/12 · cero jsErrors en todos.
- [x] **Greps limpios:** `shockmute_` fuera de SB_KEYS (app-1:107) y de `_COACH_SETTINGS_KEYS`
  (app-1:113) · `esc()` en TODO el innerHTML de la tarjeta (nombres, also, warnings, títulos,
  descripciones, names del global) · onclick por ÍNDICE (`applyShock(ti,oi)`/`shockWrite(ti)`,
  ningún dato de usuario en atributos) · constantes `SHOCK_GLOBAL_MIN`/`SHOCK_GLOBAL_MUTE_DAYS`
  nombradas.
- [x] **Prod re-verificada por Fable:** curl con nocache sirve `?v=355` (único) · primeros bytes
  SIN BOM (`<!D` en index.html, `con` en sw.js) · `_prodcheck.mjs 355` verde re-corrido (boot
  limpio, cero jsErrors).
- [x] **Tono:** la nota «X también se plantó — destrabemos este primero», la tarjeta global
  («eso ya no es un problema de un ejercicio: es fatiga acumulada… lo correcto es una semana de
  descarga») y el chat prellenado («bajamos revoluciones a propósito: es una descarga programada
  para recuperar, no un retroceso. Volvemos con todo la próxima 💪») van en voz del coach,
  cálidos y sin jerga. **SIN AVI_NEWS nuevo** (verificado en el diff — solo menciones en docs).

**Observaciones menores (no bloquean, para el radar):**
- `dismissShockGlobal` guarda con `if(!S)return` (sin chequear `mode==='global'` como sus
  hermanas) — inalcanzable en modo equivocado vía UI, pero asimétrico; 1 línea si se quiere pulir.
- `shockDeload` genera el borrador DOS veces (openGenRutinas corre `genWithStyle(def)` sin
  descarga y `toggleGenDeload(true)` regenera con ella) — imperceptible para el coach, cero bug.
- Si `genWithStyle` fallara al abrir (catálogo vacío), `m-gen` no abre pero `shockDeload` marca
  igual el checkbox del modal cerrado — inofensivo (el coach ve el toast de error del generador).
- Los mutes siguen siendo por dispositivo (localStorage, a propósito): el coach en celular + PC
  verá reaparecer una tarjeta descartada en el otro equipo. Conocido desde v354, decisión vigente.

### 🟢 VEREDICTO: FASE 4.1 APROBADA — ciclo planificar→ejecutar→verificar CERRADO (4º consecutivo).


## 23. FASE 4.2 — GATE DE CONSTANCIA (avi-v356, refinamiento de producto de Camilo)

**Origen (caso real, 2026-07-16):** Camilo probó la Fase 4.1 con su asesorada **Astrid**, que tiene
varios estancamientos — pero **por faltas de trabajo, no por fatiga**. Detectó el punto ciego: la
regla «3+ estancados = semana de descarga» asume que la persona viene entrenando duro y parejo
(fatiga de tanto exigir). Para quien se estancó **sub-entrenando**, una descarga es el consejo
EQUIVOCADO (baja aún más el volumen) — necesita **recuperar el ritmo**. Los números se ven iguales;
los separa la constancia reciente. Camilo pidió "hazlo de una vez" → Opus ejecutó directo (no medió
plan de Fable; es un refinamiento acotado sobre lo ya verificado).

**Core (`avi-core`, puro):** `shockTargets(sessions)` → `shockTargets(sessions, client, now)`.
Cuando hay ≥`SHOCK_GLOBAL_MIN` estancados, mide la **cadencia reciente** con el helper puro
`_recentCadence(sessions, now, windowDays)` = días entrenados por semana en los últimos
`SHOCK_CONSISTENCY_DAYS=28`, medidos HASTA `now` (un parón reciente baja la cadencia aunque antes
entrenara seguido → capta «huecos» Y «baja frecuencia» en una cifra, calendario-agnóstico — se
prefirió sobre `weekStreak`, que es por semana Lun-Dom y frágil para tests). Si
`cadencia < planDays(client) * SHOCK_CONSISTENCY_MIN_RATIO(0.7)` → modo nuevo **`rebuild`**
(`{mode:'rebuild',count,names,cadence}`); si no → `global` (descarga). El gate **NO afecta al modo
multi** (1-2 estancados: los planes por-ejercicio siguen válidos). Sin `now` se asume `global`
(contrato base; la UI SIEMPRE pasa `client`+`now`). Sesgo deliberado: el error costoso es
recomendar descarga a quien sub-entrena → se exige evidencia de constancia ANTES de proponerla.

**UI (`app-3`):** rama `rebuild` en `renderShockCard` (usa el mute global 7d) — tarjeta que le dice
al coach «{n} estancados — pero es por constancia: las últimas semanas fueron a saltos, primero
recuperar el ritmo (una descarga ahora bajaría aún más el volumen)». NO ofrece generar descarga ni
protocolos: solo `shockWriteRebuild()` (chat prellenado, voz coach, sin tocar la rutina) + Descartar.

**QA:** 4 tests nuevos (suite 359→**363**; sabotaje del gate muerde el test 🔒 de rebuild) +
harness `_verify-shock` **S14** (3 estancados a saltos → rebuild sin descarga + Escribirle prellena
sin enviar/tocar rutina) y **S12 reforzado** (consistente → global, NO rebuild) → **37/37**. Cinturón
verde (pulso/coach/coach-back/guiado/modales), cero jsErrors. Commits: `a...` core+tests → UI+harness
→ deploy `a31191c` v356 (bump sin BOM) → docs. Prod: curl v356 + `_prodcheck 356` verde. **Disponible
para verificación de Fable si Camilo la pide** (no se auto-lanzó: refinamiento pequeño, no una fase
planificada). Constantes tunables: `SHOCK_CONSISTENCY_DAYS`, `SHOCK_CONSISTENCY_MIN_RATIO`.

## 24. Verificación de Fable — Fase 4.2 (gate de constancia, v356) y VEREDICTO

### Verificación (2026-07-16, base `eefe819` → v356 `842b8c1`)
- [x] **Diff completo leído** (10 archivos, 207+/36−): avi-core solo suma `_recentCadence` + 2
  constantes `SHOCK_CONSISTENCY_*` + el gate dentro del branch 3+ de `shockTargets`; app-3 solo la
  rama `rebuild` de `renderShockCard` + `shockWriteRebuild`; index.html/sw.js solo bump v356; sin
  scope creep. **Fase 4.1 intacta:** `shockPlan`/`applyShockOption` sin tocar; `shockTargets` con
  firma nueva pero RETRO-COMPATIBLE — verificado en código (`planDays(client||{})` tolera cliente
  ausente; sin `now` el gate ni se evalúa) y en tests (los de 1 arg de la 4.1 pasan sin tocarse).
- [x] **`avi.test.js` semánticamente ADITIVO:** las únicas 2 líneas previas modificadas son el
  helper `stHist` ganando `spacingDays = 3` como DEFAULT (= el spacing que antes estaba hardcodeado
  → historiales idénticos para los tests viejos); cero asserts previos tocados. 4 tests nuevos.
- [x] **Suite 363/363** re-corrida por Fable (antes y después de cada sabotaje).
- [x] **Sabotajes con árbol LIMPIO, ejecutados por Fable (no reusé el de Opus):**
  (a) gate neutralizado (`if(false && cadence < …)`) → mordió el test 🔒 «a saltos → rebuild»
  (362/363); (b) sentido del umbral invertido (`<` → `>`) → mordieron los DOS tests del gate
  («parejo → global» y 🔒 «a saltos → rebuild», 361/363); (c) sabotaje PROPIO: `_recentCadence`
  devolviendo siempre 99 («todo el mundo entrena parejo») → mordió el test 🔒 (362/363).
  Restaurado tras cada uno; suite 363/363 y `git status` limpio al final.
- [x] **Sondeo adicional de Fable (c2, NO mordió — va al radar):** romper la propiedad «medido
  HASTA now» (span entre primera y última sesión en vez de hasta `now`) deja la suite en 363/363 —
  ningún test protege el caso del PARÓN reciente, precisamente la semántica que distingue esta
  medida. El código actual la tiene BIEN (verificado a mano, abajo); el candado que falta es
  del test, no del producto.
- [x] **Harness `_verify-shock.mjs` 37/37, cero jsErrors.** S12: consistente (spacing 3) → global
  con assert explícito `rebuild===false` + click real abre `m-gen` con deload marcado. S14: a
  saltos (spacing 8) → `rebuild` con `opts===0 && deload===false` (ni protocolos ni descarga) y
  S14d Escribirle prellena 312 chars con 0 mensajes enviados y rutina intacta. **Fixture honesto**
  (leído el código): `multiFixture(specs, spacingDays)` construye FECHAS reales espaciadas y 3
  rutinas con día (→ `planDays=3`, bar 2.1); la cadencia la calcula la app sola — spacing 3 da
  ~2.8 (≥2.1 → global) y spacing 8 da ~1.2 (<2.1 → rebuild) por aritmética, no por stub.
- [x] **La MEDIDA verificada a mano** (script node contra avi-core real, 6 escenarios):
  (i) **parón reciente** — entrenó parejo hace 4→3 semanas y luego NADA → cadence 1.3 → `rebuild`
  ✓ (el span corre `days[0]→now`, así que los 21 días vacíos pesan); historial 100% >28d →
  cadence 0 → `rebuild` ✓; (ii) el gate **NO toca multi**: 2 estancados a saltos → `multi` ✓;
  (iii) **sesgo hacia rebuild ante la duda** confirmado: span redondeado hacia arriba (día-cero →
  timestamp exacto de now) y bar relativo al PLAN — plan de 6 días entrenando 4/sem PAREJO →
  `rebuild` (documentado abajo como sesgo asumido, no bug). Grindeando cada 3 días → `global` ✓.
- [x] **Candados intactos (código app-3):** la rama `rebuild` no contiene `sv(`/`sendCoachMsg`/
  `pushToClient` (grep sobre el diff = vacío); `shockWriteRebuild` → `_shockChat` que SOLO asigna
  `ta.value` (leída la función: `openCoachChat` + prellenar + focus, sin envío); el modo `rebuild`
  no ofrece generar descarga ni protocolos (S14b lo pinna con `deload===false && opts===0`);
  `esc(tg.names.join(', '))` en el único dato de usuario del innerHTML; respeta el mute global 7d
  (`_shockGlobalMuted` al entrar a la rama).
- [x] **Cinturón re-corrido por Fable:** `_verify-pulse` 6/6 · `_verify-coach` TODO OK ·
  `_test-coach-back` OK · `_guiado-suite` TODO OK · `_verify-modals` 12/12 · cero jsErrors en todos.
- [x] **Greps limpios:** `SHOCK_CONSISTENCY_DAYS`/`SHOCK_CONSISTENCY_MIN_RATIO` como constantes
  nombradas y usadas en el gate · `_recentCadence` sin DOM/localStorage/`Date.now()` (recibe `now`;
  ver observación del fallback abajo).
- [x] **Prod re-verificada por Fable:** curl con nocache sirve `?v=356` (único) · primeros bytes
  SIN BOM (`<!D` index.html, `con` sw.js) · `_prodcheck.mjs 356` verde (boot limpio, cero jsErrors).
- [x] **Tono:** la tarjeta («llevan rato sin subir, pero las últimas semanas fueron a saltos…
  recuperar el ritmo — una descarga ahora bajaría aún más el volumen») habla AL COACH claro y sin
  culpar; el chat prellenado («No es para preocuparse: lo primero es volver a un ritmo parejo,
  aunque sean sesiones cortas… tu cuerpo vuelve a responder 💪») es cálido, voz del coach, cero
  regaño. **SIN AVI_NEWS nuevo** (el grep del diff solo encuentra menciones en docs).

### Observaciones menores (no bloquean, para el radar)
- **Falta el test 🔒 del parón reciente** (mi sondeo c2): un refactor futuro de `_recentCadence`
  podría cambiar el span a «entre sesiones» sin que nada muerda — y ese refactor convertiría al
  que entrenó parejo y PARÓ en candidato a descarga. 1 test de ~5 líneas lo blinda.
- **Punto ciego «regreso denso tras ausencia»:** los huecos ANTES de la primera sesión dentro de
  la ventana de 28d no pesan (el span arranca en `days[0]`). Asesorado ausente 3 semanas que
  vuelve y entrena sus 3 días la primera semana → cadence 3 ≥ 2.1 → `global` (descarga) cuando lo
  suyo es ritmo. Mitigado por el candado humano (el coach aprueba y CONOCE la ausencia) y el mute
  de 7d; si molesta en la práctica, anclar el arranque del span a `max(cutoff, primera sesión
  histórica)` lo corrige sin tocar los tests actuales.
- **El bar es relativo al PLAN, no absoluto:** con planes ambiciosos (6d) un asesorado que entrena
  4/sem parejo cae en `rebuild` aunque pueda traer fatiga real. Es el sesgo deliberado (§23) y el
  lado barato del error, pero Camilo debe saber que a más días de plan, más «rebuild» verá.
- `_recentCadence` trae fallback `new Date()` si `now` es null — hoy INALCANZABLE desde
  `shockTargets` (guard `now != null` antes de llamar), pero contradice la firma «recibe now»;
  quitar el fallback es 1 línea si se quiere pureza estricta.
- La tarjeta `rebuild` no muestra la CIFRA de cadencia que el motor ya calcula (`tg.cadence`,
  p. ej. «viene entrenando ~1.2 días/sem de 3 planeados») — dato que le daría al coach el «por
  qué» en un vistazo. Nice-to-have de producto, no defecto.

### 🟢 VEREDICTO: FASE 4.2 APROBADA — los 3 sabotajes mordieron, la medida separa fatiga de
faltas en los casos nucleares (parón reciente incluido, verificado a mano), candados y cinturón
intactos, prod v356 verde. Ciclo de verificación CERRADO (5º consecutivo).

## 25. Verificación de Fable — SESIÓN I (adherencia de agua en la ficha del coach, v361) y VEREDICTO

> La Sesión I vive en `docs/plan-sesiones.md` (plan de acción 2026-07-16); el veredicto se
> documenta aquí por continuidad del ciclo «Fable estipula → Opus ejecuta → Fable verifica»
> (6º consecutivo).

### Verificación (2026-07-16, base v360 `0421b83` → v361 `d128ba7`)
- [x] **Árbol limpio + 4 commits presentes** (`30daefc` core · `8da58e0` UI · `08eff87` deploy ·
  `d128ba7` docs). Deploy = bump PURO ?v=361/CACHE avi-v361 (leído el diff completo); docs solo
  bitácora 66 + plan-sesiones. **Sin scope creep** en ningún commit (I1 = 2 helpers + exports +
  5 tests + baseline 381; I2 = `renderCoachHabitsCard` + 1 div en index + 2 llamadas en
  `openDetail` + fixture del harness).
- [x] **Réplica `waterGoalFor` FIEL al original** — comparada línea por línea contra
  `_waterGoalFor` (app-5-salud.js:917-921): mismo `parseInt(nut.water)`, mismo umbral `>0`,
  mismo tope `Math.min(30,·)`, mismo fallback `waterGoalGlasses(weight)`. La UI le pasa
  `(DB.nutrition||{})[c.id]` — exactamente la MISMA fuente que lee el original. Única
  diferencia: guard defensivo `client && client.weight` (inofensivo). W7 de `_verify-water`
  confirma que el lado del asesorado sigue leyendo el plan del coach igual.
- [x] **GOTCHA Date-vs-timestamp cerrado:** grep de `waterAdherence(` en TODO el repo → la única
  llamada de producción es app-3-coach.js:1413 con `new Date()` (objeto Date, no timestamp).
  Tests y harness también pasan Dates. Ninguna llamada con `Date.now()` quedó viva.
- [x] **Suite 381/381** re-corrida por Fable (antes y después de cada sabotaje).
- [x] **Sabotajes con árbol LIMPIO, ejecutados por Fable (4; tres mordieron en suite):**
  (a) tope de 30 removido en `waterGoalFor` → mordió (380/381); (b) `waterGoalFor` ignorando
  `nut.water` (siempre peso) → mordió (380/381); (c) `met: d.n > 0` (cumple sin llegar a la
  meta) → mordieron 2 tests (379/381); (d) guard de progressive disclosure removido en la UI
  (`if(a.loggedDays===0)return`) → **NO lo cazó NADA**: la suite no cubre UI y el harness solo
  hacía `console.log` sin aserción (EXITCODE=0 con c2 mostrando tarjeta con 0 registros).
  **Brecha REAL de cobertura** → cerrada abajo. Árbol restaurado tras cada sabotaje.
- [x] **Brecha cerrada — el harness ganó DIENTES** (`_shot-coach.mjs detail`, cambio de Fable):
  aserciones duras con `process.exit(1)` — c1 visible (`display:block`), 7 puntos, **exactamente
  4 llenos** (`var(--bl)` sin `transparent` = metDays del fixture), texto «4 de los últimos 7»,
  y c2 sin registro `display:none`. Verde en árbol limpio; re-sabotaje del guard → EXITCODE=1
  (muerde, verificado). Era la línea de defensa que faltaba para la clase «regresión de UI
  silenciosa».
- [x] **UI verificada con RENDER real (no solo programático):** shots claro/oscuro leídos a ojo —
  patrón de puntos `●○○●○●●` coincide 1:1 con el fixture cronológico (8✓·6✗·sin registro✗·8✓·
  4✗·10✓·8✓ con meta 8), texto y meta correctos, tokens visibles en AMBOS temas (lleno `--bl`,
  aro `--br2`), tarjeta bien ubicada entre valoración y rutinas; c2 sin datos → oculta.
- [x] **Cinturón re-corrido por Fable:** `_verify-shock` TODO OK (misma zona `openDetail`) ·
  `_verify-water` 7/7 (lado del asesorado intacto) · `_verify-modals` 12/12 · `_verify-pulse`
  6/6 · `_verify-coach` 12/12 (check F confirma el orden con `cn-habits` presente) ·
  `_guiado-suite` 53/53 · `_test-coach-back` 20/20 TODO OK · cero jsErrors en todos. (1ª
  corrida del guiado dio FATAL por rate-limit del login QA — gotcha conocido; reintento a los
  5 min en verde.)
- [x] **Prod re-verificada por Fable:** `_prodcheck.mjs 361` verde — v361 servida, boot limpio,
  login/core/renderToday true, **cero jsErrors**.
- [x] **Seguridad/datos:** los únicos datos interpolados en el innerHTML nuevo son NÚMEROS
  (`d.n`, `goal`, `metDays` salen de `parseInt`/contadores) — sin `esc()` pendiente. Solo
  lectura verificada por grep del diff: sin `sv(`/`sendCoachMsg`/`pushToClient`/`Date.now`.
  Nada nuevo en SB_KEYS (correcto: `habits` ya viaja en `ax_c`).

### Observaciones menores (no bloquean, para el radar)
- El comentario de `waterAdherence` dice que una meta inválida «se cae al default por peso»,
  pero llama `waterGoalGlasses()` SIN peso → siempre 8. Inalcanzable desde la UI (la meta llega
  de `waterGoalFor`, siempre ≥6); precisión de comentario, no bug.
- El fixture del harness usa fechas RELATIVAS a hoy (`_dk(off)`) — correcto y determinista para
  metDays; si algún día la tarjeta pinta nombres de día, el shot variará según el día de la
  corrida.
- La ficha `p-detail` sigue creciendo (valoración + hidratación + shock + rutinas + chat inline
  + historial + nutrición + medidas) — refuerza el pendiente de backlog de unificar el chat
  inline con el de pantalla completa y, a futuro, repensar el orden de secciones.

### 🟢 VEREDICTO: SESIÓN I APROBADA — 3 sabotajes de suite mordieron; el 4º destapó una brecha
real (guard de UI sin cobertura automatizada) que quedó CERRADA con aserciones en el harness
(verificadas mordiendo); la réplica de `waterGoalFor` es fiel al original línea por línea; el
contrato `Date` está respetado en la única llamada de producción; render real correcto en ambos
temas; cinturón y prod v361 verdes. Ciclo de verificación CERRADO (6º consecutivo).
