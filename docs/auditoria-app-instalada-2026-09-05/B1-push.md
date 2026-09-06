# B1 · El push, la cadena entera hasta el teléfono — Samuel Ortega, ingeniero de plataforma móvil

## Veredicto en una frase
El código de la cadena de push está bien construido (permiso, suscripción, autorización servidor, poda de suscripciones muertas) y el gotcha de v551 (días de entreno desincronizados) quedó genuinamente cerrado — pero **nadie audita si el push realmente sale**: hay suscripciones duplicadas/huérfanas activas hoy mismo que nadie detecta, y las dos funciones diseñadas para traer de vuelta a quien se fue (RESCUE y COMEBACK) casi no tienen a quién rescatar porque las mismas 13-14 personas inalcanzables nunca llegaron a tener push.

## Los 3 más grandes

### 1. 🔴 Suscripciones duplicadas/huérfanas: el 20% de la gente con push está recibiendo DOS envíos por turno, y nada lo detecta
**Qué es.** `push_subscriptions` acumula más de una fila por persona cuando el navegador rota de endpoint (reinstala la PWA, resetea permisos, cambia de dispositivo). El único mecanismo de limpieza es reactivo: `send-push` y `daily-notifs` solo borran una fila si el envío falla con HTTP 410/404. Si el endpoint viejo sigue "vivo" desde el punto de vista del servicio de push (FCM sigue aceptando el POST aunque nadie lo lea), la fila **nunca se poda** y queda enviando para siempre. La migración `20260824_push_dedupe_endpoint.sql` (v535) ya detectó este patrón en Samuel y Natalia y los declaró **"dos aparatos de verdad, no se tocan"** — una decisión tomada UNA vez, el 24-ago, que nunca se vuelve a verificar.

**Evidencia.**
- SQL contra `push_subscriptions` (2026-09-05): Natalia Martinez (`78ea069c-439a-47e3-905d-c3669445bad1`) tiene 2 filas con endpoints DISTINTOS (verificado por hash): una de **2026-08-07** con `training_days:["Lunes","Lunes","Martes"]` (el patrón exacto citado como ejemplo del propio gotcha v551) y otra de 2026-09-04 con el plan correcto. Samuel Cifuentes (`31bf6d19-...`) tiene el mismo patrón: filas de 2026-08-25 y 2026-08-30, endpoints distintos.
- Logs de la edge `daily-notifs` (`function_logs`, ventana 2026-09-05T00:00→20:30, fuente real de Supabase): **en las 3 rondas del día (12:00, 15:00, 20:30 UTC) Natalia recibió DOS líneas `✅` por ronda**, una por cada fila — 6 envíos "exitosos" hoy para una sola persona. Ninguna de las dos fallò, así que ninguna se podó.
- La fila vieja de Natalia lleva **29 días sin refrescarse** (2026-08-07 → 2026-09-05) — un día más y deja de calificar como "fresca" bajo el propio criterio del baseline ("ninguna con `updated_at` de más de 30 días"). El criterio de frescura del baseline mide EDAD, no DUPLICACIÓN, así que este caso pasa desapercibido hasta que cruce esa línea.

**Cómo intenté tumbarlo.** Confirmé con `md5(subscription->>'endpoint')` que son endpoints genuinamente distintos (no es el bug de rotación de claves que v535 ya cerró con el trigger `push_dedupe_endpoint`, ese sigue sano). Consideré la hipótesis "son dos aparatos reales de Natalia (celular + tablet) y esto es exactamente lo que v535 decidió respetar" — es plausible y no puedo descartarla sin el teléfono físico. Pero el hecho verificable y no ambiguo es otro: **no existe ningún mecanismo que vuelva a preguntar si esa fila sigue viva**. Una fila que no se refresca en 29 días mientras la app llama a `ensureClientPush()`/`subscribePush(...,force=true)` en cada login es, como mínimo, un dispositivo que la persona dejó de abrir — y aun así sigue contando como "enviado" en las métricas.

**Qué cuesta arreglarlo.** Barato: cuando `subscribePush` inserta una fila nueva para un `client_id`, borrar (o marcar) las filas del MISMO client_id cuyo `updated_at` sea más viejo que un umbral (p. ej. 14 días) — no borra "el aparato viejo de verdad", pero dejaría de contarlo como entrega exitosa. Alternativa más simple: un chequeo periódico (o dentro de `daily-notifs`) que reporte cuántas personas tienen >1 fila y hace cuánto no se refresca la más vieja, para que alguien lo mire antes de que se acumule.

---

### 2. 🔴 RESCUE y COMEBACK — las dos funciones hechas para traer de vuelta a quien se fue — no tienen alcance real hoy
**Qué es.** `daily-notifs` tiene dos segmentos diseñados exactamente para el problema que motiva esta ronda (13-14 personas inalcanzables): `RESCUE` (nunca ha entrenado) y `COMEBACK` (entrenaba y lleva ≥7 días sin volver). Ambos dependen de que la persona **ya tenga** una fila en `push_subscriptions`. Pero conseguir esa fila requiere abrir la app, llegar más allá del día 1 (el aviso de activar notificaciones está deliberadamente apagado en el modo día 1, `_DIA1_OFF` incluye `cn-push-nudge`) y conceder el permiso. Es decir: **el mismo comportamiento que estas dos funciones existen para arreglar (abrir la app pocas veces y desaparecer) es el que impide que la persona llegue a tener push.**

**Evidencia (cruce `user_data` × `push_subscriptions`, 2026-09-05, filtrando harness).** De 24 clientes reales:
- **10 tienen push — y los 10 son exactamente los 10 más activos** (todos entrenaron entre el 25-ago y el 5-sep). Cero excepciones: no hay una sola persona inactiva con push vigente hoy que no sea el caso límite de Samuel (última sesión 25-ago, 11 días, candidato a COMEBACK).
- **7 clientes tienen CERO sesiones registradas jamás** (Santiago Santos, Sofía Vega, FELIPE R.L, Daniel, Cristian Luna, maria rubio, Chema/diana ramirez incluidas según el corte). **Ninguno de los 7 tiene push.** El segmento `RESCUE` — que solo se dispara martes/sábado por la tarde para gente con `total===0` — no tiene, hoy, ni una sola persona a quien pueda llegarle.
- 5 clientes más entrenaron alguna vez y se fueron hace semanas o meses (Yovan 2 sesiones, Nicolás 1, Sharith 1, Yeison 3, jose 2, jhojan 1) — **ninguno tiene push**, así que tampoco pueden recibir `COMEBACK`.
- El caso más nítido: **Miguel Pulido, 14 sesiones reales** (no es alguien que "probó y ya" — entrenó de verdad) dejó de entrenar el 30-jun y hoy **no tiene push NI teléfono guardado**. No hay ningún canal, de ningún tipo, para que AVI vuelva a llegarle. `coachCanReach` (v520) ya documenta esta clase de caso para el teléfono; aquí es la mitad push la que también está vacía.
- De los 24 clientes reales, **13 no tienen push NI teléfono** (coincide casi exactamente con el "13 de 22" del brief — el universo de 24 es la medición de hoy). Solo 1 (`maria rubio`) tiene teléfono sin push.

**Cómo intenté tumbarlo.** Pensé que quizás el corte "día 1 apaga el aviso de push" no aplica a estos casos porque muchos SÍ pasaron del día 1 (Miguel con 14 sesiones, por ejemplo). Repasé el código: el apagado por `_DIA1_OFF` es solo para el PRIMER día; alguien con 14 sesiones tuvo decenas de aperturas posteriores en las que el aviso sí se mostraba (si no había concedido permiso). Así que la explicación no es "nunca se le pidió" sino, más probablemente, que **lo rechazó, lo pospuso indefinidamente (snooze de 7 días que se repite) o su navegador lo dejó en 'default' para siempre** — cualquiera de las tres, el resultado medido es el mismo: hoy no hay canal. No pude tumbar el hallazgo con el código ni con los datos.

**Qué cuesta arreglarlo.** No es un bug de código — es un límite estructural del diseño: el push solo puede rescatar a quien todavía tiene push. La única palanca real es la que YA está en el radar (v520): capturar el TELÉFONO en el alta (lo único que el coach controla sin depender de que el navegador coopere), porque WhatsApp no depende de un permiso que la persona ya dejó de dar.

---

### 3. 🟡 Cero observabilidad histórica: no hay ninguna tabla, log persistente ni alerta que diga si el push está fallando
**Qué es.** `daily-notifs` calcula `sent/failed/skipped/pruned` en cada corrida y los devuelve como respuesta HTTP a `pg_cron` — que los descarta. No existen tablas de métricas de push en el esquema público (`select table_name from information_schema.tables` no devuelve ninguna tabla de logs/métricas de notificaciones). `net._http_response` (donde pg_net guarda temporalmente la respuesta del `http_post` del cron) solo conserva **2 filas en total** al momento de esta auditoría — la retención es de horas, no de días. Los logs de la edge function (`function_logs`) tienen la misma limitación práctica: la herramienta de consulta los cubre en ventanas de 24h. Y del lado del cliente: `subscribePush` registra sus fallos con `console.warn(...)`, nunca con la telemetría real de la app (`app_errors` — confirmado por SQL: cero filas con `msg`/`kind` que mencionen "push" en toda la tabla).

**Evidencia.**
- `select count(*) from net._http_response` → 2 filas, rango de apenas 5.5 horas.
- `select msg,kind,count(*) from app_errors where msg ilike '%push%' or kind ilike '%push%'` → 0 filas. Ningún fallo de `subscribePush` (que sí puede fallar: RLS, red, endpoint rechazado) ha quedado nunca registrado donde alguien pudiera verlo.
- El propio comentario de v426/v535 en el código reconoce la clase de problema ("meses sin push por una policy que faltaba") — ese incidente se descubrió por CASUALIDAD, auditando, no por una alerta. La arquitectura que permitió que ese bug viviera meses sin que nadie se enterara **sigue intacta hoy**: el código de la cadena mejoró mucho, pero la manera de ENTERARSE de que algo se rompió no cambió en nada.

**Cómo intenté tumbarlo.** Verifiqué si tal vez el registro vive en otro lado que no sea `public` (algún esquema de logging propio) — no lo hay; los únicos candidatos (`net._http_response`, `function_logs`) son de retención corta y no pensados como bitácora de negocio. Consideré que quizás el equipo revisa los logs de Supabase manualmente con cierta frecuencia — posible, pero el propio brief de esta ronda dice "nadie ha auditado nunca si el push llega de verdad", lo cual es consistente con no tener dónde mirar.

**Qué cuesta arreglarlo.** Medio: una tabla `push_send_log` (o simplemente insertar `sent/failed/pruned/slot/fecha` en una fila por corrida desde `daily-notifs`) cuesta una migración chica y unas líneas en la edge function. Con eso, una consulta semanal ("¿subió `failed`? ¿bajó `sent` de golpe?") pasa de imposible a trivial.

## Todos los hallazgos

| Sev | Qué | Dónde | ¿Víctima hoy? |
|---|---|---|---|
| 🔴 | Suscripciones duplicadas/huérfanas no se podan salvo por 410/404; Natalia recibe 2 envíos "exitosos" por turno desde hace 29 días | `push_subscriptions`, `daily-notifs/index.ts` líneas de poda | Sí — medido en logs de hoy (2 envíos ✅ por ronda) |
| 🔴 | RESCUE (nunca entrenó) y COMEBACK (≥7d sin volver) no tienen alcance: 0 de 12 clientes inactivos/nunca-entrenados tiene push hoy | `daily-notifs/index.ts` segmentos RESCUE/COMEBACK | Sí — Miguel Pulido (14 sesiones, sin push ni teléfono) es el caso más claro |
| 🟡 | Cero observabilidad histórica de envíos/fallos de push (ni tabla, ni log persistente, ni telemetría de fallos de `subscribePush`) | Arquitectura completa (edge functions + `app_errors`) | No hoy — pero es la razón por la que un fallo futuro (ej. rotación de VAPID) pasaría desapercibido meses, como ya pasó una vez |
| 🟡 | El cron "afternoon" corre a las 15:30 Colombia, no a las 5pm como documenta CLAUDE.md | `cron.job` (`apex-afternoon-notifs`, `30 20 * * *` UTC) vs CLAUDE.md | No — desajuste de documentación, sin efecto funcional detectado |
| 🟢 | El apagado del aviso de push en el día 1 (`_DIA1_OFF`) es deliberado y documentado, pero significa que quien entrena una sola vez y se va puede no haber visto NUNCA el pedido de permiso si ese día fue su único día | `app-4-entreno.js` `_DIA1_OFF` | Sospecha, no medible desde el servidor (el estado del permiso vive en el navegador) |
| 🟢 | `notifyCoachMood`/reporte de dolor intenta pushear a `_coach` sin comprobar antes si el cliente tiene `coach_id` asignado; si no lo tiene, `send-push` lo rechaza con 403 en silencio | `app-4-entreno.js:1235`, `send-push/_authorize` | Improbable — un cliente sin `coach_id` tampoco es visible para el coach por RLS, así que no cambia lo que el coach ve |
| 🟢 | La poda de `send-push`/`daily-notifs` solo actúa sobre 410/404; otros códigos de error permanentes (ej. VAPID inválida, 403 del servicio push) nunca podan la fila y solo suman a `failed` sin que nadie lo note | Ambas edge functions | Sin evidencia de que esté ocurriendo hoy — no medido, ver sospechas |

## Lo que verifiqué y está SANO (con números)

- **`subscribePush` (app-1-infra.js:358-409):** pide permiso solo con gesto del usuario, usa `AUTH.client()` (nunca fetch crudo con token extraído a mano — la clase de bug que causó los "meses sin push"), resuelve `client_id` por el UID real de la sesión (no por un `_pushCtx` que podía desfasarse), y devuelve `false` en cualquier fallo silencioso en vez de mentir éxito.
- **RLS de `push_subscriptions`:** las 3 policies necesarias existen y están vigentes — `push_ins_own`, `push_sel_own` (la que faltó meses y causó el incidente de julio, verificada HOY presente), `push_upd_own`. `relrowsecurity=true`. No encontré ninguna tabla nueva con el mismo patrón de "falta el SELECT del upsert" en esta área.
- **`send-push`:** verificado `verify_jwt=true` a nivel de plataforma (capa extra sobre el chequeo manual del código) + autorización por `coach_id` de la fila del DESTINATARIO (no falsificable por quien llama). Poda de 410/404 implementada y activa.
- **El gotcha de v551 (training_days/shift desincronizados) está genuinamente CERRADO**, verificado con datos de HOY: la fila vieja de Natalia (29 días, `training_days` congelado en `["Lunes","Lunes","Martes"]`) generó igualmente el mensaje CORRECTO ("descanso") en las 3 rondas de hoy (sábado 5-sep, no está en su plan real Lunes/Martes/Jueves/Viernes) — porque `daily-notifs` v9 usa `pushPlanFromRoutines` sobre `user_data.routines` en vivo, y solo cae al campo `training_days` de la fila cuando la persona no tiene rutinas. Confirmé ambos call-sites del cliente (`app-2-login.js:1204`, `app-3-coach.js:754`) recalculan el plan en cada login, no lo heredan de una copia vieja.
- **Sin suscripciones huérfanas de gente borrada:** `select ... from push_subscriptions ps left join user_data ud ... where ud.user_id is null` → 0 filas. Nadie que ya no exista sigue en la tabla de push.
- **El SW (`sw.js`, 131 líneas) maneja bien el caso "app ya abierta":** `notificationclick` hace `postMessage({type:'notif-click',...})` al primer cliente y `app-1-infra.js:806` escucha ese mensaje y navega al chat correcto vía `openChatFor`. Para notificaciones genéricas (diarias, sin `chatId`) simplemente enfoca la ventana, que es razonable porque no hay una pantalla específica a la que ir.
- **Suscripción Apple real (Kathe Beltrán, `web.push.apple.com`):** activa, con `training_days`/`shift` correctos, y **sin ningún error en el log de las últimas 24h** (3 envíos exitosos hoy). Es la mejor señal remota disponible de que el push en iOS instalado sí está funcionando para ella — no pude verificar la entrega física sin el dispositivo.
- **`daily-notifs` distingue correctamente coach de asesorados** (excluye `_coach` de sus segmentos, decisión de julio verificada vigente).

## Sospechas sin medir

- No pude confirmar si la fila duplicada de Natalia/Samuel corresponde a un segundo dispositivo real en uso o a uno abandonado — requeriría el teléfono físico o preguntarle a la persona.
- No medí cuántas personas del universo de 24 tienen `Notification.permission==='denied'` vs `'default'` (ese estado vive solo en el navegador de cada quien, invisible desde Supabase). Sin ese dato no puedo distinguir "nunca se le preguntó" de "dijo que no".
- No verifiqué qué pasa cuando `webpush.sendNotification` falla con un código distinto de 410/404 (p. ej. 403 por clave VAPID inválida, o 413 payload demasiado grande) — no encontré evidencia de que esté pasando en las últimas 24h, pero tampoco hay cómo saberlo más atrás en el tiempo (ver hallazgo 3).
- No probé en un iPhone físico si tocar la notificación de Kathe abre la app correctamente en modo standalone — solo verifiqué que el envío se aceptó del lado del servidor.

## Qué NO miré y por qué

- **No mandé ningún push real a una persona** (regla dura de la ronda). Todo lo de "sí llega" para el caso Apple se infiere de que el servicio de push aceptó el envío (log ✅), no de una confirmación de entrega en pantalla.
- **No toqué la tabla `push_subscriptions` ni ninguna otra** — todo fue `select`. No apliqué la limpieza que sugiero en el hallazgo 1.
- **No audité TWA/Play Store** (declarado fuera de esta área en el briefing — territorio de otra área si la hay).
- **No revisé histórico de logs más allá de 24 horas** — la herramienta de logs de Supabase que tengo disponible tiene ese techo; no pude confirmar si el patrón de duplicados en Natalia/Samuel es reciente o lleva semanas, más allá de lo que dice `updated_at` en la propia tabla.
- **No revisé el código de `activate_public_profile`, `delete-account`, `coach-create-client` ni `refresh_snapshot`** a fondo — solo los toqué para confirmar `coach_id` en la creación de clientes, que es lo que necesitaba para B1. Quedan fuera del alcance de "el push".
