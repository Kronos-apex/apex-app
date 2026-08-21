# Lucas · QA funcional — verificación ADVERSARIAL en navegador de avi-v507

Repo `C:\Users\KRONOS\Desktop\AVI\apex-app`, rama `main`, HEAD `4478afd`.
**Árbol limpio al terminar** (`git status` vacío, `git diff` vacío, sin puertos zombi, 0 chrome vivos).
Nada se escribió a la nube: todo con el sello `cloudWriteSealed` de localhost, `AVI_ALLOW_CLOUD_WRITE` jamás tocado. Sin commit, sin push, sin bump de versión.

Capturas: `C:\Users\KRONOS\AppData\Local\Temp\avi-lucas-v507\`

---

## 1 · Los 8 harnesses — resultado REAL

| Harness | Resultado |
|---|---|
| `_verify-chips.mjs` | ✅ **21/21** · `jsErrors: []` |
| `_verify-foodlog.mjs` | ✅ **41/41** |
| `_verify-water.mjs` | ✅ 15/15 (W0-W7, S1-S6) |
| `_verify-tope.mjs` | ✅ 15/15 |
| `_verify-hero.mjs` | ✅ 20/20 |
| `_verify-missday.mjs` | ✅ 12/12 |
| `_audit-pantallas.mjs` | ✅ veredicto verde, 12 pantallas |
| `_verify-estudio-defectos.mjs` | ✅ 11/11 |

**Ni un rojo.** No hubo nada que diagnosticar como «harness caduco vs defecto real».
Corridos de a uno, nunca en paralelo. Única anotación de `_audit-pantallas`: `a5-perfil` reporta 1 toque bajo el mínimo (**«Eliminar registro de peso», 26×32 px efectivos**) — preexistente, no falla el gate, 🟢.

---

## 2 · HALLAZGOS, priorizados

### 🔴 A — La portada del DÍA 1 sobrevive al primer entreno terminado *(PREEXISTENTE, no lo causa v507 — pero lo encontré probando sus estados)*

**Qué hice.** Monté a alguien con **0 sesiones** (modo día 1) → la portada se pinta. Le inyecté la sesión **finalizada de hoy** (`finishedAt`, exactamente lo que escribe `app-4:1916` al cerrar un entreno) y llamé `renderClientToday(c)` — que es literalmente lo que hace el poll de 15 s (`app-4:196`) y lo que hace `initClientView` al volver a la pestaña.

**Qué esperaba.** Que la portada del día 1 desapareciera: ya entrenó, ya no es día 1.

**Qué pasó.** Se queda entera y visible: **933 caracteres de HTML, `display:block`, 326 px de alto**, con su titular *«Nataly, tu plan está listo — Hoy empiezas con el primero»*, su tarjeta *«TU PRIMER ENTRENO»*, la promesa **«Lo demás aparece cuando termines este»** (falsa: todo lo demás ya está debajo) y el botón **«Empezar mi primer entreno →» vivo y recibiendo el toque** (`onclick="firstRunGo()"`, hit-test: «ese mismo botón»). La tarjeta *«¡Ya entrenaste hoy!»* sí se pinta, pero queda **debajo del plan de comida** (orden de `_todayOrder(false)`), o sea fuera de la primera pantalla.

**Captura (tamaño real):** `avi-lucas-v507/R1b-primer-entreno-terminado.png`

**Causa raíz.** `renderFirstRun` limpia con `el.innerHTML=''` en su primera línea, pero **se la llama en `app-4:964`, DESPUÉS de tres `return` tempranos**: `!routines.length` (915), `finishedTrainingToday` (923) y `!baseR` / día de descanso (945). Cuando el `return` de «ya entrenaste» gana, nadie limpia `#cn-firstrun`, y `_todayOrder` no lo apaga porque `#cn-firstrun` **no está en `_DIA1_OFF`** (es la portada, no una de las once tarjetas que el día 1 apaga).
Es la misma familia que ya se cerró dos veces: el `return` prematuro de v506 y el D5 de v403 («apagar obliga a encender de vuelta»), un piso más arriba.

**Control:** una veterana que entrena hoy da `largoHtml:0` y `display:none` → el defecto es exclusivo de la transición día 1 → primer entreno terminado.
**Corroboración accidental:** en mi primera corrida, con montajes encadenados sobre la misma página, la portada se arrastró a los estados de descanso y «ya entrenaste» (por eso re-capturé todo con recarga completa: `LIMPIA-*.png`, donde `#cn-firstrun` mide 0).

**Por qué pesa.** Es el momento más caro del producto: 8 de 22 nunca completan una sesión, y a quien SÍ la completa la app le dice «Hoy empiezas con el primero» y le ofrece un botón para empezar lo que acaba de terminar.

**Límite honesto:** no logré recorrer el entreno guiado de punta a punta con toques reales (`firstRunGo()` no me abrió el guiado en el harness), así que la reproducción es «sesión finalizada + `renderClientToday`», que es el estado y la llamada reales, no el camino de dedos completo.

---

### 🔴 B — `AVI_NEWS` v505 le describe al asesorado una tira que ya no existe *(pista **a** de Julián: CONFIRMADA, y con un agravante)*

**Qué hice.** Monté a la misma persona con `ax_news_seen = 400`, dejé que el tour se abriera solo y lo capturé **a tamaño real**, en Premium y en tier libre.

**Qué pasó (MEDIDO):**
- `newsToShow(AVI_NEWS,'400',{coach:true})` → **3 slides**: `478 · Tu meta ahora es una franja`, `479 · Tu lista del mercado`, `505 · «Hoy» ahora tiene una sola promesa`. La v505 es la **última** del recorrido.
- `newsToShow(...,{coach:false})` → **1 sola: la v505**. Como no lleva `coach:true`, **para el tier libre es la ÚNICA novedad que existe**, a pantalla completa, sobre `#s-client` / pestaña `cn-today`.
- El texto que se lee, palabra por palabra: *«El agua, los pasos y **tu plato** bajan a una **tira de tres**»*, y el paso 3: *«Abajo, la **tira de tres**: toca el agua para sumar un vaso, igual que siempre»*.
- Detrás del modal, en esa misma pantalla, hay **2 chips (`w`,`s`)**.

**Captura:** `avi-lucas-v507/P2b-tour-libre.png` (libre, la única slide) y `P2a-tour-premium-slide3.png`.

**El agravante que Julián no podía ver sin navegador:** para el **tier libre el texto ya era falso ANTES de v507**. En v504-v506 `renderHabitsCard` pasaba `conComida = !isFreeClient(client)`, así que un libre **nunca** tuvo tres chips ni tuvo plato. La entrada se dejó sin `coach:true` con el argumento «la pantalla cambió para todos», pero su contenido (el plato) es Premium. v507 solo extendió la mentira al resto.

**Consecuencia para la persona:** el único aviso que recibe la manda a buscar «tu plato» en una tira donde no está, y en su caso no está en ninguna parte.

---

### 🔴 C — El gate Premium de la puerta nueva NO tiene candado (sabotaje VERDE, y es debilidad del test)

**Qué hice.** Quité de `_foodLogDoorHtml` la línea `if(typeof isFreeClient==='function'&&isFreeClient(c))return '';` (impreso el tramo antes/después: se aplicó, 146.931 → 146.860 bytes) y corrí `_verify-chips`.

**Qué esperaba.** Rojo: el harness tiene C8 dedicado al tier libre.

**Qué pasó.** **`_verify-chips` → 21/21 VERDE.** Y mi propia sonda prueba que el sabotaje **sí cambió la conducta**: con el gate muerto, un cliente `tier:'libre'` ve en «Mi nutrición» el botón **«Anotar lo que comí hoy»** (`existe:true, alto:38`) — y al tocarlo **no pasa nada**, porque `openFoodLogRoom` tiene su propio `return` para libres. Un botón muerto, que es justo la clase que el repo persigue (`F5-2: nunca un botón muerto`).

**Cuál de las tres causas.** No es «no se aplicó» (probado) ni «el código sobra» (probado load-bearing: sin él la puerta aparece). Es **test débil**: `C8` mide al libre solo en la **tira** y en la **fila del detalle**; nadie afirma «el libre NO ve la puerta de Mi nutrición».

**Atenuante que también medí, para no dramatizar:** hoy un tier libre **no puede llegar** a la habitación de nutrición por la interfaz — las 4 puertas a `openNutritionRoom` (`app-5:352, 502, 574, 771` vía `openShopList`) están todas detrás de `renderNutritionClient`/`renderMealsToday`, que devuelven `premiumLockHTML` o cortan para libres. O sea que el gate de `_foodLogDoorHtml` es **defensa en profundidad**, no la única barrera. Pero es exactamente la forma «puerta cerrada, ventana abierta»: el día que alguien le abra a los libres una vista de solo lectura de su nutrición (un upsell perfectamente plausible), la ventana ya está abierta y ningún test lo dirá.

**Arreglo sugerido (no lo apliqué):** un `C8-bis` que monte `tier:'libre'`, llame `openNutritionRoom` y afirme que **NO** hay puerta — con su control obligatorio: a la Premium sí.

---

### 🟡 D — `C11` se satisface con el defecto *(pista **c** de Julián: CONFIRMADA)*

**Qué hice.** Saboteé `renderHabitsCard` para que no pinte NADA (`el.innerHTML=''; return;` al principio) y corrí `_verify-chips`.

**Qué pasó.** 17 rojos… y **`C11` salió VERDE**: *«✅ 🔴 C11 el plato de hoy sale UNA sola vez en «Hoy»: la tarjeta del plan, no el chip»* — con la tira de hábitos entera borrada de la pantalla. También quedaron verdes `C4-ter` y `C4-bis` (viven en otra habitación, correcto).

**Por qué.** `C11` hace su propio `montar()` y afirma `chip===false && plan===true && kcal!==null`. `chip===false` se cumple igual si `#cn-habits` no pintó nada, y `C11` nunca vuelve a afirmar que la tira existe.

**En la práctica el harness sí muerde** (C1 y otros 16 caen a gritos), así que no es un agujero explotable hoy — pero `C11` **no dice lo que su nombre dice** y aislado no protegería nada. Arreglo de una línea: añadirle `chips.length===2` (o la presencia de `.hb-strip`) a la aserción.

---

### 🟡 E — Las dos cuentas de rojos declaradas en el commit están mal *(pista **b**: una mitad de Julián acierta, la otra no)*

Los corrí de verdad, con prueba de aplicación (tramo antes/después impreso) y restauración entre medio.

| Sabotaje | Commit dice | **MEDIDO** | Cuáles |
|---|---|---|---|
| 1 · devolver el chip del plato a la tira (revert exacto de v506) | 6 rojos | **5** | C1, C4, C11, C9, C9-bis |
| 2 · quitar la puerta de «Mi nutrición» | 1 rojo | **2** | C4-ter, C4-bis |

- **Sabotaje 1 = 5, no 6.** Julián predijo C1, C4, C8, C9, C9-bis, C11. **C8 se queda VERDE**, y con razón: monta `tier:'libre'`, y el revert de v506 reintroduce el chip vía `conComida = !isFreeClient(client)` → al libre le siguen saliendo 2 chips. C8 es estructuralmente incapaz de cazar este sabotaje. Así que aquí se equivocaron los dos (el commit y Julián), por el mismo sitio.
- **Sabotaje 2 = 2, no 1.** Julián acierta: caen `C4-bis` (no existe la puerta) **y** `C4-ter` (la sonda de contraste devuelve `{"err":"no hay puerta"}` y el check trata el error como fallo, que es lo correcto — v453).

Dos sabotajes extra que corrí por mi cuenta:

| Sabotaje | Resultado | Lectura |
|---|---|---|
| 3 · quitar el gate `isFreeClient` de la puerta | **VERDE (21/21)** | test débil → hallazgo C |
| 4 · la puerta sin `onclick` | **1 rojo** (C4-bis) | el candado muerde ✅ |
| 5 · `renderHabitsCard` no pinta nada | 17 rojos, **C11 verde** | hallazgo D |

En los 5 casos se imprimió el tramo antes/después y el cambio de tamaño del archivo, y en los 5 el runner confirmó «aplicado exactamente 1 vez». Tras cada uno: `git checkout -- app-5-salud.js` + `git status` vacío.
⚠️ Nota operativa: `app-5-salud.js` **cambió de LF a CRLF** entre mi primera edición y la restauración (git lo reescribe al hacer checkout) — el patrón hay que normalizarlo, no perseguirlo. Es el gotcha del 12-ago, vuelto a pisar.

---

### 🟡 F — La rama «sin estimación posible» de «Mi nutrición» NO pinta la puerta nueva

**Qué hice.** Premium, sin plan escrito del coach y **sin peso, talla, edad ni sexo** → abrí «Mi nutrición».

**Qué pasó.** `openNutritionRoom` corta con un `return` propio (`app-5:620`) antes del `body.innerHTML` que contiene `${_foodLogDoorHtml(c)}`. Resultado: una pantalla con el héroe, una nota de dos líneas y **nada más** (captura `E6-sindatos-nutricion.png`, mirada a tamaño real). Sin puerta.

**¿Debería estar?** En mi opinión sí, y con una medición detrás: esa misma persona **sí puede registrar** — en su «Hoy» la fila del plato existe con su «+» y dice *«Anota lo que comes y llévalo claro»* (`filaPlato:true, botonMas:true`). O sea que el registro no necesita peso/talla/edad, y la habitación donde más espacio sobra es justo donde se le niega la puerta.
**Exposición:** baja y no medida contra los perfiles reales — hace falta Premium **sin plan escrito** *y* con datos corporales incompletos (el caso conocido de Astrid, «peso sin talla», sí tiene plan del coach, así que entra por la otra rama y sí ve la puerta). Eso lo puede contar Mateo, no yo.

---

### 🟡 G — Tres entradas de `AVI_NEWS` están escritas sin una sola tilde, y son justo las tres del tour

Contadas las 15 entradas: **v478, v479 y v505 tienen 0 tildes**; las otras 12 van entre 1 y 11. Y esas tres son exactamente las que ve un asesorado que no abre novedades desde antes de v478: *«Tu entreno del dia ocupa la primera pantalla… un solo boton para empezar… salen maximo dos y el resto te espera en una linea»*, *«nada mas compite por tu atencion»*, *«tocalo y ahi esta lo que no cupo hoy»*. Contra la barra «Tono Sofía · español colombiano», a pantalla completa. No es de v507, pero viaja con la misma slide del hallazgo B y se arregla en el mismo sitio.

---

### 🟢 H — Contraste: las cifras publicadas se reproducen exactas *(pista **d**)*

Sonda propia, con su control validado (**blanco/negro = 21**, **#767676/blanco = 4.54**), componiendo el alfa del color **y** el `opacity` acumulado de toda la cadena de padres:

| Elemento | Publicado | **Medido (sin opacity)** | **Medido (con opacity compuesto)** |
|---|---|---|---|
| Puerta «Anotar lo que comí hoy» claro | 5,45 | **5,45** | 5,45 (`opacity` compuesto = 1) |
| Puerta oscuro | 7,14 | **7,14** | 7,14 |
| Etiquetas de la tira + fila del plato, claro | 6,01 | **6,01** | 6,01 |
| Ídem, oscuro | 6,33 | **6,33** | 6,33 |

**¿Cambia algo la trampa de v453?** **Hoy no: ninguna.** Ninguno de los elementos medidos tiene un ancestro con `opacity < 1` en el momento en que el harness mide.
**Pero la trampa está viva, solo dormida** — y lo probé: midiendo **a los 0 ms** de `openNutritionRoom` el `opacity` compuesto es **0** (cadena: `btn bg bsm = 0` · `#nutrition-room = 0`) y el contraste real es **1,0** (invisible). Lo único que salva a `C4-ter` es su `sleep(800)`: `#nutrition-room` abre con `transition: opacity .24s` y el botón con su propia animación de entrada. Si mañana ese sleep se acorta o la animación se alarga, `C4-ter` imprimirá **5,45 sobre un botón que no se ve** — el verde sobre lo no pintado que ya costó una sesión en v453.
**Recomendación:** que la sonda de `_verify-chips` componga el `opacity` de los padres y trate `opacity ≈ 0` como **fallo**, no como medida buena.

---

### 🟢 I — Opinión de producto (marcada como opinión, no como medición)

La puerta nueva es `.btn.bg.bsm` — borde gris, texto gris de **12 px**, sin relleno ni chevron. A tamaño real (`E8-360xl-puerta.png`) lee más como rótulo de sección que como acción, encajada entre las fichas de kcal/agua y «TUS MACROS». Si toda la razón de la mudanza fue la adopción (5 personas / 7 días), la puerta que la sustituye es el elemento **más callado** de esa pantalla. Es decisión de Isabella/Diego y del PO, no mía; lo dejo dicho porque la medida que motivó v507 es de adopción.

---

## 3 · Estados probados (y los que no pude montar)

| Estado | Tira en «Hoy» | Fila del plato en el detalle | Puerta en «Mi nutrición» | Veredicto |
|---|---|---|---|---|
| **tier libre** | 2 chips (`w`,`s`), sin plato | **no** (correcto, es Premium) | **no existe**, y `openFoodLogRoom()` forzado no abre | ✅ (falta el candado → hallazgo C) |
| **modo día 1** (`firstSessionMode`) | `#cn-habits` vacío y `display:none` | — | **sí existe** | ✅ conducta correcta; ver nota |
| **día de descanso** | 2 chips + tarjeta del plan («Hoy descansas · 1944 kcal») | ok | sí | ✅ |
| **ya entrenaste hoy** | 2 chips + tarjeta del plan | ok | sí | ✅ (pero ver hallazgo A si venía del día 1) |
| **sin plan de nutrición escrito** (Premium) | 2 chips, fila del plato con «+» | sí | **sí** (rama estimación) | ✅ |
| **sin peso/talla/edad** (Premium) | 2 chips, fila del plato con «+» y texto honesto | sí | **NO** | 🟡 hallazgo F |
| **coach viéndose a sí mismo** (`COACH_SELF`) | 2 chips | ok | **sí**, y abre; el aviso es el correcto: *«Este es tu propio registro: lo que anotes aquí es tuyo y nadie más lo ve»* | ✅ |
| **360 px + `data-fs="xl"`** en «Mi nutrición» | — | — | 53 px de alto, 315 de ancho en un viewport de 360, **`docDesborde: 0`**, sin recorte, `elementFromPoint` devuelve la propia puerta, «‹ Volver» a 48 px y dentro de pantalla | ✅ **no es el defecto de v452/v453** |

**Nota del día 1:** la puerta sí aparece en «Mi nutrición» estando en modo día 1. No lo cuento como defecto — el modo día 1 despeja **«Hoy»**, no las habitaciones — pero queda dicho.

**Lo que NO pude montar:** (1) el recorrido completo del entreno guiado con toques reales hasta «Finalizar» (ver el límite honesto del hallazgo A); (2) cualquier verificación contra datos reales de la nube (prohibido escribir, y la lectura de perfiles es de Mateo) — por eso la exposición del hallazgo F queda sin cuantificar.

---

## 4 · Toques reales (recorrido hecho, no de memoria)

Con el consentimiento del registro **ya dado** (que es el estado de régimen):

| Puerta | Toques hasta dejar una comida REGISTRADA | Evidencia |
|---|---|---|
| **B · «✓ Me lo comí» en «Tu comida de hoy»** | **2** — «Ver» + «✓ Me lo comí» | 4 entradas, 592 kcal ✔ |
| **A · detalle de hábitos → «+»** | **3** — «Ver el detalle» + «+» + «✓ Me comí esto» | 4 entradas, 592 kcal ✔ |
| **C · «Mi nutrición» (la puerta NUEVA)** | **4** — Perfil + «Ver mi plan completo» + «Anotar lo que comí hoy» + «✓ Me comí esto» | 4 entradas, 592 kcal ✔ |

**Contra el antes (v506, con el chip):** el chip abría la habitación en **1** toque, así que marcar el desayuno desde ahí eran **2**. La puerta A pasó de **2 → 3**… **la primera vez**: el detalle guarda su estado por asesorado (`ax_hbopen_<cid>`, verificado: sobrevive al re-render), así que a partir del segundo día vuelve a ser **2**.
La puerta B (2 toques) ya existía y es la más barata de las tres — la afirmación del commit de que es «el camino más barato de todos» **se sostiene**.
**Donde sí se paga:** anotar algo que **no está en el plan** (buscar un alimento). Antes: 1 toque hasta la habitación. Ahora: **2** (detalle + «+») o **3** por Perfil. Es la vía que usan las 5 personas que registran, y encarece.

**La primerísima vez de la vida** se paga además el aviso de «lo ve tu coach» (+1 toque) en cualquiera de las tres puertas — incluido «✓ Me lo comí», que en vez de registrar abre la habitación con el aviso. Es por diseño y está bien, pero conviene saberlo: la primera vez que alguien toca «✓ Me lo comí» **no se registra nada** todavía.

---

## 5 · Tabla de sabotajes (resumen)

| # | Sabotaje | ¿Se aplicó? | ¿Mordió? | Si no mordió, ¿cuál de las tres causas? |
|---|---|---|---|---|
| 1 | Devolver el chip del plato a la tira (revert de v506, en `_habitStripHtml` + su llamada) | sí (tramo impreso, +1.531 bytes) | **sí — 5 rojos** (C1, C4, C11, C9, C9-bis) | — (pero el commit declara 6) |
| 2 | Quitar `${_foodLogDoorHtml(c)}` de `openNutritionRoom` | sí (−28 bytes) | **sí — 2 rojos** (C4-ter, C4-bis) | — (el commit declara 1) |
| 3 | Quitar el gate `isFreeClient` de `_foodLogDoorHtml` | sí (−71 bytes) | **NO — 21/21 verde** | **Test débil.** Probado que no es «no aplicado» (el libre pasa a ver la puerta) ni «código redundante» (es load-bearing) |
| 4 | La puerta sin `onclick` | sí (−5 bytes) | **sí — 1 rojo** (C4-bis) | — |
| 5 | `renderHabitsCard` no pinta nada (pista c) | sí (+45 bytes) | 17 rojos, pero **C11 VERDE** | **C11 es débil**: `chip===false` lo cumple una pantalla vacía |

Restauración verificada tras cada uno. Estado final: `4478afd`, árbol limpio.

---

## 6 · Veredicto

**Sobre lo que v507 dice de sí mismo: la afirmación de fondo se sostiene.** Medido en navegador, no se perdió función: la tira baja a 2 chips, y las tres puertas existen, se ven y **registran de verdad** (592 kcal en las tres). La bajada no es un escondite: el camino más barato (2 toques) sigue vivo y el detalle recuerda que quedó abierto.

**Lo que hay que corregir antes de dar el lote por cerrado:**
1. 🔴 La portada del día 1 tras el primer entreno (**A**) — preexistente, pero es el peor momento posible para que la app se contradiga.
2. 🔴 La slide v505 (**B**) — hoy, en producción, le está diciendo a todo el mundo (y solo eso al tier libre) que busque su plato en una tira de tres.
3. 🔴 El candado que falta del gate Premium de la puerta nueva (**C**).
4. 🟡 `C11` reescrito para que afirme lo que su nombre promete (**D**), las dos cuentas del commit corregidas (**E**), la puerta en la rama sin estimación (**F**) y las tildes (**G**).
5. 🟢 La sonda de contraste componiendo el `opacity` de los padres (**H**) antes de que la trampa despierte.
