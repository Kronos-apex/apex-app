# Auditoría «EL CALENTAMIENTO» — 20-sep-2026

Décima ronda. Área elegida leyendo el «Qué NO miré y por qué» de la ronda del 8-sep, que la dejó
escrita a nombre del PO: *«No abrí el calentamiento: es la siguiente ronda que pidió el PO»*.

**Nueve rondas anteriores y el calentamiento no aparece en ninguna** — y es lo primero que ve una
persona al abrir «Hoy», arriba de los ejercicios.

| Área | Qué cubre | Quién | Informe |
|---|---|---|---|
| **E1** | El calentamiento visto por el asesorado (la tarjeta, marcar ✓, el colapso, el 🎥, los sets por ejercicio, los textos) | Lucas (QA func.) + Sofía (CS) | `E1-asesorado.md` |
| **E2** | El calentamiento como contenido deportivo y como seguridad (las 34 piezas, el mapa músculo→zona, `buildWarmup`, el filtro de lesiones, las 6 listas manuales) | Laura (fisio) + Valery (coach) | `E2-deportivo.md` |
| **E3** | El editor del coach y la ceguera de medición | Mateo (Data) + Valentina (PM) | `E3-coach-y-medicion.md` |

El briefing común, con las reglas duras y los falsos positivos conocidos: `_BRIEFING.md`.

---

## BASELINE MEDIDO POR EL ORQUESTADOR (20-sep-2026)

Medido ANTES de lanzar a nadie, para que los tres frentes partan de las mismas cifras y ninguno
gaste presupuesto midiendo lo mismo. Código contra HEAD; datos con `SELECT` de solo lectura contra
producción (proyecto `eoebhrxbokyllqalyecj`).

### Estado del repo
HEAD limpio en **avi-v641** y producción sirve **avi-v641** (comparado el `CACHE_NAME` de `sw.js`
local contra el de Pages). Suite **1271**, CI verde, `_prodcheck 641` verde.

### El catálogo (código)
- **34 piezas en 9 pools**: hombros 5 · cadera 5 · rodillas 3 · tobillos 2 · muñecas 3 · espalda 5 ·
  activación superior 4 · activación inferior 4 · activación core 3.
- **0 ids duplicados**; las 34 tienen `desc` y `ytQuery` (ninguna sin guía ni sin video).
- Un nombre vive dos veces con dos ids distintos: «Círculos de muñeca» = `wh5` (pool hombros) y
  `wm1` (pool muñecas).

### Las rutinas reales (28 filas no-QA, filtro `name not ilike '%QA%'`)
**124 rutinas**: **6** con lista propia del coach · **70** con `warmup: []` · **48** sin la clave.
→ **118 de 124 (95%) muestran el calentamiento que decide el código, no el coach.**

Los **49 ids** usados en esas 6 listas **existen los 49** en `WARMUP_LIBRARY`: hoy no hay ninguno
huérfano. Las 4 listas de Claudia y Estella son idénticas entre sí y se crearon el **29-jun**, o sea
antes de que el filtro de lesiones cubriera el calentamiento (v424, 2-ago).

### 🔴 La ceguera — el dato más importante de la ronda
**503 sesiones** en `history`. Sus claves son exactamente `date, doneSets, durationSec, exercises,
feeling, finishedAt, id, kcal, mood, prs, routineId, routineName, sessionId, startedAt, totalSets,
totalVol`. **Ninguna guarda nada del calentamiento: 0 de 503.**

El estado vive solo en `wu_<rid>_<exId>` y `wuopen_<rid>` en el `localStorage` del teléfono, se borra
por día y nunca sale del aparato.

⚠️ **De aquí NO se sigue que nadie caliente.** Es un **cero sin instrumento**, la trampa exacta que
el briefing prohíbe convertir en hallazgo (misma clase que el cero de las plantillas en la ronda del
7-sep).

---

## Consolidado (orquestador, con los tres frentes entregados)

### Lo que sobrevivió, ordenado por lo que arriesga una persona real

| # | Hallazgo | Quién lo encontró | ¿Víctima HOY? | Verificado por el orquestador |
|---|---|---|---|---|
| 1 | **El calentamiento MANUAL no avisa en la pantalla donde se entrena.** El chip «ojo con su zona» vive solo en el editor del coach; `renderWarmup` nunca llama a `warmupWarnZones`. | **E2 y E3, por separado** | **Sí: el propio coach.** Lista armada el 10-sep con `we5` y `wai3`; bandera roja R5 (muslo por detrás) reportada el 14-sep, activa hasta el 28-sep | Sí — el chip solo aparece en `app-3-coach.js`; la lista del coach y las fechas, contra producción |
| 2 | **`wc3` (90/90) asciende al calentamiento de quien tiene la rodilla dañada.** `wc2` sale por la palabra «estocada» (regla del ENTRENO) y el `slice(0,2)` promueve a `wc3`, que el dictamen del 8-ago nunca revisó para esa zona. | E2 (Laura) | **Sí: Laura Ramirez Rueda y Miguel Pulido** | Sí — regex `rodilla` incluye `estocada` (`avi-core.js:418`); las dos personas declaran rodilla en `notes` |
| 3 | **Entrenar dos veces la misma rutina el mismo día abre el entreno ya palomeado.** `todayTrainAgain` solo levanta una bandera y repinta: no limpia `done_`, ni `wu_`, ni acuña sesión nueva. | E1 | Mecanismo sí; **4 casos reales** de misma rutina/mismo día (Samuel, Estella, Natalia, el coach) | Sí — `app-4-entreno.js:1063`; solo `checkAndResetSession` y `resetSession` limpian |
| 4 | **El título «⚡ Activación muscular» se puede pintar con cero ejercicios debajo.** | E1 | No hoy (hace falta lumbar + tobillo en la misma persona) | — |
| 5 | **14 de 34 piezas (41%) nunca llegan a nadie** por auto-derivación, medido contra las 118 rutinas reales. La variedad de «9 pools» es en parte ilusoria. | E2 | No (es de fondo) | — |
| 6 | **El selector de movimientos se cierra en cada toque** (`rfWarmAdd` llama `cm('m-warmpick')` sin condición): 8 toques en vez de 5. | E3 | El coach, en fricción | Sí — `app-3-coach.js:3645` |
| 7 | **El 🎥 de la tarjeta es el último emoji crudo dentro de un control ahí**; su vecino ya es SVG desde v626. | E1 | No | — |

### Lo que se tumbó, y quién lo tumbó
- **«Nadie calienta».** Prohibido de entrada en el briefing (0 de 503 sesiones es un cero SIN
  instrumento). **E3 lo respetó**: midió dos proxies, los declaró inconclusos (N=3, bajo el mínimo
  de 10) y señaló que el «100% completado» del grupo con lista manual es probablemente causalidad
  inversa. **Veredicto: no instrumentar hoy.**
- **Danilo como víctima.** Hernia lumbar L5 declarada y lista manual armada el 22-ago: E2 corrió el
  filtro real contra sus 11 movimientos y **los 11 pasan**. Es el control negativo de la ronda.
- **«El filtro de lesiones ignora el calentamiento»** (falso positivo conocido): E1 lo verificó
  contra HEAD y está bien cerrado desde v424/v454.
- Las 4 listas de Claudia y Estella (29-jun, anteriores al filtro): **no hay víctima hoy** porque
  ninguna de las dos declara nada — pero sus listas sí tienen piezas que caerían bajo
  lumbar/rodilla/aductor el día que declaren algo. Queda en «sospechas».

### La lección de método de esta ronda
El hallazgo 2 no es un bug de una línea: es que **el calentamiento HEREDA las reglas de exclusión
del ENTRENO** (`GEN_ZONE_EXCL`, una sola fuente a propósito) y **nadie revisó qué pieza ASCIENDE
cuando otra sale del pool**. Ensanchar una regla del entreno reordena en silencio el calentamiento
de quien tenga esa zona. Es la misma familia de «una regla ancha también hace daño» (v424) vista
desde el otro lado.

### Lo que va a decisión del PO
1. El lote de arreglos y su orden (los 7 de arriba no valen lo mismo).
2. Nada más: la ceguera de medición ya tiene veredicto de no-hacer, y el dictamen clínico de `wc3`
   es de Laura, no del PO.
