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
en producción (avi-v352).** Siguiente: decisión de Camilo sobre cuándo atacar la Fase 3.
