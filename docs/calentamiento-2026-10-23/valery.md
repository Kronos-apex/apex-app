# Calentamiento óptimo para las sesiones de mujer — informe de Valery (23-oct-2026)

Alcance: GP_A, GP_B, TREN_SUP (versión mujer), CORE_CARDIO y EMP_BRAZOS. Solo lectura del código; no se tocó nada. Sin datos de asesoradas reales.

## 0. Lo que leí y lo que de verdad pasa hoy

- `WARMUP_LIBRARY` tiene 33 piezas. `buildWarmup` toma 2 por grupo según el MÚSCULO (`MUSCLE_WARMUP_MAP`), filtra lesiones y patrones repetidos, y rota el punto de partida por rutina (v644).
- Un día de pierna o glúteo recibe: cadera 2 + rodillas 2 + tobillos 2 (= 6 movilidades) y 2 de `activacion_inferior`. Esa activación es sentadilla, desplante, peso muerto sin peso y talones: trabaja cuádriceps y pantorrilla. **No hay una sola pieza de activación de glúteo medio ni mayor.** Lo más parecido es `wc4` (puente) y `wc5` (patada lateral), y ambas viven en el grupo `cadera`, o sea que el motor las cuenta como «movilidad».
- La aproximación hoy es UNA serie al 50% × 12, solo en ejercicios `peso_reps`, OCULTA por defecto («Mostrar»). Está bien como piso, pero para un hip thrust de 60 kg o una sentadilla es una sola serie, y la persona rara vez la abre.
- No hay cardio suave general. La biblioteca no tiene un solo ítem de «subir la temperatura».
- Con los cambios del PO (salen `wa2`, `wr1`, `we3`) el grupo `rodillas` queda con 2 piezas (`wr2`, `wr3`) y `activacion_superior` con 3. Alcanza, pero el motor ya no tiene margen para el filtro de lesiones en rodillas: con rodilla declarada (`wr2` sale) queda solo `wr3`.

**Mi diagnóstico de fondo:** el motor elige por músculo, no por sesión. Un hip thrust y una prensa no piden lo mismo, y GP_A (más cuádriceps) y GP_B (más bisagra) reciben la misma receta. Para que el calentamiento sea «óptimo para cada entrenamiento» hace falta una RECETA POR SESIÓN (lista ordenada de ids con alternas), y el motor actual queda como respaldo para rutinas hechas a mano.

## 1. Estructura propuesta: 4 bloques, en este orden

| Bloque | Qué es | Tope de tiempo |
|---|---|---|
| A. General | Cardio suave que sube la temperatura (RPE 3-4 de 10: puedes hablar sin cortar frases) | 3-5 min |
| B. Movilidad dirigida | 3-4 piezas, SOLO las articulaciones que esa sesión va a usar | 2,5-3,5 min |
| C. Activación | 2-3 piezas, 1-2 series de 10-12; la que «despierta» el músculo que se va a entrenar | 2-3 min |
| D. Aproximación | Series livianas del ejercicio principal (regla en §3) | 2-3 min |

Orden dentro de la sesión: general, suelo (rollitos, rotación torácica, puente), de pie (tobillo, estocada, patada), activación con banda, y al final aproximación en el primer ejercicio. Así se baja y se sube del suelo una sola vez.

Honestidad sobre la evidencia: el bloque general (5-10 min en total de calentamiento) y las series de aproximación son lo que mejor está respaldado. La «activación» de glúteo antes de un hip thrust tiene evidencia mixta en rendimiento: su valor real, sobre todo en principiantes, es que enseña a SENTIR el glúteo (mucha mujer principiante hace el hip thrust con lumbar y cuádriceps). Por eso la dejo corta (2 series máximo) y no la trato como milagro.

### Reglas de tiempo y de nivel
- Total objetivo: GP 13-15 min · TREN_SUP 11-13 · EMP_BRAZOS 9-11 · CORE_CARDIO 8-10.
- Versión corta («tengo poco tiempo»): 3 min de general + 2 movilidades + 1 activación + aproximación = 7 min. Mejor un calentamiento corto que ninguno.
- Principiante (primeras 4 semanas): 1 serie de cada activación, sin banda fuerte, aproximación de 1 serie. Intermedia: 2 series de activación, banda más firme, aproximación de 2-3 series.
- Nunca más de 7 piezas marcables (sin contar el cardio). La app ya mide «0/N»; con más de 7 la persona deja de marcarlas.

## 2. Tabla sesión → piezas

Las piezas nuevas (id propuesto) están definidas en §4. El motor debe pasarlas por el filtro de lesiones ANTES de elegir (misma regla que hoy).

### GP_A — Glúteo y piernas A (compuesto de glúteo ×2, un compuesto de pierna: hip thrust, sentadilla/prensa)
1. **General (5 min):** gym `wg1` bicicleta suave (o `wg4` elíptica) · casa/corporal `wg3` marcha en el lugar · parque `wg2` caminata rápida.
2. **Movilidad (4):** `wt2` tobillo en pared (fija, todos los días de pierna) · `wc2` estocada con rotación · `wc3` 90/90 (alterna con `wc1` si hay rodilla o aductor) · `wr2` sentadilla lenta con pausa.
3. **Activación (3):** `wc4` puente con pausa de 2 s (2×12) · `wag1` almeja con banda (12 c/lado) · `wag2` caminata lateral con banda (10 pasos c/lado). Sin banda: `wag1` acostada sin banda + `wc5`.
4. **Aproximación:** §3. Primer ejercicio (hip thrust o sentadilla) con escalera.
5. **Tiempo:** ~14 min.

### GP_B — Glúteo y piernas B (compuesto de pierna ×2, un compuesto de glúteo: peso muerto rumano, bisagra, curl femoral)
1. **General (5 min):** igual que GP_A.
2. **Movilidad (4):** `wt2` · `wr3` isquios de pie · `wc5` patada lateral (con pared, hasta la altura de la cadera) · `wc3` o `wc2` (alternan día a día).
3. **Activación (3):** `wc4` puente · `wai3` peso muerto con peso corporal (bisagra: ensayo del rumano) · `wag3` patada atrás en cuatro apoyos (10 c/lado). Si el primer ejercicio del día YA es bisagra sin carga, `wai3` sale (regla v594) y entra `wag1`.
4. **Aproximación:** §3. Peso muerto rumano con escalera de 2-3 series.
5. **Tiempo:** ~14 min.

### TREN_SUP — Tren superior (pecho, espalda, hombro compuestos + bíceps y tríceps)
1. **General (4 min):** gym `wg4` elíptica (mueve brazos) o `wg1` bici · casa/corporal `wg3` con brazos · parque `wg2`.
2. **Movilidad (3):** `wh1` círculos de hombro · `we2` rotación torácica en el suelo · `wah2` deslizamiento en pared (wall slide). Alterna `wh3` apertura de pecho si el primer ejercicio es de pecho.
3. **Activación (3):** `wa3` apertura con banda (pull-apart) · `wh2` manguito (con banda liviana si hay) · `wa1` lagartija inclinada (manos en banco o pared) solo si el primer ejercicio es empuje.
4. **Aproximación:** press y remo principales con escalera de 2 series.
5. **Tiempo:** ~12 min.

### EMP_BRAZOS — Empuje y brazos
1. **General (3-4 min):** igual que TREN_SUP, un minuto menos.
2. **Movilidad (3):** `wh1` · `wh3` apertura de pecho en pared · `wh5` círculos de muñeca.
3. **Activación (2):** `wa3` + `wh2` (+ `wa1` si el primer ejercicio es de pecho).
4. **Aproximación:** primer press con 2 series; curl y tríceps no llevan.
5. **Tiempo:** ~10 min.

### CORE_CARDIO — Core y cardio
1. **General:** NO hay bloque aparte. Los primeros 3-4 min del propio cardio son el calentamiento si arrancan en RPE 3 y suben de a poco; hacer cardio suave y luego cardio es duplicar. Si el día empieza por core, entonces sí `wg3` 2-3 min.
2. **Movilidad (3):** `we1` gato-vaca · `we2` rotación torácica en el suelo · `wc1` círculos de cadera de pie (o `we5` rollitos 8 reps como apertura suave en el suelo, si la zona lumbar lo permite).
3. **Activación (2-3):** `wac5` respiración 360° (5 respiraciones) · `wac2` deadbug o `wac4` bird-dog · plancha `wac1` solo si no hay diástasis ni postparto.
4. **Si el cardio es de impacto** (cuerda, saltos, trote): suma `wt2` y `wai4` talones, y 1 serie de 10 sentadillas lentas antes de subir de ritmo. Si es bici o caminata: no hace falta.
5. **Aproximación:** no aplica (sin carga).
6. **Tiempo:** ~9 min.

## 3. Regla de series de aproximación (propuesta concreta)

Hoy: 1 serie al 50% × 12, oculta. Propongo:

| Ejercicio | Serie(s) | Detalle |
|---|---|---|
| **Primer compuesto cargado del día** (hip thrust, sentadilla, prensa, rumano, press, remo) con peso de trabajo **menor de 15 kg** | 1 | 50% × 10 |
| Ídem, peso de trabajo **15 a 59 kg** (principiante-intermedia) | 2 | 40% × 10 · 65% × 5 |
| Ídem, peso de trabajo **60 kg o más** | 3 | 40% × 10 · 60% × 6 · 80% × 3 |
| **Segundo compuesto** del día | 1 | 60% × 6 |
| **Hip thrust con barra**, siempre | misma escalera + 2 s de pausa arriba | La primera serie con la barra sola (o peso corporal) para encontrar la posición de la espalda |
| **Abducción en máquina / patada en polea / curl femoral** si NO son el primer ejercicio | 0 | La activación del bloque C ya cumple |
| **Abducción en máquina** si es el PRIMER ejercicio del día (o la activación se omitió) | 1 | 40-50% × 15, control de 2 s |
| Aislamiento de brazos | 0 | Su primera serie de trabajo es su aproximación |
| Máquina de pecho/espalda o polea | 1 | 50% × 10 |

Reglas comunes:
- Descanso entre series de aproximación: 30-45 s, sin fatiga; la última queda a 3+ repeticiones de reserva.
- Redondeo a discos reales de 2,5 kg con piso de 2,5 kg, como `warmupLoad`; con barra olímpica de 20 kg, si el 40% queda por debajo, la primera serie va con la barra sola.
- **Cambio de comportamiento que pido:** que la aproximación del PRIMER ejercicio del día aparezca ya abierta (hoy nace oculta). Si nace oculta, no existe.
- Sin peso de referencia (sin 1.ª semana de datos): 1 serie de peso corporal o barra sola × 12, como hoy.

## 4. Piezas que faltan

Prioridad P0 = sin esto el cambio no cumple lo que el PO pide; P1 = mejora.

| id | Nombre | Reps | Indicación (una frase) | Por qué | Prior. |
|---|---|---|---|---|---|
| `wg1` | Bicicleta estática suave | 4-5 min | Pedalea a un ritmo en que puedas hablar sin cortar las frases, sin apretar la resistencia. | Máquina que casi todo gimnasio de barrio tiene; sin impacto; sirve a sobrepeso y a rodilla delicada. | P0 |
| `wg2` | Caminata rápida (banda o calle) | 5 min | Camina a paso firme, con los brazos sueltos; en la banda con 2-3% de inclinación. | Parque y gimnasio sin bici; el mismo esfuerzo. | P0 |
| `wg3` | Marcha en el lugar con brazos | 3-5 min | Levanta las rodillas a media altura y mueve los brazos al ritmo, sin saltar. | Casa, parque y peso corporal; sin impacto; sin equipo. | P0 |
| `wg4` | Elíptica suave | 4-5 min | Ritmo cómodo; empuja y jala con los brazos. | Cardio con brazos para días de tren superior. | P1 |
| `wag1` | Almeja con banda | 12 c/lado | Acostada de lado, rodillas dobladas y banda sobre las rodillas; abre la rodilla de arriba sin que la cadera ruede hacia atrás. | Glúteo medio; es la puerta de entrada de la principiante. | P0 |
| `wag2` | Caminata lateral con banda | 10 pasos c/lado | Rodillas semiflexionadas, banda sobre las rodillas, pasos laterales cortos sin juntar los pies. | Glúteo medio de pie antes de abducción y sentadilla. | P0 |
| `wag3` | Patada atrás en cuatro apoyos | 10 c/lado | En cuatro apoyos, lleva la pierna doblada hacia atrás y arriba apretando el glúteo, sin arquear la espalda. | Glúteo mayor sin equipo, para casa y gimnasio. | P0 |
| `wah1` | Jalón facial liviano con banda | 12-15 | Banda a la altura de la cara, jala hacia la nariz abriendo los codos. | Hombro posterior y postura antes de remo y press. | P1 |
| `wah2` | Deslizamiento en pared | 10 | Espalda y brazos pegados a la pared, sube y baja los brazos en «W» a «Y» sin despegar. | Movilidad del hombro por encima de la cabeza antes de un press. | P0 |
| `wac4` | Bird-dog (perro de caza) | 6 c/lado | En cuatro apoyos, estira brazo y pierna contrarios sin mover la cadera. | Core de estabilidad para quien no puede hacer plancha o deadbug. | P1 |
| `wac5` | Respiración 360° | 5 respiraciones | Acostada, rodillas dobladas; inhala llevando el aire a las costillas y a la espalda, suelta lento. | Prepara el core profundo; alternativa segura en postparto o diástasis. | P1 |

Cambios de texto sobre piezas que ya existen:
- `wc5`: «lo más alto posible» invita a balancear; escribir «hasta la altura de la cadera, apoyada en la pared, sin inclinar el tronco».
- `wc3`: aclarar que son 8 cambios de lado (movimiento), no una pausa estática; ofrecer apoyar las manos o poner un cojín bajo la cadera.
- `we5`: quitar «descomprimiendo»; decir «masaje suave de la espalda». No hay respaldo para la promesa de descompresión y la gente se lo cree.
- Mover `wc4` de `cadera` a un grupo `activacion_gluteo` nuevo (con `wag1`, `wag2`, `wag3`); hoy el motor la cuenta como movilidad y se la quita a la activación.

Implementación a tener presente (para el equipo técnico): todo id nuevo debe registrarse en `WARMUP_ZONE_EXCL_IDS`. `wag1`, `wag2` y `wag3` entran a `aductor`/`abductor` (patrón de las regex ya cubre «clamshell» e «hidrante»); `wg3` entra a `rodilla` si es de rodillas altas; `wac1` y `wac4` a `muneca`; `wah2` a `hombro`. La rotación v644 debe respetar los «fijos» (`wt2`, activación de glúteo): solo lo secundario rota.

## 5. Opinión honesta: las 6 que se quedan

Estoy de acuerdo con el PO en las seis, con matices de dosis, no de decisión.
- **`wt2` tobillo en pared: la mejor pieza de toda la biblioteca.** La dorsiflexión limitada es de las razones más comunes por las que una principiante no baja en sentadilla o se le cae el talón. Va fija en todo día de pierna. Con tobillo lesionado ya sale por filtro.
- **`wc2` estocada con rotación:** muy buena para cadera, flexor y torácica de un golpe. Vigilar valgo de rodilla y que el giro sea del pecho (el texto ya lo dice, Laura lo corrigió).
- **`wc3` 90/90:** útil, pero es la más exigente articularmente de las seis (rotación interna de la cadera de atrás, rodilla en torsión). No la pondría todos los días ni en toda asesorada: sí en GP_A/GP_B, alternando con `wc1`, y NO en tren superior. Ya hay filtro para rodilla y aductor; con principiante con sobrepeso sentada en el suelo cuesta incluso llegar: ofrecer variante con apoyo.
- **`wc5` patada lateral:** me gusta como movilidad dinámica y como pre-activación sin banda del glúteo medio. Solo corregir la altura (ver §4).
- **`wr3` isquios de pie:** sirve de maravilla antes de rumano y curl femoral. Es dinámica (10 repeticiones), no estática: bien.
- **`we5` rollitos:** barata, agradable, el efecto de «calentar el cuerpo» es suave. Su valor real es de comodidad, no de descompresión. La dejo, en el suelo y al inicio del bloque de suelo, 8 repeticiones. No la pondría como prioridad en el día de pierna.

## 6. Opinión honesta: las 3 que salen

De acuerdo con las tres.
- **`wa2` remo invertido:** no es calentamiento, es un ejercicio de fuerza que exige barra baja y que a una principiante le cuesta; el motor lo ofrecía «opcional». Sale sin pérdida; la apertura con banda (`wa3`) cumple lo mismo.
- **`wr1` círculos de rodilla:** pies fijos, rodilla en rotación sin control, y la rodilla es una bisagra: no tiene qué ganar. Es la que más me alegra ver salir.
- **`we3` apertura de cadena posterior:** es un estiramiento estático pasivo de 30 s, que antes de levantar pesado no ayuda y baja un poco la fuerza; lo reemplaza `wr3` (dinámico, mismo músculo) y `wai3` (bisagra).

## 7. Desacuerdos o reservas con el PO

No tengo un desacuerdo de decisión. Tengo cuatro reservas que él debería ver:
1. **«Óptimo para cada entreno» no se logra con el motor por músculo.** Hace falta la receta por sesión (§2). Si solo se quitan las 3 piezas, GP_A y GP_B seguirán recibiendo casi lo mismo y los días de glúteo seguirán sin activación de glúteo.
2. **El 90/90 no es para todas todos los días** (ver §5).
3. **La aproximación oculta casi no se usa.** Pido que nazca abierta en el primer ejercicio.
4. **Menos es más:** tope de 7 piezas marcables. Con la lista de hoy más 11 piezas nuevas es fácil pasarse, y una lista larga se abandona.

## 8. Riesgos para Laura (fisio)

- **Postparto (>6 semanas):** cardio SIN impacto (nada de rodillas altas, saltos ni trote hasta valorar suelo pélvico); que la respiración 360° y el bird-dog reemplacen plancha y rollitos; vigilar caída de peso, presión o escape de orina en estocada con rotación y 90/90. Sin Valsalva en la aproximación pesada del hip thrust.
- **Diástasis abdominal:** `wac1` plancha, `wac2` deadbug y `we5` rollitos deben estar contraindicados hasta que ella lo apruebe (hoy `wac1` no está en ninguna lista de diástasis). Pedirle que dicte la lista.
- **Rodilla:** `wc3` 90/90 (torsión), `wc2` estocada (valgo), `wag2` caminata lateral (valgo si la banda está en el tobillo; en las rodillas es más estable), `wr2` sentadilla lenta, y `wg3` si se hace con rodillas muy altas. Confirmar que menisco o LCA operados no necesiten una versión propia del 90/90.
- **Lumbar:** `wai3` bisagra, `we5` rollitos (flexión repetida; ya está en la lista), `wc2` si el giro sale de la cintura, patada lateral con tronco inclinado. Revisar `wag3`: si arquea la espalda, es lumbar, no glúteo.
- **Osteopenia u osteoporosis (asesoradas de 45-65):** rollitos y cualquier flexión repetida de columna con rodado; decidir si `we5` queda fuera de ese perfil.
- **Cadera:** `wc3` y `wc5` en caderas con pinzamiento o dolor inguinal; aductores (ya hay lista).
- **Isquios:** `wr3` con tirón agudo o dolor de ciático: sin «rebote» ni estiramiento forzado.
- **Tobillo:** `wt2` con esguince agudo o tendinopatía de Aquiles (ya está en lista).
- **Cardio general:** sobrepeso significativo o hipertensión: elegir bici, no marcha de rodillas altas, y RPE 3-4 como techo en las primeras semanas.
- **Ciclo menstrual:** no cambiaría el calentamiento por fase; basta con que la persona pueda acortar la versión si se siente mal.
