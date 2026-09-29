# R14 · CUENTAS Y SERVIDOR — Andrés Q. (DBA) + Julián (QA estático)

## Veredicto en una frase
El servidor está bien construido (identidad real en las 6 edge functions, ningún candado de
negocio vive en un campo que el cliente pueda escribirse), pero **`delClient` no revoca el
acceso de un asesorado auto-registrado** (puede volver a entrar con su contraseña vieja y la
app le fabrica una ficha nueva sola) y **`apex.com`/`avi.com` — los 13 correos "de prueba" —
son dominios REALES con correo activo en Microsoft 365, ajenos al PO**, así que un
«olvidé mi contraseña» sobre esas cuentas (una de ellas de un menor de 15 años) viaja a un
buzón que no controla ni el coach ni el asesorado.

## Los 3 más grandes

**1. `apex.com` y `avi.com` reciben correo de verdad — y una de las 9 cuentas reales es de un
menor.** Medido con `nslookup -type=mx`: los dos dominios tienen MX apuntando a
`*.mail.protection.outlook.com` (Microsoft 365) — no son inventados, alguien los tiene
registrados y con correo activo, y no son de Camilo (su dominio real es `avientrena.com`,
verificado: NS en Vercel). De las 13 cuentas de acceso bajo esos dominios, **9 son
asesorados reales del coach** (andrea, karen, miguel, nadia, salomon — `@apex.com` — y
carla, dario, luz, nayla — `@avi.com`), 2 son las cuentas QA de los harness
(`qa-…@apex.com`, `qa-…@apex.com`, aisladas bajo su propio coach QA, documentadas)
y 2 son cuentas sin ficha (`oculto@avi.com`, `oculto@avi.com`, ver hallazgo #3 abajo). El
flujo «¿Olvidaste tu contraseña?» (`pedirResetPass` → `AUTH.resetPassword` →
`supabase.auth.resetPasswordForEmail`) manda el enlace de recuperación por el SMTP de
Supabase al correo tal cual está registrado — sin distinguir si el dominio es del negocio.
Si alguien pide recuperar `oculto@apex.com` (asesorado real, **15 años**, caso ya conocido
del consentimiento de menores v570-v573) o cualquiera de los otros 8, el correo sale hacia
la infraestructura de Microsoft 365 de quien sea dueño de `apex.com`/`avi.com` hoy — no hacia
Camilo ni hacia el asesorado. **Cómo lo intenté tumbar:** comprobé que la app NO distingue
dominio en ningún punto del flujo (`emailRe` en `coach-create-client` solo exige formato
`x@y.z`, sin lista blanca de dominios) y que Supabase responde igual exista o no la cuenta
(anti-enumeración, así que no hay forma de confirmar sin mandar el correo — prohibido por las
reglas). No pude confirmar que exista un buzón real en `oculto@apex.com` (solo que el DOMINIO
acepta correo); es el límite de lo medible sin infringir la regla de cero-correos.
**Costo de arreglarlo:** exigir dominios propios (`@avientrena.com` o los que el coach
controle) al crear una cuenta de acceso, o —más simple y ya construible hoy— que el coach
reemplace esos 9 correos por unos reales del asesorado (su Gmail, su Outlook) desde
«Editar acceso» en la ficha (`_updateClientAccount`, ya existe).

**2. `delClient` (el coach borra un asesorado) no revoca el acceso de quien se auto-registró
— vuelve a entrar con su contraseña vieja y la app le fabrica una ficha nueva sola.**
`delClient` (`app-3-coach.js:2765`) solo llama `UD.deleteClientRow(delId)`: borra la fila
`user_data`, nunca toca `auth.users`. Eso es correcto para un asesorado creado por el coach
(`coach-create-client`), porque su `user_metadata` en Auth solo trae `{name}` — sin
`goal`/`level` — así que al volver a entrar, `_enterAuthSession` (app-3-coach.js:692) ve
`row=null`, arma el perfil desde la metadata, `_complete` da `false`, y dispara el
autoborrado del "fantasma" (`delete-account` con `{ghost:true}`, que SÍ borra `auth.users`
porque ya no hay fila `user_data`). **Pero para un asesorado que se AUTO-REGISTRÓ**
(`signupClient`, `app-3-coach.js:1643`), el `signUp` guarda el perfil COMPLETO en
`user_metadata` (`goal,level,days,sex,age,weight,height,place,phone,notes,selfReg,consent`):
si el coach lo elimina y esa persona vuelve a entrar con su correo y clave viejos (que
`delClient` nunca invalidó), `_complete` da `true` y el código llama
`_provisionFreeClient(authUser,prof)` — **le crea una ficha nueva automáticamente**, con
rutina auto-generada, `tier:'libre'`, sin que el coach se entere. **Víctima hoy:** ninguna
confirmada — de los 7 huérfanos y las cuentas revisadas, ninguna es un `delClient` reciente
de un `selfReg:true` que haya vuelto a entrar; es un hueco estructural verificado por código,
no un incidente medido. **Cómo lo intenté tumbar:** revisé si `delClient` tenía alguna otra
vía de invalidación (cola de borrado pendiente, flag de suspensión) — no la tiene; y revisé
si `MS.canLogin` lo bloquearía — no aplica, porque `row` es `null` y ese chequeo vive DESPUÉS
de tener una fila. **Costo:** que `delClient`, en modo auth, invoque un modo de borrado/baneo
de `auth.users` (o al menos invalide la contraseña) para asesorados `selfReg`, en vez de
confiar en que la metadata quede incompleta.

**3. Dos de los 7 huérfanos son la MISMA persona reintentando: el registro por correo se
abandona y el de Google lo completa un minuto después — dos veces.** `oculto@avi.com`
(creada 12:13:02, sin ficha, nunca volvió a entrar) y `oculto@gmail.com`
(creada 12:13:02+52min vía Google, SÍ tiene ficha) son la misma Dora Pilar. `oculto@hotmail.com`
(creada 13:33:09, nunca confirmada) y `oculto@gmail.com` (Google, creada 13:34:22 —
**un minuto después**) son la misma Laura. Patrón repetido dos veces con el mismo intervalo
corto: alguien intenta el registro por correo, algo lo frena o lo abandona, y en menos de un
minuto reintenta con Google y esta vez sí completa. No es un hallazgo de seguridad — es una
pista de fricción en el registro por correo (¿la confirmación tarda? ¿el formulario se ve
roto un instante?) que deja cuentas fantasma acumulándose en `auth.users` para siempre
(ninguna de las dos jamás vuelve a entrar con la vía vieja, así que el self-heal de
`_enterAuthSession` nunca las toca). **Costo de arreglarlo:** no es de esta ronda — H2 cubre
correos y confirmación; aquí solo queda medido y señalado.

## Todos los hallazgos

| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🔴 | `apex.com`/`avi.com` tienen MX real (Microsoft 365), ajeno al PO; 9 asesorados reales (uno menor de 15) usan esos correos | Dominios completos, `auth.users` | No confirmada (no se puede probar sin mandar correo) |
| 🔴 | `delClient` no revoca acceso de un `selfReg:true`; vuelve a entrar y se le crea ficha nueva sola | `app-3-coach.js:2765` (`delClient`) + `:692` (`_enterAuthSession`) | No hoy (estructural) |
| 🟡 | 2 pares de cuentas fantasma por reintento correo→Google en <1 min (Dora Pilar, Laura) | `auth.users`, self-reg | Sí — 4 cuentas concretas, sin daño (solo residuo) |
| 🟡 | `daily-notifs` desplegado (v9) NO coincide con el repo: le falta el wrapper `conCors`/`ORIGENES` de v657 (dual-origin CORS) | Edge Function `daily-notifs`, `updated_at` ~25 días más viejo que las otras 5 | No — la invoca el cron con bearer secreto, no un navegador; CORS no aplica a esa vía |
| 🟢 | 2 cuentas Google nunca confirman ficha (`oculto@gmail.com`, `oculto@gmail.com`, `oculto@gmail.com`) y quedan vivas porque el self-heal solo corre si esa identidad vuelve a intentar entrar | `_enterAuthSession`, rama `!prof._complete` | No — nunca volvieron, cero acceso a datos |
| 🟢 | `rls_enabled_no_policy` en `apex_data`/`apex_data_backups`/`community_resolve_attempts` (RLS activa, sin policy) | Advisors | No — deny-by-default, es más restrictivo de lo normal, no menos |
| 🟢 | `pg_net` instalada en `public` | Advisors | No — higiene, no explota nada hoy |
| 🟢 | 12 funciones `SECURITY DEFINER` ejecutables por `authenticated` | Advisors | No — todas son RPCs con su propio candado interno (moderador, dueño), patrón ya documentado |

## Respuesta a las preguntas del orquestador

### Q1 · `coach-create-client`
**CIERTA (verificado íntegramente).** El código desplegado (v5) es **carácter por carácter
idéntico** al del repo (comparación completa de ambos archivos). Solo el COACH puede
llamarla: exige `Authorization: Bearer <token>`, resuelve el usuario con
`admin.auth.getUser(token)` y compara `caller.user.id` contra un UID de coach
**hardcodeado** (`0a6484ed-42af-449d-9903-e440ac683ecf`) — no lee ningún campo de la BD para
decidir quién es coach, así que no es forjable desde el cliente. Valida el correo solo por
**formato** (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) — **sin lista de dominios ni verificación de que
exista de verdad** (ver hallazgo #1) — y valida duplicado buscando en `listUsers` si
`createUser` falla; si el correo ya es de OTRO coach o de un coach, rechaza con
`email_taken`; si es de un asesorado del MISMO coach, re-provisiona (cambia clave, resiembra
perfil). La contraseña se valida con `weakPass`, que es un **espejo exacto, carácter por
carácter**, de `passwordProblem` en `avi-core.js` (mín. 8, minúscula, mayúscula, dígito) —
confirmado comparando ambas funciones. **La cuenta nace `email_confirm:true`** (confirmada,
entra sin clic en ningún correo). **La ficha `user_data` la crea la propia función** con
`admin.from('user_data').upsert(...)` DESPUÉS de crear el auth user; **si ese upsert falla
(`rErr`), la función devuelve 500 pero el auth user YA EXISTE** — queda un auth account
huérfano sin ficha (candidato exacto al patrón de `oculto@avi.com`, aunque no pude
probar que ESE caso concreto haya sido por esta vía y no por abandono del usuario). **Sí
captura el consentimiento de menores (v565):** `saveClient` en `app-3-coach.js` llama
`consentEvidence(...)` antes de guardar y el resultado viaja dentro de `profile` (vía
`clientToRow`) hasta el `body.profile` que recibe la edge function — la función solo
persiste lo que le mandan, la regla de negocio (edad→qué evidencia exigir) vive
client-side en `avi-core.js` y está intacta.

### Q2 · Las 13 cuentas en `apex.com` y `avi.com`
**PARCIALMENTE CIERTA, con la pista confirmada y ampliada.** Son 7 `@apex.com` + 6
`@avi.com` = 13, tal como dice el baseline. Desglose real: **9 asesorados reales** del coach
(`0a6484ed…`) — andrea, karen, miguel, nadia, salomon (todos `@apex.com`, creados en bloque
el 2026-06-03, probablemente por un seed/migración inicial y no por `coach-create-client`
uno a uno, a juzgar por el timestamp idéntico `15:05:22.234411` en 4 de ellos) y carla,
dario, luz, nayla (`@avi.com`); **2 cuentas QA** (`qa-…@apex.com` = coach QA aislado,
`qa-…@apex.com` = su único asesorado, ambas documentadas y fuera del panel del coach
real); **2 sin ficha** (`oculto@avi.com`, `oculto@avi.com` — ver Q3). Ninguno entrena
bajo un coach que no sea el real o el QA. **Salomón Cárdenas (oculto@apex.com) tiene 15
años** en su ficha — el caso ya conocido de v570-v573. **`avi.com` y `apex.com` SÍ RECIBEN
CORREO**: `nslookup -type=mx` confirma MX real hacia `*.mail.protection.outlook.com`
(Microsoft 365) en los dos — no son dominios inertes, alguien los tiene registrados con
correo activo, y no es Camilo (comprobado: `avientrena.com` resuelve a Vercel/ns1, dominio
distinto). **Qué hace Supabase / qué deja hacer la app si alguien pide recuperación o enlace
mágico para una de esas 9 cuentas reales:** el botón «¿Olvidaste tu contraseña?»
(`app-2-login.js:386`) llama `AUTH.resetPassword(correo)` →
`supabase.auth.resetPasswordForEmail` sin ninguna comprobación de dominio; Supabase manda el
correo (o falla en silencio) y la app responde SIEMPRE el mismo mensaje genérico
(anti-enumeración a propósito, confirmado leyendo el código — nunca revela si la cuenta
existe). El enlace mágico (`sendMagicLink`) está escrito en `app-1-infra.js` pero **no lo
llama ningún botón de la interfaz** (confirmado con grep): no es una superficie de ataque
hoy porque nadie puede dispararlo desde la UI. **¿Puede un tercero tomar la cuenta?**
Teóricamente sí, SI existe un buzón real detrás de esa dirección en la infraestructura de
Microsoft 365 del dueño de `apex.com`/`avi.com` — eso no se pudo confirmar sin mandar el
correo (prohibido). **La pista NO se tumba**: se sostiene con evidencia de DNS, y se amplía
con el hecho de que 9 de las 13 son asesorados reales entrenando, no solo cuentas de prueba
inertes.

### Q3 · Las 7 cuentas sin ficha
**CIERTA, clasificadas todas.**
| Correo | Proveedor | Clasificación |
|---|---|---|
| `oculto@gmail.com` | Google | Fantasma Google: entró una vez el mismo día de creación y nunca volvió; el self-heal de `_enterAuthSession` (borra el "cascarón" al detectar `_complete:false`) solo se dispara si esa identidad vuelve a intentar login — como no volvió, sigue viva |
| `oculto@gmail.com` | Google | Igual que arriba |
| `oculto@gmail.com` | Google | Igual que arriba |
| `oculto@avi.com` | correo | Confirmado, entró una vez (07-jul) y nunca completó el registro (nunca llegó a `_provisionFreeClient` con perfil completo); sin match con ninguna ficha actual |
| `oculto@gmail.com` | correo | Auto-registro **nunca confirmado** (`email_confirmed_at` null) — ni siquiera puede loguearse; trae datos del asistente (wizard) pendientes de confirmar |
| `oculto@avi.com` | correo | **Duplicado/abandonado**: la misma persona (Dora Pilar Rodríguez Salazar) completó el registro 52 min después vía Google (`oculto@gmail.com`, con ficha real hoy). Confirmado pero nunca volvió a entrar por esta vía |
| `oculto@hotmail.com` | correo | **Duplicado/abandonado**: la misma persona (Lucía Ríos) completó el registro **1 minuto después** vía Google (`oculto@gmail.com`, con ficha real hoy, actualizada hoy mismo). Nunca confirmada por esta vía |

`delClient` (`app-3-coach.js:2765`) **borra SOLO la fila `user_data`**, nunca
`auth.users` — confirmado leyendo la función completa (solo llama
`UD.deleteClientRow` + limpia colecciones locales). **Si un asesorado eliminado vuelve a
entrar con su contraseña:** `_enterAuthSession` no encuentra fila (`row=null`) y arma el
perfil desde `user_metadata`. Para un asesorado creado por el COACH (metadata solo trae
`{name}`), `_complete` da `false` → la app lo trata como "fantasma", cierra sesión, **y
además dispara el borrado server-side de esa cuenta huérfana** (`delete-account` en modo
`ghost:true`, que SÍ borra `auth.users` porque ya no hay fila de datos) — o sea que el
acceso creado por el coach queda efectivamente muerto la próxima vez que se intente usar.
Para un asesorado **auto-registrado** (metadata completa con `goal`/`level`), `_complete`
da `true` y la app **le crea una ficha nueva automáticamente** vía `_provisionFreeClient`
— no recupera lo borrado, pero SÍ recupera acceso pleno con datos frescos, sin que el coach
se entere (ver hallazgo #2).

### Q4 · `delete-account` de punta a punta
**CIERTA — repo y desplegado (v8) son idénticos, carácter por carácter, verificado.** Orden
(todo lo NO-cascadeable primero, `auth.users` de último, por diseño desde v574): (1)
`avi_showcase` — borra su tarjeta pública atándola por `(coach_id, primer_nombre)`; (2)
`push_subscriptions` (sin FK); (3) `app_errors` (sin FK); (4) **los 4 buckets de Storage**
(`avatars`, `apex-photos`, `chat-media`, `progress-photos`), **con paginación real** (bucle
de hasta 50 vueltas de `list(uid,{limit:100})` + `remove` hasta vaciar la carpeta, cubriendo
el límite de 100 por llamada); (5) `community_resolve_attempts`; (6) `auth.users` —
cascadea por FK `ON DELETE CASCADE` sobre `user_data` y toda la comunidad
(`community_profiles`→posts/comments/reactions/friendships/messages/gym_members/moderators/
follows; `community_reports` queda anonimizado por `SET NULL`, no borrado). **Qué deja
atrás, declarado a propósito en los comentarios del propio archivo:** `apex_data_backups`
(retiene ~90 días, declarado en política de datos por ley 1581/2012 — no se puede editar un
respaldo sin romperlo como respaldo) y, best-effort, cualquier archivo de `apex-photos` cuya
carpeta use el ID LEGACY en vez del uuid (gotcha conocido desde 2026-07-12: ese bucket es
anterior a auth y algunas carpetas no calzan con el uuid, así que el intento de borrado por
uuid puede no encontrar nada ahí — no bloquea el borrado, queda como residuo posible). El
coach (`COACH_UID`) está explícitamente protegido (403 `coach_account_protected`) para no
poder autoborrarse arrastrando a sus asesorados. **No lo ejecuté** (regla dura: cero
escrituras). Si se quiere una verificación de punta a punta contra una cuenta real, **eso lo
corre el orquestador con `_verify-borrado-cuenta.mjs`** (crea y borra una cuenta desechable
bajo su propio coach QA, con control de no-daño sobre las tarjetas y filas del PO).

### Q5 · Las 6 edge functions
**PARCIALMENTE CIERTA — 5 de 6 coinciden con el repo; `daily-notifs` NO.** Comparación
íntegra carácter por carácter de `index.ts` (repo vs `get_edge_function`):
- `coach-create-client` (v5): **idéntico**.
- `delete-account` (v8): **idéntico**.
- `send-push` (v12): **idéntico**.
- `refresh_snapshot` (v9): **idéntico**.
- `activate_public_profile` (v3): **idéntico**.
- `daily-notifs` (v9): **DIFERENTE.** El desplegado NO tiene el wrapper `conCors`/`ORIGENES`
  (el parche v657 de doble-origen para la mudanza a `app.avientrena.com`) que sí está en el
  repo — el desplegado sigue devolviendo CORS fijo a `kronos-apex.github.io` únicamente, sin
  el `Vary: Origin` dinámico. Confirmado también por metadatos: su `updated_at` es ~25 días
  más viejo que el de las otras 5 (que comparten el mismo instante reciente, es decir, se
  redesplegaron juntas y `daily-notifs` se quedó fuera de esa tanda). **Impacto real: bajo**
  — esta función la invoca `pg_cron` con un secreto en el body (`verify_jwt:false` a
  propósito, ver falso positivo #3 del briefing), nunca un navegador, así que el CORS
  desactualizado no la expone a nada nuevo; es evidencia de un **hueco en el pipeline de
  despliegue**, no un riesgo de acceso.

**`activate_public_profile`: SÍ exige identidad real y autoriza bien.** Exige
`Authorization` resuelto por `admin.auth.getUser`; exige que ya exista una fila
`community_profiles` para ese uid; **`birth_date` es WRITE-ONCE** (si ya está seteada, no
se puede recalibrar la edad); valida rango de fecha (5-100 años, no futura); y **el `role`
('coach'/'client') NO sale de `user_data.role` (client-writable, clase F7) sino de un COUNT
server-side sobre `user_data.coach_id = uid`** — no falsificable por un solo atacante. La
fecha de nacimiento sigue siendo autoafirmada (documentado en el propio comentario como
riesgo residual para el abogado, no oculto).

**Tabla `verify_jwt` (confirmada contra `list_edge_functions`):**
| Función | verify_jwt | Cómo resuelve al llamador |
|---|---|---|
| `coach-create-client` | true | `admin.auth.getUser(token)` + UID de coach hardcodeado |
| `delete-account` | true | `admin.auth.getUser(token)` → borra SU PROPIA cuenta (uid del token) |
| `send-push` | true | `admin.auth.getUser(token)` + `_authorize()` por destinatario |
| `daily-notifs` | **false** (a propósito) | Secreto de 32 bytes en `private.fn_secrets`, leído por RPC solo-`service_role`, viaja en el comando del cron |
| `refresh_snapshot` | true | `admin.auth.getUser(token)` → solo puede refrescar SU PROPIO snapshot |
| `activate_public_profile` | true | `admin.auth.getUser(token)` → solo su propia fila `community_profiles` |

### Q6 · Advisors de seguridad hoy
**CIERTA — nada nuevo de severidad relevante respecto a los 8 falsos positivos conocidos.**
`get_advisors(security)` devuelve: (1) `rls_enabled_no_policy` ×3 (`apex_data`,
`apex_data_backups`, `community_resolve_attempts`) — INFO, y es la situación SEGURA (RLS
activa sin policy = deny-by-default para `anon`/`authenticated`; confirma lo que CLAUDE.md
ya documenta: esas tablas están cerradas); (2) `extension_in_public` (`pg_net`) — WARN de
higiene, no habilita nada por sí solo; (3) `authenticated_security_definer_function_executable`
×12 — son las RPCs `cmty_*`/`fb_*`/`resolve_share_code`, todas del patrón ya documentado
(DEFINER con candado interno propio: moderador, dueño de la fila, etc.), ninguna nueva desde
la última auditoría; (4) `auth_leaked_password_protection` — el falso positivo #2 conocido
(solo plan Pro, decidido no pagarlo). El advisory `rls_disabled` sobre
`_cm_rate`/`_cpost_rate`/`_cc_rate` (falso positivo #1 conocido) **ya no aparece** en el
listado de hoy.

## Lo que verifiqué y está SANO (con números)
- 5 de 6 edge functions: código desplegado **idéntico carácter por carácter** al repo.
- `coach-create-client`: candado de coach por UID hardcodeado (no forjable), `weakPass`
  espejo exacto de `passwordProblem`, cuentas nacen confirmadas por diseño documentado.
- `delete-account`: orden correcto (irreversible al final), 4 buckets con paginación real,
  protección del coach contra autoborrado, no ejecutado.
- `activate_public_profile`: write-once de `birth_date`, `role` derivado server-side (no de
  un campo client-writable).
- `send-push`: candado de autorización por destinatario (`_authorize`), no solo por sesión.
- 37 cuentas de acceso totales, 30 fichas, 0 fichas sin cuenta — consistente con el baseline.
- 2 de los 3 Google-phantom (`oculto`, `oculto`, `oculto`) nunca volvieron a
  entrar → 0 riesgo de acceso hoy (sin sesión posible sin OAuth de esa identidad exacta).

## Lo que tiene que correr o decidir el orquestador / el PO
- **Decidir** si los 9 correos `@apex.com`/`@avi.com` de asesorados reales se migran a
  correos que el coach o el asesorado sí controlen (vía `_updateClientAccount`, ya
  construido) — especialmente `oculto@apex.com` por ser un menor.
- **Redesplegar `daily-notifs`** para que quede alineado con el repo (parche v657 de CORS
  dual-origen); no es urgente por impacto pero perpetúa el drift si no se cierra.
- Si se quiere una prueba de punta a punta de `delete-account`, **correr
  `_verify-borrado-cuenta.mjs`** (crea y borra una cuenta desechable bajo el coach QA).
- **Decidir** si `delClient` debe invalidar también el acceso Auth (no solo la ficha) para
  asesorados `selfReg:true` — hoy pueden volver a entrar solos.

## Sospechas sin medir
- No se pudo confirmar si existe un buzón real detrás de `oculto@apex.com` o cualquiera de
  las otras 8 direcciones `@apex.com`/`@avi.com` (solo que el DOMINIO acepta correo) —
  requeriría mandar un correo, prohibido por las reglas.
- No revisé si algún backup local (`Desktop/AVI/backups`) contiene alguna de estas 13
  cuentas con datos que ya no están en la nube (fuera de alcance de este equipo: es
  filesystem local, no Supabase).
- No crucé los 9 correos reales contra ningún leak conocido (HaveIBeenPwned) — el proyecto
  no tiene esa protección activada (falso positivo #2, decisión ya tomada de no pagarla).

## Qué NO miré y por qué
- H2 (correos y recuperación: qué ve la persona, qué le llega, SMTP propio o de Supabase) —
  es el área de Sofía + Lucas, y las reglas duras me prohíben tocar el navegador.
- El contenido de `apex_data_backups`/backups locales — fuera del alcance de "servidor
  Supabase" que me tocó, y de todas formas son solo lectura fuera de mi mandato de hoy.
- Performance advisors — la pregunta del orquestador pidió solo `security`.
- No repetí ninguna medición del baseline (cuentas, dominios, correos, almacenamiento): ya
  viene medida y verificada hoy en el briefing; solo la usé como base para profundizar.
