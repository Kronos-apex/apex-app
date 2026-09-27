# R13 · Lesiones: la matriz completa — veredicto consolidado (27-sep)

G2 terminó completo. G1 se cortó por el límite de sesión el 25-sep y su agente ya no existe; su informe
quedó con las 6 preguntas contestadas y sin las secciones de cierre. **El orquestador midió el 27-sep
cada afirmación que pesa**, contra el motor en Node (`require('./avi-core.js')` + el catálogo de
`app-1-infra.js`, 374 ejercicios, y `WARMUP_LIBRARY`, 34 piezas) y contra producción en solo lectura.
Script: `scratchpad/r13-medir.cjs` de esa sesión.

## Veredicto en una frase

El filtro hace bien lo que le toca al ALGORITMO. El hueco está en la mitad que le toca al COACH: la
regla de la casa dice que lo que arma el coach se MARCA, pero **esa marca solo existe cuando la persona
REPORTA dolor**. Lo que el coach escribe en las NOTAS no marca nada en ninguna pantalla: ni en el
editor, ni al aplicar una plantilla, ni en la ficha, ni durante el entreno. Y en dos años de app, los
asesorados han reportado dolor **cero veces** (los 2 reportes son del PO).

## Los hallazgos que quedan en pie (medidos)

### 🔴 1. Laura Ramírez Rueda entrena saltos, zancadas y extensiones con «rodillas desgastadas», y nada lo marca
- Notas del coach: *«Rodillas desgastadas, dolor en la espalda alta, dolor en los codos»*.
- Su plan real (SQL, 27-sep), creado a mano por el coach el 15 y el 23-sep:
  - **Pierna (lunes):** `e80` Sentadilla de Peso Corporal · `e35` Desplantes / Zancada · `e37`
    Extensión de Cuádriceps. Las tres son ❌ para rodilla en el dictamen de Laura (§3.2: la extensión
    terminal bajo carga es «el pico de estrés femoropatelar»).
  - **Glúteo (jueves):** `e61` Sentadilla Sumo · `e37` otra vez.
  - **Full body funcional (lunes, aplicada el 23-sep desde la MISMA plantilla que tiene Danilo):**
    `e69` Clean & Press ⚠️ AVANZADO · `e184` Sentadilla con Salto · `e81` Escaladores · `e75` Burpees.
  - **Codos:** `e11` Extensión de Tríceps con Cuerda en Polea (viernes) — el mismo ejercicio con el
    que el PO reportó su codo el 17-ago.
- **Los hizo** (historial): Pierna el 16-sep (y la empezó el 21, sin cerrar); Glúteo el 18-sep; Full
  body funcional **el 23-sep**, con saltos y escaladores; cambió los burpees por `e201` Plancha a
  Flexión, que la regla de codo quita (el 🔄 no la filtró porque las notas no reconocen «codos»).
- Por qué nada lo marcó — **cuatro puertas, verificadas en el código**:
  1. `_painForEx` (`app-6-extra.js:673`, la marca 🩹 del entreno) sale en `return null` si no hay
     `painCare` vigente. Nunca mira las notas.
  2. `rfExRow` / `renderRfExList` (el editor, adonde también llega `openNewRoutineFromTemplate`,
     `app-2-login.js:835`): ningún ejercicio se contrasta con la limitación. El editor YA calcula
     las claves (`app-3-coach.js:3783`), pero solo para el chip del calentamiento.
  3. `renderDetailRoutines` (`app-3-coach.js:3505`, la ficha): usa las claves solo para `buildWarmup`.
  4. `GEN_LIMIT_KWS` (`avi-core.js:365`) solo reconoce rodilla, lumbar, hombro y genérico:
     «espalda alta» y «codos» no producen nada (`parseLimitations` → `keys:['rodilla']`).
- Cómo intenté tumbarlo: busqué los 8 consumidores de `limitationsFor(`/`parseLimitations(` y los
  3 de `exerciseContraindicated(` en `app-*.js`. Ninguno marca un ejercicio de un plan guardado por
  una nota. El único que usa la nota contra un ejercicio es el filtro de opciones del 🔄
  (`app-2-login.js:696`), que no toca lo ya puesto.

### 🔴 2. La regla de rodilla se lleva lo que Laura escribió que NO se borra
- `GEN_ZONE_EXCL.rodilla` contiene `sentadilla` a secas. Medido con `exerciseContraindicated`:
  `e128` Wall Sit → excluido · `e158` Sit-to-Stand → excluido · `e70` Goblet → excluido. Control
  positivo `e184` Sentadilla con Salto → excluido; control sin zona → los tres vivos; control
  lumbar → los tres vivos (ahí v424 sí lo arregló).
- Dictamen de Laura, `docs/dictamen-laura-dolor-2026-08-08.md` §3.2: *«`e128` Wall Sit y `e158`
  Sit-to-Stand hasta el punto que no duela — **son terapéuticos y NO se borran**»*; `e70` Goblet es 🟡
  «en rango corto solo si va sin dolor». El mismo párrafo confirma la regla ancha: la contradicción
  es interna del dictamen y nadie la midió.
- Víctima hoy: nadie medible (solo afecta planes que GENERA el algoritmo; los de Laura R. los armó
  el coach). Afecta a toda persona con rodilla que genere plan, y G1 midió el efecto: con rodilla
  ascienden Clamshell, talones y prensa — y el wall-sit, que es el tratamiento, desaparece.

### 🟡 3. El texto del filtro describe la columna para cualquier zona
- `parseLimitations` (`avi-core.js:1042`) devuelve SIEMPRE *«Quitamos lo que suele molestar ahí:
  flexión y carga sobre la columna, giros cargados e impacto»*. Con las rodillas de Laura R. el
  texto habla de la columna. Sale en el banner del generador del coach (`app-3-coach.js:3614`) y en
  la nota del registro por cuenta propia (`genLimitationNote`). Clase «rótulo que niega lo que
  rotula» (v437).

### 🟡 4. Peso corporal puro + codo, muñeca o cuello deja UN solo ejercicio por grupo
Medido (entorno `corporal`, sin zona → con zona): cuello·espalda 3→1 (`e148`) · codo·tríceps 3→1
(`e254`) · muñeca·tríceps 3→1 (`e254`) · muñeca·pecho 8→1 (`e327`). No hay día vacío: se repite el
mismo. Víctima hoy: nadie (ninguna persona real tiene esas zonas declaradas por una puerta que llegue
al generador).

## Lo que se TUMBÓ (no llevar al PO)

- ❌ **G2 #3, «el pool colapsa a 1: Clamshell al 100% para Laura R., Press Pallof al 100% para
  Danilo».** No es un pool: `e89` es el correctivo de RODILLA y `e133` el de LUMBAR en
  `GEN_CORRECTIVE` (`avi-core.js:647`). Aparecen todos los días **porque se prescriben a propósito**.
  Su control (0% sin la limitación) es exactamente lo que produce un correctivo.
- ❌ **G1 #4, «con dolor de pecho ascienden las lagartijas y `wa1` sigue en el calentamiento».** La
  regla de pecho de Laura quita el FIN DE RANGO bajo carga (aperturas, contractora, fondos) y deja
  escrito que *«los presses se quedan TODOS y son 🟡»*. Una lagartija es un press. Coherente con su
  dictamen; si ella quiere revisarlo, es casilla suya, no defecto.
- ⚪ **G1 Q1, «espalda alta → cuello deja vivos remos y jalones».** Medido cierto (`e114`, `e6`,
  `e52`, `e25`, `e28` no caen), pero que el remo agrave el dolor interescapular es una tesis clínica
  discutible (el remo ligero suele ser tratamiento). Casilla para Laura, no hallazgo.
- ⚪ Isquios sin lista de calentamiento: cierto, y `wai3` lo cubre la lista de lumbar porque
  «muslo por detrás» siempre trae las dos. Sano hoy; anotado para quien separe esas zonas.

## Lo que está SANO (con números)
- Generador y calentamiento automático filtran por `limitationsFor` (notas + dolor), en los 3 sitios.
- `shockPlan` combina notas y dolor; no prescribe con nivel 3.
- 0 días vacíos en 1.720 días-sesión (G2, hasta 80 semillas, la cifra no se movió desde 40).
- Las 6 plantillas reales del coach y los 32 ids de `QUICK_WORKOUTS`: 0 contra `REMOVED_EXERCISES`
  (sin candado que lo sostenga mañana — 🟢, sin víctima).
- «otra zona»: el texto no promete una exclusión que no hace.
- El PO: su dolor de isquios (14-sep) sigue vigente hasta el 28-sep, y `e15` Curl Femoral de su
  martes SÍ lleva la 🩹 en el entreno (tiene reporte).

## Decisiones que son del PO / de Laura
1. **¿La nota del coach debe MARCAR los ejercicios que carga?** Recomendación: sí, del lado del
   COACH — editor, plantilla aplicada y ficha — con el mismo chip que ya tiene el calentamiento. En
   la pantalla del asesorado es otra decisión (la nota la escribió el coach, no la persona).
2. **¿Qué zonas nuevas reconocen las notas?** Las reglas de codo, muñeca, cuello, tobillo, pecho,
   isquios, aductor y abductor ya existen; solo faltan las palabras en `GEN_LIMIT_KWS`. «Espalda alta»
   → reglas de cuello es una aproximación que juzga Laura.
3. **Wall-sit y sit-to-stand fuera de la regla de rodilla**: ya lo dictó Laura por escrito; se
   ejecuta por id. `e70` Goblet (🟡 «rango corto») lo decide ella.
4. **Acto del PO, sin código:** revisar hoy el plan de Laura Ramírez (Pierna, Glúteo, Full body
   funcional y `e11`).

## Qué NO se miró
- Ningún teléfono real (como en las 12 rondas anteriores).
- `correctiveFor` contra codo/cuello (G2 lo dejó fuera).
- La casilla por casilla que G1 no alcanzó a escribir (zona × ejercicio): queda para Laura si se
  amplía `GEN_LIMIT_KWS`.
