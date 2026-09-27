# R14 · Correos y recuperación — Sofía (CS) + Lucas (QA funcional)

## Veredicto en una frase
El motor de recuperación (v582) está bien construido y sin caminos sin salida, pero DOS de sus vecinos
sí tienen víctimas reales con nombre: el login le miente a quien no confirmó su correo, y a quien no
puede recibir ningún correo (7 personas activas) la app nunca le dice que su coach SÍ puede resetearle
la clave desde el panel — eso ya existe, solo que en silencio.

## Los 3 más grandes

**1. El login trata «no confirmaste tu correo» como «contraseña incorrecta» — y le cuesta un intento.**
Quien se registra, no confirma a tiempo, y vuelve días después con su clave CORRECTA recibe
*«Email o contraseña incorrectos»* y pierde uno de sus 5 intentos (bloqueo de 30s a la quinta). No hay
NINGÚN mensaje que diga «confirma tu correo primero», y no existe botón de reenviar la confirmación en
ningún lugar de la app. **Le pasó de verdad a Edwin Ávila** (se registró 25-jul, nunca confirmó, no hay
rastro de que volviera — se perdió) **y a Laura Ramírez** (15-sep: se registró con hotmail, quedó
atascada, y 76 segundos después se registró OTRA VEZ con gmail — hoy tiene una cuenta viva y una
fantasma con su nombre real que el coach nunca ve). Cómo lo tumbé: reproduje con `AUTH.signInEmail`
espiado devolviendo la forma EXACTA que da Supabase para `email_not_confirmed` (HTTP 400, mismo código
que una clave mala) — `doLogin` lo trató igual y el mensaje salió idéntico. Costo de arreglo: bajo — un
`if` sobre `error.code==='email_not_confirmed'` en `app-2-login.js:353` (Supabase ya lo manda), texto
distinto, y no contar el intento.

**2. Quien no puede recibir NINGÚN correo (7 asesorados activos) SÍ tiene una salida real — la app nunca
se la dice.** El coach puede resetear la clave de cualquier asesorado desde «Editar asesorado» → campo
Contraseña (`_updateClientAccount`, edge `coach-create-client` v5, modo `update`, llama
`admin.auth.admin.updateUserById`) — esto contradice a CLAUDE.md, que afirma que el coach NO puede
hacerlo desde v2.0; el código vivo dice lo contrario. Pero ni el error de login ni «olvidé mi
contraseña» mencionan esta salida: a alguien con `@avi.com`/`@apex.com` la app le promete el mismo
correo que a cualquiera, sabiendo que ese dominio nunca lo va a recibir. Medido: **9 asesorados reales
con esos dominios, 7 pueden entrar hoy (no suspendidos) y 5 entraron en los últimos 30 días** — son
quienes dependen de este camino sin saberlo. Cómo lo tumbé: leí la edge function y el frontend de punta
a punta; el mecanismo es real y está desplegado (v5). Costo: medio — texto condicional (o genérico:
«si tu coach te creó la cuenta, puede restablecerte la clave sin correo») en el error de login y en el
mensaje de «olvidé mi contraseña».

**3. Sin botón de reenviar confirmación, el atasco se resuelve registrándose OTRA VEZ — y deja cuentas
fantasma con el nombre real de la persona, invisibles para el coach.** Es la causa raíz detrás del
hallazgo 1 (Laura). Costo de arreglo: medio — `AUTH.client().auth.resend({type:'signup', email})` ya
existe en la librería del proyecto (`vendor/supabase-js-2.117.2.js`), falta cablearla y darle un botón.

## Todos los hallazgos (tabla)
| severidad | qué | dónde | ¿víctima hoy? |
|---|---|---|---|
| 🔴 | Login trata "sin confirmar" como "clave incorrecta", gasta un intento, sin mención al correo | `app-2-login.js:322-363` | Sí — Edwin Ávila (perdido), Laura Ramírez (duplicada) |
| 🔴 | La salida real para quien no recibe correos (coach resetea clave) no se comunica en ningún mensaje | `app-2-login.js` (mensajes de error) · edge `coach-create-client` v5 | Sí — 7 asesorados activos con dominio `@avi.com`/`@apex.com` |
| 🟡 | Sin botón «reenviar correo de confirmación» en toda la app | `app-1-infra.js` (objeto `AUTH`) | Sí — cualquiera que pierda el primer correo de confirmación |
| 🟡 | CLAUDE.md afirma que el coach NO puede cambiar la clave de un asesorado; el código SÍ lo permite | `CLAUDE.md` vs `app-3-coach.js:219-238` | No es hallazgo de seguridad — es doc desactualizada, pero puede confundir a la próxima sesión |
| 🟢 (documentación) | Bitácora dice 4 plantillas con branding AVI (jun-2026); CLAUDE.md backlog dice 3 siguen "crudas de Supabase" | `docs/bitacora.md:8398` vs `CLAUDE.md` backlog | No verificable con mis herramientas — requiere mirar el dashboard de Supabase |
| 🟢 sano | «Olvidé mi contraseña» (v582): anti-enumeración real, cooldown, vuelta por enlace sin caminos sin salida, enlace vencido explicado | `app-2-login.js:372-461` | No |
| 🟢 sano | Google sin terminar el asistente: se auto-cura solo (borra la cuenta fantasma) en el siguiente intento, con mensaje claro | `app-3-coach.js:760-793` | No — las 3 solo siguen vivas porque nunca regresaron a intentar de nuevo |

## Respuesta a las preguntas del orquestador
- Q1 · «Olvidé mi contraseña» paso a paso: **CIERTA — el flujo está bien construido, sin caminos sin salida.**
  Verificado con `_verify-reset-pass.mjs` (20/20 OK, `AUTH.resetPassword`/`AUTH.updatePassword` ESPIADOS,
  cero correos reales) + capturas propias a 390px en claro y oscuro (`%TEMP%/q1-01..06-*.png`).
  - Pedirlo: el enlace «¿Olvidaste tu contraseña?» vive en la tarjeta de login, 36px de alto (cumple el
    mínimo táctil de 36px del proyecto), visible y pulsable en las dos capturas.
  - La promesa exacta (texto real, `app-2-login.js:412`): *«Listo: si esa cuenta existe, te llega un correo
    con un enlace para crear una contraseña nueva. Míralo también en spam.»* — anti-enumeración real: el
    mensaje es IDÉNTICO exista o no la cuenta (`R4` del harness), y hay cooldown de 60s contra toques repetidos.
  - Legible en los dos temas: el mensaje sale en una caja con fondo propio (no depende de la foto de fondo),
    capturas `q1-03/04`.
  - Volver por el enlace: `window._aviRecovery` se fotografía leyendo el hash `#type=recovery` ANTES de que
    Supabase se lo coma (`app-1-infra.js:550`). Si la sesión abrió bien, 1.6s después se abre el modal
    «Crea tu contraseña nueva» (`#m-newpass`) — SIN salir del flujo, y con el mismo candado de contraseña que
    el servidor (mínimo 8, mayúscula/minúscula/dígito) y verificación de que las dos coincidan.
  - **¿Camino sin salida? NO encontré ninguno.** Si el enlace ya venció o se usó (`authEntered=false`), la
    app NO se queda muda: pinta *«Ese enlace ya venció o se usó. Toca «¿Olvidaste tu contraseña?» para pedir
    uno nuevo.»* y abre el formulario de login (`app-2-login.js:1277`).
  - Lo único que NINGÚN harness puede probar (ya lo dice el propio comentario del código, v582): que el
    correo LLEGUE a la bandeja. El endpoint responde 200 y deja rastro en los logs (confirmado el 6-sep),
    pero eso no prueba entrega — ver Q4.
- Q2 · Quien NO puede recibir correos (dominios `@avi.com`/`@apex.com`): **CIERTA que hay un camino real,
  pero la app NUNCA se lo dice a nadie.**
  - **SÍ existe HOY un camino para que el coach restablezca la clave desde su panel** — y esto contradice
    a CLAUDE.md, que dice «desde v2.0 el coach NO puede cambiar la contraseña». Leyendo el código:
    `coach-create-client` (edge, **v5 desplegada**) tiene un **modo UPDATE por `user_id`**
    (`supabase/functions/coach-create-client/index.ts:81-90`) que llama
    `admin.auth.admin.updateUserById(updateId, {password})` — cambia la clave REAL en Supabase Auth.
    El frontend ya lo cablea: al editar un asesorado (`openEditClient`, `app-3-coach.js:160-182`) el campo
    «Contraseña» sale vacío con el placeholder *«••••••• (dejar en blanco para no cambiar)»*; si el coach
    escribe una clave nueva, `saveClient` llama a `_updateClientAccount` (`app-3-coach.js:223-238` y
    `358-362`) → la edge → Supabase Auth. Confirmado leyendo el código de punta a punta (no se ejecutó
    contra producción, por la regla de cero escrituras).
  - **La app NO dice nada útil.** El error de login con clave equivocada es genérico —*«Email o contraseña
    incorrectos»* (`app-2-login.js:361-362`)— sin mencionar al coach. Y «olvidé mi contraseña» (Q1) tampoco
    distingue: a alguien con `@avi.com`/`@apex.com` le promete el mismo *«si esa cuenta existe, te llega un
    correo»* que a nadie le va a llegar jamás, porque el dominio no recibe correo (pista del orquestador, no
    verificado con `nslookup` por mí — lo mide H1). La persona queda esperando un correo que nunca llega, sin
    saber que la salida real es pedírselo al coach en persona.
  - **Medido (unidad: personas, `auth.users` + `user_data`, excluidas las 2 cuentas QA):**
    **9 asesorados reales con correo `@avi.com`/`@apex.com`** — 2 suspendidos/bloqueados (Miguel, Nataly:
    no pueden entrar de ningún modo, ni con clave nueva) y **7 ACTIVOS que sí pueden entrar** (Astrid,
    Claudia, Danilo, Kathe, Luz/Estella, Natalia, Samuel). De esos 7, **5 entraron en los últimos 30 días**
    (Claudia 26-sep, Luz 23-sep, Astrid 15-sep, Danilo 14-sep, Natalia 2-sep) — son quienes hoy dependen de
    este camino si olvidan su clave. 6 de 7 tienen teléfono guardado (WhatsApp); Samuel no tiene teléfono
    Y no ha entrado desde el 10-jul (79 días).
- Q3 · Los 2 registros sin confirmar: **CIERTA, y con dos desenlaces distintos medidos por persona.**
  - **Qué ve al registrarse:** `signupClient` (`app-3-coach.js:1673-1697`) — si Supabase exige confirmar
    (no hay sesión), la app pinta un TOAST (ephemeral, sin pantalla ni botón): *«📧 Te enviamos un correo
    para confirmar tu cuenta. Confírmalo e inicia sesión.»* La ficha (`user_data`) **no se crea todavía** —
    el comentario del propio código lo dice: *«provisionará en el 1er login»*.
  - **¿Puede reenviar el correo desde la app? NO.** Grepé `AUTH` completo (`app-1-infra.js`) y no existe
    ningún `resend`/`reenviar` — ni botón, ni función. Si el correo se pierde (spam, dominio raro), no hay
    vuelta atrás dentro de la app.
  - **Si intenta entrar sin confirmar, con su clave CORRECTA: la app le miente.** Verificado espiando
    `AUTH.signInEmail` con la forma exacta que da Supabase para `email_not_confirmed` (HTTP 400):
    `loginFailIsNetwork` trata cualquier 4xx como «el servidor juzgó las credenciales» (`avi-core.js:9569`),
    así que `doLogin` cae al mismo camino que una clave mala: **«Email o contraseña incorrectos»**, Y
    **le gasta uno de los 5 intentos** que bloquean 30s (`app-2-login.js:353-366`). Nada distingue «no
    confirmaste tu correo» de «te equivocaste de clave». Probado con harness propio (espía, cero red real).
  - **¿Terminó con otra cuenta que sí funciona?** Medido cruzando `auth.users`+`user_data`:
    - **Laura (15-sep): SÍ.** Se registró a las 13:33:09 con `lau…@hotmail.com` (metadata `name:"Laura"`)
      y quedó sin confirmar — cuenta fantasma, para siempre. **76 segundos después**, a las 13:34:22, creó
      OTRA cuenta con `lau…@gmail.com`; esa ficha (`user_id 21e46a18…`, `name:"Laura Ramirez
      Rueda"`) existe, se confirmó 9 minutos después (13:43:49) y **sí entrena** (`last_sign_in_at`
      2026-09-21). Ella misma se salió del atasco reintentando con Gmail — pero le quedaron **DOS cuentas**:
      una viva y una fantasma con su nombre real en la metadata, invisible para el coach.
    - **Edwin/«pin…» (25-jul): NO.** Se registró como «Edwin Ávila» (`pin…@gmail.com`,
      meta `goal:'Perder grasa'`) y nunca confirmó. Busqué una ficha con su nombre en toda `user_data`:
      **cero coincidencias.** No volvió a intentarlo con otro correo, no lo creó el coach — se perdió
      en el registro y no hay rastro de que haya vuelto.
- Q4 · Correos que manda Supabase / SMTP / logs: **SÍ hay SMTP propio (CIERTA) — pero el diseño de las
  otras 3 plantillas quedó en un estado que la documentación del propio proyecto CONTRADICE, y no lo pude
  resolver con mis herramientas (NO SE PUDO MEDIR esa parte).**
  - **SMTP propio: Brevo**, conectado el 2026-06-04 (`docs/bitacora.md:8386-8393`) — `smtp-relay.brevo.com`,
    remitente verificado `avi…@gmail.com`, límite `30 correos/hora`, «Confirm email» ACTIVADO.
    No es el correo por defecto de Supabase (limitado y con tendencia a spam) como sugería la pista del
    orquestador — eso está superado desde junio.
  - **CONTRADICCIÓN sin resolver, dejo las dos citas:** la bitácora del 2026-06-04 dice que se configuraron
    **4 plantillas en español con branding AVI** vía la Management API (confirmación, magic link, recuperar
    contraseña, cambio de correo — logo + botón esmeralda + cierre «Tu entrenamiento, contigo. 💚»). Pero el
    backlog vigente de CLAUDE.md (sección «Backlog») dice: *«Otras 3 plantillas de correo con el mismo molde
    premium (magic link, restablecer contraseña, invitación) — hoy siguen con el diseño CRUDO de Supabase»*.
    **No hallé forma de leer el HTML real de esas plantillas con mis herramientas** (viven en la
    configuración de Supabase Auth, no en una tabla SQL ni en el repo — `docs/email-templates/` solo tiene
    `confirm-signup.html`). Si esto importa, alguien con acceso al dashboard de Supabase (Authentication →
    Email Templates) lo confirma mirando la plantilla de «Reset Password» directamente.
  - **`query_logs` (service auth) — los últimos días:** el proyecto SÍ retiene logs más allá de lo que
    sugería la pista del orquestador: encontré 114 eventos de `auth_logs` el **2026-09-06** (21 días atrás),
    incluida una prueba de borrado de cuenta (`user_signedup`/`user_deleted` con `avi-e2e-borrado-…@avi-
    pruebas.local`, service_role, 00:54-00:55 UTC). **Últimas 24h (26-sep 22:00 → 27-sep 22:00 UTC):**
    58 eventos, TODOS 200/204 (38× `/user`, 8× `/token` login, 4× `/logout`, 1× `/admin/users`) — cero
    errores de envío, cero «rate limit», cero fallo de login. Esto es coherente con el baseline: nadie ha
    pedido recuperar su clave desde el 6-sep. Busqué el evento de recuperación del 6-sep 20:03 (hora
    Colombia) específicamente en la franja 07-sep 00:00-02:00 UTC y salió VACÍA — no es que los logs no
    alcancen: en esa franja concreta no hubo tráfico (el proyecto estuvo inactivo esas horas). **Retención
    real, medida:** al menos 21 días (no la agoté; el tope de la herramienta es 24h por consulta, así que no
    pude barrer más atrás en una sola pasada).
- Q5 · Google sin terminar el asistente: **CIERTA — está resuelto y AUTO-CURADO, no es un limbo.**
  - Las 3 cuentas de la tabla NO nacieron del asistente (wizard): nacieron de tocar **«Entrar con Google»**
    directamente en el login (`loginWithGoogle`, `app-2-login.js:208-216`) — Supabase Auth **auto-crea una
    cuenta vacía** con ese Gmail apenas se autoriza, sin pasar por ningún formulario. Coincide con el
    patrón: las 3 están `confirmada:sí` y su `último ingreso` es EL MISMO DÍA que `creada` — un solo toque
    y nunca volvieron.
  - **Qué ve alguien que hace esto y vuelve a abrir la app:** `_enterAuthSession` (`app-3-coach.js:760-793`)
    NO encuentra ficha (`user_data`), mira `_profileFromMeta` y si no está `_complete` (no vino del asistente
    ni de «Crear cuenta con Google»): (1) llama a `delete-account` en **modo ghost** (`{ghost:true}`) que
    borra esa cuenta auth vacía — con candado en el SERVIDOR: solo borra si NO tiene fila de datos, así que
    una cuenta con progreso real es intocable por esta vía; (2) cierra la sesión; (3) muestra el login con
    el mensaje: *«Ese Google no tiene cuenta en AVI. Si tu coach ya te creó una, entra con tu correo y clave
    (Google se conecta después, desde tu Perfil). Si eres nuevo, toca "Crear cuenta".»* + toast *«Entra con
    tu correo y clave, o crea tu cuenta. 👇»*. Es código y comentarios que documentan una auditoría anterior
    (2026-07-01, caso real Claudia/Luz/Nataly) — **este camino ya se reprodujo y se cerró en producción.**
  - **¿Por qué las 3 siguen vivas entonces?** El self-heal solo corre cuando la persona VUELVE a intentar
    (abre la app con esa sesión, o vuelve a tocar Google). Las 3 nunca regresaron — ni una vez — así que el
    auto-borrado nunca se disparó. No están en un limbo activo: están simplemente **abandonadas**, y
    seguirán existiendo hasta que alguien vuelva a tocar «Entrar con Google» con ese mismo Gmail (se
    autocuran solas) o alguien las borre a mano.
  - No hice OAuth real: leí el código de punta a punta (`loginWithGoogle` → `_enterAuthSession` →
    `delete-account?ghost=true`), que es autoexplicativo y coincide exactamente con el patrón medido en
    `auth.users` de las 3 cuentas.
- Q6 · Propuestas de texto (SOLO propuesta, cero código tocado — tono Sofía, español colombiano):
  1. **Error de login cuando `error.code==='email_not_confirmed'`** (hoy dice «Email o contraseña
     incorrectos», y no debería gastar intento):
     *«Ya casi. Te falta confirmar tu correo — revisa tu bandeja (y la carpeta de spam) y toca el
     enlace que te mandamos cuando te registraste. Si no lo encuentras, toca aquí para que te lo
     volvamos a mandar.»*
  2. **Botón «Reenviar correo de confirmación»** (nuevo, al lado del mensaje anterior):
     Texto del botón: *«Reenviar correo»* → toast al mandar: *«Listo, te lo volvimos a mandar. Míralo
     también en spam.»*
  3. **Línea nueva bajo «¿Olvidaste tu contraseña?», antes o después del botón de pedir el enlace**
     (para quien tiene correo de coach y nunca le llega nada):
     *«¿Tu coach te creó la cuenta? A veces el correo no llega. Escríbele y él te pone una contraseña
     nueva sin esperar ningún correo.»*
  4. **Mensaje de «olvidé mi contraseña» tras pedirlo** (hoy es un solo texto para todos; se puede dejar
     igual por anti-enumeración, pero si se decide diferenciar por dominio interno más adelante):
     *«Listo: si esa cuenta existe, te llega un correo con un enlace para crear una contraseña nueva.
     Míralo también en spam. Si tu coach te creó la cuenta y el correo nunca llega, pídele que te la
     restablezca él mismo — es más rápido.»*

## Lo que verifiqué y está SANO (con números)
- «Olvidé mi contraseña» (v582): **20/20 checks OK** con `_verify-reset-pass.mjs` (espía AUTH, cero red
  real) + 6 capturas propias a 390px en claro y oscuro — anti-enumeración real (mensaje idéntico exista o
  no la cuenta), cooldown 60s, enlace vencido explicado, sin caminos sin salida.
- Cooldown y candado de contraseña débil (espejo de la regla del servidor: mínimo 8, mayúscula/minúscula/
  dígito) funcionan igual en el modal de la vuelta del correo (`#m-newpass`).
- Google sin terminar el asistente: las 3 cuentas fantasma NO están en un limbo — el mecanismo de
  auto-limpieza (`delete-account?ghost=true`) ya existe, está guardado por el servidor (solo borra sin
  datos) y se dispara solo en el siguiente intento de esa persona.
- SMTP propio activo (Brevo) desde 2026-06-04, remitente verificado, límite 30/h — no es el correo
  limitado por defecto de Supabase.
- Últimas 24h de `auth_logs`: **58 eventos, 0 errores, 0 rate-limit** — coherente con que nadie pidió
  recuperar su clave desde el 6-sep (baseline).
- Retención de logs medida en al menos **21 días** (más larga de lo que suponía la pista del
  orquestador) — encontré 114 eventos del 2026-09-06, incluida una corrida de `_verify-borrado-cuenta`.

## Lo que tiene que correr o decidir el orquestador / el PO
- **Decidir si se implementan las 3 propuestas de texto de Q6** (el login que miente sobre "sin
  confirmar" es el más urgente — cuesta un `if` y ya tiene la información que necesita en
  `error.code`).
- **Alguien con acceso al dashboard de Supabase (Authentication → Email Templates) mire directamente
  el HTML en vivo de «Reset Password», «Magic Link» e «Invite user»** — mis herramientas no pueden leer
  esa configuración (no vive en una tabla SQL) y la bitácora se contradice con el backlog de CLAUDE.md
  sobre si ya tienen branding o siguen crudas.
- **Actualizar CLAUDE.md**: la frase «Desde v2.0 el coach NO puede cambiar la contraseña de un
  asesorado» es falsa contra el código actual (`_updateClientAccount` + `coach-create-client` v5 modo
  update) — o se corrige el texto, o si la intención de negocio era otra, se retira la función (decisión
  de producto, no mía).
- **Decidir si se cablea `auth.resend({type:'signup',email})`** para el botón de reenviar confirmación
  (Q6.2) — la librería ya la trae (`vendor/supabase-js-2.117.2.js`).

## Sospechas sin medir
- No medí si `@avi.com`/`@apex.com` tienen de verdad registros MX inexistentes (lo asigné a H1 por
  alcance — yo trabajo navegador+código, ellos DNS/SQL de servidor); mi hallazgo de Q2 no depende de
  eso, solo de que la promesa de "olvidé mi contraseña" nunca se cumple para esos dominios en la
  práctica (0 recuperaciones exitosas en toda la historia, por el baseline).
- No verifiqué si existen MÁS registros sin confirmar fuera de la ventana de 120 días que trae el
  baseline (`confirmation_sent_at`) — el baseline ya dice que son 7 envíos / 2 sin confirmar en esa
  ventana; no repetí esa consulta completa.
- No probé el flujo de «vincular Google» (`linkGoogle`, cuenta YA logueada por correo que conecta
  Google después) — el código lo documenta bien (mismo patrón de auto-cura) pero no lo ejecuté ni con
  espía.

## Qué NO miré y por qué
- El HTML/asunto real de las plantillas de recuperación, magic link e invitación tal como viven HOY en
  Supabase Auth — fuera del alcance de mis herramientas (browser CDP contra la app local + SQL
  read-only); no hay tabla que las exponga.
- Registros MX de `avi.com`/`apex.com` — asignado a H1 por la regla del briefing (H1 trabaja DNS/SQL/
  servidor).
- No abrí Comunidad, pagos, ni ninguna pantalla fuera de login/registro/recuperación — fuera del
  alcance de H2 (correos y recuperación).
