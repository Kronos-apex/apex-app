# Auditoría: BASE DE DATOS Y SEGURIDAD — Andrés Quintero (DBA & Backend)
**Alcance: el delta v418 → v525.** Lo cerrado en `docs/auditoria-areas-2026-07-31/A2-basedatos.md` no se
re-audita; sí se re-verificó lo que aquel informe dio por sano.

## Veredicto en 5 líneas
**El modelo de acceso salió MEJOR que en julio y lo probé impersonando, no leyendo advisories:** las dos
edge functions que eran la puerta abierta (H1 de julio) están cerradas de verdad —`send-push` v11 resuelve
al usuario por su JWT **y** autoriza al destinatario, `daily-notifs` v7 usa el secreto de la BD y falla
cerrada—, el aislamiento entre asesorados sigue en 0 filas ajenas, y el arreglo de `showcase_ins` de hoy
está VIVO en producción (verificado contra `pg_policies`). **No tengo ningún 🔴.**
Lo que sí encontré es un **defecto de datos que crece solo y nadie mira**: `push_subscriptions` deduplica
por el jsonb ENTERO, así que un mismo teléfono acumula filas — **Nataly tiene 8 filas para UN solo
endpoint** y cada recordatorio le sale 8 veces por la puerta (medido en los logs de hoy). La tabla pasó
de 10 a 18 filas en tres semanas y **7 de esas 18 son duplicados patológicos de una sola persona**.
De la CLASE que me pediste enumerar: el único hermano vivo de `showcase_ins` es **`fb_ins` de
`food_barcodes`** — «es mi fila» gateando un catálogo COMPARTIDO con registro abierto, sin tope ni
rate-limit. Hoy no le pasa a nadie porque **la tabla tiene 0 filas**: la feature nunca se usó.

---

## 1 · LA CLASE QUE ME PEDISTE: «es mi fila» ≠ «tengo derecho a hacer esto»

Enumeré **las 22 policies de INSERT/UPDATE** del esquema `public` (`pg_policies`, cmd in INSERT/UPDATE)
y las clasifiqué por lo único que importa: **¿el efecto de la escritura se queda en mi fila, o sale hacia
una superficie que ven otros?**

| Policy | Gate | ¿A dónde sale lo escrito? | Veredicto |
|---|---|---|---|
| `avi_showcase.showcase_ins` | `coach_id=uid` **AND `private._is_moderator(uid)`** | página PÚBLICA | ✅ **CERRADO hoy** (verificado abajo) |
| **`food_barcodes.fb_ins`** | `created_by = uid` | **catálogo COMPARTIDO** que consulta todo autenticado | 🟡 **H3 — el hermano vivo** |
| `app_errors.app_errors_insert` | `true`, **TO anon** | tabla interna (nadie la lee salvo el coach) | 🟡 abierto desde julio (H2 de aquel informe), sin cambios |
| `community_posts.cpost_ins` | `user_id=uid` + `kind` en allow-list; `pr` exige moderador y no-menor | muro — pero **`cpost_sel` decide quién lo ve** | ✅ el gate de salida está en el SELECT, no en el INSERT |
| `community_comments.cc_ins` | `user_id=uid` **AND `private._can_comment`** | post ajeno | ✅ pregunta las dos cosas |
| `community_messages.cm_ins` | `from_user=uid` **AND `_can_dm`** | bandeja ajena | ✅ |
| `community_reactions.re_ins` | `from_user=uid` **AND** (amigos \| autor visible) | perfil/post ajeno | ✅ |
| `community_gym_members.gm_ins` | `coach_id=uid` **AND** (yo mismo \| `user_data.coach_id=uid`) | directorio del gym | ✅ ver nota F7 abajo |
| `friendships.fr_ins` | soy parte del par **AND** `requested_by=uid` **AND** `status='pending'` | solicitud a otro | ✅ nace en pending |
| `follows.fo_ins` | `follower = uid` | perfil ajeno | 🟡 **sospecha S1** (abajo) |
| `community_reports.rp_ins` | `reporter = uid` | bandeja del coach | 🟡 **sospecha S2** (abajo) |
| `community_profiles.cp_ins/cp_upd` | `user_id = uid` | su propio perfil (+ «Descubrir» si se hace público) | 🟡 **sospecha S3** |
| `user_data.*` | `uid = user_id` \| `uid = coach_id` | su propia fila | ✅ (F7 conocido, no forjable hacia afuera) |
| `push_subscriptions.push_*` | `client_id = uid::text` \| `_coach` + uid fijo del coach | su propia fila | ✅ |
| `follows.fo_upd` / `friendships.fr_upd` / `community_messages.cm_upd` | soy una de las dos partes | la relación | ✅ |
| `community_posts.cpost_upd` | `user_id = uid` | **el grant de UPDATE está recortado a `visible`** (c13c) | ✅ re-verificado: `has_table_privilege(authenticated,'community_posts','update') = false` |
| `food_barcodes.fb_upd` | (mío **AND** `verified=false`) \| moderador | fila del catálogo | ✅ y `verified*` no tiene grant de UPDATE para nadie |

**Lo que la tabla enseña, en una línea:** las policies de comunidad SÍ hacen las dos preguntas (`_can_dm`,
`_can_comment`, `_post_author_if_visible`) porque nacieron después de F7 y c13c. **Las dos superficies de
escritura más NUEVAS del repo son las que se saltaron el patrón:** `food_barcodes` (v473) y `avi_showcase`
(v523). La segunda ya está corregida.

**Corolario que salió de mirar los triggers, y que es la mitad que faltaba de la clase:** existen
rate-limits por trigger para `community_messages` (`_cm_rate`), `community_posts` (`_cpost_rate`) y
`community_comments` (`_cc_rate`). **`food_barcodes` no tiene ninguno**, y `avi_showcase` no lo necesita
porque su tope de 6 hace ese trabajo. Es el mismo olvido que la policy: al añadir la enésima superficie
de escritura de cliente se copió el `create table` pero no el cinturón.

### Verificación del arreglo de hoy (`s2`) — está VIVO
```sql
select policyname, cmd, with_check from pg_policies
 where tablename='avi_showcase' and policyname='showcase_ins';
-- showcase_ins | INSERT | ((coach_id = auth.uid()) AND private._is_moderator(auth.uid()))
select private._is_moderator('0a6484ed…');              -- coach   → true
select private._is_moderator('c52b90af…');              -- Astrid  → false
select count(*) from community_moderators;              -- 1
select count(*), count(distinct coach_id) from avi_showcase;  -- 1 fila, 1 coach
```
Y no quedó basura del ataque: la única fila publicada es del coach.

### Segunda pregunta: consultas del cliente que leen sin filtrar por dueño
Barrí **las 60 llamadas `.from('…')`** de los 7 módulos. Todas las lecturas van acotadas por dueño
(`.eq('user_id',…)`, `.eq('coach_id',u.id)`, `.or(follower.eq…)`) **o** limitadas y respaldadas por RLS
(`community_posts` con `.in(autores)` + `limit 40`). **La única sin acotar es la que ya conoces**:
`renderShowcase` (`app-2-login.js:1877`) pide `order=created_at.desc&limit=6` sin filtro de coach.
Confirmo que sigue abierta, y añado un matiz que cambia el arreglo: **hoy ya no es «un filtro que falta»**,
porque la página es PRE-LOGIN y no sabe de qué coach es el link que abrieron. Cerrarla de verdad exige
decidir el identificador (un `?c=` en el link que él comparte, o una columna `featured`), no una línea.
Con `showcase_ins` exigiendo moderador, el riesgo dejó de ser «un desconocido» y pasó a ser «el segundo
moderador que se agregue».

---

## 2 · Hallazgos verificados

### H1 · 🟠 `push_subscriptions` deduplica por el jsonb ENTERO: un solo teléfono acumula filas y cada aviso sale 8 veces
- **Qué pasa:** la UNIQUE es `(client_id, subscription)` y `subscription` incluye `keys.p256dh` y
  `keys.auth`, que **rotan** cada vez que el navegador rehace la suscripción. El `upsert` va con
  `onConflict:'client_id,subscription'` → el conflicto **nunca casa** y se inserta una fila nueva. El
  guard que debería frenarlo (`shouldPostPush`, que compara el endpoint guardado) queda **anulado por
  `force=true`**, y `ensureClientPush()` llama con `force=true` **una vez por cada apertura de la app**
  (`_clientPushHealed` es un `let` de módulo: se reinicia con la página).
- **Dónde:**
  - `app-1-infra.js:352-356` — el `upsert` con `onConflict:'client_id,subscription'`.
  - `app-1-infra.js:344` — el comentario que dice lo contrario: *«onConflict = la UNIQUE (client_id,
    subscription) → re-suscribir el mismo endpoint ACTUALIZA en vez de duplicar»*. **Es falso**, y es la
    frase que hace que nadie vuelva a mirar.
  - `app-1-infra.js:338` — `if(!force && !shouldPostPush(...)) return true` — el `force` lo salta.
  - `app-1-infra.js:419-427` — `ensureClientPush()` con `force=true`, una vez por sesión.
  - `pg_constraint` → `push_subscriptions_client_id_subscription_key UNIQUE (client_id, subscription)`.
- **Evidencia (medida contra producción, 22-ago):**
  ```sql
  select client_id, count(*) filas,
         count(distinct md5(subscription->>'endpoint'))       endpoints,
         count(distinct md5(subscription->'keys'->>'p256dh')) claves
    from push_subscriptions group by 1 order by filas desc;
  -- Nataly            6e54e22b… →  8 filas ·  1 endpoint · 8 claves   ← patológico
  -- Samuel Cifuentes  31bf6d19… →  2 filas ·  2 endpoints · 2 claves  ← 2 aparatos reales, legítimo
  -- Natalia Martinez  78ea069c… →  2 filas ·  2 endpoints · 2 claves  ← legítimo
  -- los otros 6 (incl. _coach)  →  1 fila cada uno
  ```
  Las 8 filas de Nataly tienen **el mismo endpoint byte a byte** (`md5` del endpoint: 1 distinto) y se
  acumularon entre el **12-ago y el 20-ago**, ~1 por apertura de app.
  Y sale en los logs de la edge de HOY: la ronda de la tarde imprimió **8 líneas**
  `[daily-notifs] afternoon → 6e54e22b-… ✅` en una sola pasada, y la respuesta fue
  `{"sent":17,…,"total":17}` para **9 personas**. O sea: **7 de los 17 envíos de cada ronda son basura.**
- **Intenté tumbarlo así:**
  (a) *¿No serán 8 aparatos suyos?* → No: `count(distinct md5(endpoint)) = 1`. Samuel y Natalia sí tienen
  2 endpoints distintos, y ésos son aparatos de verdad — el control que separa las dos cosas.
  (b) *¿No lo frena `shouldPostPush`?* → Lo frenaría, pero `ensureClientPush` pasa `force=true` a
  propósito (es el self-heal del cutover de v320) y ese camino **no consulta el guard**.
  (c) *¿No lo poda `send-push`?* → Solo borra en **410/404**. Un endpoint VIVO con clave vieja devuelve
  201, así que la poda no lo toca nunca; y `daily-notifs` no poda en absoluto. **No hay mecanismo de
  auto-cura: sólo crece.**
  (d) *¿Será un residuo viejo?* → No: la auditoría de julio contó **10 filas**; hoy hay **18**, y las 8
  de Nataly son todas posteriores al 12-ago.
- **A quién le pasa:** a Nataly hoy, en cada uno de los 3 turnos diarios y en cada mensaje que le escriba
  el coach por el chat (`send-push` también hace `.eq('client_id', target)` sobre esta tabla).
- **Por qué NO lo marco 🔴, dicho con honestidad:** de los 8 mensajes que le llegan al teléfono, **sólo el
  cifrado con la clave ACTUAL puede descifrarse**; los otros 7 el navegador los descarta antes de
  despertar al Service Worker (`sw.js:104` — `if(!e.data) return`), y además `sw.js:112` usa
  `tag:'avi-notif'`, que colapsa las repetidas en una sola. **No pude probar qué ve ella en su pantalla**
  y no voy a afirmarlo. Lo que sí está probado es el desperdicio, el crecimiento sin freno y un
  comentario en el código que afirma lo contrario de lo que hace.
  **Para probarlo del todo hace falta su teléfono** (o pedirle una captura del centro de notificaciones
  tras una ronda). Si resultara que las viejas SÍ se pintan, esto es 🔴 inmediato: son 24 avisos al día
  a la persona por el único canal con el que se la puede alcanzar.
- **Costo del arreglo:** **quirúrgico, y hay que hacer las dos mitades**:
  1. la identidad de una suscripción es el **endpoint**, no el jsonb → índice único sobre
     `(client_id, (subscription->>'endpoint'))` y `onConflict` apuntando ahí. Con eso `force=true` deja
     de duplicar y sigue curando, que es para lo que existe.
  2. antes de crear el índice hay que **limpiar los 7 duplicados** (conservar el `updated_at` más
     reciente por endpoint), o el `create unique index` falla.
  Media hora de SQL + 3 líneas de JS. ⚠️ **Y la limpieza es de datos de usuario, así que va con su
  auto-cura del lado cliente ANTES** (gotcha vigente: la nube sola no dura) — aquí la auto-cura es
  gratis, porque el propio `upsert` con el conflicto arreglado *es* la cura: la primera apertura de la
  app de cada persona colapsa sus filas en una.

---

### H2 · 🟡 La ronda de la tarde ya no cabe en el tiempo del cron, y `cron.job_run_details` dice «succeeded» pase lo que pase
- **Qué pasa:** los 3 cron llaman a `daily-notifs` con `net.http_post`, cuyo timeout por defecto son
  **5.000 ms**. La ronda de la tarde tarda ~6 s → pg_net abandona, guarda `status_code = NULL` y
  `timed_out = true`… **y `cron.job_run_details` la registra igual como `succeeded`**, porque el cron
  sólo mide que la SENTENCIA SQL corriera, no que la función respondiera.
- **Dónde:** `cron.job` jobid 1/2/3 (`net.http_post(...)`) · `net._http_response`.
- **Evidencia (22-ago):**
  ```
  net._http_response id=273  status_code=NULL  timed_out=true
    error_msg='Timeout of 5000 ms reached. Total time: 5000.676000 ms'   created=20:30:00
  net._http_response id=272  status_code=200   {"ok":true,"slot":"midmorning","sent":17,...}
  cron.job_run_details  →  jobid 1,2,3,5,6 : 10/10 'succeeded' en 10 días, TODOS
  ```
  Y en los logs de la edge del mismo instante: `POST | 200 | …/daily-notifs` a las **20:30:05.980** —
  o sea que la función **sí terminó bien**, sólo que 980 ms después de que el cron dejara de escuchar.
- **Intenté tumbarlo así:** (a) *¿el timeout mata la función?* → No: pg_net deja de esperar la respuesta,
  la función sigue corriendo en su propio contenedor; los logs muestran los 17 envíos completos y el 200.
  Así que **hoy no se pierde ninguna notificación** — por eso es 🟡 y no naranja. (b) *¿es un pico de un
  día?* → `net._http_response` sólo guarda ~6 h, así que **no puedo decir desde cuándo pasa**; lo que sí
  sé es que la ronda de la tarde es la más larga porque es la única con las ramas RESCUE/COMEBACK.
- **A quién le pasa:** hoy a nadie. El daño es de VIGILANCIA: **si mañana el secreto de
  `private.fn_secrets` cambia y la función empieza a devolver 401, el cron seguirá diciendo
  «succeeded» y nadie se enterará** — y la ronda de la tarde es justo la que lleva los pushes de rescate
  a quien nunca ha entrenado y de regreso a quien lleva ≥7 días fuera. Es el mismo final del smoke que
  pasó 43 versiones muerto: un gate que no puede fallar.
- **Costo del arreglo:** **una línea de config por cron.** `net.http_post(..., timeout_milliseconds =>
  20000)` en los 3 `cron.job.command`. Con eso `net._http_response` guarda el código real y basta un
  `select` para saber si la ronda entregó. Bonus gratis: **H1 es el que engorda la ronda** (17 envíos
  para 9 personas), así que arreglar H1 la baja a ~10 y el timeout deja de rozarse.

---

### H3 · 🟡 `food_barcodes`: «es mi fila» gateando un catálogo COMPARTIDO, sin tope y sin rate-limit — el hermano vivo de `showcase_ins`
- **Qué pasa:** `fb_ins` sólo exige `created_by = auth.uid()`, y el auto-registro de AVI es ABIERTO. El
  EAN es la clave primaria, así que **el primero que reclama el código de barras de un producto real
  decide los macros que va a ver todo el que lo escanee después**. No hay tope por usuario, no hay
  trigger de rate-limit (`community_messages`, `community_posts` y `community_comments` sí lo tienen) y
  la cola de moderación `fb_pending()` devuelve **`order by verified asc, created_at desc limit 200`**:
  con 200 filas nuevas de basura, lo pendiente de verdad se cae de la pantalla del coach. Es la misma
  aritmética del showcase — «puedo añadir» se convierte en «puedo reemplazar» por el `limit`.
- **Dónde:** `supabase/community/f5_food_barcodes.sql` (policy `fb_ins`) · `f6_fb_moderation.sql`
  (`fb_pending`, `limit 200`) · verificado vivo en `pg_policies` y `pg_get_functiondef`.
- **Evidencia:** `with_check = (created_by = auth.uid())`, sin más. `pg_trigger` sobre
  `public.food_barcodes` → **0 triggers**. Lo que SÍ está bien y lo comprobé: los grants son POR COLUMNA
  y `verified/verified_by/verified_at` **no** están en el `insert` ni en el `update` del cliente
  (`information_schema.column_privileges`), así que nadie se auto-verifica; y `fb_pending()` le devolvió
  **0 filas** a una asesorada real impersonada, en silencio, como promete su comentario.
- **Intenté tumbarlo así, y casi lo tumbo:**
  (a) *¿el buscador de alimentos expone estas filas a todo el mundo?* → **No.** `app-5-salud.js:2000` y
  `:2086` consultan **sólo por EAN** (`.eq('ean',ean)`); no hay búsqueda por nombre contra esta tabla.
  Así que el vandalismo no «aparece» solo: hay que escanear justo ese empaque.
  (b) *¿a cuánta gente le pasa hoy?* → **A nadie.** `select count(*) from food_barcodes` → **0 filas,
  0 creadores distintos**. La feature está construida y **nunca se ha usado en producción**. Por eso es
  🟡 y no más: no puedo completar «esto le pasa a [persona real] cuando…».
  Sobrevive como hallazgo porque **la puerta está abierta y el arreglo cuesta poco ahora que la tabla
  está vacía**; el día que tenga 300 filas, limpiar será otra cosa.
- **A quién le pasa:** hoy a nadie. Mañana, a quien escanee un producto que un tercero reclamó primero
  — y el dato malo es **internamente coherente**, que es exactamente la clase de la yuca: ningún test de
  cuadre lo caza.
- **Costo del arreglo:** dos opciones, ninguna cara. (1) **Barato y suficiente hoy:** copiar el patrón
  que ya existe — un trigger de rate-limit tipo `_cpost_rate` (N inserts por usuario y hora) y subir el
  `limit` de `fb_pending()` o partirlo en «pendientes» / «verificados» para que la cola no se pueda
  desplazar. ~1 h. (2) **De raíz:** que un aporte nazca en una tabla de PROPUESTAS y sólo pase a
  `food_barcodes` cuando el moderador aprueba — es lo que la feature ya insinúa con `verified`, pero
  puesto en la estructura en vez de en una bandera. Medio día. **Decidir con el PO si la feature sigue
  viva** antes de gastar nada: 0 filas en 12 días y el registro de comida lo usaron 5 personas.

---

## 3 · Sospechas sin probar

**S1 · `follows.fo_ins` sólo pregunta «soy yo el que sigue», no «puedo ver a quién sigo».** Todas sus
hermanas (`cc_ins`, `cm_ins`, `re_ins`) exigen además una función de visibilidad; ésta no. El trigger
`_community_follow_state` deja la fila en `pending` si el destino es privado, así que el daño máximo
sería una solicitud de seguidor no deseada — y el atacante necesitaría el `user_id` (un UUID) de la
víctima, que no es enumerable con la RLS actual. **No lo probé** porque demostrarlo exige un INSERT
(soy read-only). **Cómo probarlo:** `begin; set local role authenticated` con el JWT de un extraño
sintético; `insert into follows(follower,followee) values (extraño, uid_de_un_privado)`; leer el `state`
resultante; `rollback`. Si entra, la pregunta para el PO es si eso es aceptable (en Instagram lo es).

**S2 · `community_reports.rp_ins` y las 5 tablas sin rate-limit permiten inundar la bandeja del coach.**
`rp_ins` es `reporter = auth.uid()` a secas y `community_reports` no tiene trigger de rate-limit; lo
mismo `follows`, `friendships` y `food_barcodes`. Como el coach ve los reportes por `cmty_mod_reports()`,
un tercero podría llenársela. **No lo probé** (exige escribir). Impacto plausible: ruido, no fuga —
`community_reports` no tiene grant de SELECT para el cliente (medido: `u_sel=false`).

**S3 · Un desconocido puede aparecer en la pantalla «Descubrir» de los asesorados de Camilo.**
`cp_ins`/`cp_upd` son `user_id = auth.uid()`, e `is_private` está en el grant de UPDATE del cliente: con
el registro abierto, cualquiera crea perfil, se pone público y cae en `CMTY.discover` de todos
(`app-7-community.js:245-259`, un `select` **sin `limit`**). Hoy **no le pasa a nadie: hay 1 solo perfil
público en toda la base y es el del coach** (medido). Queda como sospecha por eso y porque la pantalla
es la misma clase de superficie compartida que el showcase, pero con opt-in del atacante.

**S4 · La cascada Service Worker → suscripción nueva.** Hay **11 filas de `Failed to update a
ServiceWorker`** en `app_errors` desde el 31-jul, en 5 personas, la última el 21-ago (v512), casi una por
despliegue. Sospecho que ese fallo es lo que hace que el navegador rehaga la suscripción con claves
nuevas y alimente H1 — encaja con las fechas de Nataly. **No lo probé:** las dos cosas pueden ser
independientes. Para probarlo haría falta correlacionar la hora exacta del error con la de la fila nueva
en la misma persona, y `app_errors` sólo registra el fallo del que además reporta.

---

## 4 · Lo que revisé y está SANO (re-verificado, no heredado)

- **`send-push` (edge v11) — el H1 de julio está muerto de verdad.** `verify_jwt: true`; resuelve al que
  llama con `admin.auth.getUser(token)` (la anon key no tiene usuario → 401) y **además** autoriza al
  destinatario con `_authorize()`: a sí mismo · a `_coach` sólo los asesorados cuyo `user_data.coach_id`
  es el uid del coach · a un asesorado **sólo su coach, leyendo la fila del DESTINATARIO**. Leí el
  código DESPLEGADO, no el del repo.
- **`daily-notifs` (edge v7) — el secreto vive en la BD y falla cerrada.** `verify_jwt:false` a propósito
  (lo llama el cron), pero compara contra `supabase.rpc('fn_notif_secret')`, y si no puede leerlo
  devuelve **503** en vez de dejar pasar. `fn_notif_secret` tiene `search_path=private,pg_temp` y
  **execute negado a anon y authenticated** (medido). Probado end-to-end por la respuesta real de hoy:
  `{"ok":true,"slot":"midmorning","sent":17,"failed":0}`.
- **Las 6 edge functions:** 5 con `verify_jwt:true` (`send-push` v11, `delete-account` v4,
  `coach-create-client` v4, `refresh_snapshot` v7, `activate_public_profile` v2) y sólo `daily-notifs`
  sin él, con el candado de arriba.
- **Aislamiento entre asesorados, impersonando a Astrid (JWT sintético en tx con rollback):**
  `user_data` **1 fila propia / 0 ajenas** · `push_subscriptions` 1 (la suya) · `app_errors` 0 ·
  `apex_data` 0 · `fb_pending()` 0 · `cmty_mod_reports()` 0. `community_reports` ni siquiera tiene grant
  (`permission denied for table`, que es la denegación por PRIVILEGIO, la buena).
- **`anon`:** lee `avi_showcase` (1 fila — **es el punto de la tabla**) y **nada más**. `apex_data` sigue
  sellada (RLS on, 0 policies = deny total).
- **`avi_showcase` está bien diseñada por lo que NO tiene:** sin grant de UPDATE
  (`has_table_privilege(authenticated,'avi_showcase','update') = false`), tope de 6 por coach vivo en el
  trigger (`_showcase_validate`, `>= 6`), allow-list del payload por trigger, y las columnas son sólo
  primer nombre + números. `anon` puede leer `coach_id`, que es un UUID que **ya está en el repo público**
  (`COACH_UID` en `send-push`), así que no es una fuga.
- **Los 24 `SECURITY DEFINER` del esquema:** **todos** llevan `set search_path` (`""` salvo los 3 de
  mantenimiento, que usan `public`). El check por CONTEO que pedía el gotcha F6 se cumple.
  Los 11 WARN de `authenticated_security_definer_function_executable` son **por diseño** (son las RPC de
  moderador y de visibilidad, todas con su gate DENTRO).
- **Grants de UPDATE recortados en comunidad** (c13c) intactos: `community_posts`, `_comments`,
  `_reactions`, `_messages`, `_gym_members` → `u_upd = false` a nivel de tabla.
  **`community_profiles` conserva el SELECT column-level** (c10) y `food_barcodes` el suyo.
- **Rate-limits vivos:** `_cm_rate`, `_cpost_rate`, `_cc_rate` siguen sin grants para anon/authenticated
  → **el advisory `rls_disabled` ya ni se emite**. Confirmado un año más: no tocar.
- **Respaldos VIVOS:** último snapshot **hoy 08:00 UTC**, 25 snapshots, 33 MB. Los 5 cron activos y
  **10/10 corridas exitosas en 10 días** (con el matiz de H2 sobre qué significa «exitosa»).
- **Tamaño:** base **51 MB** de los 500 MB del plan Free. `user_data` 2,1 MB. Sin presión.
- **v509 aguanta:** el perfil del coach conserva **19 claves** con `foodlog` dentro — la fusión
  `mergeOwnProfile` no ha vuelto a perder datos. `deload` ya no está (cerró su descarga, v512).
- **La telemetría sigue identificando** por `ctx->>'uid'` y `build` dice en qué versión iba cada persona
  (lo confirmé para las 17 filas desde el 31-jul).
- **Integridad:** 31 cuentas en `auth.users` / 26 filas en `user_data`, **0 filas huérfanas**.

---

## 5 · Lo que NO alcancé a revisar

- **Paridad `avi-core.js` ↔ `refresh_snapshot` v7** — el hueco que ya declaró el informe de julio y que
  **sigo sin cerrar**. Existe `supabase/community/c2_parity_snapshot.cjs` y no lo corrí (soy read-only y
  no quise ejecutar scripts del repo con otros agentes trabajando encima).
- **Storage, a medias.** Sí medí el estado: los dos buckets son **públicos**, `avatars` tiene sus 4
  policies acotadas a `foldername[1] = auth.uid()`, y **`apex-photos` tiene 2 objetos, los dos en
  carpetas que NO son UUID y sin tocar desde el 28-may** → el pendiente conocido (rutas por id legacy vs
  `auth.uid()`) sigue exactamente igual y las fotos siguen cayendo a base64. Lo que **no** hice fue
  probar una subida real ni medir cuánto base64 hay dentro de `user_data`.
- **`activate_public_profile`**: confirmé `verify_jwt:true` y su versión, pero **no leí su código**.
- **`get_logs` de Postgres**: sólo consulté los logs de las *edge functions*. No barrí errores 4xx/5xx de
  PostgREST ni consultas lentas.
- **Escenario B del runbook** (recrear proyecto + cuentas auth punta a punta): sigue sin ensayarse desde
  2026-07-12, igual que decía el informe anterior. Sólo verifiqué la capa 1.
- **Capa 2 de respaldo** (el JSON en `Desktop\AVI\backups\` por Tarea de Windows): fuera de Supabase, no
  la miré.
- **No ejecuté ninguna escritura**, ni siquiera en transacción con rollback. Todo lo de arriba está
  probado por privilegios + policies + impersonación de LECTURA, o queda explícitamente en «sospechas».
