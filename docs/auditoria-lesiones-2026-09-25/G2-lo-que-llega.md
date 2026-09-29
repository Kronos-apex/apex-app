# G2 · Lo que le llega de verdad a cada persona — Mateo Sanín (Data) + Lucas Ortega (QA funcional)

## Veredicto en una frase
El generador y el calentamiento filtran bien lo que saben filtrar, pero la ÚNICA marca visual que
avisa de un ejercicio contraindicado DURANTE el entreno real (`_painForEx`) depende exclusivamente
de un reporte de dolor 🤕 — nunca de las notas del coach — y en TODA la historia de la app solo el
propio PO ha usado esa puerta (2 reportes, 0 asesorados): para Laura, Darío y cualquiera cuya
limitación viva solo en las notas, el candado no existe en ninguna pantalla donde entrena de
verdad, esté o no la zona en `GEN_LIMIT_KWS`.

## Los 3 más grandes

**1. 🔴 La única marca en vivo (`_painForEx`, `app-6-extra.js:673-687`) está cableada SOLO al
reporte de dolor, nunca a `parseLimitations`/notas — y casi nadie ha usado esa puerta.**
- Qué: `_painForEx` (el chip 🩹 que aparece en la tarjeta del ejercicio dentro del guiado "Hoy")
  llama a `painZoneKeys(c, Date.now())`, que lee EXCLUSIVAMENTE `client.painCare`. Nunca consulta
  `limitationsFor(c).keys` completo ni `parseLimitations(c.notes)`.
- A quién le pasa HOY: Lucía Ríos y Darío — sus dos limitaciones son 100% de notas
  (`profile->'painCare'` es `null` para ambos, verificado por SQL) — entrenan hoy (23-sep y 25-sep
  resp.) sin que NINGUNA pantalla del entreno les marque nada, aunque `rodilla`/`lumbar` SÍ se
  detectan correctamente en sus notas.
- Evidencia: `app-3-coach.js:3501-3530` (`renderDetailRoutines`, la lista de rutinas del coach) usa
  `_limKeys=limitationsFor(c,...).keys` SOLO para `buildWarmup` (línea 3512); el `.map` que pinta
  cada `exrow` (línea 3530) no referencia `lim` en ningún punto. `app-3-coach.js:3679-3699`
  (`rfExRow`, el editor de rutinas) tampoco referencia `lim`/`GEN_ZONE_EXCL` — el coach puede meter
  a mano un ejercicio contraindicado sin ningún aviso. El único lugar que SÍ filtra por notas es el
  picker del sustituto 🔄 (`app-2-login.js:694-699`).
- Cómo lo intenté tumbar: revisé los 7 consumidores de `limitationsFor(` en todo el repo
  (`grep -n "limitationsFor("`): generador (filtra, pero solo aplica a rutinas NUEVAS), calentamiento
  auto en 3 sitios (filtra), chip del calentamiento MANUAL del coach (marca, correcto y deliberado),
  wizard de autorregistro y el gate `_hasExcl` del resultado del reporte. Ninguno marca el EJERCICIO
  de una rutina ya guardada. Confirmado con SQL: `painCare` de Laura y Darío es `null`.
- Costo de arreglo: mediano. `renderDetailRoutines`/`rfExRow`/la tarjeta del guiado necesitarían
  llamar `exerciseContraindicated(ex, limitationsFor(c).keys, DB.exercises)` igual que ya hace
  `_painForEx` con `painZoneKeys` — es extender la MISMA función a la fuente que le falta, no una
  regla nueva.

**2. 🔴 Caso real Lucía Ríos: 8 ejercicios vigentes en su plan que las reglas de codo/cuello
tienen escritas y no le llegan (confirma Q1).**
- `parseLimitations` con su nota real → `{keys:['rodilla'], hasExclusions:true}` (medido con
  `core.parseLimitations` en Node): "espalda alta" y "codos" no producen NADA porque `GEN_LIMIT_KWS`
  solo reconoce rodilla/lumbar/hombro/generic.
- Corriendo `GEN_ZONE_EXCL.codo`/`GEN_ZONE_EXCL.cuello` contra su plan REAL (SQL, 25-sep):
  - CODO quitaría/marcaría: `e11` Extensión de Tríceps con Cuerda en Polea (Viernes/Brazo y
    abdomen — el MISMO ejercicio con el que el PO reportó su codo en v546), `e69` Clean & Press
    (Lunes/Full body), `e75` Burpees (Lunes/Full body), `e81` Escaladores/Mountain Climbers
    (Lunes/Full body).
  - CUELLO quitaría/marcaría: `e23` Press Militar en Máquina (Viernes), `e69` Clean & Press
    (Lunes), `e18` Crunch Abdominal (Lunes), `e62` Russian Twist (Lunes), `e75` Burpees (Lunes),
    `e184` Sentadilla con Salto (Lunes — cae por `\bsalto` en la regla de cuello).
- Cómo lo intenté tumbar: repetí el cálculo con `GEN_ZONE_EXCL.rodilla` (la zona que SÍ detecta) y
  encontré 8 ejercicios más (e80, e35, e37×2, e69, e184, e75, e61) que tampoco tienen NINGUNA marca
  en ninguna pantalla — confirma que el problema no es solo "4 zonas de 11", es el hallazgo #1:
  ni siquiera la zona que SÍ se detecta llega a la pantalla del entreno.
- Costo: bajo para ampliar `GEN_LIMIT_KWS` con las 7 zonas que faltan (las regex ya existen en
  `GEN_ZONE_EXCL`, es reusar el mismo patrón); no resuelve el hallazgo #1 por sí solo.

**3. 🟡 El generador colapsa un slot a un solo ejercicio para Laura y Darío — pool chico REAL, no
cursor mal alineado (barrido de 80 semillas, con control).**
- Laura (rodilla): `e89 Clamshell con Banda (Concha)` aparece en el 100% de los días generados en
  las 80 semillas (320/320). Darío (lumbar): `e133 Press Pallof con Banda` en el 100% (400/400).
- Control de discriminación: corriendo los MISMOS perfiles SIN la nota de limitación, esos mismos
  ids aparecen en 0/160 y 0/200 respectivamente — la limitación es la causa, no un cursor fijo.
- Por qué es pool real y no cursor: `_genPick` elige con `start = st.cursors[key] ?? (seed % pool.length)`.
  Si `pool.length===1`, `seed % 1 === 0` para CUALQUIER semilla — es matemáticamente imposible que
  varíe. El pool amplio del mismo músculo (glúteo/gluteo, core) tiene 34 y 23 candidatos tras
  excluir rodilla/lumbar respectivamente, así que la reducción a 1 ocurre en el filtro MÁS
  específico del slot (`slotOpts`/`prefer`/`avoid` de esa plantilla en `GEN_DAYS`, no exportado —
  no alcancé a aislar cuál exactamente sin tocar el código).
- Consecuencia: no es un día vacío (0 vacíos en 320/400 días revisados) — es el MISMO ejercicio,
  para siempre, cada vez que se regenere el plan. No lesiona por sí solo, pero es la señal de que
  el pool de reemplazo de esa zona/slot está mal dimensionado.
- Sospecha sin medir: no identifiqué el `slotOpts` exacto de `GEN_DAYS` que produce esto (función
  privada, no exportada a Node) — dictamen pendiente de trazarlo en el código si se decide arreglar.

## Todos los hallazgos

| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🔴 | `_painForEx` (chip en vivo) solo lee `painCare`, nunca notas | `app-6-extra.js:673-687` | Laura, Darío, Mario — todo limitación-por-nota |
| 🔴 | `renderDetailRoutines` (lista de rutinas del coach) no marca ningún ejercicio por limitación | `app-3-coach.js:3501-3530` | Todos los que el coach revisa en su panel |
| 🔴 | `rfExRow` (editor de rutina) no avisa al agregar un ejercicio contraindicado | `app-3-coach.js:3679-3699` | Cualquiera a quien el coach le edite el plan |
| 🔴 | Laura: 8 ejercicios vigentes que codo/cuello excluirían, sin marca en ningún lado | plan real SQL, 25-sep | Lucía Ríos, hoy |
| 🟡 | PO: `e15` Curl Femoral Tumbado en Máquina (Martes/Pierna) sigue en su plan con isquios vigente (14-sep, R5) | `user_data.routines` del PO | Andrés Martínez — mitigado SOLO si corre esa rutina en el guiado (`_painForEx` sí lo marcaría ahí, vía `painZoneKeys`) |
| 🟡 | Pool colapsado a 1 (e89/e133), 100% de 80 semillas, 0% sin limitación | `avi-core.js` `_genPick`/`GEN_DAYS` | Laura, Darío — cada regeneración futura |
| 🟡 | Plantillas y QUICK_WORKOUTS: sin candado contra `REMOVED_EXERCISES` (hoy sano) | `app-2-login.js` (`openNewRoutineFromTemplate`), `app-4-entreno.js:1789` | Nadie hoy; se rompe en silencio el día que se retire un ejercicio usado en una plantilla |
| 🟡 | Aplicar una plantilla a un cliente con limitación no filtra ni avisa | `app-2-login.js:835-845` | Cualquier plantilla aplicada a alguien con limitación declarada |
| 🟢 | `dedupeExercises`/`prsRemapRetired` SÍ autocuran rutinas y récords al retirar un ejercicio | `app-2-login.js:34-80` | — (sano) |
| ⚪ | N=2 reportes de dolor en toda la historia, ambos del PO | SQL `painCare` | No hay muestra para zonas/patrones |

## Respuesta a las preguntas del orquestador

**1. ¿Una limitación en notas con codo/cuello/etc no filtra ni marca NADA en ninguna superficie?**
**CIERTA, y más grave de lo planteado.** Confirmado con `core.parseLimitations` en Node contra las
notas reales de Laura: solo detecta `rodilla`; "espalda alta" y "codos" no producen ningún key.
Contra su plan real (SQL), codo excluiría 4 ejercicios (e11, e69, e75, e81) y cuello 6 (e23, e69,
e18, e62, e75, e184) — hoy sin marca. Pero el hallazgo va más allá: incluso `rodilla`, que SÍ se
detecta, tampoco produce marca en ninguna pantalla del entreno real (8 ejercicios más sin aviso) —
ver hallazgo #1. Con Darío (lumbar, sí detectado): 12 ejercicios de su plan caen en la regla y
ninguno está marcado, por la misma razón estructural. Con el PO (isquios+lumbar vigente): `e15`
Curl Femoral Tumbado — el ejercicio exacto que motivó la regla de isquios en v607 — sigue en su
rutina de Martes; a diferencia de Laura/Darío, su caso SÍ tiene reporte de dolor, así que
`_painForEx` lo marcaría si corre esa rutina en el guiado — pero NO en la lista de rutinas del
panel del coach, que nunca marca nada (hallazgo #1 también aplica).

**2. ¿Qué superficies respetan la limitación?**
Enumeradas las 8 + 1 pedidas por el orquestador:
| Superficie | ¿Filtra o marca? |
|---|---|
| `generarRutinas` | FILTRA (usa `limitationsFor` completo: notas+dolor) — solo aplica a rutinas recién generadas |
| Plan del día que escribió el coach (marca v546) | Debería MARCAR, pero `renderDetailRoutines`/`rfExRow` no llaman a ninguna función de exclusión — NO MARCA NADA |
| Calentamiento AUTO | FILTRA (`buildWarmup` vía `limitationsFor`, en 3 sitios: vista coach, editor, "Hoy") |
| Calentamiento MANUAL del coach | MARCA (chip naranja `_rfWarmChip`, deliberado y correcto) |
| Sustituto 🔄 (`todaySubstitute`) | FILTRA las opciones que ofrece (`app-2-login.js:694-699`, usa `limitationsFor` completo) — no toca lo ya puesto |
| Plan de choque (`shockPlan`) | FILTRA candidatos de variante (usa `parseLimitations`+`painCareActive` directamente, correcto tras el fix de v546) |
| Entrenamientos rápidos (`QUICK_WORKOUTS`) | NO FILTRA NI MARCA la construcción del preset (`buildQuickRoutine` no llama nada de limitaciones); SÍ recibiría el chip `_painForEx` en el guiado, pero solo si hay reporte de dolor activo |
| Plantillas que el coach aplica | NO FILTRA NI MARCA (`openNewRoutineFromTemplate` copia verbatim) |
| "¿Cómo te sientes hoy?" 🤕 | Es la puerta de ENTRADA del reporte de dolor (no consume la limitación; la produce). Su resultado (`painShowResult`) SÍ rama por `hasExclusions` |
La que más dudas dejaba (`renderDetailRoutines` sin marca) la confirmé leyendo el HTML literal que
arma esa función línea por línea — no encontré ninguna referencia a `lim`/`GEN_ZONE_EXCL` en el
`.map` que pinta cada ejercicio; no llegué a confirmarlo con un harness de navegador por presupuesto
de turno (ver "Qué NO miré").

**3. Barrido de 40 semillas — ¿repite o deja huecos?**
**REPITE (pool chico real), no huecos.** 0 días vacíos en 320 (Laura) y 400 (Darío) revisados hasta
80 semillas (la cifra no se movió entre 40 y 80). Pero un slot por persona queda con pool=1 tras la
exclusión (e89 para Laura, e133 para Darío, 100% de las veces), confirmado con control (0% sin la
limitación) y con la fórmula del cursor (`seed % 1 = 0` siempre). El PO (isquios+lumbar, pool más
grande) no muestra este patrón: su top-1 ejercicio nunca pasa de ~13% de las sesiones.

**4. ¿Presets o plantillas referencian `REMOVED_EXERCISES` o algo inexistente?**
**NO hoy (sano), pero SIN CANDADO.** Verificado por SQL contra las 6 plantillas reales del coach
(`user_data.templates` de `0a6484ed-...`) y por lectura de `QUICK_WORKOUTS` (32 ids): ninguno
coincide con las 7 claves de `REMOVED_EXERCISES`. Pero `dedupeExercises`/`prsRemapRetired`
(`app-2-login.js:34-80`) solo recorren `DB.clients[].routines` y `DB.prs` — nunca `DB.templates`, y
`QUICK_WORKOUTS` es código estático sin test que lo valide contra el catálogo (confirmado:
`grep QUICK_WORKOUTS avi.test.js` solo tiene un test de contenido textual, no de ids). El día que se
retire un ejercicio usado en una plantilla, `openNewRoutineFromTemplate` lo copiará tal cual y
`buildQuickRoutine`/el editor lo pintarán como el id crudo sin nombre/ícono/músculo — se rompe en
silencio la próxima vez que se use.

**5. Datos: reportes de dolor en la historia.**
**N=2, ambos de la MISMA persona (el propio PO), cero asesorados reales.** SQL sobre
`profile->'painCare'` de las 30 filas de `user_data`: 2 reportes totales — codo (17-ago, ya venció) y
muslo por detrás (14-sep, vigente hoy) — los dos de "Andrés Martínez". Ningún `cleared:true` (ninguno
se cerró con "Ya estoy bien"; ambos simplemente vencieron su ventana de 14 días). **N es demasiado
chico para hablar de zonas o patrones** — pero el número en sí es el hallazgo: valida el #1, porque
significa que el único sensor que alimenta la única marca viva del sistema (`_painForEx`) nunca ha
sido tocado por ninguno de los 28 asesorados reales.

## Lo que verifiqué y está SANO
- `shockPlan` (avi-core.js:10510) combina notas+dolor correctamente (`Array.isArray` por zona, el
  bug de v546 está cerrado) y no prescribe con dolor nivel 3.
- `dedupeExercises`/`prsRemapRetired` SÍ remapean rutinas y récords cuando se retira un ejercicio.
- Las 6 plantillas reales del coach y los 32 ids de `QUICK_WORKOUTS` no referencian ningún id de
  `REMOVED_EXERCISES` hoy.
- `_PAIN_ZONE_TO_EXCL` (avi-core.js:10118) cubre las 16 áreas declarables menos "otra zona" (a
  propósito) — coincide exacto con la tabla del briefing.
- El picker del sustituto 🔄 SÍ filtra por `limitationsFor` completo (notas+dolor), no solo dolor.
- 0 días completamente vacíos en 1.720 días-sesión revisados (Laura+Darío+PO, hasta 80 semillas).

## Sospechas sin medir
- No aislé el `slotOpts`/`prefer`/`avoid` exacto de `GEN_DAYS` que colapsa el pool de Laura/Darío a
  1 candidato — `_genPick` y `GEN_DAYS` no están exportados a Node y no quise tocar el código para
  exportarlos temporalmente.
- No confirmé en pantalla (browser harness) que `renderDetailRoutines` no marca nada — el rastreo de
  código es consistente y no dejé cabos sueltos, pero no es lo mismo que verlo en el DOM real.
- No revisé si `todaySubstitute`/el picker respeta `GEN_EXCL_IDS` (exclusión por id, no solo regex)
  — el símbolo no está exportado a Node para probarlo aislado.

## Qué NO miré y por qué
- Confirmación en pantalla con harness de navegador (puertos 8829/9349): tracé el hallazgo #1 con
  lectura literal de las 3 funciones de render (`renderDetailRoutines`, `rfExRow`, `_painForEx`) y
  until control con SQL+Node, que da la misma certeza sin el riesgo de rate-limit/sesión zombi de
  los harnesses (ver gotchas de `scripts/e2e/README.md`) — prioricé cerrar las 5 preguntas con
  evidencia de código+datos dentro del presupuesto de turno.
- Mario Parra (suspendido, rodilla+generic): no corrí su plan porque está suspendido y no entrena
  hoy — mencionado en el baseline, no repetí la medición.
- No revisé `correctiveFor`/el trabajo correctivo (bloque final de `generarRutinas`) contra
  codo/cuello — fuera del alcance de las 5 preguntas y del área de G2.
