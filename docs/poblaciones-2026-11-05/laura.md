# Dictamen de Laura · postparto/diástasis, osteopenia e hipertensión (5-nov-2026)

Estado: CERRADO (Q1 a Q7). Veredicto vinculante en seguridad. Todas las cifras salen de `avi-core.js` real y del catálogo de 375 (`defaultExercises`) corridos en memoria; el repo no se tocó.

**Resumen:** las tres claves (`core_central`, `hueso`, `presion`) SE PUEDEN PROGRAMAR con las regex de Q1/Q2, las listas por id de Q3, los textos de Q4, la vigencia de Q5 y los 14 candados del final. Caen en el entreno 65 / 31 / 44 de 375 ejercicios. `hernia umbilical` queda `lumbar` + `core_central` (Q6). Q7: recomiendo preguntar con casillas (decide el PO, y el abogado por Ley 1581).

## Q1 · Las palabras  (CERRADA)

**Veredicto:** se pueden programar las tres claves. Respecto de mi propuesta del 23-oct, la original tenía huecos (falsos negativos que la gente SÍ escribe: «post parto», «hernias umbilicales», «suelo pélvico», «me descalcifiqué», «hta», el fármaco solo) y un falso positivo evitable («tensión alta en el trapecio»). Control corrido con 60 frases (script de la sesión, fuera del repo): **0 discrepancias de 60** con las regex finales.

Regla de forma (todas): se evalúan sobre `_norm()` (sin tildes ni ñ), **sin lookbehind** (`(?<!…)` revienta el parseo en iPhone con Safari < 16.4 y tumbaría `avi-core.js` entero; solo uso lookahead, que el archivo ya usa), y cada término corto lleva su borde de palabra.

### Las regex finales (para `GEN_LIMIT_KWS`, como `{ zone: 'core_central'|'hueso'|'presion', re: … }`)

```
core_central:
/post ?parto|pos ?parto|despues (de|del) (mi |el )?parto|(tuve|tras) (un |mi )?parto|parto (natural|vaginal|por cesarea)|(^| )(di|dio|dieron|dar) a luz( |$)|diastasis|separacion (abdominal|de (los )?(rectos|abdominales))|cesarea|(piso|suelo) pelvic|prolapso|incontinencia|embaraz(?!os[oa])|hernias? (umbilical|abdominal|ventral|epigastric|incisional|inguinal|hiatal)|hernias? (en |de |del )(el |mi )?(ombligo|abdomen|vientre|estomago)|eventracion|histerectom|abdominoplast|bariatric|manga gastric|bypass gastric|laparotom|(cirugia|operacion) (abdominal|de abdomen)/

hueso:
/osteopeni|osteopor|descalcifi|densidad osea|huesos (fragiles|debiles|porosos)|fragilidad osea|fractura (vertebral|por compresion|por fragilidad|de (la )?columna)|aplastamiento vertebral|vertebra aplastada/

presion:
/hipertens|(presion|tension) (arterial )?(alta|elevada)(?! en )|\bhta\b|cardiopat|arritmia|taquicardia|infarto|angina de pecho|\bstent\b|marcapaso|angioplast|bypass coronari|insuficiencia cardiac|enfermedad (del )?corazon|problemas? (del |de |en el )?(el )?corazon|problemas? cardiac|soplo cardiac|valvulopat|losartan|enalapril|amlodipin|captopril|metoprolol|atenolol|carvedilol|hidroclorotiazida|valsartan|preeclampsia/
```

### Qué cambié y por qué (cada término con su CONTROL medido)

| Término | Decisión | Control (frase → resultado) |
|---|---|---|
| `parto` suelto | **NO entra** | «parto de cero, soy principiante» → 0 · «reparto domicilios» → 0 · «me apartó del gym» → 0. Solo frases completas (`despues del parto`, `parto natural`, `di a luz`) |
| `post ?parto`, `pos ?parto` | se agrega el espacio | «post parto» → ✔ (la original NO lo cazaba) |
| `(di\|dio\|dieron\|dar) a luz` con bordes | nuevo | «di a luz hace 6 meses» → ✔ · «a luz del día» → 0 |
| `cesarea` | se queda | «cesárea hace 10 años» → ✔ (a propósito, ver Q5) · «César», «Cesáreo» → 0 |
| `diastasis` + `separacion abdominal/de rectos` | forma coloquial | «abdomen separado, separación abdominal» → ✔ |
| `piso pelvico` → `(piso\|suelo) pelvic` | se agrega «suelo» | «suelo pélvico» → ✔ |
| `incontinencia` | **nuevo** | «incontinencia al toser» → ✔. Es el síntoma que sí escriben («se me sale el pipí al saltar»); mismo manejo que el piso pélvico |
| `embaraz(?!os[oa])` | excluye «embarazoso» | «situación embarazosa» → 0 · «embarazada de 12 semanas» → ✔ |
| `hernia umbilical/abdominal` | se amplía: ventral, epigástrica, incisional, **inguinal**, hiatal, «hernia en el ombligo», plural | «hernias umbilicales» → ✔ (la original NO) · «hernia discal L5» → **0 en core_central** (sigue solo `lumbar`; control central) |
| `histerectom`, `abdominoplast`, `bariatric`, `manga gastric`, `bypass gastric`, `laparotom`, `cirugia/operacion abdominal` | **nuevos** | Hoy «cirugía/operada» cae en `generic`, que **no excluye NADA**. Una cirugía abdominal reciente es exactamente `core_central`. `bypass` va solo con «gastric»: a secas es el bypass cardíaco |
| `osteopeni`, `osteopor` | se quedan | «osteoartrosis de rodilla» → 0 · «osteópata» → 0 · «menopausia» → **0** (control: NO se marca a toda mujer mayor de 45 como osteopénica) |
| `descalcifi`, `densidad osea`, `huesos fragiles/debiles/porosos`, `fractura vertebral/por compresion/por fragilidad/de columna` | **nuevos** | «me descalcifiqué» → ✔ · «fractura de muñeca» → 0 · «tomo calcio y vitamina D» → 0 |
| `hipertens` | se queda | «hipotensión, presión baja» → 0 (otra cosa; ver «No cubierto») |
| `presion alta`/`tension alta` → `(presion\|tension) (arterial )?(alta\|elevada)(?! en )` | «arterial/elevada» y filtro `(?! en )` | «tensión alta en el trapecio» → **0** (la original daba ✔ falso: tensión MUSCULAR) · «tengo la tensión alta, tomo pastillas» → ✔ |
| `presion` **a secas** | **NO entra jamás** | «siento presión en el pecho al correr» → 0 · «presión arterial normal» → 0 · «mucha presión en el trabajo» → 0. «Presión en el pecho» es bandera roja (U2 de mi dictamen del 8-ago), **no** hipertensión: mapearla a `presion` le daría a la persona la sensación de que la app «ya lo tiene» |
| `\bhta\b` | nuevo | «tengo hta» → ✔ |
| `\bstent\b` | nuevo, con bordes | «trabajo consistente y constante», «soy muy consistente» → **0** (sin `\b`, «consi-STENT-e» cae) |
| `infarto`, `cardiopat`, `arritmia`, `taquicardia`, `angina de pecho`, `marcapaso`, `angioplast`, `bypass coronari`, `insuficiencia cardiac`, `enfermedad del corazon`, `problema(s) del corazon/cardiac`, `soplo cardiac`, `valvulopat` | se agregan | «mi frecuencia cardíaca en reposo es 60» → **0** (por eso NO uso `cardiac` suelto) |
| fármacos (`losartan`, `enalapril`, `amlodipin`, `captopril`, `metoprolol`, `atenolol`, `carvedilol`, `hidroclorotiazida`, `valsartan`) y `preeclampsia` | **nuevos** | En Colombia lo escriben por el medicamento («hipertensión controlada con losartán» y «tomo losartán») |

### Falsos positivos que ACEPTO (el lado seguro)

1. «No estoy embarazada» y «mi pareja está embarazada» → ✔ `core_central`. El parser no entiende negación ni sujeto. Costo: quitarle crunch e impacto a quien no lo necesitaba; el coach lo ve en el aviso y borra la frase.
2. «Cesárea hace 10 años» → ✔ (ver Q5).
3. «Mi papá tuvo un infarto» → ✔ `presion` (antecedente familiar). Sin lookbehind no se separa sin riesgo de parseo. Costo: apneas e isométricos máximos para una persona sana; riesgo clínico: nulo.
4. «prolapso de la válvula mitral» → ✔ `core_central` (por `prolapso` a secas) y **no** `presion`. Caso raro, lo resuelve el coach.
5. «hipertensión pulmonar» → ✔ `presion`: correcto de todos modos.

### No cubierto a propósito (sin clave)

- **Hipotensión/mareo**, **lactancia**, **menopausia**, **ciclo**: no son restricciones de carga que el catálogo pueda aplicar por nombre. Marcarlas inventaría una población.
- **Alerta cardíaca (🟡 recomendación, la decide el PO):** «dolor de pecho al esfuerzo», «palpitaciones», «me desmayé», «me falta el aire» escritos en la nota hoy solo hacen ruido si traen la palabra «pecho» (zona `pecho`). Propongo un detector solo-aviso al coach, gemelo de `GEN_NERVE_RE`, SIN excluir nada: «Menciona síntomas que pueden venir del corazón. Antes de cargar, que lo valore un médico». No bloquea esta entrega.
## Q2 · Reglas del ENTRENO por clave  (CERRADA)

**Veredicto:** las tres se pueden programar con estas regex. Medidas contra el catálogo real de **375 ejercicios** (`defaultExercises`, extraído como en `cruzar-biblioteca.js`) y contra sus controles (todos los controles se quedan: 28 en `core_central`, 24 en `hueso`, 23 en `presion`; cada control es un ejercicio terapéutico o neutro que NO debe caer). Unidad de todas las cifras: **ejercicios del catálogo por nombre normalizado**.

Principio (el de isquios y el del 8-ago): la lista saca lo que **agrava** a esa población, jamás lo que es su tratamiento. La regla va por NOMBRE; lo que el nombre no puede leer (la carga, el Valsalva, el estadio postparto) lo dice el TEXTO (§Q4) y un candado de repeticiones (abajo).

### Regex finales (para `GEN_ZONE_EXCL`)

```
core_central:
/crunch|abdominales|sit-?up|russian twist|giro ruso|hollow|rueda abdominal|ab wheel|elevacion de (piernas|rodillas)|\bv-?ups?\b|dragon flag|lenador|plancha(?! en rodillas$)(?! lateral$)|toques de hombro|mountain climber|caminata del (oso|cangrejo)|oruga|cobra|\bsalto|saltarin|burpee|sprawl|sprint|carrera|rodillas altas|talones al gluteo|caminata del granjero|farmer|trineo|lastrad|lanzamiento|thruster|man maker|azote|clean|push press|cuerdas de batalla|pesa rusa|volteo de llanta|tire flip/

hueso:
/crunch|abdominales|sit-?up|russian twist|giro ruso|lenador|hollow|rueda abdominal|ab wheel|elevacion de (piernas|rodillas)|\bv-?ups?\b|dragon flag|oruga|postura del nino|buenos dias con barra|salto al cajon|doble salto|sprint|burpee|sprawl|volteo de llanta|tire flip/

presion:
/plancha|wall sit|sentadilla isometrica|hollow|colgarse|dragon flag|caminata del granjero|farmer|trineo|lastrad|volteo de llanta|tire flip|con salto|salto al cajon|salto del patinador|salto agrupado|doble salto|sprint|burpee|sprawl|hiit|man maker|thruster|cuerdas de batalla|clean|push press|azote|lanzamiento|pesa rusa/
```
⚠️ `plancha(?! en rodillas$)(?! lateral$)` se apoya en que el nombre normalizado termina ahí: «Plancha en Rodillas» (e164) y «Plancha Lateral» (e49) se quedan; «Plancha Lateral con Elevación de Cadera» (e371) cae. Cualquier plancha NUEVA que se agregue cae por defecto (lado seguro). Sin lookbehind.

### Cuántos caen (de 375)

| Clave | Caen | % del catálogo | Por músculo | Core que SOBREVIVE | Cardio que SOBREVIVE |
|---|---|---|---|---|---|
| `core_central` | **65** | 17,3 % | core 31 · cardio 13 · piernas 8 · otro 3 · hombros 3 · glúteo 3 · espalda 3 · tríceps 1 | 9 de 40 (de fuerza: e49, e72, e133, e134, e164) | 16 de 29 |
| `hueso` | **31** | 8,3 % | core 22 · cardio 5 · piernas 2 · otro 1 · espalda 1 | 18 de 40 | 24 de 29 |
| `presion` | **44** | 11,7 % | core 12 · cardio 9 · piernas 9 · otro 3 · hombros 3 · glúteo 3 · espalda 3 · bíceps 1 · tríceps 1 | 28 de 40 | 20 de 29 |

### Las listas

- **`core_central` (65):** e17 Plancha Frontal · e18 Crunch Abdominal · e47 Rueda Abdominal · e48 Elevación de Piernas Colgado · e62 Russian Twist · e63 Hollow Body · e20 Carrera/Caminata · e66 Salto a la Cuerda · e75 Burpees · e76 Saltos de Tijera · e81 Escaladores · e131 Crunch en Polea Alta · e132 Elevación de Piernas Tumbado · e136 Caminata del Granjero · e157 Toques de Hombro en Plancha · e168 Cobra · e176 Oruga · e182 Rodillas Altas · e183 Talones al Glúteo · e184 Sentadilla con Salto · e185 Zancadas con Salto · e186 Salto del Patinador · e187 Salto al Cajón · e188 Plancha Toque de Hombro · e189 Plancha Saltarina · e194 Caminata del Oso · e195 Caminata del Cangrejo · e198 Sprint en el Sitio · e200 Salto Agrupado · e201 Plancha a Flexión · e202 Burpee Completo · e203 Sprawl · e205 Zancada Lateral con Salto · e240 Crunch en Máquina · e241 Abdominales en Banco Declinado · e277 Fondos Lastrados · e304 Dominadas Lastradas · e347 Sentadilla con Chaleco Lastrado · e360/e361 Leñador en polea (×2) · e362 Giro Ruso en Polea · e363 Elevación de Piernas en Silla Romana · e364 Elevación de Rodillas Colgado · e365 Plancha con Disco · e366 Crunch Completo con Disco (Sit-up) · e367 Dragon Flag · e368 Hollow Rock · e369 Crunch Bicicleta · e370 Crunch en V · e371 Plancha Lateral con Elevación · e376/e377 Trineo (×2) · e378 Comba con Doble Salto · e379 Burpee con Salto al Cajón · e380 Sprint en Cinta · e381 Caminata con Chaleco Lastrado · e382 Volteo de Llanta · **y los explosivos que cargan la pared abdominal y el suelo pélvico: e69 Clean & Press, e190 Balanceo con Pesa Rusa, e191 Thruster, e192 Lanzamiento a Pared, e193 Cuerdas de Batalla, e196 Push Press, e197 Azote de Balón, e204 Man Maker** (los añadí al medir el caso de la hernia, Q6: cuando la `hernia` deja de pasar por la regla lumbar, `lanzamiento` y compañía no los atrapaba nadie).
- **`hueso` (31):** e18 · e47 · e48 · e62 · e63 · e75 · e131 · e132 · e167 Postura del Niño · e176 Oruga · e187 Salto al Cajón · e198 · e202 · e203 · e240 · e241 · e360 · e361 · e362 · e363 · e364 · e366 · e367 · e368 · e369 · e370 · e378 · e379 · e380 · e382 · **e50 Buenos Días con Barra**.
- **`presion` (44):** (los 39 de la primera pasada más e69, e190, e192, e196, e197: explosivos con apnea) las 9 planchas y variantes (e17, e49, e157, e164, e188, e189, e201, e365, e371) · e63 · e368 · e367 · e128 Wall Sit · e211 Colgarse de la Barra · e136 · e74 HIIT/Intervalos · e75 · e202 · e203 · e204 Man Maker · e191 Thruster · e193 Cuerdas de Batalla · e198 · e380 · saltos de potencia (e184 e185 e186 e187 e200 e205 e378 e379) · lastrados (e277 e304 e347 e381) · trineo (e376 e377) · e382.

### Por qué cada decisión (y lo que NO cae a propósito: es el tratamiento)

**`core_central` — presión intraabdominal, flexión de tronco, impacto y cargas que empujan hacia abajo.**
- Cae: toda la flexión de tronco (crunch, sit-up, v-up, rueda, dragon flag), rotación bajo carga (Russian twist, leñador), elevación de piernas (cúpula del abdomen y tracción de la pared), planchas de peso completo, escaladores y andares en cuadrupedia dinámicos (oso, cangrejo), impacto (todo `\bsalto`, carrera, rodillas altas, sprint, burpee), carga que empuja sobre el suelo pélvico (granjero, trineo, chaleco, **`lastrad`** = lastrados) y el volteo de llanta.
- Se queda (CONTROLES): **dead bug, Pallof, bird dog, plancha en rodillas, plancha lateral** (🟡: el texto pide parar si aparece un bulto o una cúpula central), puente y hip thrust, prensa, goblet, **sentadilla con barra y peso muerto rumano** (el nombre no distingue una carga liviana exhalando de un máximo reteniendo el aire: esa línea la pone el candado de repeticiones y el texto, no la lista; si el nombre las sacara, una mujer a 14 meses del parto perdería todo su tren inferior), bici, elíptica, marcha, caminata en cinta inclinada, wall sit, sit-to-stand, remos y jalones, curl femoral, dominadas (sin lastre), rotación torácica, círculos de cadera, gato-camello, postura del niño.
- ⚠️ **`cobra` y `oruga` caen** aunque son movilidad: la extensión prona estira la línea alba y presiona el abdomen (o la cicatriz); la oruga es plancha dinámica. Quedan cuatro piezas de movilidad (e165, e167, e170, e173), suficientes.
- **Lo que NO atrapa el nombre:** cuánta carga y si retiene el aire. Ver «Candado de repeticiones y Valsalva» abajo.
- Costo: el pool de core de fuerza queda en **5 ejercicios** (e49, e72, e133, e134, e164). Alcanza para el puesto de core de cada día; el generador ya repite con memoria semanal y, si un puesto queda vacío, hoy lo deja vacío y avisa (regla del 8-ago §3: «un hueco no lastima a nadie»).

**`hueso` — flexión y torsión CARGADAS de la columna, y riesgo de caída/aplastamiento.**
- Cae: crunch, sit-up, v-up, Russian twist, leñador, rueda, hollow, elevaciones de piernas (flexión lumbar sostenida), oruga y postura del niño (flexión sostenida de columna), **buenos días con barra** (carga sobre la espalda con tronco inclinado) y lo de mayor riesgo de caída o aterrizaje brusco (salto al cajón, doble salto, sprint, burpee, sprawl, volteo de llanta).
- **Se queda a propósito (la evidencia es a favor, no en contra):** **peso muerto convencional y rumano, sentadilla con barra, hip thrust, prensa, remo con barra, press militar con barra** (la carga axial progresiva con columna neutra es el estímulo óseo; ningún protocolo serio la quita), **superman e hiperextensiones** (la extensión de columna es el correctivo de la cifosis y reduce fracturas vertebrales), plancha y planchas laterales, dead bug, bird dog, Pallof, **salto a la cuerda y saltos de tijera** (impacto moderado: estímulo óseo), rotación torácica sin carga, zancada con giro sin carga, cobra y gato-camello. Medido: ninguno cae.
- ⚠️ **Lo que el nombre NO puede separar:** osteopenia (el impacto moderado ayuda) de osteoporosis con fractura vertebral previa (el impacto lo define el médico). Por eso el impacto **moderado** no se quita y el TEXTO (§Q4) le dice a quien tiene una fractura que el impacto y la carga los define su médico. Si el PO quiere que «fractura vertebral» (ya está en la regex de `hueso`) quite también el impacto moderado, es una clave más; no la pido ahora.

**`presion` — isométricos máximos, apnea y explosivos.**
- Cae: **todas las planchas** (isométrico sostenido con tendencia a retener el aire), wall sit, colgarse de la barra, hollow, dragon flag, cargas de agarre y empuje máximo (granjero, trineo, chaleco, lastrados, volteo de llanta), **explosivos y anaeróbicos** (saltos de potencia, sprint, burpee, sprawl, HIIT/intervalos, thruster, man maker, cuerdas de batalla).
- Se queda (CONTROLES, y es el 80 % de lo útil): **bici, elíptica, caminata en cinta inclinada, marcha**; prensa, goblet, sentadilla con barra, rumano, hip thrust (peso moderado, exhalando); jalones, remos, press de banca con mancuernas; crunch (flexión, no isométrico); dead bug, bird dog, Pallof; **los isométricos autorresistidos de brazo** (e151, e254, e327: masa pequeña, y el isométrico moderado de mano es de hecho terapéutico en hipertensión); saltos de tijera y salto a la cuerda (aeróbico moderado).
- Criterio mío que Andrés Hyp puede discutir: sacar el HIIT. La app **no ve la cifra de tensión de la persona**; con hipertensión no controlada el HIIT es lo que no se hace, con controlada es aceptable. Sin ese dato, quito el pico y dejo el cardio continuo. Es reversible por el coach.
- Cardio continuo: el tope de esfuerzo (conversar, RPE 3-5) lo cumple el texto de `wg1`; en el entreno lo dice el TEXTO de la nota (§Q4).

### 🔒 Candado de repeticiones y Valsalva (lo que el nombre no atrapa)

Medido con `generarRutinas` real: un hombre intermedio con objetivo «Fuerza» recibe **6 repeticiones** en todo el trabajo de fuerza (25 ejercicios en 4 días), **con o sin** «hipertensión controlada» en la nota — hoy la nota no se lee (`keys: []`). Exijo: si `lim.keys` incluye `presion` o `core_central`, el esquema NUNCA baja de **8 repeticiones** (`scheme.repsN = Math.max(scheme.repsN, 8)`, sin series al fallo) y el texto dice «exhala al hacer el esfuerzo, no aguantes el aire». No lo pido para `hueso`: ahí la carga progresiva es el tratamiento. (Mantiene el 5×5 de `shockPlan` fuera, como ya está con dolor.)

### Qué NO cubre ninguna lista (para que nadie lo lea como garantía)
Que lo que sobrevive sea seguro para ESA persona. La app dice qué quitó, jamás que lo demás esté bien (regla de v424 que sigue en pie).
## Q3 · El calentamiento  (CERRADA)

**Veredicto:** se pueden programar las tres listas. Barrido real: `wuResolveRecipe` + `warmupContraindicated` del código, con las tablas nuevas cargadas **solo en memoria** (sin tocar el repo), sobre **1.920 casos** = 12 recetas × 2 sitios (gym, casa) × con/sin impacto × 40 conjuntos de zonas (cada clave nueva sola; cada una con cada una de las 11 zonas existentes; y 4 combinaciones: core_central+presion, core_central+hueso, las tres + lumbar + rodilla, core_central + lumbar + rodilla + tobillo).

### Las listas por id (para `WARMUP_ZONE_EXCL_IDS`)

```
core_central: ['wac1', 'we4', 'we5']        (+ 'wf1' el día que entre a la biblioteca)
hueso:        ['we5', 'wac3']               (+ 'wf1' el día que entre)
presion:      ['wa6', 'wac1']               (+ 'wf1' el día que entre)   → we4 cae además por NOMBRE («plancha»)
```
`wf1` y `wg4` **no existen en `WARMUP_LIBRARY`** (medido: 41 piezas, ninguna de las dos), así que NO se escriben en las listas hoy (candado 3: un id huérfano es una protección que no protege). Regla: **`wf1` no puede entrar a la biblioteca sin que esas tres listas ya lo nombren, en el MISMO commit.**

### 🔴 Rectifico mi lista del 23-oct en UN punto: `wac2` (dead bug) sale de la lista de `core_central`
En el dictamen del 23-oct escribí `core_central: wac1 wac2 we5 we4 wf1`. Lo corrijo, con la razón a la vista: (1) entonces la clave no existía y el texto no pedía exhalar ni parar ante un bulto; ahora existe y el texto de §5.3 lo dice; (2) en el entreno (Q2) el dead bug **e72 se queda** porque es la pieza de rehabilitación de núcleo más usada, y quitarlo del calentamiento mientras se prescribe en el entreno sería incoherente; (3) el riesgo que me preocupaba (la persona que NO escribió que está en postparto) se cubre de otra manera, abajo.

### Barrido (control de que el resultado no es una tautología)
- **Piezas de la biblioteca que caen:** `core_central` → we5, we4, wac1 · `hueso` → we5, wac3 · `presion` → we4, wa6, wac1. **Por NOMBRE** solo caen we4 y wac1 (por `plancha`); we5, wac3 y wa6 dependen **únicamente del id** → por eso van por id.
- **0 violaciones de 1.920** contra un oráculo independiente (mi tabla clínica escrita a mano, no las listas del código): ninguna pieza prohibida para una clave entra en ninguna receta.
- **Control de discriminación:** con las listas por id vaciadas (solo nombre) el mismo oráculo da **40 violaciones de 1.920**. El barrido discrimina.
- **Qué ASCIENDE (la clase de bug del 20-sep):** en TODO el barrido solo asciende **una pieza, `wah1`** (jalón facial liviano), y solo por tres caminos: `we4 > wah1` en EMPUJE y TREN_SUP cuando `core_central` o `presion` sacan la plancha de hombros, y `wa6 > wah1` en TRACCION cuando `presion` saca el colgado. `wah1` es ✅ en las tres claves (es la alterna universal de hombro/cuello/muñeca que ya aprobé el 23-oct). **Huecos de menos: 0** en los tres caminos.
- Combinación extrema (las tres claves + lumbar + rodilla + tobillo, gym): **ninguna receta queda sin bloque general ni sin al menos una pieza de movilidad**; EMPUJE: `wh1 wh3 wm1 | wa3 wah1`; PIERNA: `wt1 wc1 | wc4 wc5`; CARDIO_CORE: `wc1 we1 | wac2`; CORE_CARDIO: `we1 we2 wc1 | wac5 wac4`. El generador de `wg1` nunca cae.
- **Qué NO se mueve:** CORE_CARDIO (mujer) y CARDIO_CORE no cambian con ninguna clave: no contienen wac1, we4, we5, wa6 ni wac3. `hueso` no mueve NINGUNA receta (we5 y wac3 no están en ninguna).

### Las tres preguntas del interino
1. **¿Vuelve el dead bug (`wac2`, no `wac1`: `wac1` es la plancha corta) a ser la primera opción del CORE_CARDIO de mujer?** **NO.** La cadena se queda `wac5 · wac4 > wac2`. Razón: el dato. De 14 asesoradas, **0** escribieron algo de postparto/diástasis; la clave solo protege a quien lo escribe (Q7). Para la que NO lo escribió, el perro de caza (cuadrupedia, sin palanca larga de pierna, sin posición supina) es estrictamente más seguro que el dead bug, y en un calentamiento «un hueco de menos no hace daño; uno contraindicado sí». Cuando exista la pregunta explícita del registro (Q7) y la lea el generador, se puede revisar.
2. **¿Entra `we5` a alguna receta?** **NO**, ni con las claves leídas. Principio nuevo (lo escribo porque es la regla de fondo de todo el dictamen): **una pieza solo entra a una receta si es segura para la población que la app NO puede ver.** Las claves protegen a quien escribió su condición; los rollitos (flexión de columna con balanceo, presión sobre el abdomen) siguen siendo malos para la postparto, la persona con osteopenia o con cuello que no lo escribió. Se queda solo en el selector manual del coach, donde se MARCA.
3. **¿Entran `wf1` y `wg4`?** **NO.** `wf1`: flexión de tronco + salida a plancha + cabeza abajo; las tres poblaciones de hoy la contraindican y sigue dependiendo del texto para la población invisible. `wg4`: impacto, cae en seis zonas más las tres nuevas, y nadie la pide en ninguna receta. Se revisan el día que Q7 esté hecho **y** haya datos de que la gente declara.

### Recomendación 🟡 (no la exijo)
CARDIO_CORE (hombre) abre con `wac2`: `act: [['wac2','wac5']]`. Por el mismo argumento de la población invisible (hernia umbilical sin declarar), sería más seguro `[['wac5','wac2']]` o `[['wac4','wac2'], ['wac5']]`. Es receta de Coach Pro; lo dejo a su criterio y al del PO.

### 🟡 Embarazo (a decidir por el PO)
Las posiciones supinas (wac2, wac5, wc4 y el e72 del entreno) y prona (cobra, superman, hiperextensiones) dejan de ser buena idea más allá del primer trimestre. `embaraz` dentro de `core_central` cubre el abdomen pero NO eso. Mi recomendación: tratar `embaraz` como **bandera aparte** (gemela de `lim.nerve`) que (a) siempre dispara el aviso de «visto bueno de tu médico u obstetra antes de entrenar» (🔒, ver Q4) y (b) opcionalmente pone una lista supina/prona. Lo primero lo exijo; lo segundo, decide el PO.
## Q4 · Los textos  (CERRADA)

**Veredicto:** sí cambia cómo se le habla. Tres razones medidas en el código: (1) el aviso a quien se registró sola dice «Escribiste que tienes **una molestia en** {zona}» (`genLimitationNote`, `avi-core.js:1178`) — una persona en postparto o con tensión alta no tiene «una molestia», tiene una condición; (2) cierra con «si algo **te duele**, no lo hagas» y estas condiciones no se detectan con dolor: la señal de parar es un bulto, un escape de orina, un mareo, presión en el pecho; (3) la plantilla de la marca del coach pone «Ojo con **su** {etiqueta}» (`warmupWarnText`, línea 941) con el posesivo FIJO: la etiqueta tiene que ser un sustantivo singular que acepte «su».

Reglas que se mantienen de mi dictamen del 8-ago §2.5 y de v424: **la app dice qué QUITÓ, jamás que lo que queda sea seguro**; no nombra diagnósticos en el texto que lee la persona (por eso el aviso del cliente NO enumera «diástasis», «hernia», «osteoporosis»: dice «tu abdomen o tu suelo pélvico», «tus huesos», «tu presión arterial o tu corazón»; al coach sí se le enumera, es su oficio); sin plazos; sin «no te preocupes»; sin frases que empujen a seguir.

### Qué cambia en el código (estructura)
`parseLimitations` devuelve las claves nuevas en `keys` como hoy, pero las separa en `zones` (zonas de dolor, como hoy) y **`conds`** (condiciones: `core_central`, `hueso`, `presion`). Las plantillas imprimen una frase por zonas y OTRA por condiciones cuando hay de las dos. Nueva bandera **`lim.embarazo`** (booleana, `/embaraz(?!os[oa])|gestante|gestacion/`), gemela de `lim.nerve`: no cambia qué se excluye, cambia lo que se dice.

### `GEN_ZONE_LABEL` (etiqueta que ve el coach; entra en «Ojo con su …» y en «limitación detectada (…)»)
| Clave | Etiqueta |
|---|---|
| `core_central` | `abdomen y piso pélvico` |
| `hueso` | `salud ósea` |
| `presion` | `presión arterial o corazón` |

Medido el efecto en las plantillas reales: «Ojo con su abdomen y piso pélvico» · «Ojo con su salud ósea» · «Ojo con su presión arterial o corazón» (leen bien con el «su» fijo). Con «huesos» saldría «su huesos»: por eso no.

### `GEN_ZONE_QUITA` (qué quitó; lo leen coach Y cliente, solo lista lo quitado)
| Clave | Texto |
|---|---|
| `core_central` | `abdomen y piso pélvico: abdominales de flexión y torsión, planchas, saltos y carreras, y lo que carga hacia abajo (lastres, trineo, acarreos)` |
| `hueso` | `salud ósea: abdominales de flexión, giros con carga, buenos días con barra y los saltos y carreras de mayor riesgo de caída` |
| `presion` | `presión arterial: planchas y aguantes largos, colgarse, explosivos y HIIT, y lo que obliga a aguantar el aire` |

### Frase de condición para quien se registró sola (`genLimitationNote(lim, 'client')`)
Reemplaza «Escribiste que tienes una molestia en …» **solo cuando hay condiciones**:

> ⚠️ Escribiste algo sobre {CONDICIÓN}, así que armamos este plan cuidándolo. {QUITA} {PARADA} Todavía no lo ha revisado un profesional de la salud: si algo no te cuadra, no lo hagas y avísale a tu coach.

con `{CONDICIÓN}` = `tu abdomen o tu suelo pélvico` / `tus huesos` / `tu presión arterial o tu corazón`, y `{PARADA}` (el criterio de parar, que reemplaza a «si algo te duele»):

| Clave | `{PARADA}` |
|---|---|
| `core_central` | «Exhala siempre al hacer el esfuerzo y no aguantes el aire. Si ves o sientes un bulto en el centro del abdomen, se te escapa orina o sientes peso o presión abajo, detente y avísale a tu coach.» |
| `hueso` | «Mantén la espalda recta en cada ejercicio, sin redondearla con peso. Si te da un dolor fuerte o repentino en la espalda o en otro hueso, detente y consúltalo con tu médico.» |
| `presion` | «Respira normal en cada repetición, sin aguantar el aire, y haz el cardio a un ritmo en que puedas conversar. Si sientes presión en el pecho, mareo o te falta el aire, detente y busca atención médica.» |

(Mismo texto «Todavía no lo ha revisado un profesional» que ya existe; el nuevo no cambia el cierre, solo el criterio de parar.)

### Aviso al coach cuando se registra sola (`limitationCoachAlert`) — frase que se AÑADE por condición
- `core_central`: «Declaró una condición del abdomen o del suelo pélvico (postparto, diástasis, hernia, cirugía abdominal o embarazo). Pregúntale hace cuánto y si tiene visto bueno de su médico o fisioterapeuta. Todas las series exhalando en el esfuerzo; si aparece un bulto en el centro del abdomen, que pare.»
- `hueso`: «Declaró osteopenia u osteoporosis (o una fractura por fragilidad). El peso muerto y la sentadilla NO se quitaron a propósito: la carga progresiva con la columna neutra es parte del tratamiento. Sí se quitó la flexión y la torsión cargadas. Si hubo fractura vertebral, el impacto y la carga los define su médico.»
- `presion`: «Declaró hipertensión o una condición del corazón. Pregúntale si está controlada y qué medicación toma. Cardio a ritmo de conversación, series que no aguanten el aire; si se marea, siente presión en el pecho o le falta el aire, que pare y consulte.»
- **`lim.embarazo` (siempre, aunque sea la única condición):** al cliente: «Escribiste algo sobre un embarazo: este plan NO es un plan de embarazo y nadie lo ha revisado. Antes de entrenar, pide el visto bueno de tu médico u obstetra.» Al coach: «Menciona un embarazo. Este plan NO es de embarazo y nadie lo ha revisado: que tenga el visto bueno de su médico u obstetra antes de entrenar. La app quita abdominales y planchas, pero NO controla la posición boca arriba ni boca abajo.» 🔒 Este aviso no es opcional.

### Textos de piezas que dependen de estas claves (se suman a mis textos del 23-oct §5)
- `wac2`: «…Exhala al extender. Si ves un bulto en el centro del abdomen, detente.» (ya estaba en §5.3; pasa de recomendación a CONDICIÓN de que `wac2` no esté en la lista).
- `wac1`: «Respira; no aguantes el aire.» · `wa6`: «Respira normal, sin aguantar el aire.» (ya estaban).

## Q5 · Vigencia  (CERRADA)

**Veredicto:** la condición **dura hasta que el coach (o la propia persona, si puede editar su nota) la quite o la confirme; jamás caduca sola.** Pero **se revisa**: no se deja morir en silencio.

Razón de las dos mitades, con el dato:
1. **Jamás por calendario.** Es la regla madre de mi dictamen del 8-ago §5 («el retorno se decide por criterios cumplidos, jamás por días transcurridos») y la lección de `PAIN_TTL_MS` (un dolor que caduca solo no se resolvió: se dejó de mirar). El «postparto» de los 6 meses y la diástasis de los 14 meses no se miden en la app; una fecha tampoco prueba que se cerró.
2. **Pero la nota no tiene fecha.** Medido: `grep notesAt|notesUpd|limAt` → **0 resultados**. Hoy la app no sabe si la nota se escribió ayer o hace dos años; con este diseño «cesárea hace 10 años» queda para siempre sin quitar crunch, planchas ni saltos, y eso es **sobrerrestricción permanente**, también un daño (menos estímulo de fuerza, ningún impacto, para una persona que ya podría hacerlo).

### La regla
- **Un campo nuevo, `limitReviewedAt`** (ISO, en el registro del asesorado; viaja con `ax_c`). Se escribe al **guardar una nota que cambia las condiciones** y cuando el coach pulsa «Sigue vigente» (nunca por abrir la ficha).
- **Plazo de revisión:** `core_central` **90 días** (el postparto cambia en semanas y el filtro más estricto tiene que ir cediendo con criterio médico); `hueso` y `presion` **180 días** (son crónicas; lo que cambia es el control y la medicación).
- **Qué pasa al vencer:** NO se abre nada ni se quita nada. Se muestra una **sola** línea: al coach, en la ficha, chip «Revisar condición» con el texto «Anotó {condición} hace más de {N} días. Pregúntale cómo va; si ya tiene visto bueno de su médico o fisio, actualiza la nota» y dos botones: **Sigue vigente** (renueva la fecha) / **Ya no aplica** (abre la nota para quitar la frase). A la persona que se registró sola, **una** fila en su Perfil (no un modal, no push): «Hace unos meses escribiste algo sobre {tu abdomen…}. ¿Sigue igual? Si cambió, actualiza tu nota y tu plan se ajusta.» Una sola vez por plazo.
- **Lo que NO hace la app:** reabrir ejercicios por vencer el plazo; avisar más de una vez por ciclo (el PO ya cortó dos veces los recordatorios a quien no responde); sugerir un plazo de recuperación.
- Costo de ingeniería: un campo, un chip, una fila. Si se descarta el campo, la alternativa mínima es sólo el texto del coach al guardar («recuerda revisar esta nota cada 3 meses»), pero entonces la sobrerrestricción depende de la memoria humana; yo prefiero el campo.
## Q6 · El caso real de «hernia umbilical»  (CERRADA)

**Veredicto: queda `lumbar` + `core_central`, los DOS.** No se estrecha la palabra `hernia` de la regla lumbar.

Cómo medí: `generarRutinas` real, sobre el catálogo de 375, con una copia EN MEMORIA de `avi-core.js` con las claves nuevas (el repo no se tocó). Cliente tipo: hombre, objetivo «Recomposición corporal», nota «hernia umbilical», mismo `seed` y `now` en todos los escenarios. No tengo su plan, su sitio ni sus días (el briefing lo prohíbe pedirlos a Supabase), así que midí tres perfiles: **principiante · 3 días · gym** (el más probable por su nivel), **principiante · 3 días · casa** e **intermedio · 4 días · gym** (de contraste). Unidad: **ejercicios del plan semanal** (no del catálogo). Escenarios: *hoy* = solo `lumbar` (como lee la app ahora) · *lumbar+core* = mi propuesta · *solo core* = quitando `hernia` de la regla lumbar.

| Perfil | Sin nota | HOY (lumbar) | lumbar + core | solo core |
|---|---|---|---|---|
| Principiante · 3 d · gym | 22 | 25 | 25 | 22 |
| Principiante · 3 d · casa | 18 | 21 | 20 | 18 |
| Intermedio · 4 d · gym | 28 | 32 | 32 | 28 |

Qué cambia (ejercicios que SALEN / ENTRAN respecto de *hoy*):
- **lumbar + core vs hoy** — gym principiante: sale 1 (Bird Dog) y entra 1 (Plancha en Rodillas). Casa principiante: salen 3 (**Plancha Frontal**, Plancha Lateral, Dead Bug) y entran 2 (Bird Dog, Plancha en Rodillas). Intermedio gym: salen 4 (**Caminata del Oso, Caminata del Cangrejo, Plancha a Flexión, Abdominales en Banco Declinado**) y entran 4 (Plancha en Rodillas, Plancha Lateral, Dead Bug, Bird Dog).
- **solo core vs hoy** — gym principiante: salen 5 (Pallof, Remo Sentado en Polea con Barra Ancha, Goblet, Prensa Horizontal, Bird Dog) y **entra la Sentadilla en Smith**, más Remo en T y Prensa de Pierna pies bajos. Intermedio: **vuelven Press Militar en Multipower, Zancada Inversa y Remo en Multipower**.
- **Hallazgo de hoy, para el PO:** con solo `lumbar`, un hombre con hernia umbilical **intermedio** recibe **Abdominales en Banco Declinado, Plancha a Flexión y los andares de oso y cangrejo** (`lumbar` no atrapa abdominales de pared completa); uno de casa recibe la **Plancha Frontal**. Eso es lo que la clave nueva arregla. Para un principiante de gym, lo más probable en su caso, **el cambio real es de 1 ejercicio por 1**: lo que queda de core en su plan son Pallof, Dead Bug, Bird Dog y plancha lateral/en rodillas, que mantengo con el texto de parar si aparece un bulto.

Por qué los dos, no solo `core_central`:
1. **En el abdomen, `lumbar` está haciendo de medidor de CARGA, y no hay otro.** Su regla saca peso muerto, sentadilla con barra/frontal/hack/Smith/sumo, remo con barra, militar con barra, granjero, camarero, que son los levantamientos de presión intraabdominal alta, y es lo que se le desaconseja a una pared abdominal con un defecto hasta que se evalúe o repare. `core_central` por NOMBRE no puede ver cuánta carga ni si retiene el aire (Q2). Mi nota del 2-ago sobre `hernia` («va hacia el lado seguro: también desaconseja Valsalva y carga axial alta») **era esta razón** y sigue siendo cierta; la ratifico y le añado el segundo motivo.
2. **Cuesta poco y el coach puede deshacerlo.** El generador FILTRA; la marca al coach no bloquea lo que él arma a mano. Costo en el catálogo: `lumbar` 66 + `core_central` 65 = **91 ejercicios de 375 (24,3 %)** en la unión, de ellos 40 en ambas, 26 solo lumbar, 25 solo core. Para el principiante de gym: 1 por 1.
3. **No sé tres cosas clínicas que decidirían lo contrario:** ¿está operada?, ¿se abulta al esfuerzo?, ¿tiene visto bueno? Una hernia pequeña, estable y asintomática admite carga moderada exhalando. **Pido al coach esos tres datos** (intake clínico, Paso 1 del protocolo de CLAUDE.md) y, con ellos, él puede dejar de usar el filtro. Sin ellos, gana el lado seguro.

Lo que exijo para que no se «limpie» solo:
- 🔒 El comentario de `avi-core.js:370` («`hernia` NO se corrige») se REESCRIBE con el segundo motivo y con el candado de abajo. Hoy la única defensa de ese `hernia` es un comentario, y los comentarios no pasan por la suite.
- 🔒 Candado: `parseLimitations('hernia umbilical').keys` contiene `lumbar` Y `core_central`; `hernia discal L5` contiene SOLO `lumbar` (control central); `hernia inguinal` contiene `lumbar`, `core_central`, `aductor` y `abductor`; «tengo una hernia» a secas contiene SOLO `lumbar` (no se sabe de cuál; la regla lumbar la cubre, sin inventar abdomen).
- 🟡 Texto: en su ficha la etiqueta dirá «zona lumbar» sin tener la espalda mal. Se corrige con la frase de coach de `core_central` (Q4): «Con hernia, la zona lumbar se activa a propósito como filtro de cargas altas (peso muerto, sentadilla con barra); no significa que tenga la espalda lastimada».
- **Sus 6 rutinas ya guardadas no se regeneran**: el filtro actúa al generar. Con la clave leída, su ficha le mostrará la marca «Ojo con su abdomen y piso pélvico» en los ejercicios que ya tiene y no cumplen (`exerciseWarnZones`). Que el coach las repase: es lo único que le llega al caso real hoy.

## Q7 · ¿Conviene que el registro PREGUNTE?  (CERRADA — recomendación; decide el PO)

**Mi recomendación: SÍ, con una pantalla de casillas, pero hecha bien. Si el PO dice no, nada de lo anterior se rompe.**

Por qué (con el dato, no con la intuición):
1. **El texto libre pide que la persona se reconozca en la palabra «limitación».** Medido en los 26 asesorados (briefing): 4 notas, 0 con postparto/cesárea/diástasis/embarazo/hipertensión/corazón/osteopenia, entre 14 mujeres. La persona en postparto o con la tensión alta rara vez lo vive como «una limitación» y no lo escribe en un campo que le pregunta por molestias. Las 3 claves que acabo de dictar **solo protegen a quien se nombra**; es el mismo hueco por el que `core_central` no existía y nadie lo notó.
2. **Es la única forma de que el dead bug (Q3) y los `we5` dejen de depender de una suposición.** Con la pregunta explícita puedo revisar mi regla de «población invisible» pieza por pieza; sin ella, esa regla es el escudo principal.
3. **Es barato en la parte que importa y ya tiene molde:** mi dictamen del 8-ago diseñó una pantalla de banderas rojas «con opción positiva obligatoria» (la «Nada de esto ✓»); la de condiciones es la misma mecánica.

Cómo debe ser (si el PO la aprueba):
- **Una sola pantalla, dentro del paso 6, con casillas** + «Ninguna de estas ✓» + «Prefiero no decirlo». Marcar «Ninguna» o «Prefiero no decirlo» es un acto, nunca el valor por defecto (mismo principio que las banderas rojas: un campo opcional que se puede saltar no existe).
- Casillas: (a) «Estoy en postparto (menos de un año), tuve cesárea o me dijeron que tengo diástasis» — **solo si el sexo declarado es F o está en blanco**; (b) «Estoy embarazada» — mismo criterio; (c) «Tengo una hernia en el abdomen o me operaron del abdomen» — para todos (el caso real es de un hombre); (d) «Tengo la presión alta o una condición del corazón»; (e) «Me dijeron que tengo osteopenia u osteoporosis».
- **Cada casilla escribe la clave directo** (`conds:[…]`, unión con lo que salga del texto): no depende de una regex. Un cambio de la casilla se trata como cambio de condición para `limitReviewedAt` (Q5).
- **Mismo conjunto de casillas en la ficha del coach** (modal de alta/edición): hoy el alta por coach tampoco las tiene.
- **Salud es dato sensible (Ley 1581 de 2012).** La pregunta tiene que ser facultativa de verdad («Prefiero no decirlo»), y el aviso de privacidad/autorización de datos del registro debe cubrir datos de salud. **No lo decido yo:** va al abogado (paquete legal v697/v3) antes de publicar. Lo marco porque mi propia regla de «ninguna opcional» choca con la ley, y la ley gana: por eso la salida honesta es «Prefiero no decirlo», un acto explícito.
- Menores: las casillas (a) y (b) con una menor van a la misma ruta del acudiente del consentimiento (v565); no las bloqueo.
- Costo de fricción: +1 pantalla corta en un paso que ya existe. El estudio de retención ubica la fuga en el primer mes y no en el registro; aun así, que Valentina lo mida.

## Qué NO miré y por qué

- **Datos reales ni rutinas guardadas del caso de la hernia umbilical**: el briefing prohíbe Supabase; por eso Q6 mide tres perfiles tipo y no «su» plan.
- **Matriz de sabotaje del código** (no me tocaba, y el hook/CI la tienen): todas las cifras de este informe vienen de una copia en memoria o de variables mutadas en el proceso, nunca del repo.
- **`QUICK_WORKOUTS` (entrenamientos rápidos): NO se filtran ni se marcan por ninguna clave** (medido: `startQuickWorkout` y `openQuickWorkouts` no consultan `limitationsFor`). «Abdomen Express» (`qw_abs_casa`: e18 crunch, e72, e81 escaladores, e49, …) y «HIIT sin equipo» (`qw_hiit_casa`: e182, e81, e184, e202…) son EXACTAMENTE lo que `core_central` y `presion` quitan, a un toque del Hoy. Es el hueco n.º 6 de mi dictamen del 8-ago, que sigue abierto para estas poblaciones. Lo exijo en los candados (n.º 13). No lo audité más a fondo (las otras superficies sí pasan por `limitationsFor`: generador, selector de sustitución app-2-login:895, calentamiento app-6-extra:2656, marca del coach app-3-coach:4139).
- **Dosis del cardio** por clave (RPE, duración): lo dejé al texto de `wg1`; Andrés Hyp debe confirmar el techo para `presion`.
- **Frases coloquiales fuera de las 60 que probé** (jerga regional, errores de ortografía como «cezarea», «diastacis»): no las cubro. La casilla de Q7 es el remedio correcto, no seguir agregando variantes a la regex.
- **Efecto sobre `shockPlan`, descarga y estancamiento** de las claves nuevas (zonas que ahora entran por `excludeZones` en `avi-core.js:11431`): `painExclZones` no las conoce porque vienen de notas, no del cuestionario de dolor; mirar que `GEN_ZONE_EXCL[z]` sea lo único que las filtre ahí.
- **Embarazo avanzado** (posiciones supina/prona): lo dejo como 🟡 para el PO (Q3); no escribí esa lista.

## Candados que exijo en la suite (antes de programar; no es opcional)

1. **Palabras (Q1):** para cada clave, las frases positivas de este informe afirman la clave y las de control NO la afirman: «parto de cero», «reparto», «apartó», «César», «Cesáreo», «situación embarazosa», «a luz del día», «hernia discal L5» (sin `core_central`), «menopausia», «osteoartrosis», «osteópata», «tomo calcio», «fractura de muñeca», «tensión alta en el trapecio», «presión en el pecho», «presión arterial normal», «hipotensión», «consistente», «frecuencia cardíaca». **Cada control debe demostrar que MATCHEA algo distinto de vacío en su variante positiva** (en mi primera pasada dos controles de catálogo no matcheaban ningún ejercicio y pasaban por casualidad).
2. **Sin lookbehind:** check estático (sobre `sinComentarios`) de que `avi-core.js` no contiene `(?<=` ni `(?<!`.
3. **Entreno (Q2):** los ids que caen por clave quedan FIJADOS (65 / 31 / 44 de 375) y la suite falla si el catálogo cambia sin revisar; los controles terapéuticos NO caen (dead bug, Pallof, bird dog, plancha en rodillas y lateral en `core_central`; peso muerto, sentadilla con barra, hip thrust, superman, hiperextensiones, salto a la cuerda en `hueso`; bici, elíptica, isométricos autorresistidos, prensa en `presion`). `e50 Buenos Días con Barra` cae en `hueso` y `e148 Patrón de Bisagra (sin peso)` NO.
4. **Repeticiones y Valsalva (Q2):** con `presion` o `core_central` y objetivo «Fuerza», el esquema nunca baja de 8 repeticiones (control: sin clave sigue en 6, medido hoy).
5. **Calentamiento (Q3):** (a) las tres listas por id; (b) todo id de las tres listas existe en `WARMUP_LIBRARY`; (c) `wf1` y `wg4` NO están en la biblioteca mientras no estén en las listas; (d) barrido de las 12 recetas × 2 sitios × con/sin impacto × 40 conjuntos contra el ORÁCULO independiente: **0 violaciones**, y su CONTROL con las listas por id vaciadas da **> 0** (hoy: 40); (e) **el conjunto de piezas que ascienden es EXACTAMENTE `{wah1}`**: cualquier otro ascenso rompe el test hasta que yo barra la matriz de nuevo (la clase de bug del 20-sep); (f) `wg1` y `wg2` no están en ninguna lista nueva; (g) **`wac2` NO está en la lista de `core_central` Y su texto contiene «exhala» y «bulto»** (mi rectificación depende de ese acoplamiento).
6. **Renombrar no engaña:** `wa6`, `we5`, `wac3` (que no caen por nombre) siguen cayendo por id aunque se les cambie el nombre.
7. **Hernia (Q6):** los cuatro candados de claves de Q6, y que el comentario de la regla lumbar mencione `core_central`.
8. **Textos (Q4):** (a) etiquetas: «Ojo con su abdomen y piso pélvico», «…su salud ósea», «…su presión arterial o corazón»; (b) con solo condiciones el aviso al cliente NO contiene «molestia en» ni «te duele», SÍ contiene la `{PARADA}` de su clave y la frase «Todavía no lo ha revisado un profesional»; (c) **el aviso al cliente no contiene los nombres «diástasis», «hernia», «osteoporosis», «osteopenia», «hipertensión», «cesárea»** (regla de no nombrar diagnósticos); (d) ningún texto nuevo contiene «seguro», «sin riesgo», «sin problema», plazos ni «no te preocupes»; (e) `lim.embarazo` es verdadero con «embarazada» y falso con «embarazosa», y SIEMPRE trae el aviso del visto bueno de su médico u obstetra, al cliente y al coach.
9. **Vigencia (Q5):** `limitReviewedAt` se escribe al cambiar la nota de condiciones y al pulsar «Sigue vigente»; con 400 días simulados las claves siguen IGUAL (nada se reabre solo); el chip aparece a los 90 días (`core_central`) y 180 (`hueso`, `presion`) y no antes; un solo aviso por ciclo.
10. **Registro (Q7), si el PO lo aprueba:** cada casilla escribe su clave; «Ninguna» y «Prefiero no decirlo» no son el valor por defecto; las casillas (a) y (b) no se muestran con sexo M.
11. **Todas las superficies:** el selector de sustitución, el calentamiento, la marca del coach y el generador ven las claves nuevas con el MISMO `limitationsFor` (un caso por superficie con «postparto», «osteopenia» y «hipertensión»).
12. **Mi candado 7 de siempre:** si alguien toca `GEN_ZONE_EXCL`, `GEN_LIMIT_KWS` o `WU_RECIPES` después de este dictamen, la matriz recetas × zonas se vuelve a barrer completa (el barrido de arriba YA es ese test; que corra sobre las 11 zonas viejas + las 3 nuevas).
13. **Entrenamientos rápidos:** ningún `QUICK_WORKOUTS` con un ítem contraindicado para las claves de la persona se ofrece sin marca o sin filtro (hoy ninguno: hueco n.º 6 del 8-ago, abierto).
14. **Rep. mínima de cardio:** `wg1` sigue sin estar excluido por ninguna de las claves y su texto conserva «puedas conversar» (es el tope de esfuerzo de `presion`).

*Veredicto de Laura, 5-nov-2026. Vinculante en seguridad; Andrés Hyp confirma la dosis de `presion` y el HIIT; el PO decide Q7 y el 🟡 de embarazo.*
