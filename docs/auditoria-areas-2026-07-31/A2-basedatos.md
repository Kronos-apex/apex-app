# Auditoría: BASE DE DATOS Y SEGURIDAD — Andrés Quintero (DBA & Backend)

## Veredicto en 5 líneas
El modelo de acceso está **SANO y lo probé impersonando, no leyendo advisories**: `anon` no lee
NADA en ninguna tabla (0 filas en las 4 con grants), y un asesorado real solo ve su propia fila
(0 filas ajenas). Los respaldos están VIVOS (último hace 6 h) y las 4 RPC de moderador sí
verifican al moderador. **Lo que sí encontré es una puerta abierta en las edge functions:
`send-push` y `daily-notifs` no exigen JWT y su único candado es la anon key, que es PÚBLICA** →
cualquiera en internet le manda una notificación con el texto que quiera al celular de Camilo, o
dispara la ronda de pushes a los 10 suscritos, las veces que quiera. **Y tumbé la premisa que me
dieron:** la telemetría **SÍ identifica** a la gente (13 de 17 filas traen uid real, 5 personas con
nombre) — está en `ctx->>'uid'`, no en la columna `uid`.

---

## Modelo de acceso REAL, verificado tabla por tabla

Método (el mismo en todas): `has_table_privilege` para `anon`/`authenticated` + `pg_policies` +
**impersonación en transacción con `rollback`** (`set local role anon` y JWT sintético de un
asesorado real vía `set_config('request.jwt.claims',…)`). Nada de creerle al advisory.

| Tabla | Grants anon | RLS | Políticas | Qué puede `anon` DE VERDAD | Qué puede un `authenticated` cualquiera | Cómo lo probé |
|---|---|---|---|---|---|---|
| `apex_data` | S/I/U/D **sí** | ON | **0** | **NADA** (RLS sin policy = deny) | nada | `set local role anon; select count(*)` → **0** |
| `apex_data_backups` | ninguno | ON | 0 | nada (ni grant) | nada | `has_table_privilege` = false ×4 |
| `app_errors` | S/I/U/D **sí** | ON | 2 | **INSERT sí** (policy `WITH CHECK(true)`); SELECT/UPDATE/DELETE no (sin policy) | INSERT sí; SELECT solo el coach (uid fijo) | policy leída + `select` como anon → **0 filas** |
| `user_data` | S/I/U/D **sí** | ON | 5 | **NADA** (ninguna policy nombra a anon) | solo `user_id=uid` **o** `coach_id=uid` | JWT de asesorado real → **1 fila propia, 0 ajenas** |
| `push_subscriptions` | S/I/U/D **sí** | ON | 3 | **NADA** (policies solo `authenticated`) | solo su `client_id`; `_coach` solo el uid del coach | JWT de asesorado → **0 filas** |
| `_cm_rate` · `_cpost_rate` · `_cc_rate` | **ninguno** | OFF | 0 | **NADA** (deniega por PRIVILEGIO) | nada | `has_table_privilege` false ×4 · ver §Refutados |
| `community_profiles` | ninguno | ON | 4 | nada | SELECT **por columna** (c10 intacto) + solo perfiles visibles | grants column-level confirmados |
| `community_posts` / `_comments` / `_reactions` / `_messages` / `_gym_members` | ninguno | ON | 3-4 | nada | gateado por `_profile_visible` / `_can_dm`; **sin UPDATE** (grant recortado) | `au_upd=false` medido |
| `community_reports` | ninguno | ON | 1 | nada | **solo INSERT** (no lee reportes ajenos) | `au_sel=false` medido |
| `community_moderators` | ninguno | ON | 1 | nada | solo SELECT | medido |
| `community_resolve_attempts` | ninguno | ON | 0 | nada | nada | medido |
| `follows` / `friendships` | ninguno | ON | 4 | nada | solo sus propias filas | medido |

**Conclusión del frente 1: un asesorado NO puede leer los datos de otro, y nadie puede hacerse
pasar por coach.** Ser "coach" de una fila exige que esa fila tenga tu uid en `coach_id`, y el
`USING` de `user_data_update` impide escribir la fila de otro — así que no es forjable desde fuera.

---

## Hallazgos verificados

### H1 · 🟠 Las dos edge functions sin JWT están protegidas por una llave PÚBLICA: cualquiera le manda un push a Camilo con el texto que quiera
- **Qué pasa:** `send-push` y `daily-notifs` tienen `verify_jwt: false`. Su "auth check" compara el
  header contra una constante **hardcodeada en el propio código**, que es la anon key publicable.
  `send-push` toma `clientId`, `title` y `body` **del cuerpo de la petición, sin validar nada**, y
  entrega con service role. `daily-notifs` dispara la ronda completa a TODOS los suscritos con un
  `{"slot":"morning"}`.
- **Dónde:**
  - `send-push` index.ts: `const AVI_ANON_KEY = "sb_publishable_hKjgo84b9Lews5oq90b9Fg_1pue73W8"` →
    `if (token !== AVI_ANON_KEY) return 401`
  - La misma llave, en claro y público: `app-1-infra.js:115`, `.github/workflows/keepalive.yml:22`,
    `supabase/migrations/20260524_daily_notifs.sql:44`
  - `pushToClient` la usa como Bearer: `app-1-infra.js:490-493`
- **Evidencia:** `list_edge_functions` → `send-push verify_jwt:false`, `daily-notifs verify_jwt:false`
  (las otras 4 sí la exigen). El `clientId` viaja sin comprobación de titularidad, y **`_coach` es
  un literal adivinable** — los uid de asesorado son UUID y no se adivinan, pero el del coach no
  hace falta adivinarlo. El CORS a `kronos-apex.github.io` **no protege**: CORS es del navegador,
  un `curl` lo ignora.
- **Intenté tumbarlo así:** (a) busqué si `verify_jwt:false` era mentira del panel → no, las otras
  4 funciones salen en `true`, el campo se lee bien; (b) busqué un rate-limit o allow-list dentro de
  ambas funciones → no hay ninguno; (c) supuse que el CORS bastaba → no, solo aplica a navegadores;
  (d) esperaba que la llave fuera secreta → está en un repo público y se sirve en el JS de Pages.
  Sobrevivió porque **no hay ninguna otra comprobación en todo el camino**.
- **A quién le pasa:** a Camilo (push con texto arbitrario a su celular: un "Tu plan venció, paga
  aquí" es phishing creíble) y a los 10 suscritos (blast repetible). No hay fuga de datos: la
  función no devuelve nada del otro usuario.
- **Costo del arreglo:** `daily-notifs` es **barato**: cambiar la constante por un
  `Deno.env.get('NOTIF_SECRET')` y pasarlo desde los 3 cron (el `cron.job.command` no es legible
  por el público) — ~30 min, no toca la app. `send-push` es **quirúrgico pero toca 3 sitios**:
  `pushToClient` debe pasar a `AUTH.client().functions.invoke('send-push',…)` (que ya manda el JWT
  del usuario, como hacen `delete-account` y `coach-create-client`), luego `verify_jwt:true`, y
  dentro validar que el que llama es el coach o se pushea a sí mismo — ~2-3 h. **Es exactamente el
  mismo anti-patrón que el gotcha ya escrito** ("escrituras autenticadas van por el CLIENTE, nunca
  por fetch crudo con Bearer"): se arregló en `subscribePush` (v323) y quedó vivo en `pushToClient`.

### H2 · 🟡 `app_errors` acepta INSERT de cualquiera con la anon key, sin tope entre podas
- **Qué pasa:** la policy `app_errors_insert` es `FOR INSERT TO {anon,authenticated} WITH CHECK
  (true)` y `anon` tiene el grant de INSERT en las 9 columnas. No hay trigger, ni policy
  restrictiva, ni límite de tamaño en `msg`/`ctx`.
- **Dónde:** `pg_policies` → `app_errors_insert`, `with_check = true`. Confirmado además por el
  propio linter (`rls_policy_always_true`, WARN).
- **Evidencia (cadena completa, sin escribir nada — la auditoría es read-only):**
  1. `information_schema.column_privileges` → `anon -> INSERT` en las 9 columnas.
  2. `pg_policies` → policy permisiva de INSERT que nombra a `anon`, `WITH CHECK true`.
  3. `pg_policy where not polpermissive` → **0 restrictivas**; `pg_trigger` → **0 triggers**.
  Con privilegio + una permisiva que pasa + cero restrictivas, Postgres inserta. **Control que
  valida el método:** `user_data` tiene los mismos grants de anon pero ninguna policy que lo
  nombre, y ahí el `select` como anon dio **0** — o sea, la diferencia la hace la policy, y
  `app_errors` es la única que la tiene.
- **Intenté tumbarlo así:** busqué el tope. **Sí existe y casi tumba el hallazgo**: el cron
  `avi-errors-prune` (08:30 UTC diario) corre `app_errors_prune()`, que borra >30 días **y** deja
  solo las 5.000 más recientes. Sobrevivió porque **la poda es diaria**: entre dos corridas no hay
  ningún límite, y el proyecto está en Free (500 MB de base). Nadie puede leer lo insertado
  (SELECT es solo del coach), así que es vandalismo/ruido, no fuga.
- **A quién le pasa:** hoy a nadie — nadie tiene motivo. El riesgo es que un tercero llene la base
  y **las escrituras fallen para todos los usuarios reales** durante hasta 24 h.
- **Costo del arreglo:** una línea de config. Lo más barato que no rompe la telemetría: un `CHECK`
  de longitud en `msg`/`src`/`ua` (ya vienen recortados por el cliente a 500/300/300, así que no
  cambia nada real) + bajar la poda a cada hora en el cron. Si se quiere de raíz: mover el insert
  a una RPC `SECURITY DEFINER` con rate-limit por IP, como ya se hizo con `_cm_rate`.

### H3 · 🟡 Astrid —la asesorada más constante, 32 sesiones— no tiene peso ni altura, y la personalización se apaga en silencio
- **Qué pasa:** 2 asesorados reales (Astrid Beltran, Stevan Guerrero) no tienen `weight` ni
  `height` en su `profile`. Nada se rompe visiblemente — y por eso nadie lo ha notado.
- **Dónde:** query sobre `user_data`; `avi-core.js:401` (`bmiFrom`), `:407` (`bodyLoadProfile`),
  `:1614` (`waterGoalGlasses`).
- **Evidencia:** de 24 filas de asesorado, 3 sin peso/altura — una es la cuenta QA. Astrid:
  `peso —, altura —, 5 rutinas, 32 sesiones, último login 21-jul`.
- **Intenté tumbarlo así:** el briefing decía que esto "rompe el IMC y `bodyLoadProfile`". **Fui a
  leer las funciones y NO rompe nada**: `bmiFrom` devuelve `null` si falta cualquiera de los dos, y
  `bodyLoadProfile` cae a `'normal'`; `waterGoalGlasses` cae al fallback de 8 vasos. Cero
  excepciones, cero pantalla rota. Así que **bajé la severidad de 🔴 a 🟡**: el daño real es que a
  la persona más constante de la app el generador nunca le considera la composición corporal y su
  meta de agua es genérica.
- **A quién le pasa:** a Astrid (32 sesiones) y a Stevan. Silencioso para el coach.
- **Costo del arreglo:** cero backend. Es de producto: que el perfil pida peso/altura cuando
  faltan, o que el coach lo vea marcado en la ficha. **No se arregla en Supabase** — la app es
  offline-first y el teléfono pisaría el dato (gotcha vigente).

### H4 · 🟡 3 cuentas de `auth.users` sin fila en `user_data`
- **Qué pasa:** 28 cuentas en `auth.users`, 25 filas en `user_data` → 3 cuentas existen para
  iniciar sesión pero no tienen datos. 0 filas huérfanas en sentido contrario (integridad FK sana).
- **Dónde:** query de conteo cruzado `auth.users` ↔ `user_data`.
- **Evidencia:** `auth_users_total 28 · user_data_rows 25 · auth_sin_user_data 3 ·
  user_data_sin_auth 0 · auth_nunca_confirmado 1 · auth_nunca_login 2`.
- **Intenté tumbarlo así:** miré si eran cuentas fantasma de Google (hay una vía de limpieza,
  `delete-account {ghost:true}` en `app-3-coach.js:528`). 2 de las 3 **nunca iniciaron sesión** y 1
  nunca confirmó el correo → encajan con registros abandonados a mitad, no con corrupción.
- **A quién le pasa:** a nadie hoy. Es ruido que infla el conteo de usuarios y puede confundir
  cualquier métrica de adopción que cuente sobre `auth.users` en vez de `user_data`.
- **Costo del arreglo:** una línea de decisión del PO (borrarlas o no). No urge.

---

## Premisas que me dieron y RESULTARON FALSAS al medirlas

### ❌ «Los 15 registros de `app_errors` tienen `uid` NULL → la telemetría no identifica a nadie»
**Falso a medias, y la mitad importante es falsa.** La **columna** `uid` sí está NULL en las 17
filas — porque `_logAppError` inserta con `fetch` crudo y `Bearer SB_KEY` (`app-1-infra.js:156`),
así que `auth.uid()` (el default de la columna) resuelve a NULL. **Pero el uid SÍ viaja**, dentro
del jsonb: `ctx:{…, uid:(typeof _authUid!=='undefined'&&_authUid)||null}` (`app-1-infra.js:160`).

Medido: **13 de 17 filas traen un uid real**, de **5 personas distintas**, y todas existen en
`auth.users`. Cruzando con `user_data`, la telemetría dice con nombre y apellido quién sufrió qué:

| Fecha | Error | Build | Quién |
|---|---|---|---|
| 27-jul | `Uncaught ReferenceError: _dia1 is not defined` | avi-v403 | **Andres Martínez** |
| 29-jul | `Uncaught SyntaxError: Unexpected end of input` | avi-v410 | Andres Martínez |
| 31-jul | `Failed to update a ServiceWorker` | avi-v417 | **Astrid Beltran** |
| 30-jul | `Failed to update a ServiceWorker` | avi-v416 | Samuel Cifuentes |
| 22-jul | `Uncaught SyntaxError` | avi-v383 | Luz Rodríguez |

Las 4 filas sin uid son de gente **no logueada** — que es el comportamiento correcto.
**Consecuencia práctica:** no hay que "arreglar" la telemetría para que identifique; ya identifica.
Lo único que conviene es que la consulta del coach lea `ctx->>'uid'`. Y de regalo, **`app_errors.build`
ya dice en qué versión iba cada persona** — que es justo el pendiente abierto «falta poder saber en
qué versión va cada asesorado», resuelto para las 5 personas que han tenido algún error.

### ❌ «`_cm_rate`/`_cpost_rate`/`_cc_rate` sin RLS → rate-limits evadibles»
Sigue siendo falso, y ahora hay una prueba extra: **el advisory ya ni siquiera se emite.**
`get_advisors(security)` de hoy no trae ningún `rls_disabled`. Medido de nuevo:
`has_table_privilege` = **false** en las 4 operaciones para `anon` y `authenticated` en las 3
tablas. Postgres deniega por privilegio antes de mirar RLS. No tocar.

### ❌ `Uncaught ReferenceError: migratePhotosToStorage is not defined` (3 veces en producción)
Lo vi en la telemetría y parecía un 🔴 vivo. **Ya está arreglado en HEAD:** `app-1-infra.js:1068`
lo llama con guarda `typeof migratePhotosToStorage==='function'`, y hay un test de regresión que
exige esa guarda (`avi.test.js:4638`). Las 3 ocurrencias son de builds v375/v393/v403, ninguna
posterior. Cerrado.

---

## Sospechas sin probar

1. **Los fallos de actualización del Service Worker podrían explicar el bug del perfil de coach
   «que le aparece a todos».** 7 de 17 filas de telemetría son `Failed to update a ServiceWorker …
   An unknown error occurred when fetching the script`, en Astrid, Samuel y Natalia, **una por
   despliegue aproximadamente, la última HOY en v417**. Si la actualización falla, el teléfono se
   queda con el bundle viejo en caché — que es exactamente la hipótesis del PO. **No lo probé:**
   el mensaje es compatible con una caída de red transitoria que se reintenta al siguiente arranque,
   y no tengo forma de saber si alguien se quedó *pegado*. Para probarlo: registrar la versión
   activa por usuario (un campo en `user_data` o una fila de telemetría al arrancar) y comparar
   contra el `avi-vNNN` desplegado.
2. **`Uncaught SyntaxError: Unexpected end of input` en `:4:87` es casi seguro una extensión del
   navegador, no la app.** Aparece 5 veces en 4 versiones distintas (v310, v353, v383, v389, v410) y
   **4 de las 5 son de la misma persona, Andres Martínez**. El `src` no tiene archivo (`:4:87`,
   `#:4:87`), lo que apunta a script inyectado. No lo probé porque haría falta su dispositivo.
3. **Cualquier autenticado puede insertarse en la lista de asesorados del coach.**
   `user_data_insert` solo exige `auth.uid() = user_id`; **nada restringe `coach_id`**, así que un
   registro nuevo puede nacer con `coach_id` = uid de Camilo y aparecer en su panel. Hoy eso *es*
   el flujo de auto-registro (por diseño), pero no tiene tope: no sé si alguna de las 13 cuentas
   auto-registradas llegó así de forma no deseada. Para probarlo haría falta decidir antes con el
   PO qué cuenta como legítimo.

---

## Lo que revisé y está SANO
- **Aislamiento entre asesorados** — impersonando a un asesorado real: 1 fila propia, **0 ajenas**,
  0 en `push_subscriptions`, 0 en `app_errors`, 0 en `apex_data`.
- **`anon` no lee nada** en las 4 tablas que tienen grants (`apex_data`, `user_data`,
  `push_subscriptions`, `app_errors`): **0 filas en las 4**, medido con `set local role anon`.
- **`apex_data` está sellada** — tiene todos los grants para anon pero RLS activa **sin ninguna
  policy** = deny total. El advisory lo marca solo como INFO y es correcto dejarlo así.
- **Respaldos VIVOS** — último snapshot `2026-07-31 08:00 UTC` (hace 6,5 h), 21 snapshots, 28 MB,
  cron `apex-daily-backup` activo. El runbook sigue siendo cierto en su capa 1.
- **5 cron activos y coherentes**: backup 08:00, poda de errores 08:30, y las 3 notificaciones
  (12:00 / 15:00 / 20:30 UTC = 7am / 10am / **3:30pm** Colombia — la corrección del pico de entrenos
  de la ronda anterior está aplicada).
- **Las 4 RPC de moderador verifican al moderador dentro** (`cmty_mod_delete_post`,
  `_delete_comment`, `_reports`, `_resolve` mencionan `_is_moderator`/`community_moderators`). Los
  8 WARN de `SECURITY DEFINER` del advisor son **por diseño**, no hallazgos.
- **Grants de UPDATE recortados** en las tablas de comunidad (`au_upd = false` en `community_posts`,
  `_comments`, `_reactions`, `_messages`, `_gym_members`) — el endurecimiento tras el hallazgo del
  `kind='streak'` falso sigue en pie.
- **`community_profiles` con SELECT column-level** (c10) intacto; `community_reports` solo INSERT.
- **Integridad referencial**: 0 filas de `user_data` sin cuenta de auth.
- **`refresh_snapshot` va en v7**, como dice el briefing.
- Las otras 4 edge functions (`delete-account`, `coach-create-client`, `refresh_snapshot`,
  `activate_public_profile`) **sí exigen JWT** (`verify_jwt: true`).

---

## Lo que NO alcancé a revisar
- **Paridad `avi-core.js` ↔ `refresh_snapshot` v7**: confirmé la versión pero **no comparé la
  lógica espejada** (`communitySnapshot`, `STREAK_MILESTONES`, el guard de `new Date(null)`). Existe
  `c2_parity_snapshot.cjs` para eso; no lo corrí. **Es el hueco más grande de mi barrido** y el
  briefing lo pedía explícitamente.
- **`get_logs`**: no lo consulté. No revisé consultas lentas ni errores 4xx/5xx de las últimas 24 h
  (frente 6). Con 22 usuarios asumí que no había nada de rendimiento, pero **es un supuesto, no una
  medición**.
- **Escenario B del runbook** (recrear proyecto + cuentas auth punta a punta): sigue sin ensayarse,
  igual que decía `docs/runbook-restore.md`. Solo verifiqué la capa 1.
- **Capa 2 de respaldo** (el JSON local en `Desktop\AVI\backups\` vía Tarea de Windows): no
  comprobé que la tarea siga corriendo ni la fecha del último archivo — está fuera de Supabase y no
  lo miré.
- **`activate_public_profile`** (v2): no leí su código, solo confirmé que exige JWT.
- **Storage**: no audité cómo están hoy las policies del bucket `avatars` ni el pendiente conocido de
  fotos por `uuid` vs id legacy.
- **No ejecuté ninguna escritura** (ni en transacción con rollback) por la regla read-only, así que
  H2 va probado por cadena de privilegios+policies, no por un INSERT real.
