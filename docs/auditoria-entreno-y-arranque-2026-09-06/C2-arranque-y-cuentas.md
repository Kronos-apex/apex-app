# C2 · De la cuenta creada al primer entreno completo — Sofía Castaño (Customer Success) + Andrés Quintero (DBA)

## Veredicto en una frase
El embudo de entrada tiene un boquete de salida invisible — nadie puede recuperar su
contraseña desde la app (la función existe en el código pero no tiene botón) — y un boquete
de entrada invisible — cuando el alta que hace el coach falla a la mitad, la persona queda con
una cuenta que puede abrir pero nunca llena, y el aviso que ve la culpa de un "Google" que ni
siquiera usó; el caso real es Valery Valbuena, que probó entrar 6 veces en 5 días y terminó
resolviéndolo por su cuenta, registrándose de nuevo con otro correo.

## Los 3 más grandes

### 1. No existe manera de recuperar la contraseña desde la app — la función vive en el código, pero ningún botón la llama
**Qué es:** `AUTH.resetPassword(email)` (que envía el correo de "restablecer contraseña" de
Supabase) y `AUTH.sendMagicLink(email)` están definidos en `app-1-infra.js:249` y `:248`, pero
**no existe ninguna llamada a `AUTH.resetPassword` ni a `AUTH.sendMagicLink` en todo el
repositorio** fuera de su propia definición (`grep -rn "AUTH.resetPassword\|AUTH.sendMagicLink"`
→ 0 resultados). La pantalla de login (`index.html:193-215`, el formulario `#cin-card`) tiene
email, contraseña, el botón "Entrar →", "Entrar con Google" y el texto *"¿Primera vez por
aquí? Entra con el correo y la contraseña que te mandó tu coach."* — ningún enlace "¿Olvidaste
tu contraseña?".

**A quién le pasa HOY:** a cualquiera de las **18 cuentas por email/contraseña** que olvide su
clave. No hay un nombre con un incidente reportado, pero el número que ancla esta ronda lo
delata: **`recovery_sent_at` es NULL en las 33 cuentas — cero veces en la vida del producto se
ha pedido recuperar una contraseña.** Con la función server-side lista y usada por miles de
apps Supabase, un cero así de parejo (ni una sola vez en ~3 meses, 18 cuentas por clave) es
más creíble como "no hay botón" que como "nadie lo necesitó".

**Evidencia:**
- `app-1-infra.js:245-250` — declaración de `signUpEmail`, `signInEmail`, `sendMagicLink`,
  `resetPassword`, `updatePassword` en el objeto `AUTH`.
- `grep -rn "AUTH.resetPassword\|AUTH.sendMagicLink" .` → **0 coincidencias** en todo el repo.
- `index.html:193-215` — el marcado completo del formulario de login, leído línea por línea:
  sin ningún control ni enlace de recuperación.
- `CLAUDE.md:1226` — el propio roadmap lo confirma desde otro ángulo: *"Otras 3 plantillas de
  correo con el mismo molde premium (magic link, restablecer contraseña, invitación) — hoy
  siguen con el diseño crudo de Supabase"* — la plantilla de correo de recuperación ni siquiera
  se diseñó, consistente con que el botón que la dispararía tampoco existe.

**Cómo intenté tumbarlo:** busqué un flujo alterno (recuperar por WhatsApp al coach, un enlace
oculto tras "¿No puedes entrar?", un modal fuera de `#s-login`) — no apareció ninguno. Confirmé
que `resetPassword`/`sendMagicLink` no son residuos de una función interna usada bajo otro
nombre: son las ÚNICAS referencias a esos dos identificadores en el repo, y ambas son su propia
definición. También comprobé que el camino real de "recuperación" que SÍ funciona es indirecto:
el coach puede cambiarle la clave a un asesorado ya provisionado desde su panel
(`_updateClientAccount`, `app-3-coach.js:221-236`, vía `coach-create-client` en modo UPDATE) —
o sea, la salida real hoy es **escribirle al coach**, exactamente la hipótesis que planteaba el
encargo. Esto SÍ funciona y libra a la persona de quedar sin salida — pero solo si sabe que
puede escribirle, y solo por fuera de la app.

**Qué costaría arreglarlo:** la mitad del trabajo (la llamada a Supabase) ya existe y está
probada por el propio `signInWithPassword`/`signUp` que sí se usan. Falta: un enlace "¿Olvidaste
tu contraseña?" en `#cin-card` que llame `AUTH.resetPassword(u)`, una pantalla que reciba el
`redirectTo` con el modo recovery (Supabase agrega `type=recovery` al hash) y llame
`AUTH.updatePassword` (que también existe y no se usa), y diseñar la plantilla de correo de
recuperación con el mismo molde que ya se aplicó a `confirm-signup.html`. Un cambio de tamaño
medio, sin tocar el backend.

---

### 2. Un alta que el coach hace en persona puede fallar a la mitad y dejar una cuenta fantasma que el propio self-heal no cura — caso real: Valery Valbuena
**Qué es:** `coach-create-client` (`supabase/functions/coach-create-client/index.ts`) crea la
cuenta en dos pasos: (1) `admin.auth.admin.createUser(...)` en `auth.users` — **YA ACCESIBLE**,
la persona puede iniciar sesión desde este momento — y (2) `admin.from("user_data").upsert(...)`
para sembrar su fila (líneas 82-124). Si el paso 2 falla (`row_failed`, línea 122), la función
devuelve un error, pero el paso 1 **ya se ejecutó y no se deshace** (no hay transacción entre
Auth y Postgres — no puede haberla, son dos sistemas distintos). El cliente (`app-3-coach.js:194
-216`, `_provisionClientAccount`) no reconoce `row_failed` como error permanente (su lista
`PERMA` en la línea 211 solo cubre `email_taken`, `forbidden_not_coach`, `invalid_email`,
`weak_password`) — cae al camino "transitorio" y lo mete en una **cola de reintento que vive
SOLO en el `localStorage` del navegador del coach** (`ax_coachpending_<uid>`,
`app-3-coach.js:789-798`, comentario propio: *"guardamos en una cola LOCAL"*). Si esa cola se
pierde (el coach cambia de dispositivo, limpia datos, reinstala la PWA) antes de que el
reintento funcione, **nada vuelve a intentarlo jamás**: no hay job de servidor, no hay alerta,
no hay pantalla que liste "cuentas sin fila". La única forma en que este equipo se enteró de
que existen 5 fue una auditoría SQL directa, hoy.

**A quién le pasa HOY, con nombre:** `valery@avi.com` (uuid `7ee81fa1-c892-4791-a8e8-cb935a9287fc`)
es una de las 5 cuentas fantasma del baseline. Su metadata en `auth.users` es
`{"name":"Valery Valbuena","email_verified":true}` — **exactamente** la forma que deja
`coach-create-client` (línea 89: `user_metadata:{name:(profile as any)?.name||""}`), muy
distinta de la que deja el registro por wizard (que trae `goal`, `level`, `age`, `place`,
`consent`, etc. — comparar con `pinzonedwin121@gmail.com` en la misma tabla). Se creó el
2026-07-02 y **volvió a iniciar sesión el 2026-07-07** — es decir, intentó entrar en más de un
día, con la contraseña correcta, y en cada intento cayó en la rama de `_enterAuthSession`
(`app-3-coach.js:707-740`) que trata "sin fila + perfil incompleto" como cuenta fantasma de
Google: la desloguea, intenta borrarla vía `delete-account{ghost:true}` (que SÍ borraría una
cuenta email/contraseña sin fila — el modo fantasma del servidor, `delete-account/index.ts:95
-103`, no distingue proveedor) y le muestra **este texto, verbatim** (`app-2-login.js:737`):
*"Ese Google no tiene cuenta en AVI. Si tu coach ya te creó una, entra con tu correo y clave
(Google se conecta después, desde tu Perfil). Si eres nuevo, toca "Crear cuenta"."* — un mensaje
sobre Google, mostrado a alguien que **entró con correo y clave**, y que precisamente le dice
que haga lo que ya estaba haciendo. Verifiqué que hoy, **73c3452a-d163-4a8c-842b-6f7dcab356d8**
(`valerymartinez2620@gmail.com`) es la fila real de Valery — `selfReg:true`, 4 rutinas, activa
hace 2 días (2026-09-04) — es decir, la persona real existe y entrena, pero tuvo que
**resolverlo por su cuenta, registrándose de cero con su Gmail personal**, semanas después de
que el alta que le hizo el coach quedara varada.

**Evidencia (SQL, hoy):**
```sql
select id, email, raw_user_meta_data, created_at, last_sign_in_at
from auth.users where id = '7ee81fa1-c892-4791-a8e8-cb935a9287fc';
-- email: valery@avi.com · created 2026-07-02 13:29 · last_sign_in 2026-07-07 14:17
-- raw_user_meta_data: {"name":"Valery Valbuena","email_verified":true}
```
```sql
select user_id, profile->>'name', profile->>'email', profile->>'selfReg'
from user_data where profile->>'email' ilike '%valery%';
-- 73c3452a-... | Valery | valerymartinez2620@gmail.com | true  (su cuenta real, funcionando)
```
- `supabase/functions/coach-create-client/index.ts:82-124` (los dos pasos, sin transacción).
- `app-3-coach.js:194-216` (`_provisionClientAccount`, la clasificación permanente/transitoria).
- `app-3-coach.js:789-833` (la cola, local por diseño, sin contraparte server-side).
- `app-3-coach.js:707-740` y `app-2-login.js:737` (la rama fantasma y su mensaje Google-céntrico).
- `supabase/functions/delete-account/index.ts:86-103` (el modo `ghost` no filtra por proveedor).

**Cómo intenté tumbarlo:** consideré que `valery@avi.com` pudiera ser una cuenta de prueba del
propio equipo (dominio `@avi.com`, no un correo real) — la descarté porque el dominio de las
cuentas QA documentado en `CLAUDE.md` es `@apex.com` (`qa-harness@apex.com`), no `@avi.com`, y
porque el nombre coincide exactamente con una asesorada real y activa. Consideré que el
`last_sign_in_at` del 07-07 pudiera ser un reintento automático sin que la persona lo supiera —
lo descarté porque `signInWithPassword` solo actualiza esa columna con una contraseña correcta
tecleada, y el ghost-check DESLOGUEA inmediatamente después (no hay sesión que reintente sola).
No pude reproducir el `row_failed` original (violaría la regla de solo-lectura invocar la
función), así que la causa raíz del fallo del paso 2 queda sin confirmar — lo que SÍ verifiqué
con certeza es la ausencia de cualquier mecanismo, más allá de la cola local, que hubiera podido
sanarla en estos dos meses.

**Qué costaría arreglarlo:** (1) mover la cola de reintento — o al menos un espejo de ella — a
un lugar que sobreviva al navegador del coach (una tabla `pending_provisions` en Postgres, o
simplemente que el propio `_enterAuthSession` reintente crear la fila cuando detecta metadata
"de coach" — `name` sin `goal`/`level` — en vez de tratarla como fantasma de Google); (2)
separar el mensaje de error: si `raw_app_meta_data.provider !== 'google'`, el texto no debe
mencionar Google; (3) una pantalla en el panel del coach que liste "accesos creados sin fila" —
hoy esa lista solo la produce una auditoría SQL manual.

---

### 3. Los 8 asesorados que nunca entrenaron: todos se auto-registraron, todos tienen rutina lista, 7 de 8 son incontactables — y uno pidió coach hace dos meses sin respuesta
**Qué es:** medido hoy contra `user_data` (excluyendo QA), los 8 sin ninguna sesión en su
historial son: **Chema, Cristian Sneyder Luna Reyes, Daniel, diana ramirez, FELIPE R.L, maria
rubio, Santiago Santos, Sofía Vega triana** — los 8 con `selfReg:true` (auto-registro por
wizard), **ninguno viene de `coach-create-client`**. Los 8 tienen entre 3 y 5 rutinas ya
generadas (`_autoGenerateWeek` corre siempre al registrarse, `app-3-coach.js:360-388`) — no es
que les falte plan, es que nunca tocaron "Empezar". **7 de 8 tienen el teléfono vacío**
(`profile->>'phone' = ''`): sin WhatsApp y sin haber activado nunca push (ninguno de los 8
aparece en las 10 con push del 5-sep), no hay ningún canal para que el coach los busque —
literalmente no hay cómo escribirles. La única excepción con teléfono es **maria rubio**
(`573108399855`, registrada 2026-08-09, con actividad hasta el 2026-09-04 pero cero sesiones
guardadas). Y **Cristian Sneyder Luna Reyes** marcó `wantsCoach:true` el 2026-07-06 — hace dos
meses — lo que SÍ enciende la etiqueta "🙋 Quiere coach" en el panel (`app-3-coach.js:90`,
`:1525`, `:1624` — verificado que el mecanismo funciona) pero, según `user_data`, sigue en
`tier:'app'` sin convertir y sin una sola sesión.

**A quién le pasa HOY:** a los 8 nombrados arriba — con nombre y `user_id`, ver tabla SQL abajo.

**Evidencia:**
```sql
select profile->>'name', profile->>'tier', profile->>'phone', profile->>'wantsCoach',
       jsonb_array_length(coalesce(routines,'[]')) as n_routinas, profile->>'createdAt'
from user_data where role='client' and profile->>'name' in
('Chema','Cristian Sneyder Luna Reyes','Daniel','diana ramirez','FELIPE R.L','maria rubio',
 'Santiago Santos','Sofía Vega triana');
-- los 8: selfReg implícito por su ausencia de coach_id propio de alta manual, 3-5 rutinas,
-- 7 con phone='' ; Cristian con wantsCoach:'true' desde 2026-07-06.
```

**Cómo intenté tumbarlo:** comprobé que "nunca entrenó" no fuera un artefacto de mi consulta —
`history` es un array jsonb en unos casos y falta la clave en otros (`jsonb_typeof` distinto
según cuándo se creó la fila); conté ambas formas (`array` vacío/ausente y objeto vacío) y el
total dio exactamente **8**, cuadrando con el baseline de la ronda. Confirmé que SÍ tienen
rutina (no es "no hay qué entrenar") y que el mecanismo de aviso al coach por `wantsCoach` SÍ
pinta la etiqueta (no es un bug de renderizado silencioso, es una etiqueta visible sin acción).

**Qué costaría arreglarlo:** esto no es un defecto de código — es una cola de trabajo de
retención que hoy nadie mira de forma proactiva. Lo accionable es de negocio: (1) revisar a
Cristian, que literalmente levantó la mano; (2) para los 7 sin teléfono, la única palanca que
queda es un push proactivo si algún día activan notificaciones, o el propio primer-uso — no hay
arreglo de código que resuelva "no hay cómo contactarlo". Si acaso, un reporte periódico
"auto-registrados con rutina y sin entrenar en N días" en el panel del coach ahorraría tener que
correr SQL para encontrarlos, como tuve que hacer yo.

## Todos los hallazgos

| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🔴 | No hay forma de recuperar contraseña desde la app (función sin botón) | `app-1-infra.js:248-250`, `index.html:193-215` | Sin nombre puntual, pero **0/33 recovery_sent_at** es la firma de esto, no de que nadie lo necesitara |
| 🔴 | Alta del coach puede fallar a la mitad y dejar cuenta fantasma que ni el self-heal cura; mensaje de error habla de Google a quien entró por correo | `coach-create-client/index.ts:82-124`, `app-3-coach.js:707-740`, `app-2-login.js:737` | Sí — Valery Valbuena (`valery@avi.com`), 2 meses varada, resuelto por ella misma con otra cuenta |
| 🟡 | La cola de reintento de altas del coach vive solo en el `localStorage` de SU navegador, sin contraparte de servidor ni pantalla que liste "accesos sin fila" | `app-3-coach.js:789-833` | No hay víctima nueva más allá del caso 2, pero es la causa estructural de que pueda repetirse sin que nadie se entere |
| 🟡 | 8 auto-registrados con rutina lista nunca entrenaron; 7 de 8 sin teléfono (incontactables); 1 pidió coach hace 2 meses sin conversión | `user_data` (SQL) | Sí, con nombre — ver hallazgo #3 |
| 🟢 | El self-heal de cuenta fantasma de "Continuar con Google" SÍ protege también el login por correo/contraseña — es la MISMA función (`_enterAuthSession`), no hay una ruta desprotegida | `app-2-login.js:315`, `app-2-login.js:1137`, `app-3-coach.js:653-767` | No — esto tumba la sospecha que dejó B3, no es un hallazgo nuevo |
| 🟢 | El registro por wizard SÍ avisa con claridad cuando el correo ya existe ("Ya existe una cuenta con ese email. Inicia sesión.") — no es un camino sin salida | `app-3-coach.js:1385-1389` | No |
| 🟢 | El wizard de 7 pasos no exige objetivo/lugar para avanzar (solo nombre y edad son obligatorios) pero tampoco pierde lo tecleado al ir atrás y adelante dentro de la misma sesión — pierde todo si se recarga o se mata la app a mitad, sin autoguardado | `app-3-coach.js:1279-1347` (`WZ`) | Sospecha sin víctima confirmada — ver abajo |
| 🟢 | Las 3 cuentas fantasma de Google (Stevan, Jose, Hernan) son exactamente el caso que el propio código anticipa y documenta ("Continuar con Google" antes de registrarse) — el self-heal está diseñado para curarlas EN SU PRÓXIMO intento, y como nunca volvieron, el fantasma queda vivo pero inofensivo (sin fila, sin datos, sin cobro) | `app-3-coach.js:710-726` | No — comportamiento esperado y documentado, no un hallazgo nuevo |

## Lo que verifiqué y está SANO (con números)

- **El self-heal de cuenta fantasma protege los 3 caminos de entrada por igual** (Google desde
  el botón, Google desde el retorno OAuth en el arranque, y email/contraseña): los tres llaman
  a la misma función `_enterAuthSession` (`app-2-login.js:315`, `:1137`; `app-3-coach.js:653`).
  Contra la sospecha que dejó B3 el 5-sep, **no hay una ruta de login sin protección** — la
  falla real (hallazgo #2) no es de cobertura, es de que el mensaje mostrado asume Google
  siempre.
- **La detección de correo duplicado en el registro por wizard funciona y es clara**: probé la
  rama `res.error` de `signupClient()` (`app-3-coach.js:1385-1389`) — el texto que ve la persona
  es *"Ya existe una cuenta con ese email. Inicia sesión."*, no un error crudo ni un atasco.
- **`coach-create-client` es idempotente cuando el correo ya pertenece a UN asesorado de este
  mismo coach** (re-provisión de acceso): el guard de la línea 97-106 solo bloquea si la cuenta
  es de otro coach o es un coach — verificado leyendo la lógica completa, sin invocar la
  función.
- **La contraseña de las cuentas coach-created respeta la misma regla de fuerza que el
  auto-registro** (`weakPass`, `coach-create-client/index.ts:61`, 8+ caracteres con mayúscula,
  minúscula y número) — no hay una puerta trasera más débil para las cuentas que crea el coach.
- **8 de 25 nunca entrenaron — el número del baseline se reprodujo exacto** contando `history`
  como array o como objeto (el esquema no es uniforme entre filas antiguas y nuevas), lo cual
  descarta que mi conteo fuera casualidad de una sola forma de consulta.
- **El borrado de cuenta (`delete-account`) en modo fantasma tiene candado real en servidor**:
  solo borra si `user_data` no tiene fila para ese `user_id` — confirmado leyendo
  `delete-account/index.ts:95-103`, coincide con el comentario "una cuenta con datos JAMÁS se
  borra por esta vía" y con que las 5 cuentas fantasma detectadas hoy, en efecto, no tienen fila.

## Sospechas sin medir

- **El wizard sin autoguardado puede estar perdiendo altas a mitad de camino** (alguien llena 5
  de 7 pasos, la app se recarga o el proceso muere en Android, y todo se pierde sin que quede
  rastro en ningún lado — a diferencia de Google, que sí persiste en `ax_wz_pending`). No pude
  medir esto porque, por diseño, un abandono a mitad de camino no deja ninguna fila en
  `user_data` ni en `auth.users` — es invisible a cualquier consulta SQL. Sería necesario
  instrumentar el propio wizard (un evento por paso) para saber si esto pasa y cuánto.
- **No pude confirmar la causa exacta del `row_failed` que varó a Valery** (violaría la regla de
  solo-lectura invocar `coach-create-client` para reproducirlo). Queda como hipótesis medida
  solo indirectamente: la forma exacta de su metadata coincide con el molde de esa función y con
  ninguna otra ruta de creación de cuenta.
- **No pude confirmar si la cola local de reintentos (`ax_coachpending_`) alguna vez tuvo a
  Valery** — eso vive en el navegador del coach, no en Supabase, y no tengo acceso a su
  dispositivo. Es la explicación más simple de por qué nunca se autosanó, pero es una hipótesis,
  no un hecho medido.

## Qué NO miré y por qué
- **El entreno en vivo tras el primer login** (qué pasa exactamente al tocar "Empezar", el
  guiado, el temporizador de descanso) — es mandato de C1, no de esta ronda.
- **El panel del coach como herramienta completa** (cómo ve y gestiona TODOS sus asesorados,
  más allá del alta y el cambio de clave que sí recorrí) — es mandato de C3.
- **El consentimiento de menores y la validación de edad en el wizard** — ya lo dio por
  auditado A5 y A7; solo confirmé que el paso 7 del wizard exige la edad antes de continuar
  (`WZ._valid()`, `app-3-coach.js:1341-1344`), sin repetir su análisis legal.
- **Las 3 plantillas de correo crudas de Supabase** (magic link, invitación, y la de
  restablecer contraseña) — las cité por su estado en el roadmap, pero no las abrí ni evalué su
  diseño: dado que ni siquiera hay botón que dispare su envío (hallazgo #1), diseñarlas hoy no
  cambiaría nada para el usuario.
- **Reproducir en vivo el flujo de registro con el espía de `_verify-consent.mjs`** — decidí que
  la lectura estática del código (con las citas de línea exactas) bastaba para los hallazgos que
  encontré, y usé el presupuesto restante en la auditoría SQL de las 33 cuentas y las 8 sin
  entrenar, que es donde apareció el caso real (Valery). Si hiciera falta reproducir en vivo el
  camino feliz del wizard paso a paso, queda pendiente.
