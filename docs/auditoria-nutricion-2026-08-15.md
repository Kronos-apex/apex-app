# Auditoría independiente de NUTRICIÓN — 2026-08-15

**Auditor externo · repo en v484 (`aa70b3c`) · solo lectura: no se tocó código, ni la nube, ni ningún harness.**
**Datos reales: backup local `avi-backup-2026-08-12.json` (27 perfiles, 5 menores de edad, 10 planes escritos a mano por el coach). Los números se recalcularon desde datos crudos con las funciones puras de `avi-core.js` — nunca se le creyó al número que pinta la app.**

---

## Veredicto en 5 líneas

1. 🔴 **CONFIRMADO con datos reales: Valery (15 años, premium) tiene un plan escrito por el coach de 1.775 kcal contra un gasto de 1.910 — come un 7% por debajo de lo que gasta, siendo menor.** La regla «ningún menor por debajo de su gasto» vive SOLO en la calculadora automática; el plan escrito a mano no pasa por ella.
2. 🔴 Encima, su pantalla le explica **«Estás comiendo en balance: lo que gastas»** — el rótulo dice balance sobre un déficit real.
3. 🟡 El aviso al coach existe, pero **solo se enciende dentro del editor del plan**: los 4 planes ya guardados que se contradicen (Luz −22%, Kathe −20%, Valery −7%, Samuel +12%) están mudos hasta que él los reabra.
4. 🟢 Lo que sí está cerrado: el candado del **TEXTO** para menores funciona en sus 3 rutas (verificado), y el titular del plan **ya no miente** (0 de 10 planes con desfase titular-vs-macros; antes eran 6 de 10).
5. 🟠 Frente ② (tabla de alimentos): **la yuca del recetario dice 112 kcal «verificado» sin citar contra qué, la TCAC dice 157, y hay un test de la suite que DEFIENDE el 112** — con 11 de 22 personas comiendo yuca en su semana. Y **0 de los 50 alimentos del recetario citan fuente**, mientras el catálogo de búsqueda (`foods.json`) sí la exige alimento por alimento.

---

## Hallazgo 1 — 🔴 El candado de menores protege el TEXTO pero no el NÚMERO: hay una menor real comiendo bajo su gasto

**Qué le pasa a una persona con nombre.** Valery, 15 años, objetivo «Recomposición», tier premium. Su coach le escribió un plan a mano: 132 g proteína, 178 g carbohidrato, 59 g grasa → **1.775 kcal/día**. Su gasto real (Schofield para menores + factor de actividad, recalculado desde peso 52 kg, talla y edad del backup) es **1.910 kcal/día**. Es decir: una adolescente en crecimiento come **135 kcal/día por debajo de su gasto (−7,1%)**, todos los días, desde su app.

**El control que prueba dónde está el hueco.** Si en vez del plan escrito se usara la calculadora automática (`nutritionEstimate`), la app le daría **exactamente 1.910 kcal con déficit 0** — porque ahí SÍ vive el candado («UN MENOR NUNCA LLEVA DÉFICIT», `avi-core.js:3806-3815`). El plan escrito a mano entra por otra puerta: `nutBaseFor` (`avi-core.js:5014-5031`) toma los macros del coach **tal cual, sin preguntar la edad ni comparar contra el gasto**, y de ahí beben TODAS las pantallas que ella ve.

**Las superficies por las que ese número le llega (enumeradas):**
| Superficie | Dónde vive |
|---|---|
| «Hoy» — objetivo del día | `app-5-salud.js:366` → `nutWeekTargets` |
| «Perfil» — la semana | `app-5-salud.js:474` |
| Habitación «Ver mi plan en grande» | `app-5-salud.js:549` |
| El plato armado (menús con gramos) | mismo `base` de `nutBaseFor` |
| La lista del mercado (pantalla + WhatsApp) | `app-5-salud.js:671` y `:709` |
| La franja del registro de alimentos («te quedan X») | `app-5-salud.js:1328` |

Las seis leen de `nutBaseFor`. **El mecanismo roto es uno solo: el candado numérico de menores vive en la calculadora (`nutritionEstimate`) y no en `nutBaseFor`, que es donde se ELIGE el número que la menor lee** — la misma clase de defecto que ya se documentó para el texto («el candado va donde se elige el texto, no donde se infiere el dato»), pero por el lado del número.

**Qué tan seguro estoy: alto.** Medido sobre el backup del 12-ago con las funciones de producción; el gasto se recalculó de forma independiente desde los datos crudos. La única incertidumbre: el backup tiene 3 días — si el coach cambió el plan de Valery entre el 12 y hoy, la cifra exacta puede variar, pero el mecanismo (ninguna compuerta de menor sobre el plan escrito) está en el código HEAD.

**Nota de alcance:** de los 5 menores en la base, Valery (15) es la única con plan escrito completo. Los otros 4 caen a la calculadora (con candado) o no tienen datos para estimar. O sea: hoy la puerta abierta tiene exactamente una persona adentro — y es la más joven con plan.

---

## Hallazgo 2 — 🔴 El rótulo le dice «balance» encima de un déficit — y a la menor, doblemente

**Qué lee cada persona.** El plan de Valery (15) está rotulado `mantenimiento`. Su pantalla le explica: *«Estás comiendo en balance: lo que gastas. El objetivo no es subir ni bajar…»* (`app-5-salud.js:250-251`) — mientras el número que tiene al lado es un déficit del 7% **siendo menor**. El texto que existe para tranquilizar es el que oculta la infracción de la regla.

**Medido sobre los 10 planes escritos a mano (backup 12-ago), 4 contradicen lo que su rótulo anuncia:**
| Persona | Edad | Rótulo que lee | kcal del plan | Gasto (recalculado) | Dirección real |
|---|---|---|---|---|---|
| Luz Rodríguez | 39 | «balance» | 1.731 | 2.230 | **déficit −22%** |
| Kathe Beltrán | 28 | «balance» | 1.931 | 2.399 | **déficit −20%** |
| **Valery** | **15** | «balance» | 1.775 | 1.910 | **déficit −7%** |
| Samuel Cifuentes | 28 | «balance» | 3.535 | 3.148 | **superávit +12%** |

(La memoria del proyecto decía «4 de 9»; en este backup son **4 de 10** — un plan más entró a la base desde esa medición. La dirección del hallazgo se sostiene.)

**El aviso al coach existe pero es de VENTANA, no de FICHA.** `nutGoalCheck` (`app-5-salud.js:135-158`) le dice al coach «a X la app le va a explicar balance pero el plan le da déficit»… **solo mientras tiene abierto el editor del plan de esa persona**. Los 4 planes de arriba ya están guardados: nada en la ficha del asesorado, ni en el inicio del coach, se lo recuerda. Detectar en el editor y callar sobre lo guardado deja vivos exactamente los casos que ya existían antes del detector.

**Importante para no sobre-acusar:** en estos 4 casos el rótulo `mantenimiento` lo eligió (o heredó) el coach — el candado de menores NO lo fabricó (verifiqué `inferNutGoal` crudo vs `nutWhyKey`: idénticos aquí). Pero ojo al mecanismo: para una menor, `nutWhyKey` convierte cualquier rótulo de composición corporal a `mantenimiento` **sin tocar el número** — si un coach guardara un plan «cutting» con déficit para una menor, la app le pintaría a ella «comes en balance» sobre ese déficit. El candado de texto sin candado de número **fabrica** esa mentira por construcción. Hoy no hay un caso así en la base (medido); es la misma puerta del Hallazgo 1 vista desde el texto.

---

## Hallazgo 3 — 🟠 La yuca: un «verificado» sin fuente, la TCAC en contra, y un test que blinda el número cuestionado

**Contra qué se verificó el 112: contra nada que esté escrito.** El comentario del 3-ago (`avi-core.js:3935-3938`) dice «verificado 2026-08-03» pero **no nombra la fuente**, y la nota abierta de Andrés Hyp del 13-ago (`avi-core.js:3939-3949`) documenta: la TCAC 2018 del ICBF (código B106, pág. 54, yuca blanca cocida) da **157 kcal / 33,9 g de carbohidrato** — 29% más energía que los 112 / 26,7 de la tabla — y la premisa con la que se dedujo el 112 («cocida absorbe agua») **la desmiente la propia TCAC** (humedad cocida 61,6% vs cruda 60,9%). El estado actual es deliberado: «no se mueve ni un dígito» hasta saber de dónde salió el 112. Respetado — no toqué nada.

**Lo que sí agrega esta auditoría, medido:**
- **Exposición real**: resolviendo la semana completa de las 22 personas con plan (770 comidas, las mismas funciones de producción), **13 comidas llevan yuca y le llegan a 11 de las 22 personas** — Valery (15) incluida. Si la TCAC tiene razón, el peor día individual come **~113 kcal que la app no cuenta**.
- 🔴 **El candado está protegiendo al sospechoso**: `avi.test.js:9271-9272` afirma `yuca.kcal === 112` con el mensaje «yuca cocida = 112, no los 160 de la cruda». Ese test nació para obligar a re-verificar contra la fuente antes de cambiar el valor — pero hoy defiende un número **que no tiene fuente escrita** contra el de la TCAC que sí la tiene. Si mañana alguien corrige al 157 con cita, el test se lo rebota con un mensaje que suena a autoridad. El mecanismo «afirmar el valor en un test» solo funciona si al lado del valor está la fuente; aquí está la mitad.

**Los hermanos (censo de los 50 alimentos del recetario `NUT_FOODS`):**
- **0 de 50 llevan campo de fuente** (`src`/`ref`, verificado por inspección programática de las claves). El contraste es directo: la OTRA capa (`foods.json`, catálogo de búsqueda) **sí exige fuente re-verificable por test** — código y página de la TCAC o `fdc_id` de USDA por cada alimento (`avi.test.js:4167-4223`). La capa que alimenta EL PLATO — la que decide cuántos gramos come la gente — es justo la que no tiene trazabilidad.
- **Cuadre interno (pantalla de dedazos): 0 de 50 fallan** los dos umbrales del propio repo (±15% y 25 kcal contra Atwater 4/4/9; los peores son vegetales fibrosos, donde Atwater sobreestima por diseño). **Ojo: este cuadre NO puede cazar la clase de la yuca** — un valor de otra fila de la misma fuente cuadra perfecto consigo mismo. El repo ya lo sabe (`avi-core.js:4010-4012`); lo re-confirmo: el único candado real es fuente escrita + test, y hoy no hay fuente escrita para ninguno de los 50.
- **Crudo-como-cocido, ya documentado en el propio código (no lo re-medí)**: la tabla entera es «listo para comer» y las carnes traen valores cocidos sin decirlo en el nombre; la lista del mercado, por eso, **sub-pide pescado a menos de la mitad** (100 g servidos = ~207 g comprados, factores Bognár 2002 + TCAC E043 citados en `avi-core.js:3898-3904`) y carne ~28% según la memoria del proyecto. Es un frente abierto conocido, esperando el lote de conversión de Andrés — lo consigno como estado, no como hallazgo nuevo.
- **Medidas caseras**: la avena (cucharada 15→5,6 g) y la lata de atún (120→100 g) ya se corrigieron y tienen test. No puedo pesar nada desde aquí: el resto de medidas queda **sin verificar**, declarado.

---

## Lo que verifiqué y está BIEN

- ✅ **El candado de TEXTO para menores funciona en sus 3 rutas.** (1) Estimación automática: `nutGoalForClient` pasa por `nutMinorSafeGoal` (`avi-core.js:3519-3521`); (2) plan guardado: `nutWhyKey` pasa por el mismo candado (`:3537-3541`); (3) pantalla de entreno: `weekEditorial` tiene su propia compuerta de menor (`:6687`). El aviso del editor al coach usa el MISMO oráculo (`nutWhyKey`, `app-5-salud.js:146`), así que él ve lo que ella va a leer. Enumeré los llamadores en los 7 módulos `app-*.js`: no encontré una cuarta ruta viva que elija ese texto sin pasar por el candado.
- ✅ **El candado numérico de la CALCULADORA funciona.** Control positivo medido: para los 3 menores con datos completos, `nutritionEstimate` devuelve déficit 0 (Valery 16: 1.910→1.910; y a los de objetivo «Ganar músculo» les da superávit, que sí está permitido).
- ✅ **El titular del plan ya NO miente: 0 de 10 planes con desfase titular-vs-macros** (umbral 25 kcal). El defecto de «6 de 10» (Nataly 3.200 vs 2.960) quedó cerrado por la derivación `nutMacroKcal` en `nutBaseFor` — verificado sobre los 10 planes reales del backup. **El frente ③ del encargo queda cerrado en verde.** Las pantallas que muestran ese número son las 6 de la tabla del Hallazgo 1, todas leyendo el derivado.
- ✅ **Mifflin no se usa en menores:** `calcTMB` bifurca a Schofield bajo 18 (`avi-core.js:3583-3595`), y `isMenor` es una sola definición para todo el motor (`:3598-3601`).

## Lo que NO alcancé a mirar

- **② Barrido de `foods.json` / `NUT_FOODS` contra fuente externa** (yuca 112 vs TCAC 157, valores sin fuente, crudo-como-cocido, medidas caseras): no ejecutado en esta pasada por presupuesto. Sigue abierto tal como lo dejó la memoria del proyecto: **hipótesis sin re-medir aquí**.
- Las pantallas se auditaron por código (rutas y llamadores), no abriendo la app en un navegador — un render que oculte o reescriba el número aguas abajo no lo vería esta pasada (improbable: las 6 superficies leen del mismo `base`).
- Población declarada: 27 perfiles del backup del 12-ago; 4 son `tier:'libre'` y no ven el plan de comida, pero **Valery (15) es premium: sí lo ve**.

## Defecto medido vs. hipótesis — resumen honesto

| # | Qué | Estatus |
|---|---|---|
| 1 | Menor real (Valery, 15) con plan escrito 7% bajo su gasto; ninguna compuerta de menor en `nutBaseFor` | **Defecto MEDIDO** (backup 12-ago + código HEAD) |
| 2 | 4 de 10 planes escritos: rótulo «balance» sobre déficit/superávit real; aviso solo en el editor | **Defecto MEDIDO** |
| 3 | El candado de texto puede fabricar «balance sobre déficit» para una menor con rótulo cutting | **Hipótesis por construcción** — hoy sin caso real en la base (medido que no hay) |
| 4 | `foods.json`: yuca sin fuente / hermanos | **Hipótesis heredada, sin re-medir aquí** |

*No propongo el arreglo: el mecanismo roto es que la regla «ningún menor bajo su gasto» vive en `nutritionEstimate` y no en el punto único donde se elige el número (`nutBaseFor`), y que el detector de contradicciones solo mira mientras el editor está abierto. Ahí es donde duele; dónde se opera lo decide el equipo.*
