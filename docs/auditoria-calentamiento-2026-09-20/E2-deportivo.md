# E2 · El calentamiento como contenido deportivo y como asunto de seguridad — Laura Ospina (fisio, veredicto vinculante) + Valery (coach)

## Veredicto en una frase

El motor y el catálogo están bien construidos, pero el calentamiento tiene dos huecos que **hoy**
tocan a personas reales con nombre — una postura de cadera (`wc3`, 90/90) que nunca fue revisada
por Laura para rodilla y se le sirve a dos personas con la rodilla dañada, y el aviso de «esto le
molesta a esta persona» que solo existe en la pantalla del coach y nunca en la pantalla donde de
verdad se entrena, dejando al propio coach calentando con una bisagra de cadera y un ejercicio de
columna en rodillas mientras tiene una bandera roja activa — y un tercer hallazgo de fondo: **41%
del catálogo (14 de 34 piezas) nunca llega a nadie** por cómo está armado `buildWarmup`, así que la
variedad de «9 pools» es en la práctica ilusoria.

## Los 3 más grandes

### 1 · 🔴 [Laura, VINCULANTE] `wc3` «Apertura de cadera (90/90)» se sirve HOY a dos personas con la rodilla dañada, y Laura nunca la revisó para esa zona

**Qué es.** `buildWarmup` filtra el pool de `cadera` con la misma regex genérica de exclusión de
rodilla (`GEN_ZONE_EXCL.rodilla`, pensada para el ENTRENO) porque `wc2` «Estocada con rotación»
contiene la palabra «estocada» — y esa palabra SÍ está en la lista de rodilla. Al sacar `wc2`, el
pool de cadera queda `[wc1, wc3, wc4, wc5]`, y el `slice(0,2)` que arma el calentamiento toma
`wc1` + `wc3`. `wc3` es una apertura de cadera 90/90: sentado, una pierna doblada al frente y otra
hacia afuera formando 90°, inclinándose sobre la pierna delantera — una postura que carga la
rodilla delantera en flexión profunda **y** rotación.

**A quién le pasa HOY, con nombre.**
- **Laura Ramirez Rueda** — notas del coach: *«Rodillas desgastadas, dolor en la espalda alta,
  dolor en los codos»*. Su rutina «Pierna» (Lunes, auto-derivada, `warmup:[]`) genera hoy:
  articulares `wc1, wc3, wr1, wr3, wt1, wt2` (medido corriendo `buildWarmup` real contra su rutina
  real con `limKeys:['rodilla']`).
- **Miguel Pulido** — notas del coach: *«Lesión rodilla derecha operada, con 10% menos de
  cartílago y tendón»* (el mismo perfil que describe `laura-physio.md`). Su rutina «Pierna A —
  Cuádriceps» (auto-derivada) genera exactamente el mismo par: `wc1, wc3, wr1, wr3, wt1, wt2`.

**Evidencia (archivo:línea + medición).**
- `avi-core.js:427` — `GEN_ZONE_EXCL.rodilla` incluye `estocada` en su regex (pensada para excluir
  «Estocada con Barra» del entreno, no para el calentamiento).
- `avi-core.js:857-866` `warmupContraindicated` reutiliza esa MISMA regex sobre los nombres del
  calentamiento (a propósito, «una función por la que pasan todas las rutas» — pero aquí el efecto
  colateral no fue revisado).
- Corrida real (`node`, `buildWarmup` extraído de `app-6-extra.js:2330` contra las rutinas reales
  de las dos personas, leídas por `SELECT` de solo lectura de `user_data.routines`):
  ```
  Laura Ramirez Rueda — Pierna — limKeys=["rodilla"]
    Articulares: [ 'wc1', 'wc3', 'wr1', 'wr3', 'wt1', 'wt2' ]
  Miguel Pulido — Pierna A — Cuádriceps — limKeys=["rodilla"]
    Articulares: [ 'wc1', 'wc3', 'wr1', 'wr3', 'wt1', 'wt2' ]
  ```
- `docs/dictamen-laura-dolor-2026-08-08.md` §3.2 (Rodilla, tabla de calentamiento) dice
  textualmente: *«❌ Prohibido: `wr2` Sentadilla de movilidad lenta · `wai1` Sentadilla peso
  corporal · `wai2` Desplante — ya están en `WARMUP_ZONE_EXCL_IDS.rodilla` y confirmo las tres. ✅
  Se puede: `wr1` Círculos de rodilla · `wr3` Movilidad de isquios · `wt1`/`wt2` tobillo · `wc1`
  Círculos de cadera · `wc4` Puente.»* — **`wc3` no aparece en ninguna de las dos listas.** No fue
  aprobada ni prohibida para rodilla: quedó fuera de la revisión porque nadie sabía que el pool
  de cadera se reordena cuando `wc2` sale.

**Cómo intenté tumbarlo.** Primero pensé que como `wr3` (que SÍ está aprobada explícitamente para
rodilla) se promueve por el mismo mecanismo, `wc3` también estaría cubierta por extensión — pero
`wr3` aparece nombrada línea por línea en el dictamen y `wc3` no. Después revisé si `wc4` (que sí
está aprobada, con matiz «suave») se promovía en su lugar — no: `wc1` nunca sale del pool de
cadera para rodilla (no está en ninguna lista ni matchea el regex), así que siempre gana el primer
lugar y `wc3` el segundo; `wc4` (3er lugar tras el filtro) nunca se alcanza. También comprobé que
esto no es hipotético: corrí el motor contra las rutinas REALES de las dos personas, no contra un
fixture inventado, y usé sus limitaciones REALES (`profile.notes`, parseadas con `parseLimitations`
tal como lo hace la app).

**Qué costaría arreglarlo.** Una línea: añadir `wc3` a `WARMUP_ZONE_EXCL_IDS.rodilla`. **Veredicto
ya dictado, ver «Veredictos de Laura — cierre del lote» al final de este informe: `wc3` es ❌ para
rodilla**, con el comentario exacto que debe llevar el código y la confirmación de que lo que
queda (`wc1`+`wc4` de articular, `wai3`+`wai4` de activación) es mejor que lo de hoy, no solo
distinto.

---

### 2 · 🔴 [Laura, VINCULANTE] El calentamiento MANUAL nunca avisa en la pantalla donde se entrena — y hoy el propio coach lo sufre con una bandera roja activa

**Qué es.** El calentamiento manual (armado por el coach a mano, `routine.warmup`) es, por diseño,
la única superficie que NUNCA se filtra — decisión correcta y documentada (`avi-core.js:805-808`):
ahí decide una persona y no se le esconden opciones en silencio. Pero el aviso naranja que existe
para que esa persona SEPA qué está eligiendo (`warmupWarnZones`/`warmupWarnText`) **solo se pinta
en el editor de rutinas del coach** (`app-3-coach.js:3623-3665`, dentro de `renderRfWarmup` y
`openWarmPicker`). La pantalla donde de verdad se entrena — `renderWarmup` en `app-6-extra.js:2464`,
la que pinta la tarjeta de calentamiento de la sesión — **nunca llama a `warmupWarnText` ni a
`warmupWarnZones`** (verificado: `grep` de las dos funciones en `index.html` + los 9 `app-*.js` solo
las encuentra en `app-3-coach.js`). Quien entrena con una lista manual no ve ningún aviso, la vea el
coach o la vea el asesorado.

**A quién le pasa HOY, con nombre.** **Andrés Martínez (el coach), en su propia rutina «Full body
funcional».** Tiene un reporte de dolor **activo hoy** (`painCareActive`, ventana de 14 días desde
`PAIN_TTL_MS`): *«muslo por detrás izquierda, nivel 3, bandera roja `R5`, triaje 4, inicio
traumatismo (corrió jugando fútbol)»*, reportado el 14-sep-2026 — vence el 28-sep, y hoy es 20-sep.
Esa zona mapea a `['lumbar', 'isquios']` (`_PAIN_ZONE_TO_EXCL`, `avi-core.js:9781`). Su lista manual
(armada el 10-sep, **4 días antes** del reporte) es:
`wh1 wh2 wc1 wc2 wr1 wr2 wt1 wt2 wm1 wm2 we5 we1 wa1 wai3`.

De esos 14, **dos** son exactamente lo que su propio filtro de lumbar excluiría — confirmado
corriendo `warmupContraindicated` (la función real, extraída de `avi-core.js:857`) contra cada
ítem de su lista con `limKeys:['lumbar','isquios']`:
```
we5 "Rollitos sobre colchoneta"      -> ❌ EL FILTRO LO QUITARÍA (está en WARMUP_ZONE_EXCL_IDS.lumbar)
wai3 "Peso muerto con peso corporal" -> ❌ EL FILTRO LO QUITARÍA (está en WARMUP_ZONE_EXCL_IDS.lumbar)
```
`we5` es rodar la columna adelante y atrás sobre el suelo (flexión/compresión lumbar repetida) y
`wai3` es la bisagra de cadera sin peso — el ensayo del peso muerto, justo el patrón de su lesión
(`e14` Peso Muerto Rumano). Ninguno de los dos aparece marcado en naranja en ningún lado que él
vea entrenando, porque el chip vive solo en el editor de esa rutina específica, y él la armó
ANTES del reporte — si no vuelve a abrir el editor de «Full body funcional», nunca lo va a ver.

*(Control: revisé la lista manual de **Danilo**, hernia lumbar L5 en notas, armada el 22-ago —
`wh1 wh2 wm1 we1 we2 wc1 wc2 wa1 wa3 wac1 wac2`. Corriendo el mismo chequeo con `limKeys:['lumbar']`,
**los 11 pasan** — su lista no contiene ni `we3`, `we5`, `wai3` ni `wac3`. Danilo NO es víctima hoy.
Las 4 listas de Claudia/Estella, armadas el 29-jun antes del filtro de lesiones (v424), tampoco son
víctimas hoy porque ninguna de las dos tiene `notes` ni `painCare` activos — si algún día declaran
algo, sus listas SÍ tienen ítems que caerían bajo lumbar/rodilla/aductor/abductor, medido y anotado
en «Sospechas sin medir».)*

**Cómo intenté tumbarlo.** Verifiqué que `PAIN_TTL_MS` (14 días) no hubiera vencido el reporte —
14-sep + 14 días = 28-sep, sigue activo. Verifiqué que no tuviera `cleared:true` en la fila real
de producción (no lo tiene). Verifiqué que el reporte de codo del 17-ago (que si estuviera activo
no cambiaría nada porque `codo` no tiene lista de calentamiento) ya había expirado, para no
contarlo dos veces. Y confirmé, corriendo su OTRA rutina de pierna auto-derivada («Pierna»,
Miércoles, `warmup:[]`), que el filtro SÍ funciona bien ahí: con `limKeys:['lumbar','isquios']`
pierde exactamente `wai3` de la activación y no cambia nada más — o sea que el motor de filtrado
es sano; el defecto es específicamente que la vía manual no avisa en pantalla.

**Qué costaría arreglarlo.** Media tarde: cablear `warmupWarnText`/`warmupWarnZones` también en
`renderWarmup` (app-6-extra.js), pintando el mismo aviso «Ojo con tu zona lumbar y la parte de
atrás de tu muslo» arriba de la lista manual, sin filtrar nada (se mantiene la decisión de que el
coach decide). Esto no toca el motor ni el filtro — solo hace visible lo que `warmupWarnZones` ya
sabe calcular.

---

### 3 · 🟡 [Valery/contenido, y en menor medida Laura] 14 de las 34 piezas del catálogo (41%) nunca llegan a NADIE por cómo está armado `buildWarmup` — la variedad de «9 pools» es ilusoria

**Qué es.** `buildWarmup` toma `pool.slice(0,2)` de cada área — SIEMPRE las dos primeras del
array, en el orden en que están escritas en `WARMUP_LIBRARY`. El único mecanismo que puede
desplazar esa selección es que una de las dos primeras salga excluida por seguridad (o, más raro,
por la regla anti-repetición de v594). Medí, corriendo `buildWarmup` real contra las **118 rutinas
auto-derivadas** de producción (`warmup:[]` o sin la clave, con `limKeys:null`, el caso de la
inmensa mayoría — 115 de 118 no tienen ninguna limitación activa hoy):

```
Frecuencia de cada pieza entre las 118 rutinas auto-derivadas (sin limitación activa):
  wh1 73/118  wh2 73/118  wh3  0/118  wh4  0/118  wh5  0/118
  wc1 80/118  wc2 80/118  wc3  0/118  wc4  0/118  wc5  0/118
  wr1 65/118  wr2 65/118  wr3  0/118
  wt1 65/118  wt2 65/118  (pool de solo 2, sin piezas muertas)
  wm1 73/118  wm2 73/118  wm3  0/118
  we5 74/118  we1 74/118  we2  0/118  we3  0/118  we4  0/118
  wa1 73/118  wa3 73/118  wa4  0/118  wa2  0/118
  wai1 4/118  wai2 5/118  wai3 68/118  wai4 59/118  (aquí SÍ rota, ver abajo)
  wac1 36/118 wac2 36/118 wac3  0/118
```

**14 piezas en 0/118: `wh3, wh4, wh5, wc3, wc4, wc5, wr3, wm3, we2, we3, we4, wa2, wa4, wac3`.**
De ellas, 12 son estructuralmente inalcanzables pase lo que pase (las dos primeras del pool nunca
salen excluidas para ninguna zona conocida) — incluidas piezas terapéuticas de verdad: `wc4`
Puente de glúteo (que Laura aprueba explícitamente para rodilla Y para aductor/abductor), `wh4`
Rotación torácica sentado, `we4` Plancha de hombros (protracción/retracción, lo único del catálogo
que prepara el patrón de remo). Si Laura corrigiera hoy el texto de cualquiera de esas 12, **nadie
lo vería jamás** vía auto-derivación. Las otras 2 (`wc3`, `wr3`) sí pueden promoverse — y de hecho
se promueven hoy para las 2 personas con rodilla del hallazgo #1, más el caso adicional del hallazgo
#1.

El caso de `wai1-4` (activación inferior) es la excepción que confirma la regla: ahí la regla
anti-repetición de v594 SÍ actúa con frecuencia (porque `wc2`/`wr2` disparan los patrones
«zancada»/«sentadilla» que la activación evita), y por eso `wai3`/`wai4` dominan sobre `wai1`/`wai2`
— es la razón por la que la propia CLAUDE.md documenta que v594 bajó las sentadillas dobles de 54 a
0. Ese mecanismo funciona; el de las otras 7 áreas, en la práctica, no tiene con qué dispararse.

**A quién le pasa.** A las 27 personas reales que entrenan hoy con calentamiento auto-derivado: ven
el MISMO par de movimientos por zona, sesión tras sesión, semana tras semana, mes tras mes — nunca
los otros 1-3 de cada pool. La distribución total de movimientos por sesión (6, 8, 12, 14 o 16,
medida sobre las 118) es razonable en tamaño, pero **la variedad prometida por 9 pools con hasta 5
opciones cada uno no existe en la práctica**: para el 96% de las rutinas auto-derivadas de hoy
(113 de 118 sin limitación de rodilla/lumbar activa) el contenido servido es 100% determinista.

**Cómo intenté tumbarlo.** Revisé si el catálogo se reordena o si hay aleatoriedad por semilla en
algún lado (como sí existe en `generarRutinas` para el entreno) — no la hay: `WARMUP_LIBRARY` es un
array fijo y `wuPool` no baraja nada. Revisé si `_usados`/`_sesPats` (la regla v594) rescataba más
casos de los que medí — comprobé caso por caso qué patrón (`WU_PATTERNS`: sentadilla, zancada,
bisagra, empuje, plancha, talones) tendría que matchear el NOMBRE de cada pieza en posición 1-2 para
que se autoexcluyera, y de las 34 piezas solo `wc2` (zancada) y `wr2`/`wai1` (sentadilla) matchean
algo — el resto de los pools no tiene ningún mecanismo de rotación posible salvo el filtro de
seguridad. Y till confirmé con la medición real (arriba): 0/118 no es una hipótesis, es lo que pasó.

**Qué costaría arreglarlo.** No es un bug de seguridad — es una decisión de diseño con un costo
oculto. Arreglarlo bien (rotar por fecha/persona en vez de tomar siempre las 2 primeras) es trabajo
de un día, y antes de tocarlo valdría medir si a alguien le importa: con **0 de 503 sesiones**
guardando qué se marcó del calentamiento (el hueco de instrumentación que el briefing ya señaló),
no hay forma de saber si la monotonía le molesta a alguien o si nunca se completa igual. Lo dejo
como hallazgo de contenido, no como bloqueo de seguridad.

## Todos los hallazgos

| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🔴 | `wc3` (90/90) se promueve para rodilla sin que Laura la haya revisado para esa zona | `avi-core.js:427,857` (`GEN_ZONE_EXCL.rodilla` vs `warmupContraindicated`) | **Sí** — Laura Ramirez Rueda y Miguel Pulido, ambos hoy, en su rutina de pierna real |
| 🔴 | El aviso de zona contraindicada en el calentamiento manual solo existe en el editor del coach, nunca en la pantalla de entreno | `app-3-coach.js:3623-3665` vs `app-6-extra.js:2464` (`renderWarmup`) | **Sí** — Andrés Martínez (el coach), `we5` y `wai3` servidos hoy con bandera roja `R5` activa (vence 28-sep) |
| 🟡 | 41% del catálogo (14/34) es inalcanzable por auto-derivación; 12 de esas piezas no tienen NINGÚN mecanismo de rescate | `app-6-extra.js:2330-2417` (`buildWarmup`, `slice(0,2)` fijo) | No hay «víctima» puntual — afecta a las 113-115 rutinas sin limitación con la misma monotonía |
| 🟡 | La zona `isquios` (creada v607) no tiene lista propia de ids en `WARMUP_ZONE_EXCL_IDS`; solo la cubre el regex compartido `GEN_ZONE_EXCL.isquios`, que no matchea ninguna de las 34 piezas | `avi-core.js:791-804` (falta la clave `isquios`) vs `avi-core.js:468` | No — medido: `wr3` (el único candidato remotamente relacionado, un estiramiento de isquios) nunca es alcanzable vía isquios porque `wr1` nunca sale del pool por esa zona; solo se alcanza vía la cascada de `rodilla` (hallazgo #1), no de isquios |
| 🟡 | El bucket `cardio` de `MUSCLE_WARMUP_MAP` (rodillas+tobillos, activación inferior) no calienta hombro pese a incluir ejercicios de tren superior pesado | `app-6-extra.js:2320` | Parcial — 10 rutinas reales «Cardio + Core» no tocan `hombros`; 2 de ellas (Diana Paola Diaz, Chema) incluyen Remo Ergómetro (tracción de espalda/hombro) sin ningún calentamiento de hombro dedicado |
| 🟢 | Duplicado de nombre «Círculos de muñeca» (`wh5` en hombros, `wm1` en muñecas) — mismo texto, distinto icono | `app-6-extra.js:2250,2275` | No — es un dato medido, `wh5` nunca se sirve (posición 5 de 5, ver hallazgo #3); confusión posible solo si el coach lo busca a mano en el selector |
| 🟢 | `wc1`/`wc4` figuran como 🟡 «modificar» (más pequeño / suave) para aductor/abductor en el dictamen, pero el motor no tiene un modo «modificado», solo incluye/excluye | `docs/dictamen-laura-dolor-2026-08-08.md` §3.1 | No — cero reportes activos de aductor/abductor hoy en toda la base |

## Lo que verifiqué y está SANO (con números)

- **Las 34 piezas existen, 0 ids duplicados, las 34 tienen `desc` y `ytQuery`** — confirmado
  contra el archivo (`app-6-extra.js:2242-2308`), coincide con el baseline del briefing.
- **`wt1` y `wc2` siguen permitidos según lo decidido por Laura** (documentado en el propio código,
  `app-6-extra.js:2255-2257,2270`) — no se re-litiga.
- **El filtro de lesiones SÍ cubre el calentamiento desde v424** y se aplica ANTES del
  `slice(0,2)`, tal como afirma el comentario del código (`app-6-extra.js:2325-2329`) — verificado
  leyendo `buildWarmup` línea por línea, no solo el comentario.
- **El filtro también respeta el dolor autorreportado (`painCare`), no solo las notas del coach**,
  desde v454 (`limitationsFor`, `avi-core.js:965-983`) — confirmado: es la vía por la que el
  reporte del propio coach (14-sep) llega a filtrar su propia rutina auto-derivada.
- **El motor de filtrado por sí mismo funciona bien en las rutas auto-derivadas** — corrí
  `buildWarmup` contra 3 casos reales con limitación activa (Andrés/lumbar+isquios, Laura Ramirez
  Rueda/rodilla, Miguel Pulido/rodilla) y en los 3 casos el ítem correcto sale del pool (`wai3`,
  `wc2`+`wr2`) y se sustituye por el siguiente disponible sin vaciar el puesto.
- **118 de 124 rutinas reales (95%) usan la vía auto-derivada** — recensado directamente con
  `SELECT` (127 client + 7 coach = 124; 6 con `warmup` propio, 70 con `warmup:[]`, 48 sin la
  clave), coincide exacto con el baseline del briefing.
- **La distribución de movimientos totales por calentamiento auto-derivado es 6, 8, 12, 14 o 16**,
  medida sobre las 118 (15, 44, 42, 2 y 15 rutinas respectivamente) — ningún caso da 0 ni un número
  absurdo; el tamaño en sí es razonable para un calentamiento.
- **La regla anti-repetición de v594 funciona**: medido, `wai3`/`wai4` (68 y 59 de 118) dominan
  sobre `wai1`/`wai2` (4 y 5 de 118) precisamente porque la activación evita repetir el patrón
  sentadilla/zancada que ya usó la movilidad de cadera/rodilla — coincide con lo que CLAUDE.md
  documenta haber medido en v594 (0 de 105 con doble sentadilla, contra 54 antes).
- **Danilo (hernia lumbar L5, lista manual del 22-ago) no es víctima hoy**: verificado ítem por
  ítem, ninguno de sus 11 movimientos manuales está en la lista de exclusión lumbar.
- **`GEN_ZONE_EXCL.isquios` (regex, no lista de ids) es una decisión deliberada de Laura**
  (documentada en `avi-core.js:449-467` y en `docs/veredictos-grasa-2026-09-11.md:70-87`) para el
  ENTRENO — y verifiqué que no le hace daño al calentamiento: ninguna de las 34 piezas menciona
  «curl femoral» ni «curl nórdico», así que la regex es inerte ahí, ni protege ni desprotege nada
  que no estuviera ya cubierto (o descubierto, hallazgo aparte).

## Sospechas sin medir

- **Claudia Valbuena y Estella Rodríguez** (4 listas manuales idénticas, del 29-jun, antes del
  filtro v424): hoy no tienen `notes` ni `painCare`, así que no son víctimas — pero si alguna vez
  declaran una limitación de lumbar/rodilla/aductor/abductor, sus listas manuales YA contienen
  ítems que el filtro les quitaría hoy mismo si fueran auto-derivadas (`wai2`, `we5`, `wac3` en
  «Pierna»; `wc2`, `wr2`, `wai1`, `wai3` en «Gluteo»). No lo escribo como hallazgo porque hoy no
  hay víctima, pero es la misma clase exacta del caso del coach — la próxima vez que alguien
  declare dolor, revisar SU lista manual, no asumir que el filtro la protege.
- **La franja de 48-72h de fase aguda de una lesión** (dictamen general de dolor, §4.2: «no
  estires lo que te duele») no está codificada en `buildWarmup`/`limitationsFor` en absoluto — el
  filtro trata igual una lesión de hace 2 horas que una de hace 13 días. Hoy no importa porque el
  único caso real (`wai3`/`we5` del coach) no incluye ningún estiramiento del sitio lesionado, pero
  si el próximo reporte activo cae sobre una zona cuyo calentamiento SÍ incluye un estiramiento
  directo de esa zona (ninguna de las 34 piezas hoy lo hace para isquios, per el hallazgo de
  arriba), la app se lo ofrecería igual en la hora 1 que en la semana 2.
- **`wa2` «Remo invertido en barra baja»** requiere equipo («opcional» en su propia descripción) y
  ningún ítem de `WARMUP_LIBRARY` declara `env`. Medido: `wa2` nunca se sirve hoy (posición 4 de 4
  en activación superior), así que no hay víctima — pero si el orden del pool cambiara algún día,
  alguien entrenando en casa podría recibir una instrucción que no puede ejecutar. No até este
  cabo porque no tiene exposición real hoy.

## Veredictos de Laura — cierre del lote (post-entrega, a pedido del coordinador)

### 1 · `wc3` con rodilla declarada: **❌ PROHIBIDO**

No es ambigua. La 90/90 pone la rodilla delantera en flexión profunda **y** rotación tibiofemoral
sostenida, cargada con el peso del tronco inclinado sobre esa misma pierna — es exactamente el
patrón que irrita un menisco o un cartílago desgastado, y aquí no hay ningún beneficio terapéutico
que lo compense (al contrario que `wr3`, que es un estiramiento de isquios autolimitado, sin forzar
la rodilla). No la aprobé el 8-ago porque nadie sabía que el pool de cadera la promueve cuando
`wc2` sale — hoy sí lo sé, y con eso zanjado: entra a la lista.

**Comentario para `WARMUP_ZONE_EXCL_IDS.rodilla`, en mi voz, para quien toque esa lista dentro de
un año:**
> `wc3` «Apertura de cadera (90/90)»: la rodilla delantera queda en flexión profunda sosteniendo el
> peso del tronco inclinado sobre ella, con la tibia rotada bajo el fémur — el mismo patrón que
> agrava un menisco o un cartílago desgastado, y sin ningún componente terapéutico que lo
> justifique (a diferencia de `wr3`, que es un estiramiento suave sin flexión forzada). Se promueve
> solo en `rodilla` porque `wc2` sale de ese pool por el regex de ENTRENO (`estocada`) — un efecto
> colateral, no una revisión — y por eso nadie la había mirado hasta hoy.

### 2 · ¿Qué queda cuando `wc3` sale? — Sí me sirve, y deja a estas dos personas MEJOR

Con `wc3` fuera, el pool de cadera para rodilla es `[wc1, wc4, wc5]` (`wc5` sigue excluida, ya
estaba en la lista de aductor/abductor pero no en la de rodilla — la reviso abajo, en el barrido).
`slice(0,2)` toma `wc1` + `wc4`. Las dos ya las tengo dictaminadas explícitamente para rodilla desde
el 8-ago (`wc1` círculos de cadera, `wc4` puente de glúteo — ✅ ambas).

Y el conjunto completo que le queda a Laura Ramirez Rueda y a Miguel Pulido es:
**articulares** `wc1, wc4, wr1, wr3, wt1, wt2` · **activación** `wai3, wai4` (esto último ya lo
confirmé corriendo el motor: con rodilla activa, `wai1`/`wai2` salen por id y quedan `wai3`+`wai4`).

Eso es MEJOR que lo de hoy, no solo distinto, por tres razones:
1. **`wc4` (puente de glúteo) es funcionalmente más útil antes de un día de pierna que un
   estiramiento estático de cadera** — activa el glúteo, que es lo que van a usar en sentadilla,
   prensa o hip thrust. `wc3` no activaba nada, solo estiraba.
2. **Cero carga añadida sobre la rodilla comprometida**: `wc1` es circular y controlado, `wc4` es
   supino con rodillas dobladas ~90° sin rotación — ninguno reproduce el mecanismo de lesión.
3. **El resto del set ya estaba bien** (`wr1`, `wr3`, `wt1`, `wt2`, `wai3`, `wai4` — los seis
   aprobados desde el 8-ago), así que el cambio no deja ningún hueco de calentamiento: rodilla,
   tobillo y cadera quedan cubiertos, y lo único que se va es lo que sobraba.

No hace falta agregar nada más. Con esto, cierro rodilla.

### 3 · La clase: barrí las 8 zonas contra las 9 áreas del catálogo — sí hay más casos, y aquí están dictaminados

Hice lo que pide la pregunta: para cada zona de `WARMUP_ZONE_EXCL_IDS`/`GEN_ZONE_EXCL`, calculé qué
pieza queda promovida al primer o segundo lugar de su pool cuando el ítem de siempre sale filtrado
(no solo el caso de rodilla que ya me trajeron). Cuatro promociones más, ninguna revisada hasta hoy:

| Zona que dispara | Pool afectado | Se va | Entra | Mi veredicto |
|---|---|---|---|---|
| **rodilla** | activación inferior | `wai1`, `wai2` (ids) | `wai3` + `wai4` | ✅ — hip hinge sin peso y elevación de talón, ninguno carga la rodilla en flexión. Ya aprobado arriba. |
| **cuello** | activación superior | `wa1` (id) + `wa2` (regex `sobre la cabeza`... no, por id) | `wa3` ya estaba, entra **`wa4`** | ✅ «Balanceo de brazos cruzados» — dinámico, de pie, sin llevar el cuello a rango final ni cargar nada por encima de la cabeza. Mismo perfil de riesgo que `wh1`, que ya tengo aprobado para cuello. |
| **cuello** | activación core | `wac1` (id) | `wac2` ya estaba, entra **`wac3`** | ✅ «Rotación de cadera tumbado» — el movimiento es de cadera y columna lumbar con la cabeza apoyada en el suelo; no exige ni flexión ni rotación cervical. |
| **muñeca** | activación superior | `wa1` (regex «lagartija») | `wa3` ya estaba, entra **`wa4`** | ✅ Mismo «Balanceo de brazos cruzados» — no hay apoyo de mano ni carga en muñeca en ningún momento del movimiento. |
| **aductor/abductor** | activación inferior | `wai2` (id) | `wai1` ya estaba (nunca sale), entra segundo **`wai3`** | ✅ ya cubierto — `wai3` es bisagra de cadera, no carga el plano frontal de la cadera. Y `wai1` (sentadilla peso corporal) queda 🟡, no ❌: es la misma reserva que ya dejé escrita el 8-ago para sentadilla en esa zona («pies al ancho de cadera, sin abrir») — el motor no tiene modo «modificar reps/instrucción», solo incluye/excluye, así que sigue sirviéndose sin la corrección verbal. No lo bloqueo porque el patrón en sí no es el problema; dejo dicho que el TEXTO de `wai1` debería llevar la instrucción «pies al ancho de la cadera» cuando algún día el motor pueda anotarlo — hoy no puede, y no lo voy a convertir en ❌ por una limitación de la implementación. |

Las otras cuatro zonas (**lumbar**, **hombro**, **tobillo**, **rodilla** en el resto de sus pools)
**no producen NINGUNA promoción nueva**, verificado ítem por ítem:
- **lumbar**: cuando `we5`/`we3` salen del pool de espalda, entran `we1`+`we2` — los dos **ya**
  estaban en mi propio dictamen del 8-ago (§3.3, tabla lumbar, ✅ explícito). Nada que dictaminar.
- **hombro**: `wh3` es la única excluida y vive en la posición 3 de 5 — nunca sale wh1/wh2 para
  ningún caso, así que `wh3` jamás se promueve a nadie. Cero exposición, cero dictamen necesario.
- **tobillo**: solo quedan `wai3` sola (pool de 1) cuando se excluyen `wai1`,`wai2`,`wai4` — ya
  aprobada arriba. Ningún ítem nuevo entra en juego.
- **rodilla** en `espalda`/`munecas`/`hombros`: la zona rodilla no toca ninguno de esos tres pools
  (ni por id ni por regex) — verificado, cero interacción.

**Cierro el lote: con las cinco dictaminadas arriba (`wc3` ❌, `wa4`/`wac3`/`wai3`+`wai4` ✅, `wai1`
🟡 sin cambio de conducta), todas las promociones que el patrón «una zona quita a otra pieza» puede
producir hoy en el catálogo de 34 quedan revisadas. No queda ninguna sin dictamen.**

## Qué NO miré y por qué

- **Los «sets de calentamiento» por ejercicio (la aproximación con % de peso)** — el briefing dice
  explícitamente que es OTRA COSA (E1: `gmToggleExWarm`/`buildWarmupSection`), y así lo dejé.
- **La ficha de video/guía del calentamiento (`openWarmupDetail`, el 🎥)** — es presentación, no
  contenido ni seguridad; no le vi valor de auditoría con el tiempo que tenía.
- **El editor del coach en detalle** (armar el calentamiento a mano, el selector, `warmup: []`) —
  es el área de E3 explícitamente; solo entré a `app-3-coach.js` para verificar DÓNDE vive el
  aviso naranja, no para auditar el editor completo.
- **Las 12 zonas de `PAIN_AREAS` que el asesorado puede declarar vs. las 8 (más `isquios`) que
  tienen lista de calentamiento** — toqué `isquios` porque el briefing lo señaló con nombre propio,
  pero no hice el barrido completo de las 16 zonas de `PAIN_AREAS` contra las 9 zonas de
  `WARMUP_ZONE_EXCL_IDS`/`GEN_ZONE_EXCL` una por una (codo, muñeca, pecho no tienen lista de
  calentamiento tampoco — pero verifiqué que ninguna de las 34 piezas necesita esa lista porque
  ninguna carga el codo/muñeca/pecho de forma directa, así que no perseguí más esa rama).
- **El impacto de este hallazgo en el ENTRENO** (no solo el calentamiento) — `GEN_ZONE_EXCL.rodilla`
  con «estocada» también filtra ejercicios de ENTRENO por ese mismo camino; no medí si eso genera
  huecos similares ahí, porque el entreno es fuera de mi encargo de hoy (E2 es calentamiento).
- **Corroborar con un navegador real** que `renderWarmup` efectivamente no pinta ningún aviso —
  los puertos de harness (8829/9349) estaban en riesgo de estar ocupados por los otros dos
  agentes, así que verifiqué por código (grep exhaustivo de las dos funciones en los 10 archivos
  JS) en vez de abrir la app. Es un hueco de rigor menor: el código es inequívoco (las funciones
  simplemente no aparecen fuera de `app-3-coach.js`), pero no lo vi pintado en pantalla.
