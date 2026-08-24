# Auditoría: EXPERIENCIA Y FRICCIÓN — Sofía Castaño (CS)

> **Alcance:** delta **v418 → v526** (HEAD `6d2a561`, sello `avi-v526`). Read-only.
> Continúa `docs/auditoria-areas-2026-07-31/A5-experiencia.md`: lo cerrado no se re-audita, lo
> que aquel informe dio por SANO sí se re-verificó.
> **Criterio de prioridad:** el problema es la ACTIVACIÓN. Un hallazgo que mueva a las 8 personas
> que nunca entrenaron vale más que diez detalles elegantes.

---

## Veredicto en 5 líneas

1. **El lote de dirección B (v503-v508) NO llega al día 1: los tres mecanismos están apagados a propósito para quien nunca ha entrenado.** El héroe se excluye con un `!_dia1` explícito, la tira de chips está en `_DIA1_OFF` y el tope no tiene nada que topar. «Hoy» quedó más clara para quien ya la conocía; para el día 1 no cambió — y lo único que sí cambió en el delta (v447) **le añadió una tarjeta duplicada**.
2. **La puerta del día 1 sigue cerrada 43% de los días.** El plan cae de lunes a viernes y el día 1 solo tiene entreno si la persona llega en un día suyo; si no, la portada del día 1 **no se pinta** y lo que lee es «Hoy es tu día de descanso». Le pasó a **Chema el sábado 22-ago (ayer)**, plan de pago, 0 sesiones, sin teléfono.
3. **La app promete «te toma menos de una hora» y en el 52,7% de las veces no se cumple** (81 sesiones reales emparejadas con su propia rutina: mediana real 62,2 min contra 40,0 prometidos; 70 de 81 más largas).
4. **Dos textos afirman un coach que no existe:** el saludo de cada entrada dice «Tu coach la preparó para ti» a **12 de 24** personas sin acceso a coach, y el badge de mensajes sigue llamando a un candado que además **marca los 19 mensajes del coach como leídos** al tocarlo.
5. Lo bueno: **H4 de julio (teléfono y lesiones en el registro) está EJECUTADO y bien resuelto**, el aviso de no-entrega al coach funciona, y el reparto de días ya no amontona. El área no está sana, pero lo que se arregló se arregló bien.

---

## Hallazgos verificados

### H1 · 🔴 El día 1 sigue cayendo en «día de descanso» — y ayer le pasó a alguien de plan de pago

- **Qué pasa:** el plan se reparte **solo de lunes a viernes** (v514) y `renderFirstRun` —la portada
  del día 1— se llama **después** del `return` del día de descanso. Si la persona abre la app por
  primera vez en un día sin rutina, su primera pantalla completa es un banner que le dice que **hoy
  no entrene**. Con `_dia1` activo, además, se apagan las once tarjetas secundarias: la pantalla
  entera es el banner y un botón.
- **Dónde:**
  - `avi-core.js:122-135` `genWeekDays` — quien se registra sábado o domingo arranca el lunes.
    El propio código lo deja escrito: *«Lo que su pantalla le diga ese fin de semana es un asunto
    aparte y sigue abierto.»*
  - `app-4-entreno.js:960-976` — el `if(!baseR)` pinta el banner y hace `return`.
  - `app-4-entreno.js:1006` — `renderFirstRun(client, todayR)` vive **30 líneas por debajo** de ese
    `return`.
  - `app-3-coach.js:306` — el auto-registro sí manda `startDay` (arreglo de v418+). **El coach que
    genera desde su panel NO lo manda** (comentario en `app-3-coach.js:304`), así que los planes de
    la cohorte que funciona siguen anclados al lunes.
- **Evidencia:**
  ```
  $ node -e "genWeekDays(n, díaDeAlta) para los 7 días × 1..5 días de plan"
  SIN entreno el día de alta: Sábado n=1..5   → 5 de 5
  SIN entreno el día de alta: Domingo n=1..5  → 5 de 5
  (lunes a viernes: 0 de 25 — ahí el arreglo de v418 SÍ funciona)
  ```
  Exposición real, contando días de calendario sin rutina por persona (24 filas de `user_data`):

  | días con rutina | personas | días vacíos/semana |
  |---|---|---|
  | 1 | 1 | 6 |
  | 2 | 2 | 5 |
  | 3 | 2 | 4 |
  | 4 | 10 | 3 |
  | 5 | 9 | 2 |

  **72 de 168 días-persona = 42,9%.** Si el primer arranque cae uniforme en la semana, casi la
  mitad de las personas nuevas ven el banner de descanso en vez de su portada.

  **Víctima con nombre y fecha:** `Chema` — cuenta creada **sábado 22-ago 11:28**, `selfReg:true`,
  `tier:'app'` (plan de pago), plan **Lunes|Martes|Miércoles|Jueves|Viernes**, **0 sesiones**, sin
  teléfono. Su fila se guardó por última vez a las **11:34**: seis minutos después de registrarse y
  nunca volvió. Lo que leyó ese sábado fue *«Hoy es tu día de descanso… regresa mañana listo para
  rendir»* — y el domingo tampoco tenía nada.
  Antes que él: `maria rubio` (domingo 9-ago, 0 sesiones) y `Nicolás` (sábado 4-jul, 1 sesión).
- **Intenté tumbarlo así:**
  1. *¿No lo tapa la portada del día 1?* No. Leí el orden real de `renderClientToday` (línea 960 el
     `return`, línea 1006 la llamada). Además `#cn-firstrun` se **vacía** arriba de los `return`
     (línea 902, arreglo de v508), así que en día de descanso queda garantizadamente en blanco.
  2. *¿No será que v514 lo cerró?* Cerró la mitad: de lunes a viernes el día 1 ya tiene entreno
     (medido arriba, 25 de 25). El fin de semana queda fuera **por el horario del gimnasio**, y eso
     es una decisión de negocio correcta — el defecto no es el reparto, es **qué le dice la pantalla
     a alguien que llegó ese día**.
  3. *¿Y si casi nadie se registra en fin de semana?* De los 13 auto-registrados, **4 lo hicieron**
     (31%), y tres de los cuatro tienen 0 o 1 sesión.
  4. *¿El banner ofrece salida?* Ofrece «Ver todas mis rutinas →», que sí lleva a un sitio donde
     puede arrancar una. Pero es un segundo destino y el texto que acaba de leer le dijo que hoy
     **no** entrene.
- **A quién le pasa:** a Chema (ayer), a maria rubio, a Nicolás; y a cualquiera —también de la
  cohorte del coach, cuyos planes arrancan siempre en lunes— que abra la app por primera vez en un
  día vacío.
- **Costo del arreglo:** **quirúrgico, ~15 líneas.** En el `if(!baseR)`, si `firstSessionMode(sess)`
  es verdadero, pintar la portada del día 1 apuntando a la **próxima** rutina del plan en vez del
  banner de descanso («Tu plan está listo · empiezas el lunes con Full Body A · o entrénala hoy si
  quieres»). No toca el generador ni el criterio deportivo. La alternativa de mover el plan al fin
  de semana **no** la recomiendo: el coach no trabaja sábados y eso ya está decidido.

---

### H2 · 🔴 «Te toma menos de una hora» es cara o sello: falla el 52,7% de las veces

- **Qué pasa:** el héroe de «Hoy» (v503) y la portada del día 1 anuncian una duración. El motor la
  calcula como `series × (45 s + descanso)` y **no incluye calentamiento, cambio de máquina, ni el
  tiempo entre ejercicios**. Sobre las sesiones reales se queda corto de forma sistemática. Cuando
  el número baja de 60, el héroe añade literalmente **«te toma menos de una hora»**.
- **Dónde:**
  - `avi-core.js:6498-6507` `SET_WORK_SECONDS = 45` y `estimateWorkoutMinutes`.
  - `avi-core.js:6652` `underHour: mins != null && mins < 60` — con el comentario *«Solo se promete
    "menos de una hora" cuando el motor dice que es verdad»*.
  - `app-4-entreno.js:659` pinta la frase; `app-4-entreno.js:702` la misma estimación en la portada
    del día 1.
- **Evidencia:** emparejé **cada sesión con su propia rutina** (mismo asesorado, mismo
  `routineName`) y comparé la estimación con la duración real (`startedAt` = primera serie marcada,
  `finishedAt` = cierre; filtro 5-240 min):
  ```
  n = 81 sesiones emparejadas
  duración real (mediana)      62,2 min
  estimación (mediana)         40,0 min
  desvío (mediana)             +17,7 min
  sesiones más largas que lo prometido   70 de 81  (86%)
  avance (mediana)             1,00  → no son sesiones que se alargaron por quedarse a medias
  ```
  Y acotado a las que llevaban la frase (`est < 60`):
  ```
  sesiones con la promesa «menos de una hora»  74
  se pasaron de la hora                        39  → 52,7%
  ```
- **Intenté tumbarlo así:**
  1. *¿`startedAt` se pone al abrir la app?* No: `app-4-entreno.js:1983-1986` lo escribe en la
     **primera serie marcada**. La medida es conservadora — deja fuera el calentamiento y todos los
     toques previos, así que el desvío real es **mayor**, no menor.
  2. *¿Serán sesiones que la persona dejó abiertas?* El avance mediano es **1,00** (sesiones
     completas) y filtré por encima de 240 min. Con el filtro a ≤120 min el sentido no cambia.
  3. *¿La comparación es contra la rutina correcta?* Sí — el join es por asesorado **y** nombre de
     rutina, no contra el promedio del catálogo (que da 41,7 min y sería un número más flojo).
  4. *¿Y si la constante ya estaba medida?* No hay ninguna medición escrita al lado de
     `SET_WORK_SECONDS = 45`; el comentario dice *«una serie de fuerza típica, de pie a última
     repetición»*, que describe **la serie**, no la sesión.
- **A quién le pasa:** a todo el que abre «Hoy» en un día de entreno — y con más peso a quien está
  decidiendo si hoy tiene tiempo. Es exactamente la clase que este proyecto ya pagó: *una promesa
  que la app no puede cumplir le baja la guardia a quien la lee*.
- **Costo del arreglo:** **una constante y una franja, ~10 líneas.** (a) Recalibrar el sobrecoste
  por serie contra estas 81 sesiones (el factor medido es ×1,55) — es una línea, pero **la decide
  el deportivo, no yo**: puede ser que 45 s de trabajo esté bien y lo que falte sea un término fijo
  de montaje. (b) Decirlo como **franja**, no como cifra: «45-65 min», que es lo que el propio
  proyecto ya hizo con las calorías (v478). (c) Mientras tanto, **retirar la frase «te toma menos
  de una hora»** hasta que el número la sostenga: 1 línea, y quita una promesa que hoy falla la
  mitad de las veces.

---

### H3 · 🟠 El día 1 anuncia el mismo entreno DOS veces, y el botón de la portada no arranca nada

- **Qué pasa:** v447 metió una «tarjeta de arranque» en `#cn-today-body`. En el día 1 esa tarjeta se
  pinta **inmediatamente debajo** de la portada del día 1, con la misma rutina, el mismo conteo de
  ejercicios y la misma duración. Y el botón principal de la portada, «Empezar mi primer entreno →»,
  **no empieza nada**: solo hace scroll hasta la segunda tarjeta, donde hay otro botón «Empezar».
- **Dónde:**
  - `app-4-entreno.js:715-718` `firstRunGo()` → `scrollIntoView`, nada más.
  - `app-4-entreno.js:1007-1009` `const _heroOK = !_dia1 && …` → en día 1 `_heroOK` es **false**, así
    que `con.innerHTML = _startCardHTML(client, todayR)`.
  - `app-4-entreno.js:828-840` `_startCardHTML` — «Tu entreno de hoy» + nombre + «N ejercicios ·
    ~M min» + botón «Empezar» + «Ver otra rutina».
  - `app-4-entreno.js:697-710` la portada — «TU PRIMER ENTRENO» + el mismo nombre + los mismos
    chips + «Empezar mi primer entreno →» + «Ver otra rutina» no, pero sí «Lo demás aparece cuando
    termines este».
  - `app-4-entreno.js:732` el orden los deja adyacentes: `['cn-today-head','cn-firstrun',…,'cn-today-body',…]`.
- **Evidencia:** el camino es determinista y no tiene ramas: en día 1 `workoutStartCollapsed`
  devuelve **true** (`avi-core.js` — no expandido, sin progreso, sin override, sin trainAgain), así
  que el cuerpo es siempre la tarjeta de arranque. Los datos repetidos son tres: **nombre de la
  rutina, número de ejercicios y minutos estimados**. Las acciones repetidas son dos: un CTA
  primario y una salida secundaria.
  **Y el candado no puede verlo:** `scripts/e2e/_verify-firstrun.mjs:102` («UNA sola acción») cuenta
  botones **solo dentro de `#cn-firstrun`**, y `:116-121` (D3) afirma *«el ánimo no compite el día 1,
  y el entreno SÍ está montado debajo»* midiendo `#cn-today-body.innerHTML.length > 200` — desde
  v447 eso lo satisface la tarjeta duplicada, no el entreno montado. Es el gotcha de v513 al pie de
  la letra: *un test que sigue en verde puede haber dejado de probar lo que dice*.
- **Intenté tumbarlo así:**
  1. *¿No será que el día 1 se salta la tarjeta de arranque?* Al revés: la condición
     `_heroOK = !_dia1 && …` la **garantiza** — el héroe se apaga justo porque manda el día 1, y lo
     que queda es la tarjeta.
  2. *¿Existía ya en julio?* No. `git log -S"_startCardHTML"` → **`e3f6580` (avi-v447)**, dentro de
     este delta. La portada es de v403. La duplicación nació al juntarlas y nadie la vio.
  3. *¿El scroll no cuenta como acción?* Cuenta como toque. Para alguien que nunca ha entrenado, un
     botón grande que solo mueve la pantalla y muestra **otra tarjeta que dice lo mismo** se lee
     como que la app no registró el toque.
- **A quién le pasa:** a todo el que abre la app por primera vez en un día con entreno — el 100% de
  las personas nuevas que sí llegan a ver su plan.
- **Costo del arreglo:** **~5 líneas y una decisión.** Lo barato y correcto: en día 1, `firstRunGo`
  llama a `expandTodayWorkout()` en vez de a `scrollIntoView` (el entreno se abre de una), y el
  cuerpo no pinta la tarjeta de arranque cuando `_dia1` es verdadero (`con.innerHTML=''`, igual que
  hace con el héroe). Quedan **una tarjeta y un toque**, que es lo que la variante C prometía.
  Y el candado que lo vigile tiene que contar los botones de **toda** la pantalla, no los de un
  contenedor.

---

### H4 · 🟠 «Tu coach la preparó para ti» — a 12 de 24 personas que no tienen coach

- **Qué pasa:** el saludo de bienvenida que se pinta en **cada entrada** (5,2 s a pantalla) afirma
  que la rutina de hoy la preparó el coach. No comprueba ni que exista un coach ni que la rutina la
  haya hecho un humano: para los auto-registrados la armó `_autoGenerateWeek`.
- **Dónde:** `app-4-entreno.js:151-172` `showClientWelcome`, línea **162**:
  ```js
  line=`Hoy te toca <b>${esc(rt.name||'entrenar')}</b>. Tu coach la preparó para ti.`;
  ```
  Llamada única en `app-4-entreno.js:139`, dentro de `initClientView`, sin ningún gate de tier.
- **Evidencia:** el hermano de al lado **sí** tiene el guard, y por eso julio retiró esa sospecha:
  `app-4-entreno.js:696-698` (`renderFirstRun`) calla la atribución cuando `getCoachName()` vale
  `'Mi Coach'`. Aquí no hay nada equivalente. Población sin acceso a coach según
  `clientHasCoach` (`avi-core.js:3316`, `tier` `'libre'` o `'app'` → false), contada sobre las 24
  filas reales: **4 en `libre`** (FELIPE, Daniel, Nicolás, maria rubio) **+ 8 en `app`** (Miguel,
  Natalia, Nataly, YEISON, Santiago, jose Daniel, Cristian, Chema) = **12**. A esas mismas 12
  personas la pestaña Mensajes les pinta un candado que dice *«Habla directo con un entrenador que
  te guía»* — o sea, **la app les vende el coach que el saludo acaba de decirles que ya tienen**.
- **Intenté tumbarlo así:**
  1. *¿No se lo salta el día 1?* El día 1 gana el onboarding (`shouldShowOnboarding`,
     `app-4-entreno.js:128-140`), así que el saludo aparece **del día 2 en adelante** — es decir, en
     cada visita del resto de su vida en la app.
  2. *¿No serán rutinas que el coach sí revisó?* Para los `libre` no hay coach en absoluto: es la
     definición del tier. Para los `app`, el producto mismo dice que no incluye coach — y por eso
     `chatDeliveryBlock` (v418) le avisa al coach de que sus mensajes no llegan.
  3. *¿Será un texto viejo que ya nadie ve?* Se pinta en `initClientView`, la ruta de arranque de
     todo asesorado.
- **A quién le pasa:** a 12 de 24, incluidas Nataly, Miguel, Natalia y YEISON, que sí entrenan.
- **Costo del arreglo:** **3 líneas.** Reusar el mismo criterio del hermano:
  `clientHasCoach(client) ? 'Tu coach la preparó para ti.' : 'La armamos con tu objetivo y tu
  nivel.'` — y de paso queda una sola definición de «¿tiene coach?» en toda la app.

---

### H5 · 🟠 El badge de mensajes llama a un candado — y el toque marca como leídos los 19 mensajes que nunca verá

- **Qué pasa:** carry-over de H1 de julio, **medio arreglado**. Lo que se arregló (v418) es el lado
  del coach: ahora ve un aviso de no-entrega. Lo del asesorado sigue igual, y tiene una vuelta de
  tuerca que julio no midió: la burbuja roja de la pestaña **no tiene gate de tier**, y al tocar la
  pestaña se ejecuta `markMsgsRead()` — así que el contador se apaga, la persona se queda con el
  candado, y **nunca se entera de que había mensajes**.
- **Dónde:**
  - `app-4-entreno.js:3257-3264` `updateMsgBadge` — cuenta `m.from==='coach'` sin mirar el tier.
  - `app-4-entreno.js:120` se llama en cada arranque de la vista del asesorado.
  - `index.html:828` la pestaña ejecuta `cnTab('cn-messages',this);markMsgsRead()`.
  - `app-4-entreno.js:3251-3255` `markMsgsRead` escribe `msg_read_<cid>` y quita el badge.
  - `app-4-entreno.js:3272-3277` el candado (`premiumLockHTML`), que es lo que se pinta debajo.
  - Lo que **sí** se arregló: `app-3-coach.js:2930-2938` (`chatDeliveryBlock`) le dice al coach
    *«…lo que escribas aquí se guarda, pero no le llega»* + botón «Activar Premium + Coach».
- **Evidencia (producción, hoy):**

  | nombre | tier | sesiones | msgs del coach | último del coach |
  |---|---|---|---|---|
  | Nataly | app | 24 | **9** | 2026-07-31 |
  | Cristian S. Luna | app | 0 | 1 | 2026-07-11 |
  | Miguel Pulido | app | 14 | 4 | 2026-05-29 |
  | Natalia Martinez | app | 18 | 5 | 2026-05-25 |

  **19 mensajes del coach que nadie puede leer.** Nataly es una de las personas más activas de la
  app. Los cuatro son de plan de pago.
- **Intenté tumbarlo así:**
  1. *¿El aviso de v418 no lo cierra?* Cierra el engaño al **coach** (y se nota: no hay ningún
     mensaje del coach a un tier `app` posterior al 31-jul, que es cuando entró el aviso). No
     devuelve los 19 que ya están escritos ni quita el badge que llama a la puerta cerrada.
  2. *¿Hay otra pantalla donde los lea?* `renderClientMsgs` sigue siendo el único renderizador del
     hilo (`app-4-entreno.js:3266`).
  3. *¿Se los lleva el push?* `sendCoachChatMsg` empuja el cuerpo, pero el toque de la notificación
     (`app-1-infra.js:752`) hace `cnTab('cn-messages',tab); markMsgsRead()` → **misma puerta, mismo
     candado, y encima marcado como leído**.
- **A quién le pasa:** a esas 4 personas hoy; a cualquiera a quien el coach le baje el plan mañana.
- **Costo del arreglo:** en orden de honestidad. (a) **1 línea**: gatear `updateMsgBadge` con
  `clientHasCoach` — dejar de llamar a alguien a una puerta cerrada. (b) **~10 líneas**: que el
  candado, si hay mensajes del coach, los muestre **encima** (leer sí, escribir no) — es lo que la
  persona ya pagó de hecho. (c) **decisión del PO**: hoy el producto cobra por un plan que esconde
  mensajes ya escritos por su entrenador.

---

### H6 · 🟠 Todo el registro termina en un toast de 2,5 segundos — y hay 5 cuentas varadas del otro lado de la puerta

- **Qué pasa:** después de 7 pasos de asistente, 3 casillas legales y una contraseña, si Supabase
  exige confirmar el correo el **único** acuse de recibo es un toast de 2,5 s. No hay pantalla, no
  se dice a qué correo se envió, no hay «reenviar» ni «cambiar correo». La persona se queda mirando
  el paso 7 con el botón «Crear cuenta y empezar →» **otra vez habilitado**; si vuelve a tocarlo lee
  *«Ya existe una cuenta con ese email. Inicia sesión.»*
- **Dónde:** `app-3-coach.js:1147-1151` (`if(!session){ … toast(…); return; }`) y
  `app-1-infra.js` (`function toast(msg,ms)` → `ms||2500`).
- **Evidencia:** cuentas en `auth.users` **sin fila en `user_data`** — personas que llegaron hasta
  «crear cuenta» y no existen para el coach:
  ```
  stevanwg@gmail.com              google  08-jun 20:17  entró 1 vez (al crearse)
  dramirezmontenegro1203@…        google  08-jun 20:32  entró 1 vez (al crearse)
  josegutierrezpe19@gmail.com     google  23-jun 08:56  entró 1 vez (al crearse)
  hernan8xd@gmail.com             google  06-jul 14:30  entró 1 vez (al crearse)
  pinzonedwin121@gmail.com        email   25-jul 13:59  NUNCA entró · correo SIN confirmar
  ```
  Julio contó 3; hoy son **5**. Claudia Valbuena **sí se rescató** (tiene fila y 35 sesiones — el
  pendiente «escribirle a Claudia» funcionó). En cambio `hernan8xd` es Hernán Camacho, que en julio
  **sí tenía fila** y de plan de pago: hoy su fila no existe y su cuenta auth sigue viva.
  `pinzonedwin121` lleva **4 semanas** parado exactamente en ese toast.
- **Intenté tumbarlo así:**
  1. *¿No lo cura solo el mecanismo de fantasmas?* El de Google existe y está bien pensado
     (`app-3-coach.js:585-594`, borrado en modo ghost), pero **solo se ejecuta si la persona vuelve
     a intentarlo**: el propio comentario dice *«self-healing al próximo intento»*. Los cinco tienen
     `last_sign_in_at == created_at`: **ninguno volvió**. Un auto-cura que necesita que el usuario
     regrese no cubre justo al que se fue.
  2. *¿Serán cuentas de QA?* No: son gmails de persona; la cuenta QA (`qa-harness@apex.com`) sí
     tiene su fila.
  3. *¿El toast dura más de lo que dice?* No: `ms||2500`, y no hay ningún llamador que le pase otro
     valor en esa rama.
- **A quién le pasa:** a Edwin (hoy mismo), y a cualquiera que se registre por correo. Los 4 de
  Google, además, quedan **bloqueados para siempre** para conectar ese Google a su cuenta real
  (`identity_already_exists`), según el propio comentario del código.
- **Costo del arreglo:** (a) **hoy, 0 código:** son 5 correos, el coach escribe. (b) **~40 líneas:**
  que el final del registro sea una **pantalla**, no un toast: «Te enviamos un correo a
  **edwin@…** — ábrelo y vuelve» con «Reenviar» y «Cambiar correo». Es el último escalón del embudo
  y hoy es el elemento más frágil de la interfaz. (c) **~20 líneas:** una fila «cuentas sin
  asesorado» en el panel del coach, para que dejen de ser invisibles.

---

### H7 · 🟡 «Regresa mañana listo para rendir» es falso todos los sábados, para las 24 personas

- **Qué pasa:** el banner de día de descanso promete que mañana hay entreno. Desde v514 **ningún
  plan tiene sábado ni domingo**, así que el sábado el «mañana» del texto es otro día vacío.
- **Dónde:** `app-4-entreno.js:968-971`:
  ```js
  const _sub=_festivoHoy ? '…esta sesión no cuenta como perdida. Nos vemos el próximo día de tu plan.'
    : 'El descanso es parte del entrenamiento. Hoy tu cuerpo repara y crece — regresa mañana listo para rendir.';
  ```
- **Evidencia:** las 24 filas de `user_data` tienen entre 1 y 5 días con rutina y **ninguna** en
  sábado o domingo (v515 lo dejó medido: «0 de 25 filas con entreno en fin de semana»). El banner
  del **festivo**, escrito tres líneas más arriba, ya lo resuelve bien: *«Nos vemos el próximo día
  de tu plan»* — no promete un día que no existe. El de descanso se quedó con la versión vieja.
  Para los planes de 2 días (Lu|Vi) falla además el martes y el miércoles.
- **Intenté tumbarlo así:** *¿alguna otra parte le dice cuál es su próximo día?* No. El banner solo
  ofrece «Ver todas mis rutinas →», que muestra la lista con su columna de día, pero no dice cuál
  sigue. `weeklyMissed` mira hacia atrás, no hacia adelante.
- **A quién le pasa:** a las 24, cada sábado. No rompe nada, pero es un rótulo que contradice los
  propios datos del plan — la clase que este proyecto ya pagó cuatro veces.
- **Costo del arreglo:** **~6 líneas.** El dato ya existe (`client.routines[].day` + `GEN_WEEK_DAYS`):
  «Tu próximo entreno es el **lunes**: Full Body A». Y de paso resuelve la mitad de H1.

---

### H8 · 🟡 El asistente ofrece 6 días por semana y el motor entrega 5

- **Qué pasa:** el paso 5 del registro pregunta «¿Cuántos días por semana?» con chips del 1 al 6.
  `generarRutinas` topa en 5 desde v514, porque el plan solo cae en días hábiles.
- **Dónde:** `index.html:249` (chip «6») y `index.html:184` (`<select id="su-days">` con la opción 6)
  contra `avi-core.js:121` `GEN_MAX_WORK_DAYS = 5` y `avi-core.js:1447`.
- **Evidencia:**
  ```
  pidió 4 → recibe 4 rutinas: Lunes|Martes|Jueves|Viernes
  pidió 5 → recibe 5 rutinas: Lunes|Martes|Miércoles|Jueves|Viernes
  pidió 6 → recibe 5 rutinas: Lunes|Martes|Miércoles|Jueves|Viernes
  ```
  (`generarRutinas` con el catálogo real, semilla fija). En producción **una sola persona** pidió 6:
  `Santiago Santos`, 5 rutinas, **0 sesiones**.
- **Intenté tumbarlo así:** *¿la app le promete el sexto día en algún sitio?* No — `planDays` prefiere
  las rutinas reales, y eso está bien resuelto y documentado. El defecto es que **se lo pregunta**:
  responder «6» y recibir 5 sin una palabra es la contradicción, aunque después nadie la repita.
- **A quién le pasa:** hoy a Santiago. Mañana a cualquiera que toque el 6.
- **Costo del arreglo:** **1 línea** (quitar el chip y la opción 6) o **2** si se prefiere dejarlo con
  una nota honesta («tu coach entrena de lunes a viernes»). Lo segundo es mejor producto: explica el
  porqué en vez de esconder la opción.

---

### H9 · 🟡 El gotcha de la racha en CLAUDE.md dice lo contrario que el código

- **Qué pasa:** `CLAUDE.md` (GOTCHAS VIGENTES, umbral de constancia) afirma: *«si el número además
  se MUESTRA («2 de 3 días esta semana»), la meta mostrada sigue siendo el plan aunque la racha use
  el umbral topado, o la interfaz miente sobre cuál es el plan»*. **Las dos superficies que lo
  muestran pintan el umbral topado**, no el plan.
- **Dónde:** `app-4-entreno.js:623` `weekStreak(…, streakTarget(client), …)` → `app-4-entreno.js:633`
  y `:639` pintan `ws.target`; `avi-core.js` `weekStreak` devuelve `target: tgt` (el topado) y
  `streakTarget = min(planDays, STREAK_WEEK_MIN_DAYS=2)`. Igual en la tarjeta de constancia,
  `app-4-entreno.js:2488-2507`.
- **Evidencia:** para alguien con plan de 5 días el chip del héroe dice **«N/2 esta semana»**.
- **Mi lectura, y por qué NO propongo tocar el código:** el 2 es **correcto** y encaja con el
  objetivo operativo medido (8 días entrenados en el primer mes ≈ 2 por semana). Lo que está mal es
  el gotcha: quien lo lea va a «arreglar» un número que hoy está bien. Es el mismo daño que hizo la
  nota vieja del `var()` en SVG, que llevó a marcar como defecto un `fill` correcto.
- **Costo del arreglo:** **corregir el párrafo de CLAUDE.md** (2 minutos) y, si el PO quiere, darle
  contexto al chip («2 de 2 para mantener la racha», ~1 línea) para que no se lea como si el plan
  fueran 2 días.

---

## Sospechas sin probar

1. **El navegador embebido de WhatsApp sigue sin detectarse.** Verifiqué que el código no cambió:
   `grep -n "FBAN|FBAV|Instagram|; wv|inAppBrowser"` sobre `app-6-extra.js` → **0 coincidencias**;
   `showInstallBtn` (`app-6-extra.js:103`) solo mira `standalone`. O sea, el defecto de H5 de julio
   sigue vivo: dentro de WhatsApp la app instruye «menú ⋮ → Instalar aplicación», que ahí no existe.
   Lo que **sigo sin poder probar es el volumen**: no hay telemetría de UA. *Faltaría* mandar el UA
   en un ping de arranque, o los logs de acceso de Pages.
2. **La primera pantalla de quien llega por el link del PO tiene una sola prueba.** `avi_showcase`
   tiene **1 fila** (publicada el 22-ago 18:49). El mecanismo de v523 funciona; con una sola tarjeta
   no puedo decir si convence. *Faltaría* medir registros con y sin tarjetas publicadas, y hoy n=1.
3. **Chema es el caso limpio del hueco del fin de semana, pero no puedo separar las causas.** Se fue
   a los 6 minutos: puede ser el banner de descanso (H1), puede ser que no instaló la app, puede ser
   que solo miraba. *Faltaría* instrumentación de sesión (`lastSetAt` / eventos de pantalla), que ya
   estaba pedida en julio y sigue sin existir.
4. **La sesión a medias sigue viviendo solo en `localStorage`** (`done_`/`log_`, fuera de `SB_KEYS`).
   Sospecho que cambiar de teléfono o limpiar la caché borra el entreno en curso; no lo probé con
   dos dispositivos.
5. **El estado vacío «Tu plan aún está en preparación»** (`app-4-entreno.js:944`) sigue mandando a
   Mensajes, que para un `libre`/`app` es el candado de H5. Hoy **no le pasa a nadie** (las 24 filas
   tienen al menos una rutina; Hernán, el caso de julio, ya no existe), así que no lo levanto a
   hallazgo — pero el texto y el botón siguen ahí para el próximo `_autoGenerateWeek` que falle en
   silencio.

---

## Lo que revisé y está SANO

- **H4 de julio (teléfono y lesiones en el registro) está EJECUTADO y bien hecho.** `index.html:295-308`
  añade WhatsApp y lesiones en el paso 6, **opcionales a propósito** y con la explicación al lado
  («tu coach lo usa para escribirte si algo no te llega a la app»). El único registro posterior que
  lo llenó, `maria rubio`, tiene teléfono normalizado. Chema lo dejó vacío — con n=2 no hay
  conclusión, pero la superficie ya existe y eso era el bloqueo.
- **El aviso de no-entrega al coach funciona y está bien escrito** (`app-3-coach.js:2930-2938`):
  nombre + plan + consecuencia + acción, con `textContent` para que el nombre no entre como HTML. Se
  nota en los datos: **cero** mensajes del coach a un tier `app` después del 31-jul.
- **El reparto de días ya no amontona.** `genWeekDays` usa los extremos de la franja: 3 días salen
  lunes-miércoles-viernes, no tres días seguidos. Verificado con la función pura sobre los 5 valores.
- **El festivo está bien resuelto y bien dicho.** Nombra el festivo (`nombreFestivoCO`) y **dice que
  no cuenta como perdida**, que es justo la duda de quien ve desaparecer su lunes de pierna. Entra
  por la misma puerta que el descanso, sin abrir un `return` nuevo. Es el modelo que le falta al
  banner de descanso (H7).
- **La limpieza de la portada del día 1 (v508) está donde debe.** `#cn-firstrun` se vacía **arriba**
  de los tres `return` (`app-4-entreno.js:902`); leí el orden y no hay ninguna salida por encima.
- **El tope de avisos (v505) aparta y no silencia**, y su texto es honesto: «Tienes N avisos más»,
  con `aria-expanded` y sin marcar nada como visto (`app-4-entreno.js:754-780`). El chequeo de
  presencia excluye lo que apagó el día 1, así que los dos mecanismos no se pisan.
- **La atribución del plan en la portada del día 1 sigue sin mentir** (`app-4-entreno.js:696-698`) —
  el guard de julio sigue puesto. El que falta es su hermano (H4).
- **`markMsgsRead` / reanudar sesión / la píldora «Instalar app»**: los tres mecanismos que julio dio
  por sanos siguen en pie (`checkAndResetSession` en `app-4-entreno.js:1741`, `pillStealsTap` en
  `app-6-extra.js:210-216`). No los re-medí en el aparato.
- **v526 (el campo del chat a 16 px) es del tipo de arreglo que sí mueve la fricción real**, y su
  candado se deriva de `index.html` en vez de una lista a mano. Nada que añadir.
- **El umbral de racha topado en 2 es correcto** aunque el gotcha diga lo contrario (H9): coincide
  con el objetivo operativo medido de 8 días en el primer mes.

---

## Lo que NO alcancé a revisar

- **No corrí ningún harness ni medí un solo píxel.** Todo lo de interfaz está leído del código que lo
  produce, con línea por afirmación, y todo lo de datos está medido con SQL contra producción. Lo que
  **faltaría comprobar en el aparato** y cambia el tamaño (no el signo) de H3: cuántos píxeles ocupa
  la duplicación del día 1 a 360 px, y si el CTA de la portada queda sobre el pliegue.
- **No revisé la experiencia del COACH** (su panel, su carga diaria, los reportes de v520/v521). Es
  área de negocio y producto.
- **No revisé Comunidad** ni el módulo de nutrición desde el lado de la fricción — el segundo es A4.
- **No medí el abandono a mitad de entreno** (H8 de julio). Sigue sin instrumentación: `lastSetAt`
  no existe. Lo que sí queda medido de paso aquí es que ahora **107 sesiones** tienen `startedAt` y
  `finishedAt` (julio contaba 34 de 169), así que la duración real ya es auditable — que era la mitad
  de lo que faltaba.
- **No abrí el contenido de los mensajes** entre coach y asesorados: conté cuántos hay y de quién.
- **El camino de quien entra por Google** (`ax_wz_pending`, la vuelta del OAuth) lo toqué solo por el
  lado de las cuentas varadas; no lo seguí punta a punta.
- **No verifiqué qué ve exactamente Chema hoy.** Su fila está en producción y su plan es Lu-Vi;
  deduje su día 1 del código y del calendario, no de una captura de su teléfono.
