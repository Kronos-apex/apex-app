# F1 · La mudanza y las dos direcciones — Samuel (Android/PWA) + Tomás (iOS/Safari)

**Estado: CERRADO.** Retomado tras un corte por límite de cuenta (lo ya investigado se guardó en
este archivo antes de continuar). Las 8 preguntas del orquestador están respondidas; lo que no se
pudo medir queda declarado explícitamente como hueco, no como hallazgo.

## Veredicto en una frase
El mecanismo de la mudanza está construido con cuidado real (candados de tamaño, de pendientes, de
"solo la primera vez", CORS con los dos orígenes en 5 de 6 edge functions) y no encontré pérdida de
datos EN el salto normal — pero tiene un agujero de seguridad concreto y demostrado (un enlace
fabricado puede fijar una sesión ajena en cualquier navegador que aún no haya pisado el hogar
nuevo), un candado de avisos que no se aplica de forma confiable (al menos una persona real recibe
avisos duplicados hoy) y ningún mecanismo automático que impida que las dos direcciones queden
desincronizadas.

## Los 3 más grandes

### 1. 🔴 Un enlace `#avimv=` fabricado planta una sesión AJENA en cualquier navegador que nunca haya
   visitado `app.avientrena.com` (fijación de sesión)
- **Qué es:** `_aviLlegada()` (`app-1-infra.js:98-120`) acepta la clave `avi_auth` (la sesión
  COMPLETA de Supabase: access_token + refresh_token + user) de lo que venga en `#avimv=<base64>`
  con una sola condición: `if(localStorage.getItem('avi_auth')!=null)return;` — es decir, **solo
  protege a quien YA tiene sesión en el hogar nuevo**. `mudanzaKeyAllowed('avi_auth')` da `true`
  (no está en `MV_SKIP_RE`), y el propio *fallback* si `avi-core` no cargó es
  `(k=>k==='avi_auth')` — o sea que `avi_auth` está permitida SIEMPRE, por diseño (es el propósito
  central de la mudanza).
- **A quién le pasa HOY, con nombre:** a CUALQUIERA de los 27 asesorados (o al propio coach) que
  reciba un enlace `https://app.avientrena.com/?mudanza=1#avimv=<payload con avi_auth ajeno>` y
  todavía no haya abierto el hogar nuevo con su propia sesión — que, a una semana de encendida la
  mudanza, es la inmensa mayoría. No hace falta que la víctima sea técnica: basta con que le
  compartan el enlace disfrazado de "aquí está la app nueva" o "mira esto".
- **Qué pasa después:** el navegador de la víctima queda autenticado como el ATACANTE. Si la
  víctima no se da cuenta (nombre distinto en la ficha) y usa la app —anota su peso, sube una
  foto de progreso, escribe en el chat—, **ese dato se guarda en la cuenta del atacante**, no en
  la suya. Si el atacante es un coach o alguien con cuenta propia, puede terminar recibiendo fotos
  o mensajes privados de un desconocido sin haber hecho nada más que compartir un enlace.
- **Evidencia:**
  - Código: `app-1-infra.js:98-120` (`_aviLlegada`), `avi-core.js:11553-11555` (`mudanzaKeyAllowed`).
  - **Repro LOCAL y SELLADO** (nunca tocó producción, nunca inició sesión real — sirve el repo
    real sin modificar en `127.0.0.1:8879` con Python, navega con Chrome headless vía CDP):
    ```
    Resultado: { "auth": "{\"access_token\":\"atacante-tok\",...\"id\":\"atacante-uid\"...}",
                 "theme": "\"dark\"", "href": "http://127.0.0.1:8879/", "marca": true }
    🔴 CONFIRMADO: la sesión del "atacante" quedó plantada en avi_auth de un navegador limpio.
    Control (ya tenía sesión propia): {"auth":"...\"id\":\"victima-uid\"..."}
    ✅ Control OK: a quien YA tiene sesión, el enlace NO se la reemplaza.
    ```
    (script en el scratchpad de esta sesión, fuera del repo, no se commiteó nada)
- **Cómo intenté tumbarlo:** busqué otro candado que faltara por ver — no hay ninguno más en
  `_aviLlegada`. Verifiqué que el orden de carga de scripts no cambia el resultado (el *fallback*
  sin `mudanzaKeyAllowed` es IGUAL de permisivo para `avi_auth`). Confirmé con el control (segunda
  mitad del repro) que la protección "solo la primera vez" SÍ funciona para quien ya tiene sesión
  propia — así que no es un candado inexistente, es un candado con una condición demasiado
  estrecha (protege al que vuelve, no al que llega). El harness `_verify-mudanza.mjs` (M5) YA
  prueba que un enlace fabricado no planta la COLA del coach, pero su payload nunca incluye
  `avi_auth` — no había ningún test, sellado o no, que ejercitara este camino exacto.
- **Qué costaría arreglarlo:** no es trivial sin tocar la promesa central ("nadie vuelve a escribir
  su contraseña"). Una opción: que `avi_auth` SOLO se acepte si el propio enlace trae una firma que
  solo el origen viejo pudo producir (p.ej. un nonce de un solo uso emitido por `_aviMudanza()` y
  verificado — no contra Supabase, sino como un HMAC local con un secreto que viaje en el propio
  código cliente, que al menos exige que el enlace haya salido de una sesión real de la app en el
  momento del salto, no fabricado a mano con cualquier editor). Es una decisión de producto/ingeniería
  que le toca al equipo, no algo que este informe deba resolver.

### 2. 🟡 El candado que retira el endpoint de avisos VIEJO no se está aplicando de forma confiable
   — al menos una persona real recibe avisos duplicados hoy
- **Qué es:** `subscribePush` (`app-1-infra.js:696-760`) debería borrar la fila de
  `push_subscriptions` del endpoint anterior DE ESE MISMO APARATO justo después de guardar el
  nuevo (comentario propio: "un fallo aquí no cambia nada: queda la poda de v577 de respaldo").
- **A quién le pasa HOY, con nombre:** **Diana Paola Diaz** (`user_id 2452449f-…`). Tiene DOS filas
  vivas en `push_subscriptions`, las dos FCM (Android/Chrome), con endpoints DISTINTOS:
  `updated_at 2026-09-21 23:07:41` y `updated_at 2026-09-23 22:46:27` — esta última a **5 segundos**
  de su propio `deviceStamp` (`profile.dev.at = 2026-09-23T22:46:22.686Z`, build 665). Es decir: el
  mismo instante en que su teléfono se actualiza a la versión con la mudanza encendida, aparece una
  fila NUEVA de push — y la VIEJA no se borró.
- **Qué significa en la práctica:** `daily-notifs` no distingue origen, le manda a TODAS las filas
  de ese `client_id`. Mientras las dos filas sigan vivas, a Diana Paola cada aviso diario
  (mañana/media mañana/tarde) le suena **DOS VECES** — el mismo síntoma que el propio commit de
  v662 dice que existe para prevenir.
- **Evidencia:** SQL contra producción (solo `SELECT`):
  `select id, client_id, updated_at, subscription->>'endpoint' from push_subscriptions` — 13 filas,
  Diana Paola con 2 (`24544b84…`/`a9e0a840…` no, corrijo: sus dos ids son `1a7692a3-…` del 23-sep y
  `a9e0a840-…` del 21-sep). El coach (`_coach`) TAMBIÉN tiene 2 filas FCM con endpoints distintos
  (`04cc7506…` 25-sep y `171e45a3…` 22-sep) — con la salvedad de que el coach ya se sabía que usa 2
  aparatos reales de antes (gotcha existente), así que ese caso NO se puede atribuir a la mudanza
  sin más información.
- **Cómo intenté tumbarlo:** revisé la policy `push_del_own` (migración `20260923_push_del_own.sql`)
  contra `pg_policies` real — está bien escrita y con el alcance correcto (cada quien su fila),
  así que NO es un problema de permisos. Consideré la explicación alternativa más simple —que sea
  solo una ROTACIÓN NORMAL de token FCM, algo que pasa sin ningún cambio de origen— pero la
  coincidencia de 5 segundos entre el `deviceStamp` (que se escribe en cada arranque) y la fila
  nueva es una señal fuerte de que el evento fue precisamente ESE arranque post-mudanza. **No pude
  confirmar la causa raíz exacta** (¿la clave `apex_push:<clientId>` no viajó en el `#avimv=`? ¿el
  DELETE falló por otra razón y se tragó el error?) sin poder inspeccionar el dispositivo real de
  Diana Paola — dejo esto explícitamente como "medido pero sin causa raíz cerrada".
- **Qué costaría arreglarlo:** confirmar con un log adicional (temporal) en el propio `catch` del
  DELETE de `subscribePush`, o simplemente esperar: la poda "hermana 21+ días" ya existe como
  respaldo — pero desde el 23-sep hasta que se cumplan esos 21 días (~14-oct), sigue duplicando.

### 3. 🟡 Nada impide (ni avisa) que las dos direcciones queden en versiones distintas — un `git push`
   normal solo actualiza github.io
- **Qué es:** `publicar-hogar.mjs` es el ÚNICO camino que actualiza `app.avientrena.com` (sube a
  Vercel); el flujo normal de trabajo del repo (`git push` → GitHub Pages automático) SOLO toca
  github.io. Leí `.github/workflows/ci.yml` y `keepalive.yml` completos: la CI corre la suite y
  nada más — **cero verificación de que las dos direcciones sirvan la misma versión**. El propio
  script dice al final "Verifica: node scripts/e2e/_prodcheck.mjs vNNN https://app.avientrena.com/"
  como un paso MANUAL que depende de que alguien se acuerde.
- **A quién le pasa HOY, con nombre:** a cualquiera de las 27 personas que salte desde github.io
  (todas, salvo Laura y Kathe con iPhone instalado) durante la ventana en la que las direcciones
  estén desincronizadas — no hay un nombre concreto porque no até esto a un incidente YA ocurrido,
  pero el propio historial del repo (comentario en `publicar-hogar.mjs`) dice que **ya pasó una
  vez** con el enlace del proyecto de Vercel en v659 ("si se borra con el resto, el deploy se va a
  un proyecto NUEVO... pasó al publicar v659 y solo lo delató el prodcheck contra el hogar nuevo").
- **Qué se rompería:** quien salta desde github.io (ya actualizado a la versión N) llegaría a un
  hogar nuevo sirviendo la versión N-1 (o más vieja, si el olvido se repite varias veces). Dado que
  `mudanzaPick`/`mudanzaKeyAllowed` son funciones puras y estables entre versiones recientes, un
  desfase de una sola versión probablemente no rompe nada agudo — pero un desfase de VARIAS
  versiones sí podría, dependiendo de qué haya cambiado en el medio (un ejemplo real: si el hogar
  nuevo se queda en una versión anterior a v662, seguiría usando `home` en vez de `hogar` como
  campo de la señal, y el propio mecanismo de mudanza podría comportarse de forma inconsistente
  entre lo que el teléfono espera y lo que el servidor entrega).
- **Evidencia:** `.github/workflows/ci.yml` y `keepalive.yml` (ausencia total de pasos de
  Vercel/avientrena), `scripts/publicar-hogar.mjs:28-30` (el propio comentario admite el incidente
  de v659).
- **Cómo intenté tumbarlo:** busqué cualquier hook de pre-commit, workflow o script que comparara
  versiones entre orígenes — no encontré ninguno. Confirmé que `_prodcheck-mudanza.mjs`
  (que SÍ compara las dos direcciones) existe pero es un script que hay que invocar A MANO; no está
  enganchado a ningún gatillo automático.
- **Qué costaría arreglarlo:** un paso de CI (o un cron) que compare el `CACHE_NAME` de
  `sw.js` servido por las dos direcciones y avise si difieren — es exactamente lo que
  `_prodcheck-mudanza.mjs` ya sabe hacer, solo falta automatizarlo.

## Todos los hallazgos

| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🔴 | Enlace `#avimv=` fabricado planta `avi_auth` ajeno en navegador virgen | `app-1-infra.js:98-120`, `avi-core.js:11553` | Potencial — no hay evidencia de que se haya EXPLOTADO, pero la puerta está abierta a TODOS los que aún no visitaron el hogar nuevo |
| 🟡 | Endpoint de push viejo no se retira de forma confiable al re-suscribirse en el hogar nuevo | `app-1-infra.js:744-755` (`subscribePush`) | SÍ — Diana Paola Diaz recibe avisos duplicados desde el 23-sep; posiblemente el coach también (con reserva, ya usa 2 aparatos de antes) |
| 🟡 | Nada (ni CI ni un hook) impide que un `git push` normal deje las dos direcciones en versiones distintas | `.github/workflows/ci.yml`, `scripts/publicar-hogar.mjs` | No hoy medido, pero ya pasó una vez con el enlace del proyecto Vercel (v659, según el propio comentario del script) |
| 🟢 | Reinstalar desde Safari no lleva nada del localStorage viejo (sin mecanismo de mudanza) | `app-1-infra.js:98-100` | Laura y Kathe, SOLO si reinstalan a mitad de un entreno/con snoozes pendientes — hoy no hay evidencia de que haya pasado |
| 🟢 (verificado SANO) | `avi_auth` viaja SOLO en el `#` — nunca en `Referer` (garantía de spec, no de la app) ni en `app_errors.ctx` (no captura href/hash) | `app-1-infra.js:469-490` | No aplica |
| 🟢 (verificado SANO) | Un enlace fabricado NO puede plantar la cola del coach (`ax_cwq_`/`ax_coachpending_`) ni el flag `ax_udirty_` | `avi-core.js:11551` (`MV_SKIP_RE`) | No aplica — cubierto por `_verify-mudanza.mjs` M5 |
| 🟢 (verificado SANO) | Datos no confirmados en la nube (incl. fotos base64 sin subir) BLOQUEAN el salto entero (`_mvHasPending`), no viajan a medias | `app-1-infra.js:39-54` | No aplica |
| 🟢 (verificado SANO) | Claves forjadas que NO son `avi_auth` no consiguen subirse a la nube al hacer login normal después: el camino de fusión exige un `ax_udirty_<uid>` real, que no se puede forjar | `app-3-coach.js:683-750` (`_enterAuthSession`) | No aplica |
| 🟡 | 2 errores "newestWorker is null" en `app_errors` (24-25 sep), los dos iPhone Safari normal (no instalada) en `app.avientrena.com`, `_checkUpdate` (`reg.update()`) | `app-6-extra.js:95` | Ninguna — confirmado inofensivo (ver Q6a) |
| 🟢 (verificado SANO) | El SW y el reenvío de `media/` funcionan igual en el hogar nuevo (Vercel rewrite = mismo origen para el navegador) — razonado por código, ver "sospechas" para la parte sin confirmar en vivo | `sw.js:73-137`, `scripts/hogar-vercel.json` | No aplica |
| 🟢 (verificado SANO) | 5 de 6 edge functions desplegadas coinciden con el repo (4 idénticas byte a byte, 1 con una diferencia cosmética de guiones en un comentario) | ver Q7 | No aplica |
| 🟡 | `daily-notifs` desplegada (v9, ~29-ago) SIN el wrapper `conCors`/dos orígenes — pero nunca la llama el navegador (solo cron con secreto) | Supabase edge `daily-notifs` vs `supabase/functions/daily-notifs/index.ts` | Ninguna hoy — riesgo latente si algún día se invoca desde el navegador |
| 🟢 (verificado SANO) | El sello de versión (`profile.dev`) no guarda el origen — confirmado por SQL | `avi-core.js` deviceStamp | No aplica, ver Q8 |

## Respuesta a las preguntas del orquestador

**1. ¿Se puede perder algo en el salto?**
**PARCIALMENTE CIERTA, con matices por clave.** El salto normal (redirect automático, NO el caso
de reinstalar) está bien diseñado: `mudanzaPick` (avi-core.js:11556) hace TODO-O-NADA sobre lo
imprescindible (`MV_MUST_RE`: `done_`,`log_`,`lastre_`,`drop_`,`wshow_`,`wu_`,`wuopen_`,
`session_date_`,`session_id_`,`work_`,`mood_`,`moodalert_`,`avi_auth`) — si no cabe, NO se muda
(se queda donde funciona), nunca se muda a medias. Verificado por `_verify-mudanza.mjs` M3g/h/i
(incluso un `work_` de 5.000 caracteres, por encima del tope individual de lo opcional, viaja
porque es imprescindible). Lo OPCIONAL (snoozes, `apex_ob_done_`, etc.) viaja si cabe — y casi
siempre cabe, porque son ítems chicos y el propio catálogo grande (`ax_c`, `ax_hist`, `ax_e`) se
excluye individualmente por tamaño (>4.000 caracteres) mucho antes de agotar el total de 100.000.
La cola del coach (`ax_cwq_`/`ax_coachpending_`) NUNCA viaja Y frena el salto entero si tiene algo
(`mudanzaQueuePending`). Cualquier escritura sin confirmar en la nube (`_authDirty`, `ax_udirty_`,
`_udPending`, `_udFailedKeys`, `_pendingPush`) TAMBIÉN frena el salto — así que una foto que cayó a
base64 sin red (que se guarda dentro de `ax_photos`, sincronizado) no se pierde: bloquea la
migración hasta que se resuelva.
**El agujero real no es de PÉRDIDA silenciosa en el salto normal, es el de REINSTALAR** (hallazgo
3 arriba): ahí sí se pierde todo lo local-only, porque no pasa por `mudanzaPick` en absoluto.
Víctima: Laura/Kathe, solo si reinstalan con algo pendiente.
Sospecha sin cerrar: si `done_`/`log_` de rutinas MUY viejas (nunca limpiadas porque esa rutina no
se ha vuelto a abrir) se acumulan sin límite, podrían en teoría empujar lo imprescindible sobre el
tope de 100.000 y bloquear el salto de alguien con mucho historial — hay limpieza real
(`checkAndResetSession`/`_sweepOrphanSessionKeys`) pero SOLO para la rutina que se está viendo, no
para rutinas abandonadas. **NO SE PUDO MEDIR** (requiere inspeccionar el localStorage de un
teléfono real con mucho historial).

**2. La sesión viaja en la dirección**
**(a) CIERTA** — ver hallazgo 1. Un enlace fabricado SÍ puede fijar una sesión ajena en un
navegador que nunca visitó el hogar nuevo. Repro local confirmado con control de discriminación
(protege a quien ya tiene sesión, no a quien llega por primera vez).
**(b) Contenido:** la sesión completa de Supabase (`access_token`, `refresh_token`, `user{id,
email}` — nunca la contraseña). Duración: por defecto de Supabase, access_token ~1h,
refresh_token de larga duración (no medí la configuración exacta del proyecto — **NO SE PUDO
MEDIR** el TTL exacto sin acceso a la configuración de Auth). Dónde puede quedar escrito: **NUNCA
en `Referer`** (los navegadores nunca envían el fragmento `#` como Referer — garantía de
especificación, no de la app, verificado leyendo el spec, no hace falta repro); **NUNCA en
`app_errors`** (`ctx` solo trae `{standalone,w,uid}`, nunca `href`/`hash` — `app-1-infra.js:
485-486`); SÍ puede quedar un instante en el historial/barra de direcciones del navegador antes de
que `history.replaceState` la limpie (es prácticamente síncrono, ventana de riesgo mínima, solo
relevante para quien esté grabando la pantalla en ese instante exacto) — riesgo bajo y teórico.
**(c) FALSA** (para el camino de login normal tras el enlace) — ver hallazgo "verificado SANO":
el camino que fusionaría localStorage con la nube y re-subiría requiere un flag `ax_udirty_<uid>`
real, que está en `MV_SKIP_RE` y por tanto NO se puede forjar; sin ese flag, `_enterAuthSession`
usa la fila de la nube directamente y las claves plantadas quedan inertes. Si el enlace SÍ trae
`avi_auth` forjado (ver 2a), entonces lo que se escriba queda bajo la cuenta del ATACANTE, no bajo
la de la víctima — dato mal dirigido, no dato "inyectado" en una cuenta ajena por esta vía.

**3. Dos orígenes vivos**
**(a) CIERTA, confirmado que no hay ningún candado automático.** `publicar-hogar.mjs` es el ÚNICO
camino que actualiza `app.avientrena.com` (sube a Vercel); un `git push` normal solo dispara
GitHub Pages (github.io) vía `.github/workflows/ci.yml`. Leí ambos workflows
(`.github/workflows/ci.yml` y `keepalive.yml`) completos: **cero menciones a Vercel, a
`avientrena`, a `publicar-hogar` o a `_prodcheck-mudanza`** — CI corre la suite y nada más; no
verifica que las dos direcciones sirvan la misma versión. Si alguien hace un deploy normal y NO
corre `publicar-hogar.mjs`, **github.io queda en la versión NUEVA y app.avientrena.com se queda
ATRÁS** — la relación invertida de lo habitual ("los rezagados son los viejos"). El propio script
dice "Verifica: node scripts/e2e/_prodcheck.mjs vNNN https://app.avientrena.com/" como un paso
MANUAL que alguien tiene que acordarse de correr; no hay nada que lo fuerce. Qué se rompería: quien
salta desde github.io (ya actualizado) llegaría a un hogar nuevo con JS VIEJO — dado que
`mudanzaPick`/`mudanzaKeyAllowed` son funciones PURAS sin cambios de firma entre versiones
recientes, un desfase de una sola versión probablemente no rompe nada agudo, pero un desfase de
VARIAS versiones (si esto pasara repetidamente sin que nadie lo note, algo plausible dado que ya
pasó una vez con el enlace del proyecto Vercel en v659, según el propio comentario del script) sí
podría, dependiendo de qué cambió. **No até esto a un incidente real ya ocurrido** — es un riesgo
de proceso confirmado (ausencia de candado), no un hallazgo con víctima medida hoy.
**(b) PARCIALMENTE CIERTA.** Los 10 rezagados (Chema v644, Danilo v661, diana ramirez v544, jhojan
hernandez v608, Laura v661, Natalia v654, Nataly v563, Nicolás v571, Samuel v657, Valery v619)
siguen funcionando en github.io — confirmado que el dominio NO redirige a nivel de servidor (a
propósito, ver falso positivo #2 del briefing) y que las 5 edge functions activas (send-push,
delete-account, coach-create-client, refresh_snapshot, activate_public_profile) siguen aceptando
`https://kronos-apex.github.io` en su CORS (confirmado leyendo el código desplegado: la lista
`ORIGENES` incluye AMBOS orígenes siempre). Lo que SÍ pudo romperse para versiones viejas y no se
alcanzó a verificar en detalle: los buckets que pasaron a privados (`progress-photos`,
`chat-media`, `apex-photos`) — una versión vieja que todavía intente escribir a una ruta/bucket
público fallaría en silencio y caería a base64 (ya es el comportamiento de reserva diseñado, así
que no sería catastrófico, pero sí ineficiente). **NO SE PUDO MEDIR a fondo** cuál build exacto de
cada rezagado antecede a cada migración de buckets — dejo la lista de fechas para que alguien la
cruce: buckets movidos a privado en v649-v652 (chat-media, progress-photos) y v652 (avatares/fotos
de perfil). De los 10 rezagados, **Nataly (v563), Nicolás (v571), diana ramirez (v544) y jhojan
hernandez (v608)** están en builds ANTERIORES a v649 — ellos son los candidatos reales a sufrir
esto si suben una foto de progreso hoy.

**4. El iPhone instalado (Laura, Kathe), que NO salta por diseño**
Confirmado por SQL: Laura (`profile.dev.b=661`, iPhone, `push:granted`) y Kathe (`b=668`, iPhone,
`push:granted`) — las dos con push YA concedido, así que si algo las empujara a re-otorgar
permiso en el dominio nuevo sin saberlo sería confuso, pero no hay evidencia de que eso pase.
**¿Algo de la app de HOY las manda al dominio nuevo fuera de su app instalada?** CIERTA, con
matices: `AVI_SHARE_URL`/`CMTY_INVITE_URL` (`app-4-entreno.js:1725`, `avi-core.js:9442`) apuntan a
`https://app.avientrena.com/` — si ELLAS comparten un logro o invitan a alguien desde su app vieja
(instalada en github.io), el enlace que se genera y se manda por WhatsApp apunta al hogar NUEVO.
Si la propia Laura o Kathe tocaran ese enlace (por accidente, revisando qué mandaron), se abriría
en un navegador superpuesto de iOS sobre el dominio nuevo, SIN sesión — verían la pantalla de
login/registro de AVI como si fueran una persona nueva. No es autodestructivo (no las saca de su
app instalada), pero si el coach las invita a "abrir la app" vía el flujo `coachInviteOpenApp`
(que también usa `AVI_SHARE_URL`) pensando que eso las hará entrar a SU app, en realidad las manda
a una pantalla de registro en blanco. **"Olvidé mi contraseña"**: `redirectTo:
location.origin+location.pathname` (`app-1-infra.js:546`) — CIERTA que es seguro: se ancla al
origen DESDE el que se pide, así que si lo piden desde su app instalada (github.io), el correo las
trae de vuelta a github.io, no al dominio nuevo. **Al reinstalar desde Safari:** CIERTA, pierden lo
local-only — ver hallazgo 3 arriba.

**5. Avisos**
**(a) CIERTA que sabe que es "el mismo aparato" por comparación de `localStorage['apex_push:
<clientId>']` de ESE navegador contra el endpoint nuevo — nunca compara entre aparatos.** No puede
borrar la suscripción de OTRO teléfono de la misma persona porque los endpoints de push son
cadenas únicas por suscripción (criptográficamente improbable que coincidan) y el DELETE filtra
por el endpoint EXACTO leído de storage local, nunca por client_id solo. **PERO el candado no se
está aplicando de forma confiable en la práctica** — ver hallazgo 2 (Diana Paola Diaz con avisos
duplicados). **(b) FALSA que haya confusión de destino** — confirmado por `sw.js:161-173`
(`notificationclick`): abre `self.registration.scope`, que es el scope PROPIO del service worker
que recibió ESE push — el de github.io abre github.io, el de app.avientrena.com abre el nuevo. No
hay forma de que una notificación vieja abra el dominio nuevo o viceversa. **(c) CIERTA que el
coach está cubierto por el MISMO código** (`subscribePush` no distingue `_coach` de un asesorado
salvo en el `client_id` que usa) — pero el coach también tiene 2 filas de push con endpoints
distintos y fechas recientes (25-sep y 22-sep), el mismo patrón ambiguo de Diana Paola, con la
salvedad de que YA se sabía que el coach usa 2 aparatos reales de antes de la mudanza (gotcha
existente) — **NO SE PUDO DISTINGUIR con los datos disponibles** si sus 2 filas son 2 aparatos
reales (normal) o el mismo síntoma de duplicado.

**6. Service worker**
**(a) INOFENSIVO, confirmado.** Los 2 "newestWorker is null" (ids 71 y 72 en `app_errors`, 24 y
25-sep) son de iPhone Safari (NO instalada, `standalone:false`) en `app.avientrena.com`, en
`_checkUpdate` (`app-6-extra.js:95`, `reg.update()` sin `.catch()` en la promesa → rechazo no
manejado). Es un error conocido de WebKit al llamar `update()` en condiciones de carrera de
registro fresco — no bloquea nada: `_checkUpdate` es de disparar-y-olvidar, el chequeo real de
actualizaciones sigue funcionando por el listener `updatefound` y por el intervalo de 20 min.
`uid:null`/`build:''` porque ocurre muy temprano en el arranque (antes de que se resuelva el
build label), no porque falte algo. **(b) CIERTA, confirmado con una petición HTTP real de solo lectura (GET, sin sesión).**
`curl -I https://app.avientrena.com/media/exercises/e1.jpg` → **HTTP 200**, `Content-Type:
image/jpeg`, `Server: Vercel`, con cabeceras que se filtran del origen real detrás del rewrite
(`X-Github-Edge-Region`, `X-Github-Request-Id`, `X-Fastly-Request-Id`) — confirma que Vercel sirve
el archivo TRANSPARENTEMENTE bajo la URL `app.avientrena.com/media/...`, exactamente como describe
`scripts/hogar-vercel.json`. Como la URL que ve el navegador nunca cambia de origen (no hay
redirect visible), `url.origin === self.location.origin` da `true` en `sw.js`, así que tanto la
rama de `.mp4` (network-first con caché de respaldo) como la rama genérica de assets (cache-first)
SÍ cachean media en el hogar nuevo — mismo comportamiento que en github.io (control: el mismo
archivo en `kronos-apex.github.io/apex-app/media/exercises/e1.jpg` también da 200). Sin red: sirve
de caché si ya se pidió antes; si nunca se pidió, falla igual que en github.io (no es una
regresión de la mudanza). **(c) CIERTA, razonado por arquitectura: sigue vivo,
sigue actualizándose y NO estorba** — cada origen tiene su registro de Service Worker
completamente aislado (garantía del navegador), así que el SW de github.io no interactúa en
absoluto con el de app.avientrena.com. Sigue vivo mientras alguien visite github.io (los 10
rezagados, y cualquiera que use el ícono instalado viejo antes de que la redirección de
`_aviMudanza` los saque). No hay curl de confirmación — **razonado, no medido en vivo**.

**7. Edge functions: ¿el código DESPLEGADO coincide con el del repo?**
**CIERTA para 5 de 6, con una excepción conocida y sin impacto práctico.** Comparé el código
desplegado (vía `get_edge_function`, lectura de solo API de gestión, no toca producción) contra
los archivos locales byte a byte:
- `send-push` (v12), `delete-account` (v8), `coach-create-client` (v5),
  `activate_public_profile` (v3): **IDÉNTICOS**, `diff -u` sin salida.
- `refresh_snapshot` (v9): **UNA diferencia cosmética** — el comentario `// ── R2 · HITOS ──`
  lleva más guiones en el repo local que en lo desplegado. Cero diferencia de comportamiento.
- `daily-notifs` (v9, sin redesplegar desde ~29-ago): **le falta el wrapper `conCors`/dos
  orígenes** que el repo ya tiene — su `cors` desplegado es fijo a
  `https://kronos-apex.github.io` únicamente. Confirmado que esto **no tiene impacto hoy**:
  `daily-notifs` NUNCA la llama el navegador (grep en todo `app-*.js`/`avi-core.js`: cero
  referencias; y el propio harness `_probe-edge-cors.mjs` del repo ya lo documenta: "la llama el
  cron del servidor, que no manda Origin"). Todo el resto del contenido (los 8 pools de mensajes,
  `RENEW_NOTICE_DAYS=3`, el espejo de `pushPlanFromRoutines`, la poda de suscripciones muertas)
  coincide con el repo en lo que pude cotejar visualmente (no hice diff byte a byte de las 488
  líneas por el volumen, pero crucé los fragmentos de lógica y los textos de los mensajes).

**8. ¿Importa no saber quién se mudó?**
**CIERTA que el sello no guarda el origen** — confirmado por SQL: `profile.dev` trae exactamente
`{b, at, ua, push}`, nunca el `hostname`/origen. **Si hace falta saberlo:** el caso concreto que
encontré es justo el hallazgo 2 (avisos duplicados) — para diagnosticar POR QUÉ a alguien le
suena dos veces, ayudaría saber si las dos filas de `push_subscriptions` corresponden a dos
orígenes distintos o a dos aparatos reales, y hoy eso solo se puede intentar inferir mirando el
`user-agent` del deviceStamp contra el patrón de endpoints (frágil, no concluyente, como se vio
con Diana Paola y con el coach). **No propongo guardar el origen para perseguir a nadie** (el PO
lo prohibió) — el caso de uso es puramente de DIAGNÓSTICO técnico de un síntoma (avisos
duplicados), no de seguimiento de personas.

## Lo que verifiqué y está SANO (con números)
- `_verify-mudanza.mjs` (harness sellado existente, no lo corrí yo mismo esta ronda por no
  duplicar trabajo — lo LEÍ completo): 21 aserciones que cubren M1-M6, incluida la protección de
  la cola del coach y que lo imprescindible viaja aunque pese >4.000 caracteres.
- Repro propio (sellado, local, sin producción): confirma la fijación de sesión (hallazgo 1) CON
  su control de discriminación (a quien ya tiene sesión, el enlace no se la reemplaza) — 2/2
  aserciones, las dos con el resultado esperado (una roja=hallazgo real, una verde=control sano).
- `app_errors`: 8 filas desde el 22-sep (el baseline decía 7; la 8ª es de las 11:49 de HOY,
  25-sep, posterior a cuando se midió el baseline — mismo patrón conocido, no es una clase nueva).
  0 filas con `uid` no-nulo (la telemetría sigue sin identificar a nadie, gotcha ya conocido).
- Edge functions: 4 de 6 idénticas byte a byte al repo; 1 con diff cosmético; 1 (`daily-notifs`)
  con diff real pero sin impacto (no la llama el navegador).
- Referer / app_errors: confirmado por código que NUNCA pueden llevar el token de la mudanza.
- `push_subscriptions`: 13 filas, 10 dueños — cuadra con el baseline.
- **Reenvío de `media/` en el hogar nuevo:** `curl -I` real contra `app.avientrena.com/media/exercises/e1.jpg`
  → HTTP 200, `Server: Vercel`, con cabeceras de GitHub/Fastly filtrándose del origen detrás del
  rewrite — confirma que es transparente para el navegador y que el Service Worker SÍ cachea media
  igual que en github.io (control: el mismo archivo en github.io también da 200).
- **CI no verifica la simetría entre los dos orígenes:** leídos `.github/workflows/ci.yml` y
  `keepalive.yml` completos — cero menciones a Vercel/avientrena/publicar-hogar/prodcheck.

## Sospechas sin medir
- Acumulación de `done_`/`log_`/`session_date_`/etc. de rutinas VIEJAS que ya no se vuelven a abrir
  (la limpieza real solo corre sobre la rutina que se está viendo) podría, en teoría, empujar lo
  imprescindible por encima del tope de 100.000 caracteres en alguien con mucho historial y
  bloquear su salto entero — sin víctima medida, sin acceso a un dispositivo real para confirmarlo.
- El caso del coach con 2 filas de push (hallazgo 2): no pude distinguir "2 aparatos reales de
  siempre" de "el mismo síntoma de Diana Paola" con los datos disponibles.
- Despliegue asimétrico (pregunta 3a): confirmado que NO hay candado automático (CI no lo
  verifica), pero no até esto a un incidente real ya ocurrido — es un riesgo de proceso, no un
  hallazgo con víctima medida hoy.

## Qué NO miré y por qué
- **No corrí ningún harness contra producción más allá de lecturas SQL** — no llegué a ejecutar
  `_prodcheck.mjs` ni `_prodcheck-mudanza.mjs` esta ronda (el baseline del orquestador ya los
  corrió hoy mismo y reportó 6/6 y verde; no vi valor en repetirlos sin una hipótesis nueva que
  probar con ellos). Si hiciera falta re-confirmar el estado EN VIVO de la señal `mudanza.json`,
  ahí está pendiente.
- **No inspeccioné `_verify-mudanza-instalada.mjs` ni `_verify-avisos-mudanza.mjs` en profundidad**
  (los leí por encima, no los ejecuté) — puede haber cobertura o huecos ahí que no llegué a cruzar
  contra mis propios hallazgos, en particular el de avisos duplicados (hallazgo 2), que podría
  tener relación directa con lo que ese harness ya prueba.
- **No verifiqué en un iPhone/Android real** nada de lo relativo a la instalación, el ícono viejo,
  ni el comportamiento exacto de `navigator.standalone` — todo lo de iOS se verificó por código y
  por el repro local con `Object.defineProperty` simulando `navigator.standalone`, nunca en un
  dispositivo físico (no hay uno en el banco de pruebas, como ya lo documenta el propio repo en
  gotchas anteriores).
- **No llegué a auditar `_sabotaje-v662.mjs`/`_sabotaje-v663.mjs` corriéndolos** (los LEÍ
  completos) — no repetí su ejecución porque mutan el árbol y hay otros dos auditores trabajando
  en paralelo (regla dura del briefing).
- **Pendiente si el tiempo alcanza:** terminar de cruzar fechas de build de los 10 rezagados contra
  las migraciones de buckets privados (Q3b) con más precisión que la lista aproximada que dejé
  arriba.
