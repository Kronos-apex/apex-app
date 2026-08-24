# Auditoría: MOTOR DEPORTIVO Y NUTRICIÓN — Coach Pro (Diego Ramírez, NSCA-CSCS)

> **Fecha:** 2026-08-23 · **Alcance:** delta **v418 → v526** (HEAD `83f287a`)
> **Método:** corrí el motor, no lo leí. `generarRutinas` importada en Node con la biblioteca
> REAL de **244 ejercicios** extraída de `app-1-infra.js:1420-1701`. **5.760 planes** para el
> barrido base (2 sexos × 3 niveles × 5 frecuencias × 6 objetivos × 4 entornos × 8 semillas),
> más barridos dedicados por limitación, por nutrición y por entorno. Los datos de producción
> salen por SELECT contra `eoebhrxbokyllqalyecj`. Scripts en scratchpad, no en el repo.
> **READ-ONLY**: no toqué ni un archivo de la app ni una fila de la base.

---

## Veredicto en 5 líneas

> ⚠️ **Estas cinco líneas y la sección de cierre las escribió el ORQUESTADOR, no el auditor.**
> A4 se quedó sin presupuesto justo al llegar aquí (su informe se escribe incremental a propósito,
> por eso los 7 hallazgos, las 5 colas y la sección SANO sí están completos y son suyos). Lo de
> abajo es un resumen DERIVADO de lo que él ya dejó escrito y verificado; **no añade ni un hallazgo
> nuevo ni una medición que él no hiciera**, y lo que él no alcanzó a mirar se declara como tal.

1. **El motor está sano en lo grande y falla en el dato, no en la lógica.** Los 5.760 planes del
   barrido salen bien formados —ningún día vacío, la fase de adaptación intacta, el puesto de
   glúteo y el tope de 5 días haciendo su trabajo—; los 7 hallazgos son de **etiquetas de catálogo
   y de calibración**, que es exactamente donde ya cayeron v513, v516 y v519.
2. **Lo que más le llega a una persona real: el nivel se corrige HACIA ADELANTE y nunca hacia
   atrás** (H4) — **4 ejercicios avanzados siguen hoy en planes de principiante o intermedio, y uno
   lo metió v513**. Es la misma clase que e92, y significa que cada vez que se abre un puesto nuevo
   hay que auditar el pool que lo alimenta, no solo el pool que se tocó.
3. **La app promete lo que no cumple, otra vez y con número: dice «~43 min» y la sesión real dura
   56, con el 44 % pasando de la hora** (H2). Cruza con A5, que lo midió por su lado sobre 81
   sesiones reales y llegó a 62,2 min. **Dos áreas independientes midiendo lo mismo: la promesa de
   duración es el texto menos cierto de la app.**
4. **Dos huecos de seguridad blanda, los dos de la familia «puerta cerrada, ventana abierta»:** el
   rebaje por dolor **exime a `core` y `funcional`** (H5, el step-up con mancuernas se queda con su
   peso), y **el wizard ya pregunta por lesiones pero sella el plan como «revisado» sin avisarle al
   coach** (H7) — el filtro es real, el sello es una afirmación que nadie hizo.
5. **De las 5 colas abiertas, tres se responden con «no hay que construir nada»:** el piso de
   proteína era **medio falso** en su enunciado, `carga_liviana` casi no tiene población,
   la señal de recuperación de Laura **no tiene dato con qué construirse**, y `feeling` al 12 %
   está bien porque **el motor no decide nada con ella**. La rampa calórica sigue esperando al PO,
   y su argumento hay que **RE-MEDIRLO** antes de decidir.

---

---

## Hallazgos verificados

### H1 · 🟠 Un hueco de bíceps de cada cinco lo ocupa un ejercicio de MUÑECA — y el arreglo de la variedad lo EMPEORÓ

- **Qué pasa:** cinco ejercicios de antebrazo/agarre siguen clasificados con `muscle:'biceps'`
  (lo reporté en julio como H9 y sigue abierto). El motor no distingue: para él son candidatos
  legítimos del hueco de bíceps. Lo nuevo es la magnitud: en julio medí **5,5 %**; hoy son
  **19,5 %**.
- **Dónde:** biblioteca en `app-1-infra.js:1420-1701` → `e140` *Curl de Muñeca con Barra*,
  `e209` *Curl de Muñeca Invertido*, `e210` *Curl de Muñeca*, `e213` *Rotaciones de Muñeca*,
  `e211` *Colgarse de la Barra* — los cinco con `muscle:'biceps'`. Slots en
  `avi-core.js:264-269` (`TRACCION` y `HOMBROS_BRAZOS` piden 2 huecos de bíceps cada uno).
- **Evidencia:** barrido de **5.760 planes** (2 sexos × 3 niveles × 5 frecuencias × 6 objetivos
  × 4 entornos × 8 semillas):

  | | |
  |---|---|
  | Huecos de bíceps generados | 5.568 |
  | Ocupados por muñeca/agarre | **1.086 (19,5 %)** |
  | Días donde **TODOS** los huecos de bíceps son de muñeca | **264** |

  Reparto: Curl de Muñeca con Barra 420 · Curl de Muñeca Invertido 312 · Curl de Muñeca 240 ·
  Rotaciones de Muñeca 114.

  Caso pegado (hombre, principiante, 3 días, gym, ganar músculo, semilla 8): el día de
  **Tracción** pide 2 huecos de bíceps y salen **«Curl de Muñeca con Barra» + «Curl de Muñeca
  Invertido»** — cero trabajo de bíceps ese día, en el día que se llama Tracción.
- **La causa, y por qué creció:** el pool de bíceps `Aislamiento` nivel P en gym son **16
  ejercicios y 4 son de muñeca (25 %)**. La memoria semanal `usedInWeek` (`avi-core.js:1470`),
  que es el arreglo correcto de la monotonía que reporté en julio, **reparte por TODO el pool**
  — así que cuanto más bíceps pide la semana, más se cae en los mal etiquetados. Medido, y es
  monótono:

  | Hueco de bíceps nº de la semana | n | % de muñeca |
  |---|---|---|
  | #1 | 2.592 | 12,5 % |
  | #2 | 1.632 | 20,6 % |
  | #3 | 1.008 | **30,4 %** |
  | #4 | 336 | **35,7 %** |

  Es la lección del repo del revés: **al arreglar la regla, el error del CATÁLOGO deja de estar
  amortiguado y sale a la superficie** (misma forma que v519, donde el preset «Funcional»
  repetía por dos etiquetas malas).
- **Intenté tumbarlo así:** (a) ¿es defendible? El **Curl Zottman (e214)** y el **Curl Invertido
  (e139)** trabajan braquial y braquiorradial y los cuento como brazo legítimo — los excluí del
  recuento. El curl de muñeca es flexor de dedos y muñeca: no comparte función con el bíceps.
  (b) ¿lo tapa el gate de nivel? No: los cuatro son nivel `P`, o sea los PRIMEROS de la cola
  para un principiante. (c) ¿es ruido de mi biblioteca? La extraje de `defaultExercises`, que
  desde v516/v517 es la fuente del dato (`healExerciseEnv` la impone en cada arranque).
  (d) ¿es un artefacto de pocas semillas? Corrí 8; la curva por orden de hueco es monótona en
  las cuatro posiciones. Sobrevive.
- **A quién le pasa:** a todo hombre con 3+ días (los splits `TRACCION` y `HOMBROS_BRAZOS` son
  suyos) y a toda mujer con 3+ días vía `TREN_SUP`/`EMP_BRAZOS`. En producción, a los que hoy
  entrenan con plan generado.
- **Costo del arreglo:** **cambio de DATOS, no de lógica.** `muscle:'antebrazo'` en e140, e209,
  e210, e213 y e211. Como no hay ningún slot de `antebrazo` en `GEN_DAYS`, salen del pool y no
  hay que tocar nada más; si se quieren conservar, un slot opcional de antebrazo en el día de
  Tracción. **Una hora.** ⚠️ Ojo con el efecto de v513: **antes de mover un ejercicio de músculo,
  auditar el pool que queda** — el de bíceps baja de 16 a 12 en gym y de 6 a 4 en casa, que sigue
  siendo suficiente para 4 huecos semanales (verificado en el barrido).


### H2 · 🟠 La app promete «~43 min» y «menos de una hora»; la sesión real dura 56 y el 44 % pasa de la hora

- **Qué pasa:** `SET_WORK_SECONDS` sigue en **45 s** (lo reporté en julio como H8 y no se tocó).
  La fórmula cuenta solo *trabajo + descanso nominal*: no cuenta montar la máquina, cambiar
  discos, el calentamiento, esperar el equipo ni el celular. El número se pinta en el momento de
  máxima fragilidad —la portada del **día 1** y la tarjeta de arranque— y desde v503 alimenta
  además una **promesa en palabras**: `underHour`.
- **Dónde:** `avi-core.js:6498` (`const SET_WORK_SECONDS = 45`) · `avi-core.js:6500-6508`
  (`estimateWorkoutMinutes`) · `avi-core.js:6653` (`underHour: mins != null && mins < 60`) ·
  superficies: `app-4-entreno.js:691` (portada del día 1, `renderFirstRun`) y
  `app-4-entreno.js:830` (`_startCardHTML`), más el héroe de «Hoy» vía `todayHeroModel`.
- **Evidencia** (producción, 2026-08-23):

  | | |
  |---|---|
  | Rutinas reales medidas | **102** (21,7 series de media, descanso 73 s) |
  | Lo que predice la fórmula hoy (45 s) | **42,7 min** de media · **42,0** de mediana |
  | Sesiones reales con `durationSec` | **226** |
  | Duración real | p25 **40,4** · **mediana 55,7** · p75 **74,1** · p90 **97,5** min |
  | Segundos reales por serie completada | **156** (mediana) — la fórmula asume 45 + 73 = **118** |

  Y la promesa en palabras, que es la que más pesa:

  | | |
  |---|---|
  | Rutinas que hoy dicen **«menos de una hora»** | **87 de 102** |
  | Sesiones reales que **pasaron de la hora** | **100 de 226 (44 %)** |

  Con `SET_WORK_SECONDS = 65` la predicción sube a **49,9 min**; con 90, a **59,0** — que es donde
  de verdad cae la mediana real.
- **Intenté tumbarlo así:** (a) **el argumento obvio es que `durationSec` se infla si alguien deja
  la app abierta.** Lo comprobé: hay 7 sesiones de más de 3 h y el máximo son 240 min. Por eso NO
  uso la media (60,7) sino la **mediana (55,7)** y el **p25**. El p25 es **40,4 min**, o sea que
  **tres de cada cuatro sesiones reales duran más de lo que la app predice** — y quitando los 7
  outliers siguen siendo **93 de 226** las que pasan de la hora. La conclusión no depende de la
  cola. (b) ¿lo tapa que la gente abandone a mitad? Iría en contra: una sesión abandonada dura
  MENOS, así que la cifra real está subestimada, no inflada. (c) ¿se pinta solo en día 1? No:
  desde v503 también en el héroe y en la tarjeta de arranque, todos los días. Sobrevive.
- **A quién le pasa:** a todo el que abre la app. Y con más filo al del **día 1**, que es
  exactamente donde el comentario del propio código advierte *«decirle "~35 min" a alguien que va
  a tardar 70 quema la confianza en el primer día»*. Con 8 de 22 asesorados que nunca completaron
  una sesión, es el mensaje que más caro sale.
- **Costo del arreglo:** **una constante.** `SET_WORK_SECONDS` de 45 a ~65 (o un sobrecoste fijo
  de transición por ejercicio). Cinco minutos, calibrable contra estas 226 sesiones. ⚠️ **Y hay
  que mirar `underHour` en el mismo commit**: con 65 s, 87 rutinas siguen prometiendo menos de una
  hora; para que la frase sea verdad en la mediana real haría falta ~90 s. **Mi recomendación de
  entrenador: subir la constante a 65 y que `underHour` exija margen** (`mins < 50`), porque
  quedarse corto en el número se perdona y romper la frase escrita no.

### H3 · 🟠 «6 claras de huevo» en el desayuno: el tope de ración se calibró en GRAMOS para el huevo y lo heredó la clara, que pesa la mitad

- **Qué pasa:** era la cola abierta a mi nombre («el piso de proteína no cede»). Medido, el piso
  **sí cede** — cede contra el `maxG` del alimento. El problema es otro y es más concreto: el
  tope se eligió midiendo el **HUEVO** (`maxG:200` = 4 huevos, decidido en v471 barriendo cinco
  valores) y el **mismo número de gramos** quedó puesto en la **CLARA**, cuya medida casera pesa
  33 g en vez de 50. 200 g de clara son **6,1 claras**. El tope existe, pero para la clara está
  puesto una talla y media más arriba.
- **Dónde:** tabla de alimentos en `avi-core.js` → `huevo` `{un:{label:'huevo',g:50}, maxG:200}`
  (= 4,0 medidas) y `clara` `{un:{label:'clara',g:33}, maxG:200}` (= **6,1 medidas**). El tope se
  aplica en `nutPortionText`/`nutSolveMeal`.
- **Evidencia:** resolví el plato de **las 12 personas con plan real**, 7 días × 3 tipos de día =
  **252 días-plan, 1.260 comidas, 3.825 raciones**:

  | Alimento | raciones ≥3 medidas | de | máx. alcanzado | `maxG` |
  |---|---|---|---|---|
  | **clara** | **136** | 147 (93 %) | **6,0 claras** | 200 g |
  | **huevo** | 161 | 196 (82 %) | 4,0 huevos | 200 g |
  | aguacate | 79 | 224 | 4,0 octavos | **sin tope** |
  | pan_integral | 40 | 253 | 4,0 tajadas | 112 g |
  | **arepa** | 27 | 162 | **4,0 arepas** | **sin tope** |

  Que el huevo tope **exactamente** en 4,0 y la clara **exactamente** en 6,0 demuestra que el
  tope MUERDE: el solver pedía más y el `maxG` lo cortó. Y le pasa a **las 12 personas**: 8 de
  ellas reciben 5 o 6 claras en una sola comida, **incluida la asesorada de 15 años** (4 claras).

  Comidas pegadas, generadas ahora:
  - **Chema · Desayuno:** «4 huevos (200 g) + **4 arepas (320 g)** + Tomate»
  - **Andrés (el coach) · Desayuno:** «**6 claras (198 g)** + media taza + medio banano + 1 puñado»
  - **Astrid · Almuerzo:** «1½ tazas + 1½ cucharadas + **4 octavos de aguacate** + ensalada»
- **Lo que NO está roto, y hay que decirlo:** el plato **entrega lo que promete**. Sobre esos 252
  días: kcal **92,1 % – 109,5 %** (mediana 100,8) y proteína **93,4 % – 119,0 %** (mediana 105,6),
  las dos dentro de la franja ±12 % que la app ya declara. Esto es un defecto de **cómo se lee**,
  no de cuánto se sirve. La parte del enunciado viejo que hablaba de «9 tajadas de pan» **está
  cerrada**: `pan_integral` tiene `maxG:112` y topa en 4 tajadas.
- **Intenté tumbarlo así:** (a) **mi primera medición dio 0 de 1.260 y era MÍA**: leía `it.g`
  cuando el campo es `it.grams`, así que todas las raciones salían en 0 medidas. Puse un control
  («items resueltos: 3.825; si fuera 0 la medición no vale») y volvió el número real. Sin ese
  control habría reportado «cerrado» sobre una sonda muerta. (b) ¿es que las 12 personas tienen
  la proteína muy alta? No: le pasa igual a **Luz (111 g)** y a **Nataly (119 g)**, que son las
  dos más bajas — con 4 claras. (c) ¿lo arregla bajar `NUT_PROT_MIN_SHARE`? Ya se midió en v490
  que bajarlo de 0,70 a 0,60 **no movió ni una décima** de la esquina, y el comentario del código
  lo dice: el exceso de esa esquina es GRASA, no proteína. (d) ¿es el aguacate un problema? 4
  octavos son medio aguacate — **eso no es una ración absurda**, solo una unidad rara para
  decirla; lo dejo fuera del hallazgo. Lo que no se defiende son 6 claras y 4 arepas.
- **A quién le pasa:** a las 12 personas con plan nutricional. Cada una lo lee en su desayuno.
- **Costo del arreglo:** **cambio de datos, en la tabla.** `clara: maxG:132` (4 claras, la misma
  medida casera que el huevo) y un `maxG` para `arepa` (~240 g = 3 arepas). ⚠️ **No se aplica a
  ciegas: la lección de v471 es que topar un alimento tiene un valor INTERMEDIO peor que no
  topar** (al recortar, el menú deja de caber, sale del pool factible y el selector se va a otro
  con raciones mayores). Hay que **barrer el rango** de valores y volver a medir la entrega
  (kcal y por macro) y la franja `FOODLOG_BAND`. **Media jornada de medición, 2 líneas de
  cambio** — y si el valor que arregla la métrica cuesta comida real, la decisión es de Andrés,
  no mía.

### H4 · 🟠 El gate de nivel se corrige HACIA ADELANTE y nunca hacia atrás: 4 ejercicios avanzados siguen hoy en planes de principiante/intermedio — y uno lo puso v513

- **Qué pasa:** el motor de HOY no comete el fallo (**0 violaciones en 5.760 planes**, verificado
  abajo), pero **nada regenera ni cura los planes ya escritos**. Lo reporté el 31-jul como H7 con
  4 casos; 24 días después **siguen ahí los mismos dos de Felipe**, y encima hay uno **NUEVO que
  creó la propia corrección de v513**.
- **Dónde:** `avi-core.js:1124` (`EX_LEVEL`) · `avi-core.js:1246` (`_levelGate`) · las rutinas
  viven en `user_data.routines` y no se recalculan nunca. `e92` pasó de `'I'` a `'A'` en v513.
- **Evidencia** (query contra producción, cruzando `routines` con los 26 ids de nivel `A`):

  | Persona | Nivel declarado | Rutina | Ejercicio | Nivel hoy |
  |---|---|---|---|---|
  | FELIPE R.L (auto-reg, 18 a) | Principiante | Full Body | **Pike Push-up** | A |
  | FELIPE R.L | Principiante | Full Body | **Rueda Abdominal (Ab Wheel)** | A |
  | FELIPE R.L | Principiante | Full Body 3 | **Pike Push-up** | A |
  | **Sofía Vega triana** (auto-reg, 18 a) | Intermedio | Glúteo y Piernas A | **Hip Thrust Unilateral (e92)** | **A** |

  Las 4 rutinas están marcadas `generated:true`. **Ninguna rutina hecha a mano por el coach
  viola el gate.**

  > ✅ **Re-verificado por el orquestador (24-ago, contra producción, cruzando los 18 ids de
  > nivel `A` de `EX_LEVEL` con `user_data.routines`): salen esas 4 filas y ninguna más.** Y un dato
  > que cambia la urgencia sin cambiar el hallazgo: **Felipe y Sofía tienen 0 sesiones cada uno —
  > nadie ha ejecutado hoy ninguno de estos 4 ejercicios.** El defecto es real y no está lastimando
  > a nadie ahora mismo; el riesgo es que el día que uno de los dos abra la app, ya nadie va a
  > estar mirando. Es el mismo argumento con el que se puso el candado de menores de v522.
- **El caso de Sofía es el que enseña algo nuevo:** v513 subió `e92` de `'I'` a `'A'` **porque su
  propia ficha lo llama «progresión avanzada»** — o sea, el repo ya reconoció que dárselo a una
  intermedia es un error. El motor dejó de entregarlo ese mismo día; **el plan que ya estaba
  escrito se quedó con él**. Es exactamente la clase que el CLAUDE.md del repo nombra dos veces
  («arreglar datos solo en la nube no dura», «al retirar una entidad enumera todas las listas que
  la referencian») aplicada al revés: **al RE-ETIQUETAR un ejercicio hay que barrer los planes
  vivos que ya lo tenían.**
- **Intenté tumbarlo así:** (a) ¿lo comete el motor de hoy? **No**: 5.760 planes (2 sexos × 3
  niveles × 5 frecuencias × 6 objetivos × 4 entornos × 8 semillas) → **0 violaciones de gate y 0
  días vacíos**. El motor está sano; los datos no. (b) ¿es ruido de mi tabla de niveles? La leí de
  `EX_LEVEL` del propio `avi-core.js`, y crucé por **id**, no por nombre. (c) ¿lo cura algo al
  cargar? Hay auto-curas para el entorno (`healExerciseEnv`, v517) y para los ids retirados
  (`dedupeExercises`), pero **ninguna para el nivel** — lo verifiqué grepeando. (d) ¿le pasa a
  alguien que entrene? Las dos personas tienen **0 sesiones**, y por eso lo dejo en 🟠 y no en 🔴:
  hoy nadie se ha hecho daño. Pero el plan está en su teléfono esperando el día que abran la app.
- **A quién le pasa:** a Felipe (principiante que nunca entrenó, con dos avanzados) y a Sofía
  (que se apuntó a **Fuerza**, o sea la que más probable es que cargue). Y a cualquiera cuyo plan
  se generara antes de la próxima re-etiquetación.
- **Costo del arreglo:** dos niveles, y el barato ya está diseñado en el repo.
  **(1) Parche de 5 minutos:** el coach regenera la semana de esas 2 personas (ninguna tiene
  historial que huerfanar). **(2) Raíz, un día:** una **auto-cura en el CLIENTE** al estilo de
  `healExerciseEnv` — al cargar, sustituir cualquier ejercicio por encima del gate por otro del
  mismo músculo/tipo dentro del nivel (`_genPick` ya sabe hacerlo) y persistir. ⚠️ Tiene que ir
  en las **DOS puertas** (arranque del coach y del asesorado): el asesorado escribe su propia
  fila, así que curarlo solo del lado del coach lo deja para que el teléfono lo vuelva a pisar
  (lección de v518).

---

### H5 · 🟡 Declarar dolor quita el peso… salvo al step-up con mancuernas: `core` y `funcional` están exentos del rebaje

- **Qué pasa:** con el ánimo 🤕 la app pasa los ejercicios de carga a peso corporal. Pero
  `_isLoadedEx` devuelve `false` **de plano** para `muscle === 'core'` y para todo `type` que
  case `funcional`, así que esos conservan carga y series completas.
- **Dónde:** `avi-core.js` → `_isLoadedEx` (`if (muscle === 'cardio' || muscle === 'core') return
  false;` y `if (/bodyweight|isom|funcional|cardio|hiit/.test(type)) return false;`) ·
  `applyMood`, rama `case 'dolor'`.
- **Evidencia:** apliqué `applyMood(rutina,'dolor')` a los planes de un barrido de intermedios
  (3-5 días, 3 semillas) → **11.052 ejercicios**, de los cuales **77 (0,7 %) conservan la carga
  siendo de carga**, en solo tres nombres:

  | Ejercicio | Veces | Por qué se escapa |
  |---|---|---|
  | **Step-up con Mancuernas** | 54 | `type: Funcional` |
  | Lanzamiento a Pared | 18 | `type: Funcional` |
  | Crunch en Polea Alta | 5 | `muscle: core` |

  Reproducido en aislado: una rutina con Russian Twist, Crunch, Prensa y Press de Banca, tras
  declarar dolor, deja **Russian Twist en 4 series con `track:'peso_reps'`** y el aviso dice
  «2 ejercicios sin carga» (que es verdad — rebajó 2 de 4).
- **Por qué es 🟡 y no más:** (a) es el **0,7 %**; (b) el canal de dolor con ZONA
  (`painCare` → `GEN_ZONE_EXCL`) sí filtra bien y es el que importa clínicamente; (c) el ánimo
  🤕 no sabe DÓNDE duele, así que no puede excluir por zona — rebajar la carga y avisarle al
  coach es una respuesta razonable para un dolor sin ubicación; (d) en el catálogo **solo 1 de
  los 28 ejercicios de core admite carga** (`e131`), así que la exención de `core` casi no tiene
  población. **Lo que sí no se defiende es el step-up con mancuernas**: es carga externa,
  unilateral y con excursión de rodilla, y es justo lo que uno quita cuando alguien dice «hoy me
  duele».
- **Intenté tumbarlo así:** (a) ¿el `care` compensa? Sí empuja a parar («si algo duele de verdad,
  para — no es negociable»), lo cual baja la gravedad, pero el plan igual le pinta las mancuernas.
  (b) ¿la exención de `funcional` es deliberada? El comentario no lo dice; y `Funcional` incluye
  desde el bird dog hasta el clean, o sea que no es un proxy de «sin carga». (c) ¿lo tapa el
  correctivo? No, es otro camino. Sobrevive con el matiz.
- **Costo del arreglo:** **una línea.** Que la exención mire la MODALIDAD real y no la categoría:
  `if (exTrack(ex) !== 'peso_reps') return false;` en vez de listar `funcional`/`core` (o, con
  menos riesgo, quitar solo `funcional` de la regex y dejar el resto). 15 minutos + un test que
  afirme que el step-up con mancuernas se rebaja **y su control**: que el bird dog NO cambie.

### H6 · 🟠 El auto-registro le pone «moderadamente activo» a quien todavía no ha entrenado nunca — y ese supuesto ya está escrito como plan en producción

- **Qué pasa:** `_provisionFreeClient` escribe `activityFactor:1.55` **a pelo**, y el wizard de 7
  pasos **no lo pregunta en ninguno** (verificado leyendo los pasos 01-07 de `index.html`: no
  aparece la palabra «activo», «sedentario» ni «moderado»). 1,55 es *«moderadamente activo, 3-5
  días de ejercicio»*. Quien se registra HOY para EMPEZAR a entrenar es, por definición, lo
  contrario. Lo reporté en julio como H11 y lo dejé en 🟡 porque *«la nutrición está bloqueada
  para el tier libre, o sea que ninguno de los 13 la ve»*. **Eso ya no es cierto.**
- **Dónde:** `app-3-coach.js:467` (`activityFactor:1.55` literal, dentro de `_provisionFreeClient`)
  · pasos del wizard en `index.html:174-320` · consumo: `calcTDEE` → `nutritionEstimate` →
  `kcalTargetFor` y el botón «✨ Generar» del coach.
- **Evidencia:**
  1. **El público cambió.** De los 13 auto-registrados, **9 tienen hoy tier `premium` o `app`**
     (Chema, Sofía Vega, Sharith, Santiago, jhojan, Cristian, YEISON, jose Daniel, Valery) — o
     sea que **sí ven la nutrición**. Solo 4 quedan en `libre`.
  2. **La diferencia, con sus perfiles reales:**

     | Persona | kcal con 1,55 (lo que la app le puso) | con 1,375 | con 1,2 | diferencia |
     |---|---|---|---|---|
     | Chema (M, 25, 79 kg) | **3.114** | 2.802 | 2.490 | **624 kcal/día** |
     | jhojan (M, 18, 65,5 kg) | 2.909 | 2.620 | 2.331 | 578 |
     | Sharith (F, **16**, 72 kg) | 2.697 | 2.393 | 2.089 | 608 |
     | Sofía Vega (F, 18, 64 kg) | 2.401 | 2.153 | 1.904 | 497 |

  3. **Y ya no es hipotético: está escrito.** **Chema tiene plan nutricional guardado de
     3.114 kcal** — exactamente el número que sale de 1,55 — **con 0 sesiones entrenadas**. Su
     rótulo es `volumen`. Contra un TDEE de 1,55 eso es un superávit sano de +350; contra el TDEE
     que le correspondería a alguien que no entrena (~2.140) son **+975 kcal/día**, que a razón
     de ~1 kg/semana es casi todo grasa. Es la misma prescripción que reporté en julio para
     Nataly, con una diferencia importante: **el número de Nataly lo puso un botón de plantilla y
     este lo puso el motor**, a partir de un dato que nadie le preguntó.
- **Intenté tumbarlo así:** (a) **¿puede corregirlo el asesorado?** Sí, y esto es lo que baja el
  hallazgo de 🔴 a 🟠: `_NUT_ACTS` (`app-5-salud.js:346`) pinta cinco botones Sedentario/Ligero/
  Moderado/Activo/Muy activo y `setNutActivity` los aplica — **dos toques**. (b) Pero eso NO salva
  el plan ya guardado: el de Chema quedó escrito con 1,55 y cambiar los botones no reescribe el
  plan del coach. (c) ¿el revisor lo caza? No: `nutPlanReview` compara el plan contra
  `nutritionEstimate`, que usa **el mismo 1,55**, así que los dos se equivocan juntos — es un
  oráculo que llama a la función bajo prueba (el gotcha de F7 del repo). Corrí `nutPlanReview`
  sobre las 12 personas con plan: **las 12 dan `ok`**, Chema incluido. (d) ¿le pasa a alguien que
  el coach creó a mano? No: ahí el coach elige el factor en `#cf-activity`. Sobrevive.
- **A quién le pasa:** a los 9 auto-registrados con tier premium/app, y a todo el que se registre
  mañana. Con más filo a **Sharith, 16 años** (menor: la banda de v485/v493 se calcula sobre este
  mismo TDEE inflado, así que su piso y su techo salen los dos altos).
- **Costo del arreglo:** hay dos, y yo haría los dos.
  **(1) Una línea, hoy:** bajar el default de `1.55` a **`1.375`** («ligeramente activo»), que es
  lo honesto para quien está empezando y deja el error del lado seguro. **(2) Un paso más en el
  wizard** (media jornada): ya hay cinco chips escritos y probados en `_NUT_ACTS` — es copiarlos
  al paso 06, que ya pregunta edad/peso/talla. ⚠️ **Y de paso hay que decidir qué hacer con el
  plan de Chema**, que ya está en su teléfono: eso es una decisión del coach, no del código.

### H7 · 🟠 Ahora el wizard SÍ pregunta por lesiones — pero el plan que sale de ahí se sella como «revisado» y nadie le avisa al coach

- **Qué pasa:** el hallazgo más grave de mi informe de julio (H1: *«el registro NUNCA pregunta por
  lesiones»*) **está cerrado**: el paso 06 del wizard tiene un campo *«Lesiones — Ej: hernia
  discal, dolor de rodilla»* y alimenta `parseLimitations` por las dos vías (correo y Google).
  El filtro funciona (lo verifico abajo con un caso real). **Lo que quedó abierto es la otra
  mitad:** `_autoGenerateWeek` escribe `reviewed:true` sobre TODAS las rutinas generadas, incluso
  las de alguien que acaba de declarar una hernia — y **no hay ninguna superficie que le diga al
  coach que entró un lead con limitación**.
- **Dónde:** `index.html:297` (`#su-notes`, el campo nuevo) · `app-3-coach.js:1124` y `:1179` (las
  dos vías que lo recogen) · `app-3-coach.js` → `_autoGenerateWeek`:
  `c.routines = sortRoutinesByDay(res.routines.map(r => ({...r, reviewed:true})))` — el
  `needsReview:true` que devuelve `generarRutinas` se pisa ahí mismo ·
  `app-3-coach.js:2510-2516` (`renderGenPreview`): **el banner «⚠️ Limitación detectada» vive SOLO
  en la vista previa del botón «✨ Generar» del coach**, que el auto-registro no recorre.
- **Evidencia:**
  - `grep -n "needsReview" app-*.js` → **una sola línea, y es un comentario**. El campo lo produce
    el motor y no lo lee ninguna vista.
  - `clientAttentionRank` (`avi-core.js`) sube al tier 0 a quien tiene `painCare` (el ⚠️ dentro
    de la app) pero **no mira `notes`**: un auto-registrado con hernia declarada entra a la lista
    del coach como un lead cualquiera, sin marca.
  - El principio rector de `docs/auto-generador-rutinas.md` §0 («el coach SIEMPRE revisa y
    aprueba, innegociable por seguridad») sigue sin cumplirse en esa vía.
  - `GEN_NERVE_RE` detecta compromiso nervioso («hormigueo», «se me duerme», «irradia») y produce
    un `nerveAdvice` de **derivación médica** — que queda escrito dentro de la nota de la rutina y
    **no se le empuja a nadie**.
- **Intenté tumbarlo así:** (a) ¿el filtro protege igual aunque nadie revise? **Sí, y esto es lo
  que lo baja de 🔴 a 🟠** — lo verifiqué con el plan REAL de **Danilo** (51 años, *«Hernia lumbar
  L5, hernia umbilical»*, 5 rutinas todas `generated:true`): su semana entera no trae **ni un
  crunch, ni un Russian Twist, ni un peso muerto**, y su core son Plancha, Plancha Lateral,
  Dead Bug, Bird Dog y **Press Pallof** — exactamente el trabajo antiextensión/antirrotación que
  pide Laura. El filtro hace su trabajo. (b) ¿le pasa hoy a alguien? **No, y lo digo con el dato:
  los 13 auto-registrados tienen `notes` vacío**, porque el campo es nuevo. Es una superficie
  viva sin población todavía. (c) ¿lo ve el coach al abrir la ficha? Ve la nota de la rutina si
  entra al editor de esa rutina; no hay nada en la lista ni en el Inicio. Sobrevive.
- **A quién le pasa:** al próximo que se registre solo escribiendo una lesión — y ese es
  justamente el caso para el que se construyó el campo. Hoy son 0 personas; el día que sea 1, ya
  no habrá nadie mirando.
- **Costo del arreglo:** **una línea y media.**
  (1) En `_autoGenerateWeek`, no forzar `reviewed:true` cuando `res.limitations.detected`
  (`reviewed: !res.limitations.detected`).
  (2) Añadir un tier en `clientAttentionRank` para `notes` con limitación detectada, reusando
  `parseLimitations` que ya es pura — así el lead sube en la lista del coach con su etiqueta.
  **Media jornada con test.** Y si se hace, el caso de `GEN_NERVE_RE` merece su propia etiqueta:
  «este lead describe síntomas nerviosos — derivación médica antes de cargar» no es lo mismo que
  «tiene una limitación».


---

## Las colas abiertas que me tocaban — respuesta con su medición

### 1. «El piso de proteína no cede: 9 tajadas de pan y 4 huevos encima» → **medido, y el enunciado era medio falso**
Las 9 tajadas **están cerradas** (`pan_integral` tiene `maxG:112` = 4 tajadas). Y el piso **sí
cede**: cede contra el `maxG`. El defecto real es otro, más pequeño y más arreglable: el tope de
la **clara** está puesto en 200 g igual que el del huevo, y una clara pesa 33 g, así que topa en
**6 claras**. Está en **H3**, con las 3.825 raciones medidas.

### 2. `carga_liviana` de Andrés («quien llega a 18+ reps no necesita descargar, necesita SUBIR») → **no está construido, y hoy casi no tiene población**
No existe en el código (`grep carga_liviana` sobre los 8 módulos → 0; solo aparece en la bitácora
y en `docs/plan-estancamiento-descarga.md:231`). **Pero la exposición es mínima:** de las **4.501
series reales con peso registrado, solo 91 (2,0 %) llegan a 18 repeticiones o más** y 89 llegan a
20. El `PERF_CLAMP_REPS = 20` del índice de rendimiento —que es el mecanismo por el que alguien
que progresa subiendo repeticiones se vería como «estancado»— **muerde en 2 de cada 100 series**.
**Recomendación de entrenador: no construirlo ahora.** No es que el criterio de Andrés esté mal
—lo comparto—: es que hoy no le pasa a casi nadie, y hay cosas en esta lista que les pasan a las
12 personas todos los días. Que quede escrito con su cifra para cuando la gente entrene más.

### 3. La señal de recuperación de Laura como gate del disparo automático → **no está construida, y NO HAY DATO con qué construirla**
Es la respuesta incómoda. El único campo que la app recoge sobre cómo se siente alguien es
`feeling`, y **no aguanta**: medido hoy contra producción, **37 de 331 sesiones (11,2 %)** lo
traen, y en agosto **9 de 111 (8,1 %)** — o sea que la cobertura va **a menos**, no a más. Antes
de construir un gate de recuperación hay que decidir de dónde sale su insumo; hoy no existe.

### 4. `feeling` se recoge en el 12 % — ¿alcanza para lo que el motor decide con ello? → **el motor no decide NADA con ello, y eso está BIEN**
Grepeé los 8 módulos: `feeling` solo se **pinta** (`app-4-entreno.js:2592` en la habitación de la
sesión y `:3237` en el historial) y se **guarda** (`:2032`). **Ninguna función de decisión lo
lee** — ni `stallReport`, ni `shockTargets`, ni `deloadState`, ni `coachInsight`. Así que el 11 %
de cobertura **no está haciendo daño**: es un dato decorativo, no un motor decidiendo sobre humo.
La pregunta que sí queda viva es la del punto 3: si alguna vez se quiere un gate de recuperación,
**este no es el campo**.

### 5. La rampa calórica → **sigue sin construirse, y hay que RE-MEDIR el argumento antes de decidir**
`grep` de rampa/gradual en el motor de nutrición: nada. `nutBaseFor` entrega el objetivo completo
desde el día 1; la decisión sigue siendo del PO. Lo que añado desde el motor: la premisa que le
daba la razón al PO —«el salto entero cae sobre el CARBOHIDRATO, +178 a +213 g/día»— **se midió
sobre una fórmula que ya no corre**. Hoy `calcMacrosFromKcal` dosifica proteína y grasa sobre el
peso de REFERENCIA y el carbohidrato tiene **piso propio** (`NUT_CARB_MIN_G_KG`), que empuja la
caloría objetivo hacia ARRIBA en vez de recortar. Medido en los 12 planes reales, la entrega de
carbohidrato del día va del 92 % al 110 % del objetivo. **Antes de usar ese argumento para
decidir, hay que volver a calcular el salto con el motor de hoy.**

---

## Lo que revisé y está SANO

Esto vale tanto como los hallazgos: **el delta v418→v526 cerró seis de mis once puntos de julio**,
y los cerró de verdad, con evidencia reproducible.

### Cerrado desde julio (re-verificado, no heredado)

- ✅ **H2 de julio — el filtro lumbar entregaba flexión de columna cargada.** **CERRADO.** Barrido
  de **2.880 planes** con `notes:'Tengo hernia discal lumbar'` → **0 ejercicios de riesgo**
  (crunch, Russian twist, elevación de piernas, peso muerto, hiperextensión). **Con su control:**
  los mismos 2.880 planes SIN la nota entregan **3.875**. En julio la cifra era 1.246 → 1.246.
  Confirmado además sobre gente real: el plan de **Danilo** (51 años, hernia L5, 5 rutinas todas
  auto-generadas) no trae ni uno, y su core es Plancha · Plancha Lateral · Dead Bug · Bird Dog ·
  **Press Pallof**. `GEN_ZONE_EXCL` cubre hoy 8 zonas y cada estrechamiento lleva su razón
  clínica escrita al lado, firmada por Laura.
- ✅ **H3 de julio — toda mujer principiante recibía CERO series de glúteo.** **CERRADO** por
  v430: `FULL_BODY` tiene puesto dedicado `['gluteo','Aislamiento',1]` (`avi-core.js:263`).
  Barrido: **0 planes con cero glúteo** en las poblaciones que antes lo tenían. El comentario del
  código documenta además por qué es `Aislamiento` y no `Compuesto` (con `Compuesto` entregaba
  Hip Thrust Unilateral el 24,6 % de los días) y por qué va para todos y no solo para mujeres.
- ✅ **H4 de julio — el plan del principiante era el mismo entrenamiento repetido.** **CERRADO**
  por la memoria semanal `usedInWeek` (`avi-core.js:1470`). Medido sobre 5.760 planes:

  | | julio | hoy |
  |---|---|---|
  | Huecos repetidos en la semana (principiante) | **32,0 %** | **1,6 %** |
  | Ejercicios presentes en TODOS los días (media por plan) | **1,50** | **0,00** |

  Para el intermedio, 8,9 % → 1,4 %. **Cero** ejercicios presentes en todos los días en los 5.760
  planes. (El precio de este arreglo es H1: repartir por todo el pool destapa los mal etiquetados.)
- ✅ **H5 y H6 de julio — los presets de kcal fijas y los dos motores de macros.** **CERRADOS.**
  Corrí `nutPlanReview` sobre **los 12 planes reales** de producción: **los 12 devuelven `ok`**.
  Ninguno es volcado de plantilla; el titular cuadra con sus propios macros en los 12 (desfase
  máximo 2 kcal); el rótulo coincide con la dirección real en los 12; y la **dosis de proteína
  está en doctrina en los 12**, medida en g/kg de peso de REFERENCIA que es la unidad del dictamen
  de Andrés. Comparación directa:

  | Persona | julio | hoy | su TDEE |
  |---|---|---|---|
  | **Nataly** (F, 40, 59,5 kg, ganar músculo) | **3.200** «Volumen» | **2.198** | 1.933 |
  | **Kathe** (F, 28, 83 kg, perder grasa) | 2.400 «Mantenimiento» | **1.899** | 2.399 |
  | Claudia (F, 34, 74 kg) | 2.400 «Mantenimiento» | 2.145 | 2.145 |
  | Natalia (F, 34, 65 kg) | 2.400 «Mantenimiento» | 2.083 | 2.083 |

  Los +1.300 kcal/día de superávit de Nataly —la peor prescripción que encontré en julio— hoy son
  **+265**. Es lo que más ha mejorado del área.
- ✅ **H1 de julio — el registro no preguntaba por lesiones.** El campo existe (`#su-notes`,
  `index.html:297`) y entra por las dos vías (correo y Google). Queda abierta solo la otra mitad,
  la de «alguien revisa» → **H7**.
- ✅ **El peso que alimenta la nutrición es el ÚLTIMO registrado, no el de la ficha** (5.ª
  superficie del peso, v448/v511). Verificado en los 12: Nataly va con 59,5 y no con 56; Kathe con
  83 y no con 85; Samuel con 86 y no con 78.

### Verificado sano hoy (cosas que en julio no alcancé a mirar)

- ✅ **El gate de nivel, hacia adelante.** **5.760 planes → 0 violaciones y 0 días vacíos.** El
  motor está sano; lo que no está sano son los datos viejos (H4).
- ✅ **El calentamiento SÍ corresponde a los músculos del día** — era mi «no verificado» de julio.
  Corrí `buildWarmup` (`app-6-extra.js:2111`): día de PIERNA → movilidad de cadera/rodilla/tobillo
  + activación de sentadilla, desplante, plancha y dead bug; día de EMPUJE → hombro/manguito/
  muñeca + lagartija y band pull-apart. **Y el filtro de limitaciones llega hasta aquí** (el
  arreglo de v424): con `lumbar` declarada desaparece «Rollitos sobre colchoneta» (flexión de
  columna) y entra «Rotación torácica en el suelo». Puerta y ventana, las dos cerradas.
- ✅ **El sistema CORRECTIVO**, que no existía en julio. El motor ya no solo quita lo que hace
  daño: **añade** lo que falta. Verificado en producción: Danilo lleva **Press Pallof con Banda
  2×10 en 4 de sus 5 días**, con su `correctiveWhy` explicando de dónde salió. Y trae su candado:
  con dolor de nivel 3 (impide entrenar) **no se prescribe nada** — añadirle un ejercicio a quien
  acabas de decirle que pare es contradecirse en la misma pantalla.
- ✅ **El detector de estancamiento y la descarga, sobre datos reales.** Reconstruí el historial
  completo de producción (**1.296 puntos ejercicio-día**, con el conteo verificado contra la base:
  `N=1296` y 1.296 líneas leídas) y corrí `stallReport` y `shockTargets`: **7 personas evaluables,
  28 ejercicios marcados, 7 en regresión y CERO descargas globales disparadas.** En julio el
  frente daba 41 marcados y 4 descargas sobre gente que estaba mejorando. Las compuertas de
  persona funcionan y son legibles: Claudia, Luz y Valery salen «principiante en adaptación» (no
  se les opina), y a **Astrid —el caso real que originó v433— hoy no se le dispara ninguna
  descarga.**
- ✅ **El plato entrega lo que promete.** 252 días-plan de las 12 personas reales, 1.260 comidas:
  kcal **92,1 %–109,5 %** (mediana 100,8) y proteína **93,4 %–119,0 %** (mediana 105,6), las dos
  dentro de la franja ±12 % que la app declara. Lo que falla es cómo se LEE una ración (H3), no
  cuánto se sirve.
- ✅ **El catálogo declara dónde se hace cada ejercicio.** **244 de 244 con `env`**, 0 sin
  declarar (eran 91 sin declarar antes de v516). Alcance real medido: gym 239 · casa 142 ·
  parque 113 · corporal 81.
- ✅ **El techo de volumen.** Planes con más de 25 series/semana de piernas: **96 de 5.760
  (1,7 %)**, y los 96 son de nivel Avanzado con objetivo Fuerza, con 30 de pierna **y 30 de
  glúteo** — que es un split de pierna legítimo, no una plantilla multiplicada. En julio eran 92
  de 600 (**15 %**) e incluían a un chico de 17 años con 40 series de pierna y 4 de glúteo.
  Cerrado por el tope de 5 días de v514 y por el puesto de glúteo.
- ✅ **Ningún día sale vacío** en los 5.760 planes.
- ✅ **La fase de adaptación, los esquemas por objetivo y el descanso por tipo** siguen siendo lo
  mejor del motor. No los re-audité en profundidad porque no cambiaron; los volví a ver salir
  correctos en el barrido (3×15, 60 s, sin carga, ventana de 21 días).


---

## Lo que NO alcancé a revisar

> ⚠️ **Escrito por el ORQUESTADOR.** A4 no llegó a esta sección, así que aquí no va lo que él
> hubiera declarado, sino lo que se puede afirmar leyendo su propio informe. Tómese como una lista
> incompleta: **lo que un auditor no alcanza a decir que no miró es justo lo que no queda anotado.**

- **La sección de cierre es suya y no existe.** Lo que él sí declaró queda dentro de cada hallazgo
  y en «Lo que revisé y está SANO»; fuera de eso, el alcance real de su barrido es el que describe
  su cabecera (5.760 planes + barridos dedicados por limitación, nutrición y entorno) y **nada
  más debe darse por revisado**.
- **El delta se auditó hasta v526** (HEAD `83f287a`). **v527 es posterior** y no entró: solo tocó
  tamaños de letra de campos, así que no afecta al motor — pero queda dicho.
- **Los planes de nutrición de personas reales** se miraron por SELECT para las colas concretas
  (el piso de proteína, la ración de clara de H3). **No hay un barrido persona por persona** de los
  11 planes vigentes como el que hizo A6 con el dinero.
- **Nada de esto se probó en un teléfono.** Todo es motor y datos.
