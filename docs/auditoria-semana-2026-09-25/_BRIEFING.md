# BRIEFING COMÚN — auditoría «LO CONSTRUIDO ESTA SEMANA» (2026-09-25)

Lee este archivo completo antes de hacer nada. Aplica a las 3 áreas (F1, F2, F3).

El encargo del PO se juzga con el criterio de las once rondas anteriores: **«auditorías serias,
nada genérico»**. Ver «Qué es un hallazgo serio». Un informe lleno de buenas prácticas genéricas se
considera FALLIDO aunque esté bien escrito.

---

## Por qué existe esta ronda

Las once rondas anteriores auditaron código de hasta el 20-sep. **Entre el 21 y el 23-sep salieron
24 versiones (v645 → v668) que nadie ha revisado con ojos independientes**, y tocan justo las tres
superficies donde un defecto duele más:

- **La mudanza a `app.avientrena.com`** (v657-v665): toca el teléfono de TODAS las personas, y la
  sesión viaja de un dominio a otro dentro de la dirección.
- **Las fotos privadas y lo que sale de la app** (v649-v652, v659-v667): fotos del cuerpo de gente
  real —a veces menores— y tres imágenes que se comparten a WhatsApp con la foto de la persona.
- **El chat nuevo** (v645-v649): eliminar la conversación, «esperando respuesta», «visto», fotos y
  videos. Es el canal por el que el coach se entera de un dolor.

**No hay incendio:** desde el 22-sep la app registró 7 errores y los 7 son de la misma clase ya
conocida (el service worker que no logra actualizarse). Esto es prevención, no bomberos. Por eso
mismo, un hallazgo sin víctima medida vale poco aquí.

| Área | Qué cubre | Quién |
|---|---|---|
| **F1** | **La mudanza y las dos direcciones**: el salto de `kronos-apex.github.io/apex-app/` a `app.avientrena.com`, qué viaja y qué se queda, la sesión en la dirección, el service worker en los dos orígenes, los avisos (push) por dominio, el iPhone instalado que NO salta, el CORS de las edge functions y el despliegue en dos sitios. | Samuel (Android/PWA/TWA) + Tomás (iOS/Safari) |
| **F2** | **Fotos privadas y lo que sale de la app**: los buckets y sus políticas, los enlaces firmados, qué pasa con las fotos al borrar una cuenta, las 3 imágenes compartibles con foto, el candado de menores en todo lo que sale, la vitrina pública y las capturas de la web. | Andrés Q. (DBA/Storage/RLS) + Sofía Castaño (CS: qué entiende la persona) |
| **F3** | **El chat nuevo**: eliminar la conversación (una marca por lado), «esperando respuesta» (`h-await`), «visto», respuestas guardadas, contexto del entreno y fotos/videos, contra las conversaciones REALES. | Lucas Ortega (QA funcional) + Mateo Sanín (Data) |

---

## El producto

AVI es una PWA de entrenamiento (vanilla JS, sin framework, sin build, un solo `index.html` + 7
módulos `app-*.js` + `avi-core.js` + `sw.js`) de **Camilo Andrés** («Andrés Martínez» en público),
entrenador personal independiente en Guaduas, Cundinamarca. Backend Supabase (proyecto
**`eoebhrxbokyllqalyecj`**; el otro, `yndpryhirbhlhlkmxyyv`, NO es este producto).

**Desde el 23-sep la app vive en DOS direcciones a la vez:** `https://kronos-apex.github.io/apex-app/`
(GitHub Pages, la de siempre) y `https://app.avientrena.com/` (proyecto Vercel `avi-app`, servido
aparte a propósito: si github.io redirigiera, un teléfono sin actualizar vería pantalla de error).
Un teléfono actualizado que abre github.io SALTA solo al hogar nuevo llevándose la sesión; los
rezagados siguen funcionando en github.io. La web de venta es OTRO proyecto (`avientrena.com`,
Next.js en `Desktop/AVI/avi-web`).

**Arquitectura que hay que tener en la cabeza:** es *offline-first*. `localStorage` es la fuente de
verdad y sincroniza HACIA Supabase; el teléfono PISA al servidor. **Y `localStorage` es POR ORIGEN**:
lo que vive en github.io no existe en `app.avientrena.com` salvo que la mudanza lo lleve. Eso es
central en F1.

**El problema del negocio es la ADOPCIÓN.** Un hallazgo que devuelva a alguien que dejó de entrenar,
o que le ahorre al coach una tarea que hoy hace a mano, vale más que uno elegante que no mueva a
nadie.

---

## MAPA DE LA SUPERFICIE (verificado contra HEAD hoy — nombres verbatim)

### F1 · La mudanza
- `app-1-infra.js`: `AVI_OLD_HOSTS` :23 · `_aviMudanza()` :73 (el salto, sale de github.io) ·
  `_aviLlegada()` :98 (la llegada al hogar nuevo, lee la sesión del `#`) · `subscribePush(...)` :696
  (retira el endpoint viejo del mismo aparato **después** de guardar el nuevo; policy `push_del_own`,
  migración `supabase/migrations/20260923_push_del_own.sql`).
- `avi-core.js`: `mudanzaKeyAllowed(k)` :11553 · `mudanzaPick(entries)` :11556 (qué viaja: lo
  imprescindible del entreno en curso ENTERO o no se muda; lo opcional hasta el tope; los respaldos
  que la nube ya tiene, nunca) · `mudanzaQueuePending(entries)` :11579 (la cola del coach sin subir
  FRENA el salto) · `pushLostReminder(perm, hadEndpoint, snoozeTs, now)` :3981 (v665: a quien se
  mudó y perdió sus avisos, `#cn-push-moved`).
- `sw.js`: :103 `net.redirected` → `Response.redirect` (sin esto, un teléfono instalado vería
  `chrome-error://` el día que el origen viejo redirija).
- Despliegue del hogar nuevo: `scripts/publicar-hogar.mjs` (publica la señal SIEMPRE; apagar =
  `--sin-mudanza`) y `scripts/hogar-vercel.json` (`media/` —115 MB— NO se sube: se REENVÍA a
  github.io). La señal: `https://app.avientrena.com/mudanza.json`.
- Edge functions con `conCors` (los dos orígenes): las 6 de `supabase/functions/`.
- Harnesses que ya existen (no los repitas: busca lo que NO cubren): `_verify-mudanza` (21/21,
  local y sellado), `_verify-mudanza-instalada` (3/3), `_prodcheck-mudanza` (6/6, solo LEE
  producción), `_verify-avisos-mudanza` (13/13), `_sabotaje-v662` (22/22), `_sabotaje-v663` (6/6).

### F2 · Fotos privadas y lo que sale de la app
- `app-5-salud.js`: `saveProgressPhoto(clientId,base64,label)` :1459 (la ÚNICA puerta para guardar
  una foto de progreso) · `migrateProgressPhotosPrivate()` :1487 (auto-cura en el teléfono del
  dueño: base64 o enlace público → bucket privado).
- `app-1-infra.js`: `avatarUrlFor(c)` :405 (resolvedor ÚNICO de la foto de perfil, firma el enlace
  para las seis superficies) · `shareCanvasImage(cv,nombre,titulo,textoGuardada)` :363 (puerta
  única de «Compartir») · los helpers del chat `_chatMediaToken` :273, `_chatMediaUpload` :280,
  `_chatMediaUrl` :290, `chatMediaNode` :309.
- Las 3 imágenes que se comparten: la de logro (modelo G, v661), la del cierre del entreno
  (`_wfPrepShareCanvas(c)` app-4 :2940, v664) y la de progreso que arma el COACH
  (`_storyDrawG(x,d,foto)` app-3 :2126, v667). Con foto de perfil las tres son la FOTO a sangre.
- `avi-core.js`: `clientProgressStory(client, sessions, now)` :11261 (candado de menores:
  `{razon:'menor'}`) · `sessionShareData(session, client)` :6191 (v624) · `shareSiteLabel(site)` :11522.
- Buckets: migraciones `supabase/migrations/20260921_progress_photos.sql`,
  `20260921_chat_media.sql`, `20260921_apex_photos_private.sql`, `20260910_apex_photos_select_policy.sql`.
- `supabase/functions/delete-account/index.ts` (desplegada v8): limpia `progress-photos` y `chat-media`.
- Harnesses existentes: `_verify-fotos-privadas` (15/15), `_verify-story-g` (8/8),
  `_verify-compartir-sesion` (12/12), `_probe-chat-media` (8/8 — **ESCRIBE en producción: NO lo corras**).

### F3 · El chat nuevo
- `avi-core.js`: `mergeMsgs(local, cloud, cap)` :2448 (UNIÓN, v625) · `chatClearMark(list)` :2467
  (la marca es la fecha del ÚLTIMO mensaje visto, nunca el reloj) · `chatClearLater(a, b)` :2475
  (la marca solo avanza) · `chatMsgContext(sessions, now)` :2507 (v646) ·
  `chatAwaiting(clients, msgsById, clearsById, now, horas)` :2544 (v647) ·
  `coachReadShouldStamp(msgs, prevReadAt)` :2587 · `chatSeenIndex(msgs, coachReadAt)` :2594 (v648) ·
  `chatViewMode(client, msgs)` :5331 (`open`/`archive`/`lock`, v584).
- `app-3-coach.js`: `markCoachRead(id)` :3998 · el aviso `h-await` :4016 · `_coachMsgs(id)` :4061
  (vista FILTRADA del coach) · `coachChatAskDelete(btn)` :4072 · `sendCoachChatMsg()` :4169 ·
  `coachSendMedia()` :4193.
- `app-4-entreno.js`: `_clientMsgs(clientId)` :4319 (vista FILTRADA del asesorado) ·
  `clientChatAskDelete(btn)` :4329 · `renderClientMsgs(clientId)` :4345 ·
  `_paintMsgThread(con,msgs,coachReadAt)` :4390 · `clientSendMedia()` :4422 · `sendClientMsg()` :4442.
- La cola de escrituras del coach (v588/v612/v616): `_persistCoachWrite(k,v)` app-1 :1536,
  `UD.readClientCol` app-1 :635 (`ok`/`ausente`/`mudo`), `coachQueueVerdict(entry, lectura)` avi-core :11086.
- El merge de tres vías del perfil (v623): `mergeProfile3` avi-core :2772 · `mergeOwnRow3` :2786.
- Harnesses existentes: `_verify-eliminar-chat` (15/15), `_verify-chat-lote` (17/17).

---

## BASELINE MEDIDO HOY (25-sep-2026) — créelo, NO lo vuelvas a medir

Lo midió el orquestador: el código contra HEAD y los datos con `SELECT` de solo lectura sobre
producción. **Cada cifra nombra su unidad.** Filtro «no-QA» = `profile->>'name' not ilike '%QA%'`.
**Si tu trabajo contradice un número de aquí, dilo explícitamente: eso es un hallazgo en sí mismo**
(ya pasó varias veces en este repo, y tres cifras del orquestador las tumbaron los agentes).

### Estado del repo y de producción
- HEAD limpio en **`9dce945` (avi-v668)**. Suite **1338/1338** (corrida local hoy).
- Producción sirve **`avi-v668` en las DOS direcciones** (comparado el `CACHE_NAME` de `sw.js` de
  github.io y de `app.avientrena.com` contra el local).
- `https://app.avientrena.com/mudanza.json` → **HTTP 200**, cuerpo
  `{"hogar":"https://app.avientrena.com","v":2}`, `Access-Control-Allow-Origin: *`,
  `Cache-Control: public, max-age=0, must-revalidate`. En github.io, `mudanza.json` → **404**.
- Edge functions DESPLEGADAS (versión de Supabase): `send-push` v12, `delete-account` v8,
  `coach-create-client` v5, `refresh_snapshot` v9, `activate_public_profile` v3 — **las cinco
  redesplegadas el 23-sep** (con `conCors`); `daily-notifs` v9, desplegada por última vez
  **~29-ago** (no la llama el navegador; el repo sí trae `conCors` en ella).

### F1 · Teléfonos, errores y avisos
- **Versión por teléfono** (`node scripts/versiones-telefonos.mjs`, unidad = PERSONAS con sello
  de versión): **6 en v668** · **3 en v665** (Astrid, Diana Paola, Yovan) · **10 por debajo de
  v662** (Chema v644, Danilo v661, diana ramirez v544, jhojan hernandez v608, Laura v661, Natalia
  v654, Nataly v563, Nicolás v571, Samuel v657, Valery v619) · **9 sin datos**. O sea **9 personas
  con una versión que salta** (v662 en adelante).
- 🔴 **El sello de versión NO guarda el ORIGEN.** Hoy nadie puede decir cuántos se mudaron de
  verdad. No inventes el número; si importa saberlo, di POR QUÉ y a quién.
- **Laura y Kathe** usan iPhone con la app instalada: por diseño NO saltan (`navigator.standalone`)
  y siguen en github.io hasta reinstalar desde Safari.
- `app_errors` desde el 22-sep: **7 filas**, todas `kind='promise'` del service worker: 5 «Failed
  to update a ServiceWorker…» (3 con alcance github.io, builds v653/v661; 2 con alcance
  `app.avientrena.com`, build v665) y **2 «newestWorker is null» el 24-sep en app.avientrena.com
  con `uid` NULL y `build` vacío**. **0 `RangeError`** en toda la tabla (30 filas desde el 27-ago:
  es lo que retiene). ⚠️ `uid` viene NULL en las 7: la telemetría no identifica a nadie.
- `push_subscriptions`: **13 filas**, **10 dueños** distintos (`client_id`), **7 filas con
  `updated_at` ≥ 23-sep**. La tabla **no guarda el origen** (columnas: `id, client_id,
  subscription, updated_at, training_days, training_shift`).

### F2 · Fotos, buckets y lo que se publica
- **Buckets** (`storage.objects`): `progress-photos` **PRIVADO**: **21 objetos** en **11 carpetas**
  (943.254 bytes, último 22-sep) · `chat-media` **PRIVADO**: **1 objeto** (90.264 bytes, 21-sep) ·
  `apex-photos` **PRIVADO**: **0 objetos** · `avatars` **PÚBLICO** (Comunidad, congelada): **2
  objetos** en 2 carpetas (64.807 bytes, último 10-sep). ⚠️ La bitácora de v652 dice «avatars:
  1 foto»; hoy hay 2 objetos — averigua si es una foto de una persona o un archivo auxiliar.
- **Fotos de progreso** (`user_data.photos`, 28 filas no-QA, sin lápidas): **15 vivas** — **12 con
  `path`** (bucket privado) · **3 en base64 DENTRO de la fila** (de **3 personas**; privadas por RLS,
  se mudan solas cuando su dueño abre la app) · **0 con enlace público**.
- **Fotos de perfil**: **9 personas con `avatarPath`**, 0 en base64, 0 con enlace http.
  Cuadra: 12 + 9 = 21 = los objetos de `progress-photos`.
- **Menores por edad declarada** (`profile.age` < 18): **4** — Sharith sofia (16), Santiago Santos
  (17), Samuel Cifuentes (15), Valery (15). **Ninguno tiene foto de perfil hoy.** ⚠️ La edad es
  AUTODECLARADA: Samuel se registró con 28 y tiene 15 (v570).
- **Vitrina pública** (`avi_showcase`, la única tabla que se lee sin cuenta): **4 tarjetas** —
  Kathe, Claudia, Nataly, Astrid. Ninguna es de un menor. La de Samuel ya no está.

### F3 · El chat
- **15 conversaciones** (filas no-QA con `msgs` no vacío) · **153 mensajes** en total: **68 de
  asesorados** (escritos por una persona) · **80 del coach** · **5 automáticos** (`system:true`,
  los genera la app — ⚠️ la ronda del 7-sep contó uno de estos como «un asesorado escribió y nadie
  le contestó», y era falso) · **1 con archivo** (`media`) · **1 con contexto de entreno** (`ctx`).
  Último mensaje: 24-sep 13:00 UTC. Claves que aparecen en los mensajes: `ctx, date, from, media,
  system, text`.
- **Marcas de «eliminar»**: **1 asesorado** tiene `chatClearedAt`; la marca del coach
  (`coach_settings.mc`) tiene **1 clave**.
- **«Visto»**: **8 asesorados** tienen `coachReadAt`.
- **Respuestas guardadas**: el coach **NO tiene la clave `qr`** en `coach_settings` → hoy ve las 4
  de fábrica. Su `coach_settings` trae: `ce, cn, e[374], ld(3), mc(1), mr(18), nequi, site`.

---

## FALSOS POSITIVOS CONOCIDOS — si reportas uno de estos, tu informe pierde credibilidad

1. **«El iPhone instalado no salta a la dirección nueva».** Deliberado (v662): en iOS una app de
   pantalla de inicio que navega a otro dominio lo abre en un navegador superpuesto, y cada app
   instalada tiene su propio almacenamiento. Se quedan en github.io, que sigue vivo. **Lo que SÍ
   es hallazgo:** algo que la app haga HOY asumiendo que todos están en el dominio nuevo y que
   rompa a quien se quedó.
2. **«github.io sigue vivo / no redirige».** A propósito: Pages con dominio propio OBLIGA a
   redirigir, y un teléfono sin actualizar vería pantalla de error.
3. **«`mudanza.json` tiene CORS `*`».** Es una señal pública sin datos; tiene que poder leerla
   github.io.
4. **«El bucket `avatars` es público».** Es de Comunidad (congelada) y ahí la foto se muestra a
   los contactos por diseño.
5. **«Eliminar la conversación no la borra para el otro».** Decisión del PO (v645), como «Vaciar
   chat» de WhatsApp: al coach no se le puede borrar un «me duele la rodilla» porque el asesorado
   vació su chat.
6. **«El "visto" no es instantáneo».** Declarado en v648: llega en el siguiente refresco.
7. **«Hay fotos en base64 dentro de la fila».** Son privadas por RLS y se mudan solas cuando su
   dueño abre la app (v650). Solo es hallazgo si alguna quedó ACCESIBLE a alguien que no debe.
8. **«La vitrina pública muestra nombres».** Solo el PRIMER nombre y kilos, a propósito (v523);
   ni apellido, ni edad, ni peso.
9. **«El coach ve las fotos y el chat de su asesorado».** Por diseño: todo lo de una pareja vive
   en la carpeta del ASESORADO y lo leen exactamente dos personas.
10. **«Quien tenía avisos debe volver a activarlos en el dominio nuevo».** El permiso de avisos es
    POR DOMINIO (lo impone el navegador); v665 se lo recuerda, y mientras tanto le siguen llegando
    por la suscripción vieja.
11. **Nutrición** (cerrada por el PO), **Comunidad** (congelada), **el registro de alimentos**
    (congelado), los advisories `rls_disabled` de `_cm_rate`/`_cpost_rate`/`_cc_rate` (grants
    revocados: Postgres evalúa privilegios antes que RLS) y `auth_leaked_password_protection`
    (solo plan Pro, decidido no pagarlo). **Todos cerrados.**
12. **«Hay que perseguir a los asesorados que no abren la app / no tienen avisos».** El PO lo
    cortó dos veces: no se proponen acciones para perseguir inalcanzables (11 de 12 nunca pagaron).
13. **«Faltan tests / falta manejo de errores / convendría refactorizar»** sin caso concreto y sin
    víctima: no es un hallazgo en este repo.

---

## Qué es un hallazgo SERIO (y qué se va a rechazar)

**SÍ es un hallazgo:**
- Algo que una persona real puede sufrir hoy, con su nombre y la consulta o el `archivo:línea` que
  lo demuestra.
- Algo que la app PROMETE por escrito y no cumple (cita el texto exacto y dónde vive).
- Un dato que se pierde en silencio, o que queda al alcance de quien no debe verlo.
- Un camino sin salida: una acción que se puede empezar y no terminar, un aviso que no se puede
  apagar, un estado del que no se puede volver.
- Trabajo manual que el coach hace hoy y la app ya tiene datos para ahorrarle.
- Una medición que **contradice** el baseline de arriba.

**NO es un hallazgo:**
- Consejos genéricos de buenas prácticas sin caso concreto ni víctima.
- Cualquier cosa ya escrita en **GOTCHAS VIGENTES** de `CLAUDE.md` — léelo antes de reportar.
- Algo ya arreglado: **verifica contra HEAD**, nunca contra un informe viejo.
- Una hipótesis sin medir presentada como hecho. Para eso está «Sospechas sin medir».
- «Falta X» cuando X existe con otro nombre. Busca antes de afirmar una ausencia.

**Una regla que este repo pagó caro:** *el que audita llega con hipótesis, no con hallazgos.* Las
preguntas de tu área (abajo, en tu encargo) son HIPÓTESIS del orquestador y pueden ser falsas: en
la ronda del 5-sep dos pistas del orquestador las tumbaron los agentes. **Tumba tus propios
hallazgos antes de escribirlos, y escribe cómo lo intentaste.**

---

## REGLAS DURAS

1. 🔒 **SOLO LECTURA contra producción.** `SELECT` sí. `INSERT`/`UPDATE`/`DELETE`, migraciones,
   invocar edge functions, desplegar o subir archivos: **jamás** — tampoco «dentro de una
   transacción que se deshace». Para probar quién puede LEER algo sí puedes impersonar un rol con
   `begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true); select …; rollback;`
   — solo con `SELECT` dentro. Las políticas de escritura se juzgan LEYENDO `pg_policies`.
   Son los datos de 27 personas reales que le pagan al PO.
2. 🔒 **Nada de sondas que escriben ni crean cuentas:** ningún `scripts/e2e/_probe-*` ni
   `_verify-borrado-cuenta`. Contra producción solo se permiten `_prodcheck.mjs` y
   `_prodcheck-mudanza.mjs` (solo leen) y `scripts/versiones-telefonos.mjs` (solo lee).
3. 🔒 **NO toques el código del repo.** Esta ronda es diagnóstico. Cero commits, cero ediciones a
   cualquier archivo que no sea tu propio informe.
4. 🔒 **Un hallazgo sin evidencia verificable no es un hallazgo.** Cada uno lleva `archivo:línea`, o
   la consulta SQL con su resultado, o la salida del comando. Nombres de función y de columna
   **verbatim**: si escribes un nombre que no existe, el hallazgo entero queda en duda.
5. 🔒 **Intenta TUMBAR tu propio hallazgo antes de escribirlo**, y escribe cómo lo intentaste. Si lo
   tumbaste, va a «Lo que verifiqué y está SANO», que también vale.
6. 🔒 **Distingue «no hay víctima hoy» de «no pasa nada».** Las dos se reportan, marcadas distinto:
   el PO decide con esa diferencia.
7. ⚠️ **Cuidado con tus propias sondas.** En este repo, en un solo día, TRES hallazgos resultaron ser
   defectos de la sonda que los midió. Toda medición lleva **control de discriminación** (¿distingue
   de verdad los dos casos?) y **control de cobertura** (¿estoy midiendo algo, o el cero sale
   porque no leí nada?). **Un cero sin control no vale.** Y en SQL: `NOT (condición)` sobre una
   clave ausente descarta la fila en silencio (lógica de tres valores) — compara siempre tu conteo
   con el universo del baseline.
8. ⚠️ **Mide en PANTALLA, no en el fuente, cuando juzgues lo visible.** Un emoji dentro de
   `<span class="t-ic" data-ic>` se vuelve SVG al cargar. Sin `<meta viewport>` una prueba se
   maqueta a 980px.
9. ⚠️ **El navegador es SOLO de F1.** Los harnesses de `scripts/e2e/` comparten los puertos
   8829/9349 y sois tres corriendo a la vez: **F2 y F3 miden por código y SQL.** F1 puede correr
   los harnesses LOCALES (el sello `cloudWriteSealed` impide escribir a producción desde
   `localhost`; **no lo desactives**) y los dos `_prodcheck`. Credenciales QA en
   `~/.avi/e2e-creds.json` — **nunca** la cuenta de un asesorado real. Rate limit del login ~2-3 min.
10. ⚠️ **No corras matrices de sabotaje.** Mutan el árbol unos segundos y hay otros dos agentes
    leyéndolo.

---

## CÓMO ENTREGAS (obligatorio, y va PRIMERO)

**Antes de investigar nada, CREA tu archivo de informe con el esqueleto de secciones vacío.** Luego
ve rellenándolo a medida que encuentras, no al final. Si te quedas sin presupuesto a mitad de
camino, lo que ya escribiste se conserva y la ronda no se pierde.

Tu archivo: `docs/auditoria-semana-2026-09-25/<TU-CÓDIGO>.md` (F1-mudanza.md · F2-fotos.md · F3-chat.md)

Secciones, en este orden:

```
# <código> · <área> — <tus nombres de rol>
## Veredicto en una frase
## Los 3 más grandes
   (cada uno: qué es · a quién le pasa HOY, con nombre · evidencia (archivo:línea o SQL con su
    resultado) · cómo intenté tumbarlo · qué costaría arreglarlo)
## Todos los hallazgos
   (tabla: severidad 🔴/🟡/🟢 · qué · dónde · ¿hay víctima hoy?)
## Respuesta a las preguntas del orquestador
   (una por una: CIERTA / FALSA / NO SE PUDO MEDIR, con la evidencia)
## Lo que verifiqué y está SANO (con números)
## Sospechas sin medir
## Qué NO miré y por qué
```

La sección **«Qué NO miré y por qué» no es relleno: es como se elige la próxima ronda.** Sé
específico y honesto ahí.

Al terminar, tu **última respuesta** debe ser un resumen de máximo 15 líneas: el veredicto y los 3
grandes. El informe completo vive en el archivo, no en tu respuesta.

**Escribe en español de Colombia, en lenguaje de producto.** El PO es entrenador, no desarrollador:
dile qué ve la persona y qué arriesga el negocio. Los detalles técnicos van en la evidencia, no en
el veredicto.
