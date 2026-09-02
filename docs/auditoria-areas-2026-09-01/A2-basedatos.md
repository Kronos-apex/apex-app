# A2 · Base de datos, seguridad y edge functions — Andrés Q. (DBA)

## Veredicto en una frase
El aislamiento entre personas SÍ funciona (probado impersonando, no solo leído) y las tres edge
functions revisadas están bien cerradas; pero corriendo el propio harness de seguridad que el
briefing me pidió correr dejé una prueba en un estado que hoy grita "hueco" donde no lo hay, y las
tres tablas de rate-limit de comunidad viven hoy sin ninguna alarma — ni siquiera la que el equipo
ya había aprendido a ignorar.

## Los 3 más grandes

1. 🔴 **El propio harness de RLS, corrido tal como el briefing pedía, dejó una prueba QA rota que
   hoy reporta un "hueco de aislamiento" que no existe.**
   - Evidencia: corrí `node scripts/e2e/_verify-rls-aislamiento.mjs` (14/14 verde) y después
     `node scripts/e2e/_sabotaje-rls.mjs` (6/6 como se esperaba). El caso S4 de la matriz de
     sabotaje reescribe temporalmente una línea del harness para que el asesorado QA intente
     `PATCH` sobre **su propia fila** (`coach_id = su propio uid`) — algo que la RLS SÍ permite,
     porque es su fila. Ese `PATCH` **se ejecutó de verdad** (HTTP 200, fila afectada) y la matriz
     solo restaura el archivo `.mjs`, nunca la fila que acaba de escribir. Verificado con SQL de
     servicio: `user_data` del asesorado QA (`9418640a-2e55-…`) quedó con
     `coach_id = 9418640a-2e55-…` (él mismo) en vez de `d69a24f5-d9ab-…` (el coach QA). Al volver
     a correr `_verify-rls-aislamiento.mjs` inmediatamente después: `❌ control: el coach QA SÍ ve
     a su propio asesorado — 0 fila(s)` → `❌ 1 fallo(s) — HAY UN HUECO DE AISLAMIENTO`.
   - Intenté tumbarlo así: repetí la corrida tres veces, confirmé con `pg_policies` que la política
     de `user_data` sigue siendo exactamente `auth.uid()=user_id OR auth.uid()=coach_id` (sin
     cambios), y reproduje el PATCH manual con la cuenta QA para confirmar que el escritor
     legítimo (el propio dueño de la fila) es quien lo causa — no es un tercero colándose. No hay
     ningún hueco de RLS: hay una prueba que se comió su propio fixture.
   - Qué cuesta arreglarlo: **restaurar el dato** (1 UPDATE, decisión del PO/quien tenga escritura):
     ```sql
     update public.user_data set coach_id = 'd69a24f5-d9ab-49e1-90ad-237fd15c71c0'
      where user_id = '9418640a-2e55-414a-9952-c6030fc62dd9';
     ```
     y **arreglar la matriz** (`scripts/e2e/_sabotaje-rls.mjs`, caso S4): antes de aplicar ese
     parche, fotografiar el `coach_id` real del asesorado QA con la llave de servicio y
     restaurarlo al final del caso, igual que ya hace el caso de escritura contra `COACH_REAL`
     unas líneas más abajo en el mismo archivo. Es una asimetría dentro del propio archivo: un
     caso restaura lo que toca y el otro no.

2. 🔴 **Las tres tablas de rate-limit de comunidad (`_cm_rate`, `_cpost_rate`, `_cc_rate`) hoy no
   tienen NINGUNA alarma — ni siquiera la que ya se había aprendido a ignorar.**
   - Evidencia: `get_advisors(security)` corrido hoy (2026-09-01) — **no aparece ninguna entrada
     sobre estas tres tablas**, ni crítica ni de ningún nivel. En cambio, la nota del 2026-07-30 en
     CLAUDE.md registra que el advisor SÍ las marcaba «crítico» ese día. Confirmé por SQL que
     `relrowsecurity=false` en las tres (sigue igual) y que `authenticated`/`anon` no tienen
     ningún grant (`has_table_privilege` → `false` en las tres, para ambos roles) — hoy siguen
     protegidas SOLO por la ausencia de un `grant`. Y busqué en `avi.test.js` y en
     `scripts/e2e/*.mjs` cualquier candado que afirme «estas tres tablas no tienen grants» —
     **no existe ninguno** (sí existe ese patrón para otras clases, p. ej. el espejo de CHECK de
     `food_barcodes` o el conteo de `security definer` de F6/F7, pero no para estos grants).
   - Intenté tumbarlo así: repetí la consulta del advisor dos veces por si era caché, y confirmé
     con `has_table_privilege`/`has_column_privilege` (no solo `information_schema`, que puede
     mentir sobre grants por columna) que el estado real de permisos no cambió — estas tablas
     siguen tan cerradas como el 30-jul. El problema no es que estén abiertas hoy: es que **la
     única señal automática que existía sobre ellas se apagó sola**, y nada la reemplazó.
   - Qué cuesta arreglarlo: un test estático de una función (`grep` sobre `pg_class`/
     `has_table_privilege` para las tres, contra producción, igual que ya existe para el `.sql` de
     otras tablas) que falle si algún día aparece un `grant` a `anon`/`authenticated` sobre estas
     tres. Menos de 30 líneas, mismo patrón que los espejos de CHECK que ya existen en el repo.

3. 🟠 **El baseline de esta ronda dice «2 coaches» y en producción hay UNO — y tres candados del
   sistema tienen el UID de Camilo escrito a mano, lo que los deja ciegos el día que aparezca un
   segundo coach real.**
   - Evidencia: `select role, count(*) from user_data group by role` → `coach: 2`. Pero de esos 2,
     uno es **la cuenta QA** (`🧪 QA COACH`, uid `d69a24f5-…`, aislada a propósito, «no sale en el
     panel de Camilo»). El único coach de producción es `0a6484ed-…` (Camilo, alias
     "Andrés Martínez" en su perfil de Google). El «2» del baseline cuenta la cuenta de pruebas
     como si fuera un segundo coach real — no lo es. Y sobre ese supuesto (que sí habrá un segundo
     coach algún día, documentado en el roadmap como AVI GYM multi-coach), tres candados de este
     repo tienen el UID de Camilo **hardcodeado**, no derivado de ninguna tabla de roles:
     `coach-create-client/index.ts` (`COACH_UID = "0a6484ed-…"`, así que un segundo coach real
     recibiría `403 forbidden_not_coach` al intentar crear un asesorado desde la app) y la policy
     `app_errors_select_coach` (`auth.uid() = '0a6484ed-…'::uuid`, así que un segundo coach jamás
     vería los errores de sus propios asesorados). Ninguno de los dos falla INSEGURO (los dos
     deniegan de más, no de menos), así que hoy no es un hueco de seguridad — es una mina para el
     día que el negocio crezca, y confirma que «2 coaches» como número no describe lo que hay hoy.
   - Intenté tumbarlo así: crucé `user_data.role='coach'` contra `auth.users` por email — el UID
     `0a6484ed-…` resuelve a `camilo06197@gmail.com` (el correo del PO), y el segundo `coach` es
     literalmente la cuenta rotulada `🧪 QA COACH (harness — no borrar)`. No hay ningún tercer
     coach escondido con otro criterio (probé también `community_moderators`, que solo tiene a
     Camilo, y `coach_settings is not null`, que da la misma pareja).
   - Qué cuesta arreglarlo: decisión del PO sobre CUÁNDO conviene generalizar (mientras haya un
     solo coach real, el hardcode no hace daño); si se generaliza, ambos candados pasan a comparar
     contra `role='coach'` en vez de un UID literal — el resto de la RLS de `user_data` YA es
     genérica (no depende de qué coach sea).

## Todos los hallazgos

- 🟡 **`food_barcodes` (el escáner de códigos) sí sigue el mismo patrón arquitectónico que
  `avi_showcase` antes de v525 — «es mi fila» como único gate de un INSERT que cualquier cuenta
  puede disparar — pero está mitigado y hoy no es un hallazgo urgente.** Verificado: `authenticated`
  tiene `grant insert` **por columna** exactamente sobre las 9 columnas que `barcodeDraft()`
  (avi-core.js) rellena — `created_by` se deja fuera a propósito y se resuelve por el `DEFAULT
  auth.uid()` de la tabla, así que el insert real de la app SÍ funciona (mi primera lectura con
  `has_table_privilege` decía `INSERT:false` y me hizo sospechar que el escáner estaba roto; era
  un falso positivo mío — `has_table_privilege` no ve los grants por columna, hay que usar
  `has_column_privilege` o `information_schema.column_privileges`). La diferencia con
  `avi_showcase` es que aquí el daño de que cualquiera escriba está contenido: no es
  pública (requiere `authenticated`), nace `verified=false`, no la lee el generador de menús, y
  hay cola de moderación con `fb_delete`. Lo que SÍ falta: no hay ningún límite de tasa sobre
  cuántas filas puede insertar una sola cuenta — un `curl` en bucle podría llenar la cola de
  moderación de basura sin que nada lo frene (hoy la tabla tiene 0 filas, así que el costo de
  arreglarlo hoy es bajo y no urge).
- 🟡 **El campo `role` de `community_profiles` (la insignia "COACH" del perfil público) se puede
  auto-otorgar con DOS cuentas de auto-registro, una sola persona.** `activate_public_profile`
  asigna `role:'coach'` si existe alguna fila de `user_data` con `coach_id = mi_uid AND user_id !=
  mi_uid`. Como `user_data.coach_id` es un campo que el propio dueño de la fila puede escribir (es
  la misma mecánica que usa `requestCoach()`, documentada como intencional — clase F7), una cuenta
  B puede apuntar su propio `coach_id` al uid de la cuenta A, y A pasa a ver "role: coach" al
  llamar la función. El comentario del código dice que esto "no es forgeable por un atacante
  SOLO" — cierto en sentido estricto, pero el auto-registro es libre y gratis, así que una sola
  persona con dos correos desechables sí puede hacerlo. Verifiqué el impacto real: `role` en
  `community_profiles` **solo pinta una insignia cosmética** ("👑 Perfil de coach" / chip "COACH")
  en tres sitios de `app-7-community.js` — no desbloquea ninguna lectura, escritura ni RPC
  adicional. Riesgo: engaño social dentro de Comunidad (alguien se hace pasar por coach frente a
  asesorados reales), no fuga de datos.
- 🟢 **`push_subscriptions`: los 2 duplicados que quedan después de v535 son de la clase correcta
  (endpoints DISTINTOS), no la que v535 cerró.** Confirmado: el trigger `push_dedupe_endpoint`
  (migración `20260824_push_dedupe_endpoint.sql`) sigue vivo y colapsa por `(client_id, endpoint)`.
  Las 12 filas / 10 `client_id` de hoy tienen, en los 2 casos con más de una fila (Samuel y
  Natalia), endpoints **distintos** — el control que la propia migración documenta para separar
  "duplicado real" de "dos aparatos". Respondiendo la pregunta del briefing — **sí, la fila queda
  huérfana cuando el endpoint ROTA por completo** (no solo cuando rotan las claves bajo el mismo
  endpoint, que es lo que v535 sí cubre): el trigger deduplica por endpoint, así que un aparato
  que obtiene un endpoint nuevo de verdad (reinstalar la PWA, limpiar datos del sitio, cambiar de
  gestor de push) dejará viva la fila del endpoint viejo hasta que `send-push`/`daily-notifs`
  reciban un 410/404 al intentar usarla — que puede tardar mucho o no llegar nunca si el proveedor
  de push no libera el token. El caso de Natalia (filas del 7-ago y de hoy, 25 días de separación)
  es compatible con esta lectura, aunque no puedo probar sin acceso al dispositivo si es un
  segundo aparato real o uno abandonado. No es una fuga de datos: es una fuente lenta de pushes
  redundantes.
- 🟢 **`apex_data` / `apex_data_backups`: sanas, y cerradas a `anon`/`authenticated` aunque
  `apex_data` figure con un `grant SELECT` a ambos roles.** Verificado en vivo con la llave
  pública: `GET /rest/v1/apex_data?select=key` → `200 []` (no error, cero filas) — porque
  `apex_data` tiene RLS **habilitada y sin ninguna política**, que en Postgres es
  denegar-por-defecto para todo el que no sea el dueño o `service_role`, sin importar el grant de
  tabla. El advisor lo marca como `rls_enabled_no_policy` (nivel INFO, no crítico) — y con razón:
  es el estado MÁS cerrado posible, más estricto que tener una política. `apex_data` (18 filas) es
  el blob legado congelado desde junio (todas las `updated_at` son de antes del corte a Auth real);
  incluye 2 llaves fósiles con el prefijo `coach_andres:` de un esquema mono-coach anterior a la
  migración — basura inerte, sin riesgo, pero vale la pena purgarla si algún día se hace limpieza.
  `apex_data_backups` (25 filas) sigue la retención documentada — 14 diarios + domingos hacia atrás
  (verifiqué las fechas: Jun 7/14/21/28, Jul 5/12/19/26, Ago 2/9/16 son domingos; Ago 19 en
  adelante es diario) — sin huecos ni filas fantasma. `user_data` tiene 27 filas = 2 coach + 25
  client, cuadra exacto con el baseline.
- 🟡 **`app_errors`: bien cerrada para lectura (solo Camilo, por policy), abierta sin límite para
  escritura (por diseño, pero sin ningún tope).** `app_errors_select_coach` restringe el SELECT a
  `auth.uid() = '0a6484ed-…'` — nadie más, ni siquiera otro coach hipotético, puede leer la
  telemetría de errores (mismo hardcode que el hallazgo #3). `app_errors_insert` permite INSERT a
  `anon` y `authenticated` con `with_check: true` — sin ninguna validación de tamaño ni límite de
  tasa. Es necesario que sea así (hay que poder registrar un error ANTES de iniciar sesión), pero
  hoy nada impide que alguien mande miles de filas de basura por `curl`. Con 16 filas en meses de
  vida, no es urgente. Aparte, leyendo el contenido: 12 de las 16 filas son el mismo error
  ("Failed to update a ServiceWorker... unknown error") repartido en varios usuarios y builds — no
  parece grave (fallo de red al refrescar el Service Worker, benigno); pero 4 filas son
  "Uncaught SyntaxError: Unexpected end of input" en `:4:87`, **siempre** en la cuenta de Camilo
  (`0a6484ed-…`), repetidas en v436, v448, v470, v479 y v507 — 4 versiones distintas con el MISMO
  error en el MISMO punto, una de ellas con `src` mostrando `?avi-chat=<uid>` (deep link a un chat).
  No alcancé a diagnosticar la causa raíz (necesitaría los archivos servidos exactos de cada build
  y no es del alcance de A2), pero es un patrón recurrente sin dueño — nadie lo ha investigado
  nunca porque nadie había mirado `app_errors` como conjunto.
- 🟢 **Diana Ramírez (`c78c9817-…`), la única fila con `coach_id` nulo, es un caso SANO de RLS —
  no un hueco.** Es autoregistrada, tier `libre`, nunca pidió coach (`wantsCoach: null`), con 3
  rutinas auto-generadas y actividad hasta el 26-ago. Bajo la policy de `user_data`
  (`auth.uid()=user_id OR auth.uid()=coach_id`), con `coach_id=null` **nadie más que ella misma**
  puede leer o escribir esa fila — ni siquiera Camilo. Es el resultado correcto y más seguro que
  puede dar esa política ante un dato ausente. El costo es de negocio, no de seguridad: es
  invisible para cualquier coach (no aparece en ningún panel), y ya está cubierto por el estudio
  de retención de otra ronda (13 de 22 inalcanzables).
- 🟢 **Las tres edge functions revisadas resuelven identidad por JWT server-side, no por nada que
  el cliente pueda falsificar.** `activate_public_profile`: exige `Authorization: Bearer <jwt>`,
  lo resuelve con `admin.auth.getUser(token)`, y solo escribe la fila `community_profiles` del
  propio `uid` resuelto — nunca uno que venga en el body. `coach-create-client`: mismo patrón, y
  además compara el uid resuelto contra `COACH_UID` fijo (403 si no coincide) antes de tocar nada;
  la contraseña de la cuenta creada pasa por su propio chequeo de fuerza server-side (réplica de
  `passwordProblem`). `daily-notifs`: no usa JWT de usuario (la llama un cron, no una persona) sino
  un secreto de 32 bytes leído por RPC solo-`service_role` desde `private.fn_secrets` — confirmé
  que `verify_jwt:false` en la plataforma es CORRECTO aquí (el candado real está adentro, en la
  comparación de secretos) y no es el bug de v426 (`send-push` con la anon key pública) repetido.
  Las tres tienen CORS restringido a `https://kronos-apex.github.io` (cosmético contra navegador,
  no contra `curl`, pero consistente con el resto del repo).
- 🟢 **Advisor de seguridad, triado completo (corrido hoy):** ninguna entrada CRÍTICA. 3×
  `rls_enabled_no_policy` (INFO, es el estado MÁS seguro, ver arriba) · 1× `extension_in_public`
  (pg_net, cosmético) · 9× `authenticated_security_definer_function_executable` (las RPCs de
  comunidad y del escáner — todas ya auditadas en rondas anteriores y con su propio gate interno
  de moderador/dueño: `fb_verify`/`fb_delete`/`fb_pending` exigen `_is_moderator`;
  `cmty_mod_*` exigen lo mismo por su nombre y por auditorías previas) · 1× `auth_leaked_password_
  protection` (Pro-only, decisión ya tomada de no pagarlo, documentada). **Advisor de rendimiento:**
  todo INFO/WARN de bajo impacto con la escala actual (25 personas) — FKs sin índice de cobertura
  y políticas RLS que re-evalúan `auth.<fn>()` por fila en vez de `(select auth.<fn>())`; mecánico
  de arreglar cuando la comunidad crezca, no muerde hoy.

## Sospechas sin medir

- El error recurrente `Uncaught SyntaxError: Unexpected end of input` en la cuenta de Camilo
  (4 versiones distintas) huele a una carga parcial de script bajo red móvil o a un choque con el
  Service Worker durante una actualización — no lo medí a fondo (necesitaría los `sourcemap`/
  archivos exactos de esas versiones, fuera del alcance de A2).
- No pude confirmar si la segunda fila de `push_subscriptions` de Natalia es un segundo aparato
  real o un aparato abandonado — solo puedo ver la base de datos, no su teléfono.
- No verifiqué si existen más lugares en el código (fuera de los tres que encontré) con el UID de
  Camilo escrito a mano — busqué por el literal `0a6484ed` en `.sql` y `.ts` pero no en los 8
  archivos `.js` de la app (ahí el patrón habría sido product/UX, no DB/seguridad, y queda fuera
  de mi área).

## Qué NO miré y por qué

- No revisé a fondo `send-push`, `delete-account` ni `refresh_snapshot` — el briefing pidió
  específicamente las otras tres; las tres restantes ya están documentadas y verificadas en
  auditorías/gotchas anteriores (v426, v418, C2) y no formaban parte del delta v528→v563.
- No intenté un `grant` real de prueba sobre `_cm_rate`/`_cpost_rate`/`_cc_rate` para confirmar en
  vivo qué se filtraría — sería alterar producción, prohibido por el mandato de solo-lectura. La
  evidencia del hallazgo #2 es por AUSENCIA de candado, no por explotación directa.
- No audité el contenido semántico de nutrición, catálogo de ejercicios ni comunidad (moderación,
  feed, DMs) — son áreas de otros informes (A3-A9) y no son de base de datos/seguridad per se.
- No corrí un censo completo de todas las tablas `community_*` una por una (friendships, follows,
  reactions, reports, gym_members, moderators) — ya tienen sus propios harnesses versionados
  (`_verify-community`, `_verify-dm`, `_verify-feed`, etc.) corridos y documentados en rondas
  anteriores, y el delta v528→v563 no las tocó de forma sustancial según el changelog de versiones.
- No medí el tamaño ni la retención de las tablas `community_*` (mensajes, posts, comentarios) —
  el briefing solo pidió `apex_data`/`user_data`/`apex_data_backups`/`app_errors`.
