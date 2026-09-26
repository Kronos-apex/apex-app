# G1 · La matriz de seguridad — Laura Ospina (fisio) + Coach Pro

## Veredicto en una frase
(pendiente)

## Los 3 más grandes
(pendiente)

## Todos los hallazgos (tabla: severidad 🔴/🟡/🟢 · qué · dónde · ¿víctima hoy?)
(pendiente)

## Respuesta a las preguntas del orquestador (una por una: CIERTA / FALSA / NO SE PUDO MEDIR)

### 1. Las tres aproximaciones — veredicto de Laura, ejercicio por ejercicio

**«espalda alta» → reglas de `cuello`: INCOMPLETA (quita de menos).** `cuello` está construida
alrededor del mecanismo CERVICAL (sobre la cabeza, colgado, crunch que jala el cuello, impacto) y
**no contiene ningún término de remo/jalón** salvo `remo con barra` (bisagra de columna). Medido
contra el catálogo (`exerciseContraindicated`): con «espalda alta» declarada, `e114` Remo Sentado
en Máquina, `e6` Jalón al Pecho en Polea, `e52` Remo con Mancuerna a una Mano, `e25` Remo en Polea a
una Mano, `e28` Jalón al Pecho Agarre Cerrado — **NINGUNO cae**. Clínicamente, el trapecio medio,
los romboides y el elevador de la escápula (lo que de verdad dolería en «espalda alta»/dolor
interescapular) son precisamente los músculos que traccionan estos remos y jalones — más que
cualquier extensión sobre la cabeza. La aproximación protege el cuello cervical pero deja viva la
carga directa sobre la zona que la persona señaló. Ejercicio concreto: alguien con «espalda alta»
sigue recibiendo Remo Sentado en Máquina sin ningún filtro.

**«muslo por delante» → reglas de `rodilla`: CORRECTA en cobertura, pero HEREDA UN DEFECTO GRAVE de
`rodilla` (ver hallazgo #1 más abajo).** El mapeo en sí es clínicamente razonable — cuádriceps y
rodilla comparten el aparato extensor, y la lista de `rodilla` (sentadillas, zancadas, extensión de
cuádriceps, saltos) es la correcta para dolor anterior de muslo. El problema no es la
APROXIMACIÓN: es que `rodilla` excluye por el término bare `sentadilla`, que atrapa a `e128`
Sentadilla Isométrica en Pared (Wall Sit) y `e158` Sentadilla a Silla (Sit-to-Stand) — **los dos
ejercicios que el propio dictamen de Laura (§3.2) llama «terapéuticos y NO se borran»**. Ver
hallazgo #1.

**«pantorrilla» → reglas de `tobillo`: CORRECTA.** El agravador directo (`elevacion de talones`) y
el impacto (`salto`, `carrera`, `sprint`) están cubiertos, y son exactamente el mecanismo de una
pantorrilla/Aquiles irritados. No se encontró un hueco comparable a los otros dos.

**Veredicto:** 🟡 CIERTA A MEDIAS. `muslo por delante` y `pantorrilla` son aproximaciones clínicas
razonables (el segundo problema de rodilla no es de la aproximación, es de la regla base). `espalda
alta → cuello` SÍ es una aproximación deficiente: quita lo cervical y deja viva la carga directa de
remo/jalón sobre la propia zona declarada.

### 2. El calentamiento sin lista para pecho, codo e isquios

**`codo`: CIERTO que ninguna de las 34 piezas lo carga — verificado pieza por pieza.** Barrido de
las 34 piezas de `WARMUP_LIBRARY` contra `GEN_ZONE_EXCL.codo` (que también aplica por NOMBRE, no
solo por id): 0 caen. Ninguna involucra el mecanismo de Laura (codo en flexión profunda con tríceps
alargado). Es una ausencia real de riesgo, no un hueco.

**`isquios`: CIERTO en la práctica, pero por una CASUALIDAD ESTRUCTURAL, no por diseño.** 0 piezas
caen por nombre (`curl femoral|curl nordico` no aparece en ningún nombre de calentamiento). El único
candidato real es `wai3` «Peso Muerto con Peso Corporal» (bisagra de cadera con carga en isquios
alargados — el mismo mecanismo por el que el curl nórdico SÍ se excluye en el entreno). `wai3` SÍ
está protegido, pero por la lista de **`lumbar`** (`WARMUP_ZONE_EXCL_IDS.lumbar` incluye `wai3`) —
y `isquios` SIEMPRE llega acompañado de `lumbar`, porque la única puerta de entrada
(`muslo por detrás` → `_PAIN_ZONE_TO_EXCL`) mapea a las DOS zonas a la vez, nunca a `isquios` sola.
Es un candado que funciona hoy por un acoplamiento que nadie decidió a propósito: si algún día
`isquios` se vuelve alcanzable sin `lumbar` (p. ej. una palabra clave de notas del coach que la
dispare sola — hoy `GEN_LIMIT_KWS` no la tiene, así que no ocurre), `wai3` quedaría sin filtro.

**`pecho`: FALSO — sí hay una pieza que lo carga y no cae ninguna lista.** `wa1` «Flexión de pecho
(lagartija)» es literalmente un push-up: carga directa del pectoral bajo el peso corporal. Verificado
con `buildWarmup` real: para un día de pecho con «pecho» declarado, `wa1` sigue en `activaciones`
IDÉNTICO al caso sin limitación — la única pieza que cae por el regex de pecho es `wh3` «Apertura de
pecho en pared» (que ni siquiera se llega a servir, porque el pool de hombros ya entrega `wh1`/`wh2`
antes). El regex de `pecho` (`aperturas|apertura de pecho|contractora|fondos|lanzamiento|azote`) no
contiene ningún término de flexión/lagartija, mientras que el de `muneca` sí atrapa `wa1` (por
`lagartija`) — la MISMA pieza está protegida para muñeca y desprotegida para pecho, la zona que
literalmente trabaja.

**Veredicto de la pregunta 2 en conjunto: PARCIALMENTE FALSA.** «Ninguna de las 34 carga esas
zonas» es cierto para codo, cierto en la práctica (no por diseño) para isquios, y **falso para
pecho**: `wa1` (push-up) queda sin filtrar con dolor de pecho declarado.

### 3. Lo que ASCIENDE en el ENTRENO — barrido de las 11 reglas
Ver «Ejercicios que ascienden» más abajo (sección aparte, con la tabla completa por zona). Resumen:
en la mayoría de zonas lo que asciende es clínicamente sano (glúteo en línea recta reemplaza a
lateral/abierto, movilidad de tobillo reemplaza a impacto). El hallazgo real es que **para
`aductor`, `abductor` y `tobillo`, `e128` Wall Sit y `e158` Sit-to-Stand ASCIENDEN** (se sirven MÁS
quedando fuera de rodilla) — consistente con que son seguros ahí, pero es la misma pieza que
`rodilla` **excluye por completo** en vez de solo modificar. Detalle en el hallazgo #1.

### 4. Pools que se vacían o quedan de 1
**CIERTA — 5 combinaciones reales (zona × entorno `corporal` × músculo) sobreviven con 1-2
candidatos, causadas por la zona (no por escasez de catálogo).** Ver tabla completa abajo. Los
casos con `musculo:'otro'` (e180/e68/e136) son FALSOS POSITIVOS: `GEN_DAYS` nunca pide
`muscle:'otro'` en ningún slot — el motor no puede vaciar un pool que nunca consulta.

### 5. Términos que muerden de más o de menos
**CIERTA — hay un caso grave de más (rodilla) y uno confirmado de menos (cuello/espalda-alta,
respondido en la pregunta 1).** Ver hallazgo #1 (rodilla come Wall Sit/Sit-to-Stand) y hallazgo #2
(discrepancia código/comentario en `hombro` con `colgarse`). El resto de los 11 regex se revisaron
contra el catálogo completo (374) sin encontrar otro caso de «rana en araña» o «salto en asalto» —
esas dos minas ya están cerradas (`\brana\b`, `\bsalto`).

### 6. «otra zona»
**CIERTA — el texto es honesto.** `painExclZones('otra zona')` devuelve `[]`; en
`limitationsFor` eso dispara el `return` temprano que NO agrega la frase «quitamos de tu plan…», y
en `painShowResult`/N1-N2 el texto se reemplaza por `PAIN_SIN_LISTA_C` («No te vamos a cambiar los
ejercicios: con lo que nos contaste no sabemos cuáles quitarte»). No promete una exclusión que no
ocurre. 🟡 **Matiz medido, no es un hallazgo pero queda anotado:** el texto de resultado que se
muestra justo al enviar el reporte (`opts.hasExclusions`) se calcula sobre el `limitationsFor()`
GLOBAL del cliente (todas sus zonas activas), no sobre la zona de ESTE reporte. Si alguien tiene
`rodilla` vigente por otro reporte y hoy reporta `otra zona`, el texto que ve dirá «sacamos de tu
sesión lo que carga esa zona» aunque para «otra zona» no se quitó nada — el filtro sí operó, pero
sobre la OTRA zona. Es un caso de baja probabilidad (dos reportes activos a la vez) y no se pudo
confirmar contra un cliente real hoy.

## Ejercicios que ascienden en el ENTRENO (barrido `generarRutinas`, 30-40 semillas × 72 combos
sexo×nivel×entorno×días, por zona; control: comparado contra la misma malla SIN limitación)

| Zona | Top ascienden (entran más) | ¿Alguno carga la MISMA zona sin estar excluido? |
|---|---|---|
| rodilla | Clamshell, Elevación de Talones, Curl Nórdico, RDL a una pierna, Prensa de Pierna (×3 variantes) | No. Prensa es 🟡 en el dictamen (no ❌), y el sistema no controla el rango — riesgo ya conocido y aceptado, no nuevo |
| lumbar | Remo Invertido, Escaladores, Plancha Lateral con Elevación de Cadera, Plancha Toque de Hombro, Caminata del Oso | No. Son ejercicios de estabilidad de core sin flexión de columna — sustitución sana |
| hombro | Rotación Externa con Banda, Elevaciones Y-T-W, Toques de Hombro en Plancha, Elevaciones Laterales, Face Pull | No. Son justo lo que Laura aprueba (`e21/e100` Face Pull, `e138` rotación externa) |
| aductor | Puente de Glúteo, Patada de Glúteo en Cuadrupedia, Zancada Inversa a Peso Corporal, **Sentadilla Isométrica en Pared (+162)** | `e128` Wall Sit asciende — es seguro para aductor, pero es la misma pieza que `rodilla` EXCLUYE por completo (hallazgo #1) |
| abductor | Puente de Glúteo, Frog Pump, Sentadilla Cosaco, **Wall Sit (+559)**, **Sit-to-Stand (+184)** | Mismo matiz que aductor |
| cuello | Face Pull, Elevaciones Y-T-W, Patrón de Bisagra sin peso, Toques de Hombro en Plancha, Rotación Externa | No |
| tobillo | Movilidad de Tobillo, **Wall Sit (+548)**, **Sit-to-Stand (+472)**, Sombra de Boxeo, Marcha en el Sitio | Mismo matiz |
| isquios | Aducción/Extensión de Cadera en Máquina, Elevación de Talones, Extensión de Cuádriceps | No — son de otro grupo muscular por completo |
| codo | Tríceps Isométrico Autorresistido, Patada de Tríceps (mancuerna/polea/banda/botella), Elevaciones Y-T-W | No |
| muneca | **Press de Pecho Isométrico Autorresistido (+1702)**, Elevaciones Y-T-W, Tríceps Isométrico, Press de Pecho con Banda de Pie | No — son autorresistidos/isométricos, sin carga sobre la muñeca en extensión |
| pecho | Pullover con Barra Z (+342), **Press de Pecho Isométrico Autorresistido (+149)**, Lagartijas en sus 6 variantes | ⚠️ Lagartijas (Push-up) y sus variantes ASCIENDEN al excluirse las aperturas — y siguen cargando pecho. Ver hallazgo #4 |

**Veredicto de la pregunta 3: en 9 de 11 zonas lo que asciende es clínicamente sano** (activación de
glúteo, estabilidad de core, trabajo isométrico). **En `aductor`/`abductor`/`tobillo` asciende Wall
Sit/Sit-to-Stand** — que es correcto para ESAS zonas, pero expone que `rodilla` los excluye sin
motivo (mismo hallazgo #1, visto desde el lado de la promoción). **En `pecho` lo que asciende (las
lagartijas) sigue cargando la zona declarada** — es el mismo hueco del hallazgo #4, confirmado
también por el lado de la promoción: al quitar aperturas/contractora, el generador rellena con MÁS
push-ups, no con menos carga de pecho.

## Pools que se vacían o quedan de 1 (zona × entorno × músculo, barrido de niveles P/I/A)

Control de discriminación: se descartan las filas donde el pool YA era de 1 SIN la zona activa
(escasez del catálogo, no del filtro) y las filas con `muscle:'otro'`, que `GEN_DAYS` **nunca pide**
como slot (verificado grepeando las plantillas — 0 apariciones de `'otro'` en `GEN_DAYS`).

| Zona | Entorno | Músculo | Sin zona | Con zona | Sobrevive | ¿Se repite a diario? |
|---|---|---|---|---|---|---|
| cuello | corporal | espalda | 3 | **1** | `e148` Patrón de Bisagra sin peso | Sí, en cualquier plan de casa/peso-corporal con día de espalda |
| codo | corporal | triceps | 2-3 | **1** | `e254` Tríceps Isométrico Autorresistido | Sí |
| muneca | corporal | triceps | 2-3 | **1** | `e254` Tríceps Isométrico Autorresistido | Sí |
| muneca | corporal | pecho | 4-8 | **1** | `e327` Press de Pecho Isométrico Autorresistido | Sí — el pool se desploma de hasta 8 candidatos a 1 |
| lumbar | corporal | espalda | 3 | 2 | `e148`, `e149` | Alterna entre 2, menos grave |
| tobillo | corporal | cardio | 8-9 | 2 | `e141` Marcha en el Sitio, `e144` Sombra de Boxeo | Alterna entre 2 |

**Veredicto de la pregunta 4: CIERTA.** El entorno **`corporal`** (peso corporal puro) es donde el
sistema se queda sin margen: quien entrena solo con su cuerpo Y declara codo, muñeca o cuello
termina con UN ÚNICO ejercicio isométrico repetido cada sesión para ese grupo muscular — no hay
error visible (la app sirve *algo*, nunca un hueco en blanco), pero el «un pool de 1 se repite todos
los días» del briefing se confirma exactamente para estos tres cruces. No se detectó ningún caso de
pool en CERO (hueco real en el día) entre las combinaciones revisadas.

## Casillas que necesitan dictamen (zona × ejercicio/pieza, veredicto ✅/🟡/❌ y razón clínica)
(pendiente)

## Lo que verifiqué y está SANO (con números)
(pendiente)

## Sospechas sin medir
(pendiente)

## Qué NO miré y por qué
(pendiente)
