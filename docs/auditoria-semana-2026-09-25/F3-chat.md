# F3 · el chat nuevo — Lucas Ortega (QA funcional) + Mateo Sanín (Data)

Medido por código (avi-core.js, app-1/2/3/4/6-*.js, index.html) + SQL de solo lectura contra
`eoebhrxbokyllqalyecj` (proyecto real) + funciones PURAS de `avi-core.js` cargadas en Node con los
datos reales de los 15 hilos. Sin navegador (regla de F3). HEAD verificado: `9dce945` (avi-v668),
limpio.

## Veredicto en una frase

El chat nuevo está bien construido en lo mecánico (eliminar, contexto, visto y las superficies de
texto pasan sus controles), pero tiene un hueco real en la cola de reintentos del coach (una
corrección puede quedar retenida en silencio, disparada por CUALQUIER escritura posterior a la
misma fila — el «visto» es la más frecuente) y un aviso de «esperando respuesta» que hoy no se
puede apagar sin escribir, aunque el mensaje que lo dispara no pida nada.

## Los 3 más grandes

### 1. La cola de reintentos del coach queda retenida por cualquier escritura posterior a la fila, no solo por la que falló — «visto» es el disparador más común
- **Qué es:** `coachQueueCanReplay(entry, rowUpdatedAt)` (avi-core.js :11048-11067) decide si una
  escritura pendiente del coach se puede reenviar comparando el `updated_at` ACTUAL de la fila del
  asesorado contra `entry.ts` (el momento en que falló). Pero `UD.updateClientRow` (app-1-infra.js
  :652-659) estampa `updated_at:new Date().toISOString()` en CADA `update()`, sin importar qué
  columna se está escribiendo — es un timestamp de FILA, no de columna. Y `markCoachRead` (app-3
  -coach.js :3998-4011) escribe `c.coachReadAt` y llama `sv('ax_c',DB.clients)`, que para el coach
  cae en `_persistCoachWrite('ax_c',...)` (app-1-infra.js :1536-1589) — la MISMA fila.
- **A quién le pasa HOY:** no se pudo confirmar una víctima ACTUAL — la cola (`_cwq`) vive en
  `localStorage` del navegador del coach (`ax_cwq_<uid>`), invisible por SQL. El mecanismo es
  determinista y reproducible: cualquier coach que (a) edite algo de un asesorado sin señal
  (récord, peso, medida, nutrición, historial — todo lo que NO es `ax_c` ni `msgs`), (b) recupere
  señal, y (c) haga CUALQUIER otra escritura exitosa sobre la MISMA fila (abrir su chat y que
  `markCoachRead` estampe «visto» es la más natural, pero también sirve editar su ficha) — pierde
  la posibilidad de que su corrección se reintente sola.
- **Evidencia:** avi-core.js :11048-11067 (`coachQueueCanReplay`), :11086-11098
  (`coachQueueVerdict`); app-1-infra.js :652-659 (`updateClientRow` siempre estampa `updated_at`),
  :1565-1588 (el bucle de `_persistCoachWrite` para `ax_c`); app-3-coach.js :3998-4011
  (`markCoachRead`). Control ejecutado en Node con `avi-core.js` real:
  ```
  A) fila sin tocar tras el fallo -> coachQueueVerdict = "subir" (correcto)
  B) fila tocada por "visto" (otra columna) -> coachQueueVerdict = "retener"
  cs:* y msgs -> siempre "true" (exentos, por diseño correcto)
  prs (misma fila tocada después) -> coachQueueCanReplay = false
  ```
- **Cómo intenté tumbarlo:** revisé si `markCoachRead` toca la MISMA columna que la corrección en
  cola (en ese caso `_persistCoachWrite` la re-escribe con el edit todavía en memoria y sí la
  resuelve — probado también). El hueco es específico a columnas DISTINTAS de `ax_c`/`msgs` (`prs`,
  `history`, `bodyweight`, `medidas`, `nutrition`, `photos`), que son exactamente las que NO están
  exentas en `coachQueueCanReplay`. Confirmé que `msgs` y `cs:*` SÍ están exentas a propósito (v625,
  v616) — la exención de `cs:*` incluso documenta el MISMO síntoma con otro ajuste («el `updated_at`
  del coach se mueve con TODO lo suyo — marcar un chat leído ya lo mueve») pero esa exención NO se
  extendió a `prs`/`history`/etc.
- **Qué costaría arreglarlo:** no comparar contra el `updated_at` de FILA para columnas que no sean
  la que está en juego — o guardar un `updated_at` por columna (más caro), o, más barato, que
  `_flushCoachWrites` lea el VALOR de la columna en disputa (ya lo hace, `coachQueueSameAsCloud`) y
  solo entre en «retener» si el valor de la nube CAMBIÓ respecto al que se leyó al fallar — hoy solo
  hace esa comparación de contenido para decidir «igual», no para relajar el criterio de tiempo.

### 2. «Esperando respuesta» no tiene ninguna forma de apagarse sin escribir
- **Qué es:** `renderAwaitCard()` (app-3-coach.js :4015-4029) es la ÚNICA función que toca `h-await`
  (grep confirmado en app-3-coach.js, index.html y avi-core.js). No existe mute, «×», ni «descartar»
  para esta tarjeta — a diferencia de `coachPulse`/`coachInsight`, que sí tienen «Entendido»/mute por
  tipo. La única forma de que una persona SALGA de la lista sin que el coach le escriba es tocar
  «Eliminar la conversación» (`coachChatAskDelete`, app-3-coach.js :4072-4094), que reasigna
  `ax_msgclear` hasta el último mensaje visible — `chatAwaiting` filtra con `msgsVisible` y esa
  persona deja de tener mensajes visibles, así que sale del aviso. Pero eso es una acción MUCHO más
  grande (esconde toda la conversación) y no se presenta como un «descartar este aviso».
- **A quién le pasa HOY:** corrí `chatAwaiting(clients, msgsById, coachClears, now, 24)` (la función
  REAL) sobre los 15 hilos reales (SQL, 25-sep-2026 ~12:11 UTC). Sale **1 persona: Claudia
  Valbuena**, esperando desde `2026-09-24T12:06:31.779Z` (24 h), 2 mensajes sin responder. Su
  último mensaje visible es **"💪 ¡Entrenamiento hecho!"** — uno de los 4 botones de respuesta
  rápida (`index.html` :799-802), que no pide nada (junto con "🙏 ¡Gracias, coach!"; los otros 2,
  "🙋 Tengo una duda" y "🤕 Algo me dolió", sí piden algo). Diana Pilar Rodriguez Salazar está a
  **1 minuto** de entrar también (su último mensaje, "Buen día bien", es de hace 23h 59min).
- **Evidencia:** avi-core.js :2537-2561 (`chatAwaiting`, con el comentario propio: «incluye los
  avisos automáticos de dolor: también piden respuesta» — es decir, el diseño NO distingue tipos de
  mensaje, cualquier `from==='client'` cuenta); index.html :799-802 (los 4 botones); salida real del
  script (arriba).
- **Cómo intenté tumbarlo:** revisé si existe algún mecanismo de silencio específico buscando
  «awaitmute»/patrones similares a `coachpulse_<cid>_<type>` — no existe ninguno. Revisé si el
  propio diseño ya previno el caso (documentado: sí sabe que un aviso automático de dolor cuenta, a
  propósito) — pero el caso de un «gracias»/«listo» NO está mencionado en ningún comentario del
  código, así que no parece una decisión consciente. Con N=1 hoy no puedo decir «esto pasa seguido»,
  pero la MECÁNICA (2 de 4 respuestas rápidas no piden nada y aun así cuentan) es estructural, no
  un accidente de hoy.
- **Qué costaría arreglarlo:** barato — un botón «Ya vi esto» tipo `coachpulse_<cid>` que silencie
  esa entrada N días sin tocar `ax_msgclear` (para no esconder el hilo completo), reusando el patrón
  ya existente en `coachInsight`/`coachPulse`.

### 3. Fotos y videos no tienen la misma honestidad que los mensajes de texto (v588 solo cubrió texto)
- **Qué es:** `sendCoachChatMsg` (app-3-coach.js :4169-4190) trackea `_cchatSending[date]` y, si
  `svNow('ax_m',...)` falla, revisa `_cwqHasMsg` y muestra "📴 Sin conexión: guardé el mensaje..."
  en vez de "Mensaje enviado" — y pinta "⚠️ sin enviar" junto al mensaje en el hilo (v588, la
  corrección de exactamente este defecto para texto). `coachSendMedia` (app-3-coach.js :4193-4211) y
  `clientSendMedia` (app-4-entreno.js :4422-4440) NO tienen ese seguimiento: tras `await
  _chatMediaUpload(...)` exitoso, empujan el mensaje, llaman `svNow('ax_m',DB.msgs)` SIN comprobar
  el resultado (`clientSendMedia` ni siquiera lleva `await`), y ACTO SEGUIDO —pase lo que pase con
  la escritura— disparan `pushToClient(...)` («Te mandó una foto/video») y el toast de éxito
  («Foto enviada»/«Video enviada»).
- **A quién le pasa HOY:** no hay forma de medirlo por SQL (depende de que la señal caiga en el
  instante exacto entre el fin de la subida y el guardado del mensaje — ventana de milisegundos).
  Es un hueco de CÓDIGO, no un hecho observado hoy. El archivo SÍ llega al bucket primero siempre
  (confirmado: si `_chatMediaUpload` falla, la función corta con `return` ANTES de crear el mensaje
  — no hay riesgo de mensaje sin archivo). Verifiqué el estado real de `chat-media`: **1 objeto**
  (`78ea069c…/chat-mubm8k2wnyxgfb1hvjh.jpg`, 90.264 B, creado 21-sep 19:06:00 UTC) que **coincide
  exactamente** con el único mensaje con `media` en los 15 hilos (Natalia Martinez, coach envía foto,
  19:05:59.509Z) — hoy no hay huérfanos, ni mensajes sin archivo.
- **Evidencia:** app-3-coach.js :4164-4189 (patrón correcto, texto) vs :4193-4211 (sin ese patrón,
  foto); app-4-entreno.js :4422-4440 (mismo hueco, cliente); SQL `storage.objects` (arriba).
- **Cómo intenté tumbarlo:** revisé si la escritura fallida al menos queda en la cola (`_cwq`) para
  no perderse — SÍ: `svNow('ax_m',...)` para el coach cae en `_persistCoachWrite`, que en caso de
  fallo hace `_cwqAdd('msgs',id,slice)` (app-1-infra.js :1619-1620), y `msgs` está EXENTO del
  hallazgo #1 (`coachQueueCanReplay` siempre deja reenviar `msgs`). Así que el dato NO se pierde
  para siempre — pero la UI en el momento MIENTE (dice «enviada», el otro lado recibe un push de
  algo que su app todavía no tiene), y si el coach alguna vez «descarta» una entrada `msgs` retenida
  pensando que está atascada, ESE archivo sí queda huérfano para siempre (nadie más lo borra salvo
  `delete-account`, fuera del alcance de F3).
- **Qué costaría arreglarlo:** reusar exactamente el patrón de `sendCoachChatMsg`
  (`_cchatSending`/`_cwqHasMsg`) en `coachSendMedia` y su equivalente en `clientSendMedia` — es
  código ya escrito, se trata de aplicarlo.

## Todos los hallazgos

| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🔴 | Cola de reintentos retenida por cualquier escritura posterior a la fila (no solo la que falló) | avi-core.js :11048-11067, app-1-infra.js :652-659, :1565-1588 | No medible (estado local del coach) |
| 🟡 | `h-await` no se puede silenciar sin escribir ni sin borrar la conversación entera | app-3-coach.js :4015-4029 | Sí — Claudia Valbuena hoy, N=1 |
| 🟡 | Fotos/videos sin marcador «pendiente»/«sin enviar» (v588 solo cubrió texto) | app-3-coach.js :4193-4211, app-4-entreno.js :4422-4440 | No observado hoy (0 huérfanos); riesgo de código |
| 🟡 | Solo 1 de 4 generadores de mensajes automáticos marca `system:true`; el campo no lo lee NINGUNA función de la app (es solo forense/para análisis) | app-4-entreno.js :1495 (sí) vs app-6-extra.js ~:530-534, app-3-coach.js :416-418/:439-441 (no) | No observado hoy en los 15 hilos (los 5 automáticos presentes sí están bien marcados); riesgo para análisis futuros |
| 🟢 | `_pollAuthCoach`/`_pollAuthClient` notifican sobre mensajes RAW (no filtrados por `_coachMsgs`/`_clientMsgs`) — en teoría un mensaje viejo que llega tarde por sync podría notificar algo ya «visto» en otro aparato | app-1-infra.js :1118-1167 | No medido, hipotético, baja probabilidad |
| ⚪ | `pollMessages` (legacy, blob `apex_data`) sigue leyendo `DB.msgs` crudo, pero es código MUERTO en producción (gated por `if(AUTH_MODE)return _pollAuthData();`, y AUTH_MODE es v2.0+ siempre true) | app-1-infra.js :967-1054 | Ninguna — inalcanzable |

## Respuesta a las preguntas del orquestador

**1. Eliminar la conversación — ¿lectores crudos?** **FALSA** (no queda ninguno sin razón). Barrí
TODOS los usos de `DB.msgs`/`msgs` en los 7 módulos (índice completo abajo). Filtrados via
`_coachMsgs`/`_clientMsgs`/`msgsVisible`: bandeja (`renderMsgs`, contador no-leídos incluido),
vista previa de la ficha (`renderDetailMsgs`), orden por atención (`renderClients` arma `_optsById`
con `_coachMsgs`), `chatAwaiting`/`h-await` (filtra internamente con la marca de cada lado), chat
completo de ambos lados. Crudos CON razón documentada: `_sinConversar` (app-3-coach.js :3966-3968,
comentario explícito: mira el hilo entero porque «eliminar» no significa «nunca hablamos»);
`exportData`/`importData` (app-4-entreno.js :4530-4589, backup completo, por diseño). Crudos SIN
comentario pero sin efecto dañino: `coachReadShouldStamp` dentro de `markCoachRead` (mira mensajes
NUEVOS relativos a una fecha, no expone contenido viejo); `_pollAuthCoach`/`_pollAuthClient` (detectan
DELTA vía merge, no re-muestran lo ya-visto — ver hallazgo 🟢 arriba). No hay «reportes del coach»
ni «búsqueda» que toquen mensajes (grep sin resultados para ambos).

**2. «Esperando respuesta» (h-await).**
(a) **CIERTA con matices** — corrido HOY con la función real sobre los 15 hilos reales: sale 1
persona (Claudia Valbuena, desde 2026-09-24T12:06:31Z, 24h, 2 msgs). Ver hallazgo #2 para el detalle.
(b) **CIERTA** — un «gracias»/«listo» SÍ deja a la persona esperando (el código no distingue tipos de
mensaje) y el coach NO puede apagar el aviso sin escribir (solo existe «Eliminar conversación», una
acción mucho más grande). De los 4 mensajes de respuesta rápida, 2 no piden nada («💪 Entrenamiento
hecho», «🙏 Gracias»); el caso de hoy (Claudia) es exactamente ese tipo.
(c) **CIERTA** — los `system:true` entran igual que cualquier mensaje humano (el código no filtra
por esa marca en `chatAwaiting`), que es lo correcto por diseño (comentario explícito: «los avisos
automáticos de dolor también piden respuesta»). Pero ver el hallazgo 🟡 de abajo: solo 1 de 4
generadores de mensajes automáticos usa esa marca.

**3. «Visto» contra la cola del coach.** **CIERTA** — ver hallazgo #1 completo arriba. Confirmado
por código + control ejecutado en Node contra las funciones reales de `avi-core.js`.

**4. «Visto» contra el merge de tres vías.** **FALSA en el caso común, con una salvedad
preexistente no específica de «visto».** `markCoachRead` → `sv('ax_c',...)` → `_persistCoachWrite`
SÍ pasa por `mergeOwnRow3`/`mergeProfile3` (app-1-infra.js :1565-1588; avi-core.js :2772-2793) — NO
reemplaza la columna a ciegas. Probé `mergeProfile3` con datos sintéticos (base sin tocar,
`coachReadAt` tocado solo por el coach, un hábito de agua tocado solo por el asesorado en la nube):
el resultado conserva LAS DOS cosas — `{"habits":{"water":{"2026-09-25":4}}, "coachReadAt":"..."}`
— confirmado. La salvedad: si NO existe base (`_coachSnap`) o la LECTURA de la nube falla justo en
ese instante, `_persistCoachWrite` cae al `else` (app-1-infra.js :1581-1584) y escribe el perfil
LOCAL crudo (solo con las lápidas de récords fusionadas) — esto SÍ podría pisar un hábito/dolor
recién escrito por el asesorado. Pero es un comportamiento de TODA escritura `ax_c` del coach
(editar cualquier campo de la ficha tiene el mismo riesgo en ese mismo escenario degradado), no algo
que «visto» introduzca de nuevo — no lo cuento como hallazgo propio de esta área.

**5. Fotos y videos.**
(a) **CIERTA (archivo sin mensaje es posible; mensaje sin archivo, no).** Ver hallazgo #3. Si la
subida falla, no se crea mensaje (bien guardado). Si la subida tiene éxito y el guardado del
mensaje falla después, el archivo se sube igual y el mensaje queda en cola (v588) — no se pierde,
pero la UI no lo dice y si se descarta manualmente, sí queda huérfano.
(b) **CIERTA** — ningún texto en `coachChatAskDelete`/`clientChatAskDelete` (app-3-coach.js
:4072-4094, app-4-entreno.js :4329-4344) menciona que el ARCHIVO sigue en el bucket. Solo dicen que
«la otra persona conserva su copia» (del chat), no que las fotos/videos ya enviados siguen
guardados aunque el hilo se «elimine». Coincide con el hallazgo del auditor F2. **Corroborado por
código (dato nuevo de F2, confirmado sin navegador):** grepeé toda mención a «privad/firmad/vence»
cerca de foto/video/chat en los 4 archivos relevantes — las ÚNICAS apariciones son comentarios de
código (app-1-infra.js :271, :277-279; app-3-coach.js :792, :1306, :1865; app-4-entreno.js
:2738-2944), NINGUNA vive dentro de un `toast(...)`, `textContent=` o `innerHTML=` que la persona
vaya a leer. Ni `chatMediaNode` (los toasts «Cargando foto…»/«Subiendo foto…»/«No se pudo cargar»)
ni `_chatPrepMedia` dicen quién puede verla ni que el enlace vence en 1 hora. Confirma la observación
de F2 desde el lado del código: la app SABE que es privada y temporal (el diseño es correcto, ver
«Lo que verifiqué y está SANO») pero nunca se lo dice a quien envía o recibe.
(c) **FALSA (no hay botón muerto)** — el botón de cámara del asesorado vive DENTRO de
`#cn-msg-composer` (index.html :804-805), que se oculta completo (`style.display='none'`) en
`_vista!=='open'` (archive y lock, app-4-entreno.js :4354-4356). No hay estado intermedio con el
botón visible pero inerte. Del lado del coach el botón siempre está activo (correcto: su capacidad
de escribir nunca se gatea, solo se avisa si no llega — `chatDeliveryBlock`).
(d) **CIERTA** — `pushToClient('_coach',...)`/`pushToClient(id,...)` con título «💬 [Nombre] te
escribió» y cuerpo «Te mandó una foto»/«Te mandó un video» (app-3-coach.js :4208, app-4-entreno.js
:4438). No revela el contenido de la imagen.

**6. Contexto del entreno (chatMsgContext).** **CIERTA, verificada con controles.** Selecciona por
FECHA (año/mes/día LOCAL), nunca por posición (avi-core.js :2507-2529). Con dos sesiones el mismo
día, toma la MÁS RECIENTE (probado: sesión de las 19:00 gana sobre la de las 13:00). Pasada la
medianoche, una sesión de las 23:50 de ayer con «ahora» a las 00:10 de hoy devuelve `null` (sin
contexto) en vez de mostrar el día equivocado — comportamiento correcto y documentado
(«sin sesión de hoy devuelve null: un contexto de otro día confundiría más que no tenerlo»).
Ejecutado en Node contra la función real, dos casos de control, los dos pasan.

**7. Con datos (lado Mateo).** **NO SE PUDO MEDIR — N insuficiente y confundido.** Desde que existe
`h-await` (v647, 21-sep) hasta hoy (25-sep) hay solo 4 días. De los 153 mensajes totales, 54 caen en
esa ventana, pero forman apenas **4 situaciones independientes**: 10 de los 13 pares
pregunta-respuesta que caen en esa ventana son de UNA SOLA conversación en vivo (Laura Ramirez
Rueda, 21-sep, chat mientras los dos estaban en el gimnasio a la vez — tiempos de 0.0 a 1.6 h,
evidentemente presencial y no comparable). Los otros 3 casos: Danilo (1.5h), Laura otra vez (24.4h,
el caso que factualmente `h-await` habría mostrado), Claudia (0.2h). Mediana histórica (antes del
21-sep, N=26 rachas): 4.6h. No hay forma honesta de separar «mejoró la respuesta por `h-await`» de
«el coach tuvo una conversación en vivo con Laura ese día» — y con N=4 situaciones reales, cualquier
conclusión de tendencia sería inventada. Dato adicional: el racimo de «Buenos días !!» que 6
personas recibieron el 24-sep entre 12:04 y 12:21 (Laura, Astrid, Kathe, Estella, Diana, Claudia)
parece una ronda MANUAL del coach saludando a varios a la vez, no una reacción dirigida por
`h-await` a un caso puntual.

**8. Lo que se pinta (textContent).** **CIERTA — verificado en las superficies pedidas, ninguna
usa innerHTML crudo con texto de mensaje.** Bandeja (`renderMsgs`, app-3-coach.js :3951): usa
`esc()` dentro de `innerHTML` (correcto, escapado). Vista previa de la ficha (`renderDetailMsgs`
:3922): `textContent`. Chat completo coach (`renderCoachChatThread` :4150) y asesorado
(`_paintMsgThread`, app-4-entreno.js :4398): `textContent` en ambos. Contexto del entreno
(`chatCtxNode`, app-1-infra.js :417-427): `textContent` en las 3 piezas (cabecera, series, cada
línea de ejercicio) — con comentario explícito «Todo por textContent: el nombre de un ejercicio lo
teclea alguien». Aviso `h-await` (`renderAwaitCard` :4023-4026): usa `esc()` en `innerHTML` para el
NOMBRE (no pinta texto de mensaje ahí, solo nombre + tiempo de espera). Push
(`notifNewMessage`/`showAviNotif`, app-1-infra.js): pasa el texto como `body` a la Notification API
del navegador, que NO interpreta HTML — no aplica el riesgo. `esc()` (app-2-login.js :87) es una
función real de escape (`&`,`<`,`>`, etc.), no un no-op.

## Lo que verifiqué y está SANO (con números)

- **153 mensajes / 15 hilos reproducidos exactamente** desde SQL: 68 humanos de asesorado + 80 del
  coach + 5 `system:true` = 153. 1 con `media`, 1 con `ctx`. Coincide al dígito con el baseline.
- **0 lectores del chat sin filtrar y sin razón** — ver pregunta 1.
- **0 objetos huérfanos en `chat-media` hoy** — 1 objeto en el bucket, coincide exactamente con el
  único mensaje con `media` en los 15 hilos (mismo path, mismo minuto).
- **`chatMsgContext` pasa sus 2 controles** (selección por fecha con 2 sesiones el mismo día; no
  invade el día siguiente cruzando medianoche).
- **`mergeProfile3` pasa su control de discriminación**: con base/local/cloud sintéticos donde cada
  lado tocó una clave distinta, el resultado conserva las dos.
- **El botón de cámara del asesorado se oculta correctamente** en `archive`/`lock` (no queda
  «botón muerto»).
- **El push de foto/video dice lo correcto** sin revelar contenido.
- Coach clear (`coach_settings.mc`, 1 clave: Laura) y client clear (`profile.chatClearedAt`, 1
  persona: Laura) coexisten en el MISMO hilo, en fechas distintas (17:02 vs 17:38 del 21-sep) — es
  el caso real donde el propio coach y la propia Laura probaron la función el mismo día; los
  mensajes POSTERIORES a cada marca (23-sep y 24-sep) siguen visibles para ambos, confirmando que
  la marca no sobre-oculta.

## Sospechas sin medir

- `_pollAuthCoach`/`_pollAuthClient` (app-1-infra.js :1063-1167) notifican sobre mensajes detectados
  por MERGE contra el crudo de la nube, sin pasar por `_coachMsgs`/`_clientMsgs`. En el caso normal
  esto es correcto (son mensajes genuinamente NUEVOS). Sospecho —sin poder probarlo sin dos
  dispositivos reales— que si un mensaje VIEJO (anterior a la marca de «eliminar» de ESTE
  dispositivo) llega tarde por una fusión rezagada desde OTRO dispositivo del coach, podría disparar
  una notificación sobre contenido que este dispositivo ya consideraba «eliminado». Severidad baja
  (un solo coach, un solo navegador la mayoría del tiempo).
- No verifiqué si `_flushCoachWrites` corre en algún punto adicional al `online` event (aparte de
  las 2 llamadas explícitas que sí encontré en el arranque, app-3-coach.js :1072 y :1116) — si el
  coach nunca dispara esos 2 caminos ni un `online` real (señal flaky que nunca pasa por «offline»
  del navegador), una entrada podría quedar sin reintentar automáticamente por más tiempo del que
  documenté. No cambia el hallazgo #1 (que es sobre RETENCIÓN, no sobre falta de reintento).

## Qué NO miré y por qué

- **No usé el navegador** (regla de F3): no vi la PANTALLA real del hilo con foto/video. Sí grepeé
  el CÓDIGO completo de esa superficie (`chatMediaNode`, `_chatPrepMedia`, los toasts de subida) y
  confirmé por esa vía que ningún texto visible menciona privacidad/retención (ver pregunta 5b) —
  corrobora lo que reportó F2, pero un grep no ve lo que un CSS pueda estar mostrando por fuera del
  string literal (p.ej. un ícono de candado sin texto); eso solo lo ve el navegador, que es de F1.
- **No medí el bucket `chat-media` más allá de hoy** (solo 1 objeto existe; no hay serie histórica
  de huérfanos para contar).
- **No profundicé en `send-push` (la edge function)** — el contenido que le llega ya sale sano del
  lado de la app (textContent/Notification API); no repetí el trabajo de auditorías de seguridad
  anteriores sobre esa función.
- **No medí cuántas veces en TODA la historia un mensaje de respuesta rápida sin pedir nada quedó
  «esperando» más de 24h** — solo pude correr `chatAwaiting` sobre el estado de HOY (es una función
  del momento, no un histórico); una serie histórica exigiría re-simular el estado de `ax_msgclear`
  día por día, que no está guardado con versión.
- **No verifiqué `_selfRegLimAlert`/`_selfRegMinorAlert`/`painSubmit` contra una persona real que
  los haya disparado** (ninguno de los 15 hilos de hoy los contiene) — el hallazgo sobre `system:true`
  es de código, no de un caso observado.
