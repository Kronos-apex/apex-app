# BRIEFING COMÚN — auditoría «EL CALENTAMIENTO» (2026-09-20)

Lee este archivo completo antes de hacer nada. Aplica a las 3 áreas (E1, E2, E3).

El encargo del PO se juzga con el criterio de las nueve rondas anteriores: **«auditorías serias,
nada genérico»**. Ver «Qué es un hallazgo serio». Un informe lleno de buenas prácticas genéricas se
considera FALLIDO aunque esté bien escrito.

---

## Por qué existe esta ronda

El área se elige leyendo la sección **«Qué NO miré y por qué»** de las rondas anteriores. La del
8-sep (`docs/auditoria-rapidos-2026-09-08/README.md`) lo dejó escrito:

> *«No abrí el calentamiento: es la siguiente ronda que pidió el PO, y merece su propia pasada
> (100 de 105 rutinas usan el auto-sugerido).»*

**Nueve rondas y el calentamiento no aparece en ninguna.** Y es la primera cosa que ve una persona
cuando abre «Hoy»: está ARRIBA de los ejercicios, antes de todo. Si estorba, es lo primero que
estorba; si miente, miente antes que nada.

| Área | Qué cubre | Quién |
|---|---|---|
| **E1** | **El calentamiento visto por el asesorado**: la tarjeta de la sesión (movilidad + activación), marcar ✓, la barra de progreso y la insignia, el 🎥, el colapso, y los **«sets de calentamiento» por ejercicio** (la aproximación). Dentro del guiado, que es el default. | Lucas Ortega (QA funcional) + Sofía Castaño (CS/textos) |
| **E2** | **El calentamiento como contenido deportivo**: las 34 piezas, el mapa músculo→zona, `buildWarmup` y sus reglas, el filtro de lesiones sobre el calentamiento, y las 6 listas manuales congeladas. | Laura Ospina (fisio, **veredicto vinculante en seguridad**) + Valery (coach) |
| **E3** | **El editor del coach y lo que NO se mide**: armar el calentamiento en el constructor de rutinas, el selector, `warmup: []`, las plantillas, y el hecho de que el calentamiento **no deja rastro en ningún lado**. | Mateo Sanín (Data) + Valentina Ríos (PM) |

---

## El producto

AVI es una PWA de entrenamiento (vanilla JS, sin framework, sin build, un solo `index.html` + 9
módulos `app-*.js` + `avi-core.js`) de **Camilo Andrés** («Andrés Martínez» en público), entrenador
personal independiente en Guaduas, Cundinamarca. Backend Supabase, deploy a GitHub Pages
(`https://kronos-apex.github.io/apex-app/`), empaquetada además como TWA para Android.

**Arquitectura que hay que tener en la cabeza:** es *offline-first*. `localStorage` es la fuente de
verdad y sincroniza HACIA Supabase; el teléfono PISA al servidor. Un dato que solo vive en
`localStorage` **no existe para el coach ni para nadie más**. Eso es central en esta ronda.

**El problema del negocio es la ADOPCIÓN.** Un hallazgo que devuelva a alguien que dejó de entrenar,
o que le ahorre al coach una tarea que hoy hace a mano, vale más que uno elegante que no mueva a
nadie.

---

## MAPA DE LA SUPERFICIE (verificado contra HEAD hoy — nombres verbatim)

**La tarjeta de la sesión** (`app-6-extra.js`):
- `WARMUP_LIBRARY` :2242 — el catálogo de movimientos, 9 pools.
- `MUSCLE_WARMUP_MAP` :2311 — músculo del ejercicio → qué zonas calentar.
- `buildWarmup(exercises,limKeys)` :2330 — decide la sesión y arma movilidad + activación.
- `wuKey/wuIsDone/clearWarmup` :2424-2428 · `wuToggle(id)` :2430 · `updateWarmupProgress()` :2441.
- `renderWarmup(exercises)` :2464 — pinta `#wu-wrap`. Resuelve `routine.warmup` (lista del coach) o
  auto-deriva. Lee las limitaciones con `limitationsFor(cliente, ahora).keys`.
- `wuOpenKey/wuIsOpen/toggleWarmup()` :2534-2545 — el colapso, que PERSISTE (v572).
- `findWarmupEx(id)` :2636 · `openWarmupDetail(id)` :2641 — el 🎥.
- **Los sets por ejercicio (la aproximación) son OTRA COSA**: `gmToggleExWarm(ei)` :1010 y, en la
  clásica, `buildWarmupSection`/`toggleExWarm` con claves `wshow_<rid>_<ei>`.

**El editor del coach** (`app-3-coach.js`):
- `_effWarmIds()` :3607 · `_rfWarmLim()` :3618 · `_rfWarmChip(ex,lim)` :3626 ·
  `renderRfWarmup()` :3630 · `rfWarmDel(id)` :3644 · `rfWarmAdd(id)` :3645 ·
  `openWarmPicker()` :3657 · `saveRoutine()` :3690 (escribe `warmup:`).

**La seguridad** (`avi-core.js`):
- `WARMUP_ZONE_EXCL_IDS` :791 — ids contraindicados por zona (lumbar, rodilla, hombro, aductor,
  abductor, cuello, tobillo, muñeca).
- `warmupWarnZones` :812 · `warmupWarnText` :818 · `warmupContraindicated` :862.
- `limitationsFor(cliente, ts)` — la ÚNICA puerta: une lo que escribió el coach (`profile.notes`) y
  el dolor que declaró la persona (`painCare`).

**Dónde se monta:** `renderWarmup` la llama el guiado (`gmRender` inserta `#wu-wrap` antes de las
tarjetas, v265) y la clásica. El guiado es el DEFAULT desde v262.

---

## BASELINE MEDIDO HOY (20-sep-2026) — créelo, NO lo vuelvas a medir

Lo midió el orquestador: el código contra HEAD y los datos con `SELECT` de solo lectura sobre
producción (proyecto **`eoebhrxbokyllqalyecj`**, AVI-ENTRENAMIENTO; el otro,
`yndpryhirbhlhlkmxyyv`, NO es este producto). **Si tu trabajo contradice un número de aquí, dilo
explícitamente: eso es un hallazgo en sí mismo** (ya pasó dos veces en este repo).

### Estado del repo
HEAD limpio en **avi-v641**, y producción sirve **avi-v641** (comparado `CACHE_NAME` de `sw.js`
local contra el de Pages). Suite **1271**, CI verde, `_prodcheck 641` verde.

### El catálogo de calentamiento (código)
- **34 piezas en 9 pools**: hombros 5 · cadera 5 · rodillas 3 · tobillos 2 · muñecas 3 · espalda 5 ·
  activación superior 4 · activación inferior 4 · activación core 3.
- **0 ids duplicados. Las 34 tienen `desc` y `ytQuery`** (ninguna queda sin guía ni sin video).
- **Un nombre aparece dos veces con dos ids**: «Círculos de muñeca» es `wh5` (pool hombros) y `wm1`
  (pool muñecas), con `reps` distintas («10 c/dirección» las dos, `icon` distinto: 👐 y ✋). Es un
  DATO medido, no un veredicto: júzgalo tú si toca tu área.

### Las rutinas reales (28 filas no-QA, filtro `name not ilike '%QA%'`)
**124 rutinas.** De ellas:
- **6 tienen lista de calentamiento propia** del coach.
- **70 tienen `warmup: []`** (lista vacía) → la app auto-deriva.
- **48 no tienen la clave** → la app auto-deriva.
- O sea: **118 de 124 rutinas (95%) muestran el calentamiento que decide el código, no el coach.**

Las 6 con lista propia, tal cual están hoy:

| persona | rutina | día | n | ids | ejercicios | creada |
|---|---|---|---|---|---|---|
| Andres Martínez (el coach, su propio plan) | Full body funcional | Libre | 14 | wh1 wh2 wc1 wc2 wr1 wr2 wt1 wt2 wm1 wm2 we5 we1 wa1 wai3 | 11 | **10-sep-2026** |
| Claudia Valbuena | Pierna | Lunes | 8 | wc1 wr1 wt1 wt2 wai2 we5 we2 wac3 | 6 | 29-jun-2026 |
| Claudia Valbuena | Gluteo | Jueves | 9 | wc1 wc2 wr1 wr2 wt1 wt2 we2 wai1 wai3 | 6 | 29-jun-2026 |
| Danilo | Hombros y Brazos | Jueves | 11 | wh1 wh2 wm1 we1 we2 wc1 wc2 wa1 wa3 wac1 wac2 | 8 | 22-ago-2026 |
| Estella Rodríguez | Pierna | Lunes | 8 | wc1 wr1 wt1 wt2 wai2 we5 we2 wac3 | 6 | 29-jun-2026 |
| Estella Rodríguez | Gluteo | Jueves | 9 | wc1 wc2 wr1 wr2 wt1 wt2 we2 wai1 wai3 | 6 | 29-jun-2026 |

- **Los 49 ids usados existen los 49 en `WARMUP_LIBRARY`.** Hoy no hay ninguno huérfano.
- Las 4 listas de Claudia y Estella son **idénticas entre sí y se crearon el 29-jun**, o sea
  **antes de que el filtro de lesiones cubriera el calentamiento** (v424, 2-ago) y antes del chip de
  aviso del selector.

### 🔴 LO QUE NO SE PUEDE MEDIR, Y ES EL DATO MÁS IMPORTANTE DE ESTA RONDA
**503 sesiones** guardadas en `history` (28 filas no-QA). Sus claves son exactamente:
`date, doneSets, durationSec, exercises, feeling, finishedAt, id, kcal, mood, prs, routineId,
routineName, sessionId, startedAt, totalSets, totalVol`.

**Ninguna guarda nada del calentamiento. 0 de 503.** El estado vive solo en `wu_<rid>_<exId>` y
`wuopen_<rid>` en el `localStorage` del teléfono, se borra por día y **nunca sale del aparato**.

⚠️ **TRAMPA MEDIDA, no caigas en ella:** de aquí **NO se sigue** que nadie calienta, ni que todos
calientan. **Es un cero sin control** — no hay instrumento. Si quieres afirmar algo sobre la
adopción del calentamiento necesitas otra vía (proxies: duración de la sesión, `wuopen_` no es
observable, etc.) y tienes que decir su margen. Un informe que diga «nadie calienta» sin
instrumento queda rechazado. Lo que SÍ es un hallazgo legítimo es **si esa ceguera importa y a
quién** (¿el coach necesita saberlo? ¿Laura? ¿vale el costo de guardarlo?).

### Las personas dueñas de las 6 listas manuales (dato crudo, el veredicto es de E2)
- **Andres Martínez** (el coach, 88 sesiones) — `profile.notes` vacío, pero `painCare` con DOS
  reportes: (1) **codo derecho, nivel 2**, 17-ago, sobre `e11` «Extensión en Polea»; (2) **muslo por
  detrás izquierdo, nivel 3, con bandera roja `R5`**, 14-sep, sobre `e14` «Peso Muerto Rumano»
  (triaje 4, `corregido:true` el 15-sep — antes decía «muslo por dentro (aductores)»).
  Su lista propia se creó el **10-sep**, o sea **cuatro días antes de ese reporte**.
- **Danilo** (20 sesiones) — `profile.notes`: *«Hernia lumbar L5 / Hernia umbilical / Pero Danilo
  dice que estas hernias no son una limitación a la hora de entrenar»*. Sin `painCare`.
- **Claudia Valbuena** (57 sesiones) y **Estella Rodríguez** (58 sesiones) — `notes` vacío, sin
  `painCare`.

**El dato duro que esto pone sobre la mesa, y que E2 tiene que resolver con evidencia:** el
calentamiento MANUAL **no se filtra nunca** (decisión deliberada: ahí decide una persona, y se le
avisa con un chip naranja en el editor). Las 4 listas viejas se armaron cuando ese chip no existía,
y la del coach se armó antes de su propio reporte de dolor. **¿Hay hoy alguien recibiendo un
movimiento que el filtro le quitaría? Con nombre, id y la regla exacta.** Si la respuesta es no,
también vale y se escribe con las cifras.

---

## FALSOS POSITIVOS CONOCIDOS — si reportas uno de estos, tu informe pierde credibilidad

1. **«El filtro de lesiones ignora el calentamiento».** Era verdad hasta v424 (2-ago) y **ya está
   arreglado**: `buildWarmup` recibe `limKeys` y filtra ANTES del `slice(0,2)`. Y desde v454
   `renderWarmup` usa `limitationsFor` (coach + dolor declarado), no solo las notas del coach.
   Verifícalo contra HEAD antes de escribir cualquier cosa de este tipo.
2. **«El calentamiento manual del coach no se filtra».** Es **deliberado** y está documentado
   (`avi-core.js:808-811`): cuando el coach arma la lista a mano no se le quita nada en silencio, se
   le marca con el chip naranja `_rfWarmChip` + confirmación en `rfWarmAdd`. Decirlo como defecto,
   sin víctima concreta, no es hallazgo. **Decir «a ESTA persona le está llegando ESTO» sí lo es.**
3. **«La aproximación / series con % del peso no está en la tarjeta».** Se movió a propósito a los
   sets de calentamiento POR ejercicio para no duplicar (comentario en `renderWarmup`).
4. **«La tarjeta se abre cerrada / el estado no persiste».** Persiste desde v572 (`wuopen_`), y fue
   un reporte real del PO por un salto de 543 px. No lo re-reportes; si encuentras OTRO salto, mide
   los píxeles.
5. **«El calentamiento no repite lo que ya trae la sesión».** Regla del PO implementada en v594
   (`_usados` en `buildWarmup`). Si encuentras una repetición VIVA, es hallazgo; la ausencia de la
   regla no lo es, porque está.
6. **`wt1` «Círculos de tobillo» sigue permitido con dolor de tobillo** y `wc2` «Estocada con
   rotación» con lumbar: son decisiones **explícitas de Laura**, documentadas con su razón. No son
   olvidos.
7. **Nutrición** (cerrada por el PO), **Comunidad** (congelada), **la vitrina de la pantalla de
   inicio** (a propósito), los advisories `rls_disabled` de `_cm_rate`/`_cpost_rate`/`_cc_rate`
   (grants revocados, Postgres evalúa privilegios antes que RLS) y
   `auth_leaked_password_protection` (Pro-only, el PO decidió no pagarlo). **Todos cerrados.**
8. **Las 8 medallas / los 20 logros** (v639) y **Comunidad contando logros** (v641): recién
   desplegados y verificados. No son de esta ronda.
9. **«Faltan tests / falta manejo de errores / convendría refactorizar»** sin caso concreto y sin
   víctima: no es un hallazgo en este repo.

---

## Qué es un hallazgo SERIO (y qué se va a rechazar)

**SÍ es un hallazgo:**
- Algo que una persona real puede sufrir hoy, con su nombre y la consulta o el `archivo:línea` que
  lo demuestra.
- Algo que la app PROMETE por escrito y no cumple (cita el texto exacto y dónde vive).
- Un número que no cuadra entre dos pantallas que muestran lo mismo.
- Un camino sin salida: una acción que se puede empezar y no terminar, o un estado del que no se
  puede volver.
- Un dato que se pierde en silencio (arquitectura offline-first: es la clase más común aquí).
- Trabajo manual que el coach hace hoy y la app ya tiene datos para ahorrarle.
- Una medición que **contradice** el baseline de arriba.

**NO es un hallazgo:**
- Consejos genéricos de buenas prácticas sin caso concreto ni víctima.
- Cualquier cosa ya escrita en **GOTCHAS VIGENTES** de `CLAUDE.md` — léelo antes de reportar.
- Algo ya arreglado: **verifica contra HEAD**, nunca contra un informe viejo.
- Una hipótesis sin medir presentada como hecho. Para eso está «Sospechas sin medir».
- «Falta X» cuando X existe con otro nombre. Busca antes de afirmar una ausencia.

**Una regla que este repo pagó caro:** *el que audita llega con hipótesis, no con hallazgos.* En la
ronda del 5-sep dos pistas del orquestador resultaron FALSAS y las tumbaron los agentes. Se espera
lo mismo de ti: **tumba tus propios hallazgos antes de escribirlos, y escribe cómo lo intentaste.**

---

## REGLAS DURAS

1. 🔒 **SOLO LECTURA contra producción.** `SELECT` sí. `INSERT`/`UPDATE`/`DELETE`, migraciones,
   invocar edge functions que escriban y despliegues: **jamás**. Son los datos de 25 personas reales
   que le pagan al PO.
2. 🔒 **NO toques el código del repo.** Esta ronda es diagnóstico. Cero commits, cero ediciones a
   cualquier archivo que no sea tu propio informe.
3. 🔒 **Un hallazgo sin evidencia verificable no es un hallazgo.** Cada uno lleva `archivo:línea`, o
   la consulta SQL con su resultado, o la salida del comando. Nombres de función y de columna
   **verbatim**: si escribes un nombre que no existe, el hallazgo entero queda en duda.
4. 🔒 **Intenta TUMBAR tu propio hallazgo antes de escribirlo**, y escribe cómo lo intentaste. Si lo
   tumbaste, va a «lo que verifiqué y está SANO», que también vale.
5. 🔒 **Distingue «no hay víctima hoy» de «no pasa nada».** Las dos se reportan, marcadas distinto:
   el PO decide con esa diferencia.
6. ⚠️ **Cuidado con tus propias sondas.** En este repo, en un solo día, TRES hallazgos resultaron ser
   defectos de la sonda que los midió, y en otra ronda fueron SEIS. Toda medición lleva **control de
   discriminación** (¿distingue de verdad los dos casos?) y **control de cobertura** (¿estoy midiendo
   algo, o el cero sale porque no leí nada?). **Un cero sin control no vale.**
7. ⚠️ **Mide en PANTALLA, no en el fuente, cuando juzgues lo visible.** Un emoji dentro de
   `<span class="t-ic" data-ic>` **se vuelve SVG al cargar** (`aviIconizeStatic`, 51 casos). Eso ya
   costó 4 mediciones falsas el 17-sep. Y sin `<meta viewport>` una prueba se maqueta a 980px.
8. ⚠️ **Si corres algo en el navegador:** los harness de `scripts/e2e/` son el patrón. El sello
   `cloudWriteSealed` impide escribir a producción desde `localhost`; **no lo desactives**. Hay
   credenciales QA en `~/.avi/e2e-creds.json` — **nunca** uses la cuenta de un asesorado real. Ojo
   con el rate limit del login (~2-3 min entre corridas). Los harness comparten los puertos
   8829/9349: **si otro agente está usando el navegador, espera o mide por código y SQL.** Sois tres
   corriendo a la vez.
9. ⚠️ **No corras matrices de sabotaje.** Mutan el árbol unos segundos y hay otros dos agentes
   leyéndolo. Esta ronda es lectura.

---

## CÓMO ENTREGAS (obligatorio, y va PRIMERO)

**Antes de investigar nada, CREA tu archivo de informe con el esqueleto de secciones vacío.** Luego
ve rellenándolo a medida que encuentras, no al final. Si te quedas sin presupuesto a mitad de
camino, lo que ya escribiste se conserva y la ronda no se pierde. Esto no es una sugerencia: es la
razón por la que las rondas anteriores entregaron completas.

Tu archivo: `docs/auditoria-calentamiento-2026-09-20/<TU-CÓDIGO>.md`

Secciones, en este orden:

```
# <código> · <área> — <tu nombre de rol>
## Veredicto en una frase
## Los 3 más grandes
   (cada uno: qué es · a quién le pasa HOY, con nombre · evidencia (archivo:línea o SQL con su
    resultado) · cómo intenté tumbarlo · qué costaría arreglarlo)
## Todos los hallazgos
   (tabla: severidad 🔴/🟡/🟢 · qué · dónde · ¿hay víctima hoy?)
## Lo que verifiqué y está SANO (con números)
## Sospechas sin medir
## Qué NO miré y por qué
```

La última sección **«Qué NO miré y por qué» no es relleno: es como se elige la próxima ronda.** Sé
específico y honesto ahí.

Al terminar, tu **última respuesta** debe ser un resumen de máximo 15 líneas: el veredicto y los 3
grandes. El informe completo vive en el archivo, no en tu respuesta.

**Escribe en español de Colombia, en lenguaje de producto.** El PO es entrenador, no desarrollador:
dile qué ve la persona y qué arriesga el negocio. Los detalles técnicos van en la evidencia, no en
el veredicto.
