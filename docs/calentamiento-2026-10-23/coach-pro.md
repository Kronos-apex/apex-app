# Calentamiento óptimo por sesión (hombre y generales) — Coach Pro

Fecha: 23-oct-2026. Solo lectura del código (`WARMUP_LIBRARY`, `MUSCLE_WARMUP_MAP`, `buildWarmup` en `app-6-extra.js`; `GEN_DAYS`/`GEN_SPLITS` en `avi-core.js`). Cubre EMPUJE, TRACCION, PIERNA, TREN_SUP, HOMBROS_BRAZOS, CARDIO_CORE y FULL_BODY. GP_A, GP_B y CORE_CARDIO son de Valery.

## 0. Diagnóstico en una frase
Hoy el calentamiento sale de un mapa «músculo a grupos, toma 2 de cada uno». Por eso un día de pierna recibe 6 movilidades, no pide nada de cardio y mete piezas de baja utilidad (círculos de rodilla, apertura posterior). El PO tiene razón en que no es «óptimo para cada entrenamiento». Mi propuesta cambia el mecanismo, no solo las piezas: **una receta por tipo de sesión** más una **regla de aproximación** clara. La rotación por día (v644) queda solo dentro de huecos con alternativa.

## 1. Estructura común (los 4 bloques)
| Bloque | Qué es | Regla |
|---|---|---|
| 1. General | 3 a 4 min de cardio suave, RPE 3-4/10 (se puede conversar) | Sube temperatura y frecuencia cardiaca. La evidencia es mixta, pero cuesta poco y en tren inferior sí se nota. **Se puede saltar** si la persona llegó caminando o en bici 10 min o más (casilla «ya vengo caliente»). |
| 2. Movilidad específica | 2 a 3 piezas | Solo la articulación que la sesión va a cargar. Dinámica, nada estático de 30 s. |
| 3. Activación | 1 a 2 piezas | Los músculos «dormidos» de esa sesión. Si el primer ejercicio ya es la versión con peso corporal, esa pieza se omite (regla v594, se mantiene). |
| 4. Aproximación | Series livianas del ejercicio con carga (sección 3) | Es la parte que más suma, según la evidencia. |

**General por entorno:**
- **Gym:** bicicleta, elíptica (con brazos en días de tren superior) o trotadora en caminata inclinada. Pierna y full body: 4 min. Tren superior: 3 min. Remo ergómetro solo si ya domina la técnica; en principiantes cuesta más de lo que da.
- **Casa, parque y corporal:** marcha o trote suave en el sitio con brazos (`wg2`), 3 min. En parque, saltar cuerda suave (`wg4`) o trotar una cuadra. En full body corporal, el gusano (`wf1`).
- **CARDIO_CORE:** no se agrega bloque general. El primer cardio de la sesión ES el general: 3 min al 50 % del ritmo previsto.

## 2. Tabla sesión → piezas (por id)
`(N)` = pieza nueva de la sección 4. `|` = alternativas (rotación por día o falta de equipo).

| Sesión | General | Movilidad (máx.) | Activación | Aproximación | Total |
|---|---|---|---|---|---|
| **EMPUJE** | 3 min elíptica/bici/inclinada; sin máquina `wg2` | `wh1` círculos de hombro · `wh3` apertura de pecho en pared · `wm1` círculos de muñeca (3) | `wa3` apertura con banda · `we4` plancha de hombros | Press de pecho 2-3 · press de hombro 1-2 · tríceps ninguna | ≈ 9 min |
| **TRACCION** | 3 min elíptica con brazos/bici; sin máquina `wg2` | `we2` rotación torácica en el suelo · `wh1` círculos de hombro (2) | `wa6`(N) colgado activo (si hay barra) · `wa3` apertura con banda \| `wa5`(N) Y y T | Jalón/remo 1-2 · peso muerto si aparece: 3 · bíceps ninguna | ≈ 9 min |
| **PIERNA** | 4 min bici (mejor opción); sin máquina `wg2` | `wt2` tobillo en pared (fija) · `wc2` estocada con rotación (fija) · `wc3` 90/90 \| `wr3` isquios (rota por día) (3) | `wc4` puente de glúteo · `wc5` patada lateral \| `wai5`(N) caminata lateral con banda | Primer multiarticular: 3 series (barra) o 2 (prensa/hack) · los demás compuestos: 1 | ≈ 11 min |
| **TREN_SUP** | 3 min | `wh1` círculos de hombro · `we2` rotación torácica en el suelo · `wh3` apertura de pecho en pared (3) | `wa3` apertura con banda · `we4` plancha de hombros | Primer press de pecho 2 · primer jalón/remo 1-2 · primer press de hombro 1 | ≈ 10 min |
| **HOMBROS_BRAZOS** | 3 min | `wh1` círculos de hombro · `wh2` rotación de manguito · `wm1` círculos de muñeca (3) | `wa3` apertura con banda · `wa5`(N) Y y T | Press de hombro 2 · primer bíceps 1 · primer tríceps 1 (los codos son lo más frágil del día) | ≈ 10 min |
| **CARDIO_CORE** | incluido en el cardio (3 min al 50 %) | `wc1` círculos de cadera · `we1` gato-vaca. Si hay saltos o trote: `wt1` círculos de tobillo y `wai4` elevación de talones (2-3) | `wac2` deadbug (una; el core del día hace el resto) | Ninguna (sin carga) | ≈ 5 min |
| **FULL_BODY** | 4 min; corporal: `wf1`(N) gusano | `wc2` estocada con rotación · `wt2` tobillo en pared · `wh1` círculos de hombro (3) | `wc4` puente de glúteo · `wa3` apertura con banda | Solo el primer ejercicio de tren inferior y el primero de tren superior con carga: 1 serie cada uno (el principiante ya trabaja liviano) | ≈ 10 min |

**Por qué esas piezas y no otras:**
- **Pierna:** el tobillo (dorsiflexión) decide la profundidad de la sentadilla y cuánto se cierran las rodillas hacia adentro. La estocada con rotación es la pieza con más retorno de toda la biblioteca: cadera, flexor de cadera y torácica en un solo movimiento. El 90/90 y la movilidad de isquios se alternan porque ocupan el mismo hueco (cadera profunda y posterior). No va `wr2` sentadilla lenta: la primera serie de aproximación con la barra vacía ya ensaya el patrón. Tampoco `wai1`/`wai2` si son el ejercicio principal. Si el primer ejercicio es bisagra (peso muerto rumano, hip thrust), `wai3` sustituye a `wr3`. `wai4` solo si la sesión trae pantorrilla.
- **Empuje:** lo que se carga es hombro y escápula, no cadera. La apertura de pecho prepara el press profundo y `we4` mueve el serrato. **No pongo la lagartija:** es una serie de press de pecho encubierta, fatiga tríceps y la aproximación ya cumple esa función.
- **Tracción:** la torácica ayuda a que los hombros bajen y atrás. El colgado activo despierta dorsal y depresores de escápula. `wa3`/`wa5` equilibran el empuje de la semana. Sin barra, `wa6` se cambia por `wa5`.
- **Hombros y brazos:** el manguito sí se justifica aquí: hay elevaciones laterales y presses sobre la cabeza. Muñeca porque hay curl con barra y fondos.
- **Cardio y core:** cinco minutos de preparación. Más es relleno, porque la sesión ya es moverse y sudar.
- **Full body:** lo recibe el principiante, que casi siempre está en fase de adaptación. Mejor pocas cosas bien hechas.

**Nada de estiramientos estáticos de 30 s (`wm2`, `wm3`)** en la selección automática. Quedan en la biblioteca para el editor manual del coach. Antes de levantar no suman y consumen tiempo.

## 3. Regla de aproximación (la parte que más suma)
El peso de trabajo es el de la primera serie efectiva del ejercicio (último peso registrado, o el sugerido si no hay historial). Se redondea al disco disponible (2,5 kg). Descanso entre aproximaciones: 30-45 s, sin cansarse.

| Tipo de ejercicio | Series |
|---|---|
| Multiarticular de **pierna con barra** (sentadilla, peso muerto, hip thrust con barra) | **3**: 40 % × 8 · 60 % × 5 · 80 % × 3 |
| Multiarticular de **tren superior con barra o mancuernas pesadas** (press, remo, press militar) | **2**: 50 % × 8 · 75 % × 4. Si las reps de trabajo son ≤ 6 (fuerza), se agrega 90 % × 1-2 |
| **Prensa, hack, Smith** | **2**: 50 % × 8 · 75 % × 4 (la carga absoluta es grande) |
| **Máquina o polea** | **1**: 60 % × 8 |
| **Aislamiento** (curl, extensión, elevación) | **1**: 50 % × 10, solo si es el primero de su músculo y ningún compuesto anterior ya lo trabajó |
| **Peso corporal** | Ninguna. En calistenia (parque) la aproximación es la **variante más fácil** del mismo ejercicio: una serie de 5-6 reps (flexión inclinada para la flexión, remo invertido con pies más cerca para la dominada). Con bandas: una serie con la banda más suave |

**Reglas de aplicación:**
1. **Solo el primer ejercicio de cada músculo**, nunca el segundo ni el tercero. Es lo que hace Fitbod y es lo correcto: el músculo ya está caliente.
2. **Un músculo que ya trabajó como sinergista en un compuesto anterior no recibe aproximación** (tríceps tras el press, bíceps tras el remo). Excepción: HOMBROS_BRAZOS, por los codos.
3. **Máximo 3 ejercicios con aproximación por sesión** y máximo ≈ 6 series en total. Más es perder tiempo.
4. **Barra vacía o peso mínimo:** si el 40-60 % queda por debajo de la barra (20 kg) o de la primera placa de la máquina, esa serie se reemplaza por barra vacía × 10 y las demás se saltan si quedan iguales al peso de trabajo.
5. **Fase de adaptación o carga liviana (≤ 40 % de la máxima):** solo 1 serie al 50 % × 10 en el primer ejercicio de la sesión. La primera serie real ya es liviana.
6. **Zona declarada con molestia** (lumbar, hombro, rodilla): se añade una serie intermedia, no se quita ninguna. Nunca la del 90 %.
7. **Barra no es igual que máquina.** Barra = más series (más habilidad y más riesgo); máquina = una.

## 4. Piezas que faltan (ids propuestos)
| id | Nombre | Reps | Indicación | Por qué |
|---|---|---|---|---|
| `wg1` | Cardio suave en máquina | 3-4 min | Bicicleta, elíptica o trotadora inclinada a un ritmo en que podrías conversar. El último minuto sube un poco. | Hoy NO existe cardio general. Es el primer bloque de la receta. |
| `wg2` | Marcha o trote suave en el sitio | 3 min | Rodillas arriba sin saltar fuerte y brazos moviéndose. Si te falta el aire para hablar, baja el ritmo. | Equivalente sin máquina para casa, parque y corporal. |
| `wg4` | Saltar cuerda suave | 2-3 min | Saltos pequeños, ritmo cómodo, rodillas suaves. Para en cuanto sientas el golpe en las rodillas. | Calentador clásico del parque y del barrio. |
| `wf1` | Gusano (caminata de manos) | 5 reps | De pie, baja las manos al suelo, camina con ellas hasta la plancha y vuelve. Dobla las rodillas lo que haga falta. | Una sola pieza para isquios, hombro y core cuando falta tiempo o equipo. |
| `wa5` | Elevaciones en Y y T | 8 de cada una | Inclinado al frente o boca abajo, sin peso: brazos en Y y luego en T con los pulgares arriba. | Trapecio inferior y deltoides posterior, que el empuje de la semana deja callados. |
| `wa6` | Colgado activo en barra | 2 × 15-20 s | Cuélgate de la barra y baja los hombros lejos de las orejas sin doblar los codos. | Despierta dorsal y escápula antes de jalar. Pide barra de dominadas. |
| `wai5` | Caminata lateral con banda | 10 pasos c/lado | Banda sobre las rodillas, media sentadilla, pasos laterales sin dejar que las rodillas se cierren. | Glúteo medio, más específico que la patada lateral cuando hay banda. |
| `wac4` | Perro de caza | 8 c/lado | En cuatro apoyos, estira brazo y pierna contrarios sin mover la cadera. Mantén 2 s. | Core sin flexión repetida de columna (alternativa más amable que el rollito). |

Reubicar: `wc4` (puente de glúteo) vive hoy en el grupo `cadera` pero es una **activación**, no movilidad. Pasa a `activacion_inferior`.

## 5. Duplicado «círculos de muñeca»
`wh5` y `wm1` son el mismo texto. **Dejar `wm1`** (grupo `munecas`, ya enlazado con pecho, hombros, bíceps y tríceps) y **borrar `wh5`**. Migrar cualquier `routine.warmup` guardada que contenga `wh5` hacia `wm1`, deduplicando si ya tenía ambas. Para los que salen: `wr1` se retira sin sustituto, `wa2` pasa a `wa3`, `we3` pasa a `we1`. Si no se migra, `findWarmupEx` no los encuentra y la lista del coach se acorta en silencio (el código ya cae al auto-derivado si queda vacía, pero perder piezas sin avisar no es bueno). Revisar también la suite: puede estar contando 33 piezas.

## 6. Mi opinión honesta sobre las decisiones del PO
**Las 6 que se quedan.**
- **`wt2` tobillo en pared: de acuerdo, sin dudas.** Es la pieza con más respaldo de la lista: la dorsiflexión limitada es de las causas más comunes de sentadilla pobre, talones que se levantan y rodillas hacia adentro. Mi primera elección en pierna.
- **`wc2` estocada con rotación: de acuerdo.** La mejor relación tiempo/beneficio de la biblioteca. El texto de Laura (girar desde el pecho, no desde la cintura) ya la deja segura.
- **`wc3` 90/90: de acuerdo con un ajuste.** El texto actual describe un estiramiento sentado y pasivo. El valor del 90/90 está en las **transiciones**: rotar las dos rodillas de un lado al otro, 6 reps por lado. Reescribir la indicación así. Para el principiante rígido es incómodo y toma un minuto; por eso lo alterno con `wr3` y no sale todos los días de pierna.
- **`wc5` patada lateral: de acuerdo.** Activa el glúteo medio sin material, justo lo que hay en un gimnasio de barrio. Limitar la amplitud a lo controlado: es un balanceo, no una patada, para no jalar el aductor.
- **`wr3` isquios de pie: de acuerdo.** Útil en pierna y full body. Con lumbar o hernia (flexión de columna) ver sección 7.
- **`we5` rollitos: aquí discrepo en parte.** No tiene respaldo sólido: «descomprimir» la espalda baja rodando no está demostrado y es flexión lumbar repetida. Es tranquilo para la mayoría y a la gente le gusta, así que **no lo vetaría**, pero no entra en ninguna receta por defecto. Queda en el editor manual y como alternativa a `we1` si el PO la quiere. Con lumbar, hernia o disco, se filtra.

**Las 3 que salen: de acuerdo con las tres.**
- **`wr1` círculos de rodilla:** la que yo más quería quitar. La rodilla es una bisagra; rotarla bajo compresión estresa menisco y ligamentos sin darle nada a cambio. Mejor la sentadilla lenta.
- **`we3` apertura de cadena posterior:** una caída pasiva con la espalda redondeada no es movilidad. `wr3` y la bisagra de cadera cumplen mejor.
- **`wa2` remo invertido:** es un ejercicio real, no un calentamiento. Fatiga y pide una barra baja que no siempre hay. Si el catálogo de ejercicios lo tiene, vive allí; en parque sirve como aproximación de la dominada (tabla de series).

**Una discrepancia de fondo:** la rotación diaria de piezas (v644) busca variedad, pero va contra «un calentamiento que funcione». El tobillo y la estocada con rotación deben salir **siempre** en pierna. Propongo rotar solo dentro de los huecos con alternativa (`wc3`/`wr3`, `wc5`/`wai5`, `wa3`/`wa5`).

## 7. Riesgos de lesión — qué debe mirar Laura
| Zona | Piezas a revisar (filtro/aviso) |
|---|---|
| **Lumbar / hernia / disco** | `we5` rollitos (flexión repetida; sugiero filtrarlo siempre), `we1` gato-vaca, `wr3` isquios inclinado, `wf1` gusano (flexión + isquios), `wc3` 90/90 (rotación + flexión), `wc2` rotación, `wai3` bisagra. Aproximación de peso muerto: máximo 3 series, sin la del 90 % |
| **Rodilla / menisco / LCA** | `wc3` 90/90 (**el mayor riesgo de lo que el PO conserva**: rota la rodilla en flexión profunda), `wr2` sentadilla profunda lenta, `wc2` estocada, `wg2`/`wg4` impacto, `wai5` (colapso hacia adentro) |
| **Hombro (inestabilidad, manguito, pinzamiento)** | `wh3` apertura de pecho en pared (estresa la cápsula anterior), `wa6` colgado, `wa5` Y y T, `we4`, `wh2` |
| **Muñeca / codo** | `wm1`, `we4`, `wf1`, `wac4` (apoyo de mano), `wa6` (agarre). Aproximación de codos en HOMBROS_BRAZOS |
| **Cadera / ingle (aductor)** | `wc5` balanceo, `wc3`, `wai5` |
| **Tobillo / Aquiles** | `wt2`, `wg2`, `wg4`, `wai4` |
| **Cuello** | `wa6`, `wa5` |
| **Hipertensión** | `wa6` (aguantar sin respirar), `wf1` (cabeza por debajo del corazón), plancha |
| **60+ / impacto** | `wg4` cuerda, `wg2` trote: reemplazar por marcha |

Además: con una zona con molestia la aproximación agrega series, no las quita; Laura debe confirmar que el filtro de lesiones no deje la primera serie real en frío.

## 8. Resumen operativo para quien implemente
1. Sustituir «2 por grupo» por una **receta por tipo de sesión** (derivar el tipo desde los músculos, como ya hace `buildWarmup`).
2. Agregar el bloque general (`wg1`, `wg2`, `wg4`, `wf1`) con casilla «ya vengo caliente».
3. Aplicar la tabla de aproximación (sección 3) a los ejercicios con carga, solo el primero de cada músculo.
4. Migrar ids retirados (`wh5`, `wr1`, `wa2`, `we3`) en las rutinas guardadas.
5. Sacar `wm2` y `wm3` de la selección automática (quedan para el editor manual).
6. Mover `wc4` a `activacion_inferior`.
7. Pasar las 8 piezas nuevas y las alertas de la sección 7 por Laura antes de publicar.
