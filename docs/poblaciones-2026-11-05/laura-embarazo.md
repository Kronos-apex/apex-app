# Dictamen de Laura · embarazo por estándar y alerta cardíaca (5-nov-2026, tarde)

Estado: CERRADO (E1 a E4). Sigue a `laura.md` (mañana) y responde `_BRIEFING-2.md`. Veredicto vinculante en seguridad. Todas las cifras salen del catálogo real de 375 (`defaultExercises`, extraído como en `cruzar-biblioteca.js`), de `WARMUP_LIBRARY` real y de `avi-core.js` real con las tablas nuevas inyectadas **solo en una copia en memoria** (el repo no se tocó).

## E1 · La lista del ENTRENO para embarazo  (CERRADA)

**Veredicto:** se puede programar. Zona nueva `embarazo` (regex por nombre + 7 ids), siempre acompañada de `core_central` (la regla del abdomen, el impacto y los lastres de la mañana ya cubre lo demás). **Caen 60 de 375 (16,0 %) con `embarazo` sola; 59 de ellos no los quitaba `core_central`; juntas caen 124 de 375 (33,1 %); sobreviven 251.**

### Qué estándar uso en cada punto (y qué NO afirma)

| Punto | Fuente | Qué dice y cómo lo traduzco |
|---|---|---|
| Entrenar en embarazo sano es bueno; fuerza moderada y aeróbico moderado | ACOG Committee Opinion n.º 804 (2020); guías canadienses SOGC/CSEP 2019; OMS 2020 (150 min/semana de actividad moderada, más fuerza) | No quito el entreno de fuerza ni el cardio moderado. El tope es **hablar con comodidad** (prueba del habla). Por eso `embarazo` NO excluye prensa, sentadilla, remos, jalones, bici, elíptica ni caminata en cinta |
| Posición **boca arriba** | ACOG: desaconseja el ejercicio boca arriba **prolongado** después del primer trimestre (el útero puede comprimir la vena cava y bajar la presión). SOGC/CSEP 2019 es más laxa: sin restricción fija, pero «si aparecen mareo, náusea o malestar, cambiar de posición» | Los dos coinciden en la parte práctica: **la persona debe poder cambiar de posición al primer síntoma**. La app no está en el cuarto y no ve el síntoma, así que su único control es **no ofrecer** el ejercicio plano boca arriba. Lado seguro, sin pretender que el estándar prohíba más de lo que prohíbe |
| Posición **boca abajo / peso sobre el vientre** | Sentido clínico del embarazo avanzado; no hay una norma de la OMS ni de ACOG que la prohíba por nombre | Lo trato como 🟡 de comodidad y de protección de la pared abdominal (diástasis gestacional), no como contraindicación absoluta |
| **Caídas y golpes en el abdomen** | ACOG 804: evitar actividades con riesgo de caída o de trauma abdominal (contacto, esquí, equitación, gimnasia, buceo) | En el gimnasio traduzco: barra sobre la espalda o el hombro con **un solo apoyo** (búlgara con barra, zancada con barra), el curl nórdico (cae hacia adelante) y la sentadilla sissy (se inclina atrás sobre las rodillas) |
| **Valsalva y cargas máximas** | SOGC/CSEP 2019: fuerza sí; evitar contener la respiración y cargas supramáximas | Va por el **candado de 8 repeticiones mínimas y exhalar** que ya dicté para `core_central` (y que se aplica siempre que haya `embarazo`, porque siempre viaja con ella). Por NOMBRE solo saco el peso muerto parcial en rack (e309), que es sobrecarga por definición |
| **Calor y esfuerzo máximo** | ACOG 804 y SOGC/CSEP: evitar calor/humedad excesivos; esfuerzo vigoroso solo si ya era habitual | La app no ve el calor ni si era habitual. Saco HIIT/intervalos y la bici de asalto (esfuerzo máximo por diseño). Los demás cardios quedan y el texto manda la prueba del habla e hidratación |
| **Laxitud ligamentaria (relaxina)** | ACOG 804 lo menciona como razón para cuidar los rangos extremos | **No** lo traduzco en lista: no hay forma de leerlo por nombre sin vaciar la pierna. Va al texto |

⚠️ No dejo constancia de ninguna cifra de semanas que no sea de estas guías. No cito umbrales numéricos de sentadilla ni de carga: **ningún estándar los fija**.

### La regex (para `GEN_ZONE_EXCL.embarazo`, contra el nombre normalizado, sin lookbehind)

```
/press de banca|press declinado|aperturas declinadas|aperturas con mancuernas en banco|press de pecho en el suelo|press frances|press jm|press tate|pullover con (mancuerna en banco|barra z)|curl femoral tumbado|hip thrust|puente|frog pump|prensa vertical|superman|nadador|elevaciones y-t-w|hiperextensi(on|ones) (en banco|de cadera)|curl de biceps arana|remo invertido|remo renegado|curl nordico|sissy|zercher|bicicleta de asalto|hiit|intervalos|lagartijas|push-?up|flexiones (diamante|arqueras|con )|dead bug/
```

Y la lista por id, para lo que el nombre no delata (`GEN_EXCL_IDS.embarazo`):

```
['e72', 'e110', 'e246', 'e309', 'e322', 'e332', 'e334']
```
- `e72` Dead Bug (también por nombre; id por si lo renombran) · `e110` Press Inclinado con Barra («banco inclinado **30**-45°»: a 30° es casi plano y la descripción misma lo autoriza) · `e246` Zancada con Barra al Hombro · `e309` Peso Muerto Parcial en Rack · `e322` Pájaro en Banco Inclinado (boca abajo sobre el banco, no lo dice el nombre) · `e332` Curl Femoral a una Pierna (la máquina es la tumbada; la descripción no lo dice) · `e334` Sentadilla Búlgara con Barra.

🔴 **Error mío corregido por un control, déjenlo anotado.** La primera versión de la regex llevaba `hiperextensiones?` (que acepta «hiperextension**e**» y no «hiperextensión»): **no atrapaba `e357 Hiperextensión de Cadera en Banco Romano`** y el generador de prueba la puso en el plan de una embarazada. La cacé porque la corrida del generador me devolvió `e357` en el plan, no porque el listado la delatara. Con `hiperextensi(on|ones)` queda atrapada. Lección para el test: **el candado del entreno no puede usar su propia regex como oráculo** (ver candado 1).

### Cuántos caen (de 375) y cuáles

| | Ejercicios | % del catálogo |
|---|---|---|
| `embarazo` sola | **60** | 16,0 % |
| `core_central` sola (mañana) | 65 | 17,3 % |
| Los que ambas quitan (e380) | 1 | |
| **Solo `embarazo`, no `core_central`** | **59** | 15,7 % |
| **Unión (lo que ve una embarazada)** | **124** | 33,1 % |
| Sobreviven | 251 | 66,9 % |

Por músculo, `embarazo` sola: pecho 16 · glúteo 12 · espalda 8 · piernas 8 · tríceps 7 · hombros 4 · cardio 3 · core 1 · bíceps 1. Unión: pecho 16 · core 32 · piernas 16 · glúteo 15 · cardio 15 · espalda 11 · tríceps 8 · hombros 7 · otro 3 · bíceps 1. **Sobreviven por músculo (de 375):** pecho 23 · espalda 37 · hombros 33 · bíceps 33 · tríceps 23 · piernas 53 · glúteo 25 · core 8 · cardio 14 · otro 2.

**Las 60, por razón (suman 60, sin repetir):**
- **A · Boca arriba (34):** e1 e71 e215 e216 e217 e219 e222 e242 e291 e295 (press y apertura planos o declinados) · e112 e137 e296 · e12 e57 e273 e275 e276 (tríceps tumbado) · e73 e91 e106 e350 e359 (puentes y rana) · e42 e43 e92 e243 e348 e349 (hip thrust) · e72 · e110 · e146 e312 (remo invertido: empieza boca arriba bajo la mesa y es un sostén de tronco) · e345 (prensa vertical).
- **B · Boca abajo (9):** e15 e332 (curl femoral tumbado) · e82 e109 e149 (superman, Y-T-W en suelo, nadador) · e116 e357 (hiperextensión en banco romano: la almohadilla aprieta pelvis y vientre) · e264 e322 (araña y pájaro sobre banco inclinado).
- **C · Peso del cuerpo colgando sobre el vientre en el suelo (9):** e83 e123 e220 e293 e294 (lagartijas y variantes de punta de pie) · e97 e154 (pike) · e307 (renegado) · e335 (Zercher: la barra va contra el vientre).
- **D · Caída o equilibrio con carga (4):** e246 e334 · e337 (sissy) · e333 (nórdico).
- **E · Sobrecarga (1):** e309.
- **F · Esfuerzo máximo y calor (3):** e74 · e373 · e380 (este también cae por `core_central`).

### Lo que NO cae (los CONTROLES, y es el 80 % de lo útil)
Medidos, **0 de 52 controles caen** (por `embarazo` ni por `core_central`; 16 grupos): caminar y marchar (e375 caminata en cinta inclinada, e141, e145) · bici estática, reclinada e indoor (e64 e248 e249) · elíptica (e67) · sentadilla con barra, goblet, peso corporal, sit-to-stand y wall sit (e13 e70 e80 e158 e128) · prensa 45° y horizontal (e36 e236 e330) · rumano (e14 e226) · remos sentado, a una mano, con apoyo pectoral (e114 e52 e25 e229) · jalones (e6 e27) · press de hombro sentado y en máquina, laterales, face pull (e319 e22 e23 e8 e21) · press inclinado con mancuernas, hammer y pec deck (e2 e84 e111) · flexiones en pared, rodillas e inclinadas (e77 e78 e113) · Pallof, bird dog, plancha en rodillas y lateral (e133 e134 e164 e49) · cuadrupedia, fire hydrant, gato-camello (e165 e130 e90) · de lado: abducción tumbada y almeja (e163 e89) · glúteo de pie, abducción, curl femoral sentado y de pie (e44 e45 e129 e94 e126 e39) · curl, martillo, tríceps en polea (e29 e10 e11).
⚠️ **Dos pérdidas que conviene que el PO sepa (vienen de `core_central`, no de esta lista):** `e20 Carrera / Caminata` cae por el nombre «carrera»; quedan e375, e141 y e145 para caminar. Y el core de fuerza queda en **4**: Pallof, bird dog, plancha en rodillas y plancha lateral.

### Controles de que la lista discrimina (no es tautología)
1. **Oráculo independiente, por la DESCRIPCIÓN de cada ejercicio (posición), no por su nombre:** 28 ejercicios dicen «boca arriba», «acuéstate…», «boca abajo», «sobre el banco»…; la unión los atrapa a **28 de 28**. Con SOLO `core_central` (sin `embarazo`) escapan **23**: el barrido discrimina.
2. **Generador real, 8 escenarios** (mujer; principiante 3 días gym · intermedio 4 días gym · principiante 3 días casa · intermedio 5 días gym; objetivos «Ganar músculo» y «Bajar de peso»; mismo `seed` y `now`): **0 violaciones** de la unión; **ninguna rutina queda con menos de 3 ejercicios**; el total de ejercicios del plan es el **mismo** con y sin la nota (19/19, 23/23, 18/18, 29/29): el generador rellena con lo que sobrevive, no deja huecos. Core por rutina: 0 a 2 (el día sin core queda sin core: «un hueco no lastima», regla del 8-ago).
3. **Controles de la palabra:** `situación embarazosa` → `[]` (no dispara); `estoy embarazada de 12 semanas` → `['core_central','embarazo']`.

### Decisión sobre el trimestre: **NO leerlo. La lista se aplica desde que lo nombra.**
Razones, con el dato:
1. **Solo podría usarse en la dirección PELIGROSA.** Más allá del primer trimestre ya quito todo lo que hay que quitar; leer el trimestre solo serviría para **relajar** la lista en el primero. Relajar sobre una lectura equivocada deja a una embarazada de 7 meses con press plano.
2. **Lo medí.** Un lector ingenuo (`N semanas`, `N meses`, `primer trimestre`) sobre 14 frases verosímiles acierta **8 de 14** y **se equivoca 6 veces en la dirección de relajar**: «llevo 8 semanas **entrenando** y estoy embarazada», «llevo 2 meses **en el gym**», «mi bebé nace **en** 3 meses», «cesárea hace 2 meses», «me operaron **hace 1 mes**», «empecé dieta hace 6 semanas». El número casi nunca es la edad gestacional, y las guías cuentan desde la última regla (que la gente no escribe igual).
3. **El costo de no leerlo es chico.** En el primer trimestre la persona pierde ejercicios que no necesitaba perder (34 de «boca arriba»), pero los reemplaza el generador con otros (plan igual de largo, escenario 2 de arriba), y las guías mismas dicen que **la restricción aparece después de ese trimestre**: el costo es de variedad, no de entrenamiento.
4. **Quien sabe es el coach, no el parser.** Salida honesta: el **coach** puede quitar la frase de la nota (o lo que decida con el visto bueno de su médico) y la lista se levanta; la vigencia de Q5 (revisar a los 90 días, `core_central`) cubre que un embarazo ya terminado no quede para siempre. No hay «relajar sola» en ninguna ruta.

No propongo regex de trimestre. Si el PO lo pide de todas formas, el mínimo seguro es **tratar cualquier número como NO leído** y no relajar nunca.

---

## E2 · El calentamiento para embarazo  (CERRADA)

**Veredicto:** se puede programar. Lista por id, **sin lookbehind y sin tocar `wg1`/`wg2`**:

```
WARMUP_ZONE_EXCL_IDS.embarazo: ['we5', 'wc4', 'wac2', 'wac3', 'wac5', 'wa5', 'we4']
```
(Las de la mañana no cambian: `core_central: ['wac1','we4','we5']` · `hueso: ['we5','wac3']` · `presion: ['wa6','wac1']`.)

| Pieza | Por qué cae con `embarazo` | ¿La atrapa el NOMBRE? |
|---|---|---|
| `we5` rollitos | boca arriba, flexión de columna con balanceo y presión sobre el abdomen | no (solo id) |
| `wc4` puente de glúteo activación | boca arriba (el nombre dice «puente»: lo atrapa la regex del entreno) | **sí** (`puente`) |
| `wac2` deadbug | boca arriba. **Rectifica la mañana:** allí lo saqué de la lista de `core_central` por el argumento de la persona que no lo escribió; con `embarazo` nombrado la razón es otra y sí lo saco | no («Deadbug» sin espacio no cae en `dead bug`; solo id) |
| `wac3` rotación de cadera tumbado | boca arriba, rodillas al pecho | no (solo id) |
| `wac5` respiración 360° | boca arriba | no (solo id) |
| `wa5` elevaciones en Y y T | boca abajo (o con el pecho sobre un banco inclinado) | no (solo id) |
| `we4` plancha de hombros | peso del cuerpo sobre el vientre y las muñecas (ya salía por `core_central`) | sí (`plancha`, por la regla de la mañana) |

**Lo que NO cae a propósito (y es lo bueno del embarazo):** `wac4` perro de caza (cuadrupedia: es la posición que el estándar recomienda), `we1` gato-vaca, `we2` rotación torácica **de lado** (la descripción dice «acostado de lado»: de lado no es boca arriba), `wag1` almeja y `wag2/wag3` (de lado y cuadrupedia), `wc1 wc2 wc3 wc5` caderas de pie y sentado, `wr2 wr3`, `wt1 wt2`, `wh1…wh3`, `wm1…wm3`, `wa3 wa4 wah1 wah2`, `wai1…wai4`, `wg1 wg2 wg3`. `wa1` lagartija inclinada también se queda: su texto pide pared o banco alto primero.

### Barrido (mismo método de la mañana)
`wuResolveRecipe` + `warmupContraindicated` reales, con las tablas cargadas **solo en memoria**, sobre **1.440 casos** = 12 recetas × 2 sitios (gym, casa) × con/sin impacto × 30 conjuntos de zonas: `embarazo` sola · `embarazo + core_central` · cada una con cada una de las 11 zonas viejas · con `presion` · con `hueso` · con ambas · con las 11 viejas a la vez · tres combinaciones extremas con lumbar + rodilla + tobillo.

| Medida | Resultado | Control |
|---|---|---|
| Violaciones contra el **oráculo clínico escrito a mano** (no las listas del código) | **0 de 1.440** | con la lista `embarazo` por id **vaciada**, el mismo oráculo da **424**: el barrido discrimina |
| Recetas sin bloque general | **0** | `wg1`/`wg2` no están en ninguna lista (medido) |
| Recetas sin ninguna pieza de movilidad | **0** | |
| Ids de las 4 listas que no existen en `WARMUP_LIBRARY` | **0** (las 7 de `embarazo` existen) | `wf1` y `wg4` siguen sin estar en la biblioteca |
| `wg1`/`wg2` en alguna lista | **no** | |
| Piezas que **ASCIENDEN** (la clase de bug del 20-sep) | **exactamente UNA: `wah1`** (jalón facial liviano con banda), 296 casos | es ✅ para embarazo, `core_central`, `hueso` y `presion` (ya la aprobé el 23-oct) |

Cómo asciende `wah1`: `we4 > wah1` en EMPUJE y TREN_SUP (la plancha de hombros sale por `embarazo` y por `core_central`); **y un camino nuevo respecto de la mañana: `wa5 > wah1` en HOMBROS_BRAZOS** (las Y-T boca abajo salen); `wa6 > wah1` en TRACCION solo con `presion`. **Control independiente por descripción:** las piezas cuya DESCRIPCIÓN dice «boca arriba / boca abajo / acostado» son `we5 we2 wa5 wc4 wag1 wac2 wac3 wac5`; quitando las dos que dicen «de lado» (`we2`, `wag1`), son **exactamente** las 6 de mi lista (más `we4`, que es plancha).

### 🟡 Los huecos de MENOS (lo que cuesta, medido): **6 de las 12 recetas pierden una pieza de activación**
Hoy, con `embarazo`: PIERNA, FULL_BODY, GP_A y GP_B pierden `wc4` (el puente de activación, su única opción); CARDIO_CORE pierde `wac2` y queda **sin ninguna activación**; CORE_CARDIO pierde `wac5` (la respiración). Ninguna queda sin bloque general ni sin movilidad (el candado de verdad), pero un día de glúteo sin activación de glúteo no es un buen calentamiento. **Propuesta, que es receta de Coach Pro/Valery y por tanto decide el PO con ellos** (la medí: cierra los huecos, 0 violaciones, 0 ascensos nuevos peligrosos):

```
PIERNA / FULL_BODY / GP_A : act[0] = ['wc4', 'wag3']     (patada atrás en cuatro apoyos)
GP_B                       : act[0] = ['wc4', 'wag1']     (almeja, de lado)
CARDIO_CORE                : act    = [['wac4','wac2'], ['wac5']]   (la misma que ya recomendé esta mañana)
CORE_CARDIO                : act[0] = ['wac5', 'wac6']    (pieza nueva, abajo)
```
Resultado medido con esa propuesta: con `embarazo` solo queda con una pieza menos CARDIO_CORE (de dos de activación a una: `wac4`); las otras 11 recetas quedan completas. Ascienden además `wag3` (PIERNA, FULL_BODY, GP_A), `wag1` (GP_B) y `wac6` (CORE_CARDIO): `wag1` y `wag3` ya estaban en la biblioteca y las aprobé el 23-oct (de lado y cuadrupedia, sin riesgo para estas claves); **`wac6` es nueva, no existe**, y el texto lo dicto yo:

> **wac6 · Respiración 360° sentada** · 5 respiraciones · «Siéntate con la espalda recta y apoyada, y las manos sobre las costillas. Inhala por la nariz: las costillas se abren a los lados y hacia atrás. Exhala largo por la boca, soltando las costillas. No aguantes el aire.»

Y si `wac6` entra a la biblioteca, **debe quedar fuera de toda lista** (es la alterna universal); si no entra, la cadena `['wac5','wac6']` queda como `['wac5']` y CORE_CARDIO conserva solo `wac4`. Esta propuesta no la exijo; **lo que SÍ exijo es la lista de arriba**.

### 🟡 Un texto para `wg3` (no exigido)
`wg3 Caminata rápida` dice «Debes poder hablar entrecortado, no cantar». La prueba del habla que usan ACOG y la guía canadiense para el embarazo es **hablar con comodidad**, no entrecortado. `wg1` ya dice «ritmo en que puedas conversar»; sugiero para `wg3`: «Debes poder hablar de corrido, sin quedarte sin aire» (sirve a todos, no solo a la embarazada).

### Qué no se mueve
CARDIO_CORE con impacto: `core_central` ya quita saltos y carrera del entreno, así que `wuSessionImpact` no dispara en la práctica; medido igual con impacto forzado: `mov wc1 we1 wt1 wai4 | act (vacío)` hoy, sin violaciones.
## E3 · Los textos de embarazo  (CERRADA)

**Veredicto:** el aviso obligatorio de la mañana se **reescribe**: dejó de ser cierto («NO controla la posición boca arriba ni boca abajo») y ahora trae el criterio de parada del estándar. Mismas reglas de la mañana: la app dice qué QUITÓ, jamás que lo que queda sea seguro; sin plazos; sin «no te preocupes»; sin «seguro/sin riesgo/sin problema»; la persona que se escribió sola lee «embarazo» porque ella misma lo escribió (no es un diagnóstico que la app le revele).

### 0 · La palabra (Q1 del embarazo; la clave nueva la necesita)
Una sola constante para las dos entradas de `GEN_LIMIT_KWS` (`core_central` **y** `embarazo`) y para la bandera `lim.embarazo`, así no se separan:

```
GEN_EMBARAZO_RE = /embaraz(?!os[oa])|gestante|gestacion|prenada|dulce espera|futura mama|bebe (viene )?en camino|(estoy|ando|vamos|estamos) esperando (un |mi |a mi |al )?(bebe|hij[oa]|nino|nina)|espero (un |mi )?(bebe|hij[oa]|nino|nina)/
```
(sobre `_norm()`, sin lookbehind; solo lookahead). Controles medidos: **19 de 19 frases positivas** («estoy embarazada», «embarazada de 12 semanas», «cursando gestación», «soy gestante», «estoy preñada», «estoy en dulce espera», «soy futura mamá», «mi bebé viene en camino», «estoy esperando un bebé», «espero un hijo para marzo»…) y **0 falsos positivos en 18 controles** («situación embarazosa», «qué embarazoso», «espero bajar de peso», «espero un cambio», «estoy esperando resultados», «esperando el bus», «tuve un bebé hace 8 meses», «gestión del tiempo», «digestión lenta», «congestión nasal», «sugestión», «espero a mi hijo en la salida del colegio», «mis niñas son pequeñas»…). **Falsos positivos que ACEPTO (lado seguro):** «mi esposa está embarazada» y «tuve un embarazo hace 3 años»: el parser no entiende sujeto ni tiempo; el costo es perder 59 ejercicios que podía hacer, y la revisión de Q5 (90 días) y el coach (quitar la frase) lo corrigen.

### 1 · Etiqueta, lo que quita y la parada

`GEN_ZONE_LABEL.embarazo` = `'embarazo'`. Medido: «Ojo con su embarazo» (con el «su» fijo de la plantilla). En la ficha `lim.zones` sale `['abdomen y piso pélvico', 'embarazo']`. ⚠️ **Una colisión de lectura:** cuando UNA pieza queda marcada por las dos claves a la vez, la plantilla de `warmupWarnText` une `a y b` y sale «Ojo con su abdomen y piso pélvico **y** embarazo» (medido). Exijo que, si `embarazo` está en la lista, la etiqueta de `core_central` se omita (el embarazo la implica): sale «Ojo con su embarazo».

`GEN_ZONE_QUITA.embarazo` (lo leen coach y cliente; solo lista lo quitado):
> `embarazo: ejercicios boca arriba o boca abajo, el peso del cuerpo sobre el vientre (lagartijas, pike), barras sobre una sola pierna, sobrecargas y el esfuerzo máximo (HIIT, bicicleta de asalto)`

🔴 **Lo cacé midiendo y es un candado:** con la clave nueva SIN entrada en `GEN_ZONE_QUITA`, `parseLimitations('estoy embarazada').advice` sale **«Quitamos lo que suele molestar ahí — .»** (la lista vacía después del guion). Es la clase de bug del 27-ago («este mapa se llena completo o la zona nace muda»). La suite debe afirmar que `_zonasQueQuita(['embarazo'])` NO es vacía.

`{PARADA}` del embarazo (criterio de parar: las señales de ACOG 804 y de la guía SOGC/CSEP 2019 de actividad en el embarazo; reemplaza a la `{PARADA}` de `core_central` cuando están juntas, porque ya la contiene):
> «Entrena a un ritmo en que puedas conversar, exhala en cada esfuerzo sin aguantar el aire y toma agua. Detente y consulta a tu médico u obstetra si tienes sangrado, pérdida de líquido, contracciones o dolor en el vientre, mareo o desmayo, dolor de cabeza fuerte, dolor en el pecho, falta de aire que aparece antes de esforzarte o no pasa al descansar, dolor o hinchazón en una pantorrilla, debilidad que te quite el equilibrio, o si notas que el bebé se mueve menos; si es fuerte, ve a urgencias. También detente si ves un bulto en el centro del abdomen.»

### 2 · El aviso al cliente (`genLimitationNote(lim,'client')`, cuando hay `lim.embarazo`; SIEMPRE, aunque sea la única condición)
> «⚠️ Escribiste algo sobre tu embarazo, así que armamos este plan cuidándolo, pero NO es un plan de embarazo. Todavía no lo ha revisado un profesional de la salud: antes de entrenar, pide el visto bueno de tu médico u obstetra. Quitamos los ejercicios boca arriba o boca abajo, los saltos y el esfuerzo máximo, y no sabemos en qué semana vas. {PARADA} Si algo no te cuadra, no lo hagas y avísale a tu coach.»

Cumple los candados de la mañana (8b): no contiene «molestia en» ni «te duele», sí «Todavía no lo ha revisado un profesional» y la `{PARADA}`; (8c) no nombra diagnósticos; (8d) ni «seguro», «sin riesgo», «sin problema», plazos ni «no te preocupes».

### 3 · El aviso al coach (`limitationCoachAlert` y `genLimitationNote(lim,'coach')`, siempre con `lim.embarazo`)
> «Menciona un embarazo. Este plan NO es un plan de embarazo y nadie lo ha revisado: que tenga el visto bueno de su médico u obstetra antes de entrenar. La app quitó lo que va boca arriba o boca abajo, el peso del cuerpo sobre el vientre, los saltos, el esfuerzo máximo y las barras sobre un solo apoyo, y pide 8 repeticiones o más exhalando. NO sabe en qué semana va (aplica todo desde que lo nombra), ni si tiene una condición que prohíbe entrenar (sangrado, placenta previa, preeclampsia, rotura de membranas, embarazo múltiple, hipertensión o diabetes sin control): pregúntale semanas, visto bueno y síntomas. No controla el calor, el agua ni los rangos extremos de cadera (la laxitud del embarazo). Si el embarazo ya terminó, quita la frase de la nota.»

Esto **reemplaza** la frase de la mañana «La app quita abdominales y planchas, pero NO controla la posición boca arriba ni boca abajo» (ahora falsa). Lo que sigue sin controlar es lo que dice el texto: semana, condición de riesgo, calor.

### 4 · Dos ajustes de texto que arrastra esta clave
- `wac2`: pasa a estar en `WARMUP_ZONE_EXCL_IDS.embarazo`. Su texto de la mañana («Exhala al extender. Si ves un bulto en el centro del abdomen, detente») se queda como está: sigue siendo la condición para que `wac2` no esté en la lista de `core_central`.
- Entrenamientos rápidos: **el hueco n.º 6 (`QUICK_WORKOUTS` no se filtran) pesa MÁS con esta clave**: «Abdomen Express» y «HIIT sin equipo» son boca arriba, planchas y saltos a un toque del Hoy. El candado 13 de la mañana pasa a ser obligatorio para `embarazo` también (abajo).
## E4 · La alerta cardíaca  (CERRADA)

**Veredicto:** se puede programar, **solo aviso, sin quitar ningún ejercicio** (decisión del PO). Gemela de `GEN_NERVE_RE` en lo clínico (criterio de derivación, no de sustitución), **distinta en una cosa que exijo: dispara sola**. `GEN_NERVE_RE` solo anuncia si `detected` (`detected && GEN_NERVE_RE.test(n)`); esta no. Una persona que escribe solo «a veces me desmayo» no tiene zona, así que hoy la app no haría nada.

### La regex (`GEN_CARDIAC_RE`, sobre `_norm()`, sin lookbehind; solo lookahead)

```
/palpitacion|taquicardia|desmay|sincope|(perdi|perdida de)l? (el )?conocimiento|se me (acelera|dispara|sale|salta)\w* (el )?(corazon|pecho)|corazon (acelerado|desbocado)|(el )?corazon (me )?(late|se pone)( muy| demasiado| super| bien)? \w*(rapido|fuerte|raro|acelerad)|latidos? (irregulares|raros|fuertes|descontrolados)|me duele el corazon|dolor\w* (fuerte |agudo )?(en|del|de) (el )?(corazon|pecho)[^.]{0,40}(al|cuando|mientras|despues de|con) (hacer |el |un |mucho |algun |cualquier |subir |subiendo )?(ejercicio|esfuerzo|corr(er|o|iendo)|trot(ar|o|ando)|camin(ar|o|ando)|escaleras|cardio|actividad)|dolor\w* (en|del|de) (el )?pecho (que )?(se )?(me )?(irradia|baja|pasa|va|se corre|se extiende) (al|a la|hacia|por)( el)? (brazo|mandibula|quijada|espalda|cuello)|opresion (en|del|de) (el )?(pecho|torax)|presion (fuerte )?en (el )?pecho|se me aprieta (el )?pecho|me aprieta (el )?pecho (al|cuando|mientras) (corro|camino|subo|hago|me esfuerzo|troto|entreno)|siento (que )?(me )?aprieta (el )?pecho|(siento|tengo|con) (como )?(un )?peso en (el )?pecho|me falta (el )?(aire|aliento|respiracion)|falta de (aire|aliento)|no puedo respirar|dificultad para respirar|disnea|me ahogo (al|cuando|con|sin|de repente|en reposo|caminando|subiendo)|\bmare(o|os|ada|ado)\b(?! (en|de|por|al) (el |un |los |las )?(carro|carros|bus|buses|avion|barco|bote|moto|viaje|viajar|viajes|transporte))|me marea\b|vertigo(?! a (las |la )?altura)|vision (borrosa|nublada)|se me nubla la vista/
```

### Controles medidos (al estilo de Q1)
**37 de 37 frases positivas** la disparan: «tengo palpitaciones», «se me acelera el corazón sin hacer nada», «mi corazón late muy rápido», «me desmayé el año pasado», «casi me desmayo», «perdí el conocimiento una vez», «dolor en el pecho al hacer ejercicio», «presión en el pecho cuando corro», «dolor fuerte en el pecho al subir escaleras», «dolor de pecho que se me va al brazo izquierdo», «me aprieta el pecho cuando camino rápido», «me falta el aire al caminar», «no puedo respirar bien», «me ahogo al subir escaleras», «me mareo cuando entreno», «tengo mareos», «vértigo al levantarme», «visión borrosa al esforzarme», «latidos irregulares»…

**Solo 1 falso positivo en 36 controles** (y es una negación, ver abajo). Controles que NO disparan: «frecuencia cardíaca en reposo 60» · «mi frecuencia cardíaca máxima es 180» · «quiero sacar pecho» · **«dolor de pecho por el press»** · «me duele el pectoral» · «dolor en el pecho por las flexiones de ayer» · **«me ahogo de la risa»** · «mareo en el bus» · «me mareo en el carro» · «me mareo al viajar en avión» · «la marea sube» · «vértigo a las alturas» · «mi corazón está fuerte y sano» · «me gusta el cardio» · «me falta tiempo» · «me falta motivación» · «falta de constancia» · «presión arterial normal» · «mucha presión en el trabajo» · «presión de grupo» · «el pecho me quedó cargado de la gripa» · «aumenté el peso en el pecho» · «la camiseta me aprieta el pecho» · «cargo más peso en el pecho cada semana» · «opresión política» · «quiero fortalecer el corazón» · «mi mamá tiene problemas del corazón».

### Cómo separo el pecho MÚSCULO del pecho CORAZÓN (lo que pidió el briefing)
Ninguna palabra sola lo separa («pecho» es las dos cosas). Lo separan **tres contextos**, y la clave es que la regla del músculo (`GEN_LIMIT_KWS` área `pecho`, que ya existe) sigue su camino y **no se toca**:
1. **Irradiación** del dolor al brazo, la mandíbula, la espalda o el cuello (un pectoral lastimado no se corre al brazo izquierdo).
2. **Esfuerzo GENERAL, no el nombre de un ejercicio:** «dolor en el pecho al hacer ejercicio / al correr / al subir escaleras / al caminar». «Dolor de pecho por el press» o «por las flexiones» no tiene ese contexto y se queda como músculo.
3. **Palabras que el músculo no usa:** «opresión», «presión en el pecho», «peso en el pecho», «se me aprieta el pecho», «me duele el corazón».
**«Dolor de pecho» a secas NO dispara.** En un gimnasio es músculo casi siempre y dispararía miles de avisos falsos; el caso cardíaco real cae en alguno de los tres contextos, y el cuestionario de dolor ya tiene su bandera roja `U2` (pecho + falta de aire, sudor frío o mareo) para quien lo llena.

### Falsos positivos que ACEPTO (el lado seguro, costo: un aviso de más)
1. **Negación:** «desmayo no, no tengo» y «sin mareos ni palpitaciones» disparan (el parser no entiende «no/sin»). Es un aviso recomendando valorar algo que ella dijo no tener: molesta, no daña.
2. **Otra persona:** «mi mamá tuvo un desmayo». Igual que «mi pareja está embarazada» de la mañana.
3. **Dolor muscular posterior a «hacer ejercicio»:** «dolor en el pecho después de hacer ejercicio» (puede ser músculo) dispara. Aceptado: no puedo separarlo por texto, y la dirección del error es recomendar una valoración.
4. **Mareo del embarazo** («tengo mareos por el embarazo»): dispara, y está bien: el mareo es una señal de parar del estándar (E3).
5. **Falta de aire por mal estado físico** («me falta el aire en la cardio»): dispara. Aceptado a propósito: el PO pidió «palpitaciones … y listo» y una valoración no le hace daño a quien se ahoga en el cardio.

### ¿Se relaciona con la clave `presion`? **No: son independientes, y es una decisión, no un descuido.**
`presion` lee **diagnósticos declarados** («hipertensión», «arritmia», «infarto», «losartán»); la alerta lee **síntomas** («palpitaciones», «desmayo», «me falta el aire»). Medido:

| Frase | Alerta | `presion` |
|---|---|---|
| «arritmia», «tuve un infarto», «soy hipertensa», «tomo losartán» | **no** | sí |
| «palpitaciones», «me desmayé», «me falta el aire» | **sí** | no |
| «tengo taquicardia al subir escaleras», «hipertensa con palpitaciones», «hipertensión y mareos» | **sí** | sí |

Por qué: (1) una persona con hipertensión diagnosticada ya está bajo un médico; recomendarle «que lo valore un profesional» en cada nota sería ruido, y el PO ya cortó dos veces los recordatorios a quien no responde; `presion` ya le dice al coach que pregunte si está controlada y que pare ante mareo, dolor de pecho o falta de aire. (2) Un síntoma sin diagnóstico no tiene casilla: ahí la alerta es lo único que lo agarra. (3) `taquicardia` cae en las dos (es diagnóstico Y síntoma): correcto. **La alerta NO agrega `presion` a `keys`:** no quita nada (decisión del PO).

### Los textos

`lim.cardiacAdvice` (al **coach**, mismo formato que `nerveAdvice`):
> «Menciona síntomas que pueden venir del corazón o de la respiración (palpitaciones, desmayo, mareo, falta de aire, o dolor o presión en el pecho al esfuerzo). Antes de cargar, que lo valore un profesional de la salud: este plan es un borrador y no reemplaza esa valoración. No se quitó ningún ejercicio por esto.»

A la **persona que se registró sola** (`genLimitationNote(lim,'client')`, cuando `lim.cardiac`; si además hay limitación, va **después** del aviso de la limitación):
> «⚠️ Escribiste algo que puede tener que ver con el corazón o con la respiración. Te recomendamos que lo consulte un profesional de la salud antes de entrenar: este plan no reemplaza esa valoración, y no quitamos ningún ejercicio por esto. Si lo sientes mientras entrenas, detente; y si es fuerte o no pasa, busca atención médica de una vez.»

Cumple lo que pidió el PO: **recomienda de una vez la valoración y nada más.** Sin «no te preocupes», sin plazos, sin diagnosticar (no enumera los síntomas que ella escribió, dice «algo que puede tener que ver con»), sin «seguro/sin riesgo».

Aviso al coach cuando se registra sola (`limitationCoachAlert`), para el caso **solo-cardíaco** (hoy `if (!l.detected) return null` lo dejaría mudo; hay que cambiarlo a `if (!l.detected && !l.cardiac) return null`):
> «⚠️ {Nombre} se registró por su cuenta y escribió algo que puede venir del corazón o de la respiración. Su plan se generó solo y NADIE lo ha revisado. {cardiacAdvice} Escribió: «{nota}»»

(Y en ese caso NO debe aparecer la frase «Esa zona NO tiene filtro automático: no se excluyó ni un ejercicio», que habla de una zona que no existe.)

### Dónde debe verse (superficies; la alerta hereda el fallo de `nerve`: solo aparece si hay limitación)
`parseLimitations` devuelve `cardiac` (booleana) y `cardiacAdvice`, **sin tocar** `detected`, `keys`, `zones` ni `hasExclusions`. `limitationsFor` ya reparte con `Object.assign({}, lim, …)`, así que `cardiac` viaja. Hay que tocar: (a) `genLimitationNote` cliente y coach, (b) `limitationCoachAlert` (la línea de arriba), (c) `renderGenPreview` en `app-3-coach.js`: hoy `_nerve` va dentro del banner `warn`, que solo sale con `_lim.detected`; la alerta necesita **su propio bloque** fuera de esa condición. 🟡 Opcional y no exigido: aplicar la misma regex a la nota libre del cuestionario de dolor, junto a `nervio_en_la_nota` (`avi-core.js:4578`); el PO dijo «solo aviso» y esa vía sube a nivel 4, así que **no la pido**.
## Qué NO miré y por qué

- **Los documentos de los estándares (ACOG n.º 804, SOGC/CSEP 2019, OMS 2020) no los abrí en esta sesión** (sin navegador ni web, por el briefing): los cito por lo que dicen sus recomendaciones prácticas, de memoria clínica. **No usé de ellos ninguna cifra como umbral** (ni semanas, ni kilos, ni frecuencia cardíaca). Antes de publicar el texto literal de las señales de parada (E3), que un obstetra o un médico deportivo lo lea: **mi competencia es la musculoesquelética**; las contraindicaciones obstétricas las dicta quien atiende el embarazo, y por eso la app pide su visto bueno antes de todo.
- 🔴 **Nutrición y embarazo: la app no sabe lo que es.** Medido: `grep embaraz` sobre `avi-core.js`, `app-*.js` e `index.html` solo devuelve la palabra «embarazoso» de un comentario y el aviso de e382 (el volteo de llanta: "no recomendado con hipertensión, hernia o embarazo"); ninguna lógica la lee. Una mujer que escribe «embarazada» con objetivo «Bajar de peso» recibe un plan de comida **con déficit**. No es mi área ni lo audité: es de **Andrés (Hyp)**, y es más grave que cualquier ejercicio de esta lista. Debe entrar como pendiente del PO.
- **Lactancia y postparto:** el PO dijo que solo se atiende lo que la persona nombra; `core_central` ya lee «postparto/cesárea/diástasis». No añadí lactancia (no cambia la carga que el catálogo puede aplicar por nombre).
- **Dolor de la cintura pélvica / sínfisis del pubis** (frecuente en el embarazo y agravado por la base abierta y la zancada profunda): no lo leo por nombre porque vaciaría la pierna; queda como pregunta del coach en el aviso («rangos extremos de cadera»). `e336 Sentadilla Cosaco` y las zancadas laterales **no** caen.
- **Entrenamientos rápidos (`QUICK_WORKOUTS`):** lo mismo que la mañana: no se filtran. No los volví a auditar; el candado 9 de abajo lo exige.
- **El generador de la ficha del coach (los ejercicios que el coach arma a mano):** el generador FILTRA y la marca solo AVISA («Ojo con su embarazo»); no bloquea lo que el coach elige. Es la regla de la casa; no la toqué.
- **Calor, hidratación y altura:** no se pueden leer por nombre; quedan en el texto del coach y en la `{PARADA}`.
- **Recetas de Coach Pro/Valery:** la propuesta de E2 (`wc4 → wag3/wag1`, `CARDIO_CORE`, `wac6`) la medí pero no es mía de decidir.
- **Efecto sobre `shockPlan`, descarga y estancamiento** de las claves nuevas: igual que esta mañana, `painExclZones` no las conoce porque vienen de notas; pendiente de mirar cuando se programen.
- **El PO descartó Q7:** ninguna casilla se construye. Sigo creyendo que la persona que no escribe «embarazada» queda sin proteger (por eso el principio de la «población invisible» sigue siendo el escudo), pero la decisión es suya y está tomada.

## Candados que exijo en la suite (antes de programar; no es opcional)

Se suman a los 14 de la mañana (menos el 10, que era el registro y queda sin efecto) y los **reemplazan** donde se nombra.

1. **Entreno (E1):** los ids que caen por `embarazo` quedan FIJADOS (**60 de 375**; 59 que `core_central` no quita; unión **124**) y la suite falla si cambia el catálogo sin revisión. **Oráculo independiente: la DESCRIPCIÓN, no el nombre ni la regex** (28 ejercicios que dicen «boca arriba/boca abajo/acuéstate/tumbado/sobre el banco»; la unión debe atrapar **28 de 28**) y su CONTROL: con SOLO `core_central` escapan **23** (>0). 🔴 **El test no puede usar `GEN_ZONE_EXCL.embarazo` para decidir lo que debe caer**: así se me coló `e357` (ver E1).
2. **Los 52 controles del entreno NO caen** (caminata en cinta, marcha, bici ×3, elíptica, sentadilla con barra/goblet/peso corporal/sit-to-stand/wall sit, prensa ×3, rumano ×2, remos ×4, jalones ×2, hombros ×5, press inclinado/hammer/pec deck, flexiones en pared/rodillas/inclinadas, Pallof, bird dog, plancha en rodillas y lateral, cuadrupedia ×3, de lado ×2, glúteo ×6, brazos ×3), y cada grupo de controles demuestra que su variante positiva SÍ cae (hip thrust, puente, press de banca, lagartijas: 6/4/5/1 en el catálogo, los 16 caen). `e110`, `e322`, `e332`, `e246`, `e309`, `e334` caen **por id** aunque se les cambie el nombre (renombrar no engaña); `e163` (abducción tumbado de LADO) y `e89` (almeja) NO caen.
3. **Sin lookbehind** en `GEN_EMBARAZO_RE`, `GEN_ZONE_EXCL.embarazo` y `GEN_CARDIAC_RE` (el check estático sobre `sinComentarios` de la mañana los cubre si recorre todo `avi-core.js`; verifíquese con un caso que SÍ contenga `(?<=`).
4. **Acoplamiento:** `parseLimitations('estoy embarazada').keys` contiene `embarazo` **Y** `core_central`; `('situación embarazosa').keys` no contiene ninguna de las dos; `lim.embarazo` es verdadero y falso respectivamente. Las 19 positivas y las 18 de control de E3 §0, cada control con su variante positiva que SÍ dispara.
5. **Trimestre NO se lee:** `parseLimitations('embarazada de 8 semanas').keys` es IGUAL a `('embarazada de 30 semanas').keys` y a `('embarazada').keys`. Ningún número relaja nada.
6. **Calentamiento (E2):** (a) `WARMUP_ZONE_EXCL_IDS.embarazo` son exactamente `['we5','wc4','wac2','wac3','wac5','wa5','we4']` y los 7 existen en `WARMUP_LIBRARY`; (b) barrido de las 12 recetas × 2 sitios × con/sin impacto × 30 conjuntos = **1.440 casos contra el oráculo escrito a mano: 0 violaciones**, y su CONTROL con la lista por id de `embarazo` vaciada da **> 0** (hoy 424); (c) **el conjunto de piezas que ascienden es EXACTAMENTE `{wah1}`** (si el PO aprueba mi propuesta de recetas, `{wah1, wag1, wag3, wac6}`); cualquier otro ascenso rompe el test hasta que yo barra de nuevo; (d) ninguna receta sin bloque general ni sin movilidad; (e) `wg1`, `wg2` y `wg3` no están en ninguna lista; (f) `wac2` **SÍ** está en `embarazo` y **NO** está en `core_central` (las dos mitades de la rectificación); (g) `wa1` y `wac4` NO están en ninguna.
7. **Textos (E3):** (a) `GEN_ZONE_LABEL.embarazo === 'embarazo'` y `GEN_ZONE_QUITA.embarazo` existen y `_zonasQueQuita(['embarazo'])` **no es vacía** (la frase «Quitamos lo que suele molestar ahí — .» no debe poder salir); (b) si `embarazo` está en la lista, no sale «abdomen y piso pélvico y embarazo»; (c) el aviso al cliente con `lim.embarazo` contiene «Todavía no lo ha revisado un profesional», «médico u obstetra», «visto bueno», las señales «sangrado», «líquido», «contracciones», «mareo», «dolor de cabeza», «pecho», «falta de aire», «pantorrilla» y «se mueve menos»; y NO contiene «molestia en», «te duele», «seguro», «sin riesgo», «sin problema», «no te preocupes», ni nombra un diagnóstico; (d) el aviso al coach contiene «NO es un plan de embarazo», «semana» y «obstetra» y **NO contiene la frase vieja** «NO controla la posición boca arriba ni boca abajo»; (e) ambos avisos salen **SIEMPRE** con `lim.embarazo`, aunque sea la única condición y aunque no se haya excluido nada.
8. **Alerta cardíaca (E4):** (a) las **37 positivas** disparan y los **36 controles** no, salvo la negación documentada (que se afirma como falso positivo ACEPTADO, para que nadie la «arregle» a ciegas); (b) **dispara sola**: `parseLimitations('a veces me desmayo')` → `cardiac` verdadero con `detected` falso, `keys` `[]` y `hasExclusions` falso; **no excluye ni un ejercicio** (generar con esa nota da el MISMO plan que sin nota); (c) `('arritmia')` → `presion` sí, `cardiac` no; `('taquicardia al subir escaleras')` → las dos; (d) `limitationCoachAlert` devuelve texto no nulo con una nota solo-cardíaca y ese texto NO contiene «Esa zona NO tiene filtro»; (e) los textos contienen «profesional de la salud» y no contienen «no te preocupes», «seguro», ni plazos; (f) el control de siempre: `'dolor de pecho por el press'` NO dispara y `'dolor en el pecho al hacer ejercicio'` SÍ.
9. **Entrenamientos rápidos:** ningún `QUICK_WORKOUTS` con un ejercicio de la unión `embarazo + core_central` se ofrece sin marca o sin filtro (hoy ninguno lo tiene: «Abdomen Express» y «HIIT sin equipo»).
10. **Repeticiones y Valsalva:** con la nota «embarazada» y objetivo «Fuerza», el esquema nunca baja de 8 repeticiones (viene por `core_central`; el test pasa por `embarazo` para que no se pierda si alguien separa las dos claves).
11. **Vigencia (Q5):** `embarazo` entra con plazo de revisión de **90 días** (como `core_central`) y el chip dice «Anotó embarazo hace más de 90 días…»; la persona sigue con la lista aunque pasen 400 días (nada se levanta solo); el coach la quita editando la nota.
12. **Mi candado 7 de siempre:** si alguien toca `GEN_ZONE_EXCL`, `GEN_EXCL_IDS`, `GEN_LIMIT_KWS`, `WARMUP_ZONE_EXCL_IDS` o `WU_RECIPES` después de este dictamen, el barrido de recetas × zonas se vuelve a correr completo (el del punto 6 YA es ese test, sobre las 11 zonas viejas + las 4 nuevas).

*Veredicto de Laura, 5-nov-2026 (tarde). Vinculante en seguridad. Decide el PO: la propuesta de recetas de E2, y la revisión por un obstetra del texto de las señales de parada. Andrés (Hyp): nutrición del embarazo, antes que cualquier otra cosa de esta lista.*
