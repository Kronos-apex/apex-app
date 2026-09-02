# A6 · Negocio y Dinero — Camilo Ramos (Growth) + Valentina Cruz (PM)

## Veredicto en una frase
El módulo de plata está bien construido y el dinero **sí cuadra** contra el código (recordatorio de
renovación, gracia de 7 días y cortesía funcionan tal como los diseñó el PO) — el problema no es que
la mecánica falle, es que **de los 13 asesorados que se registraron solos, 12 nunca han pagado un
peso y la app no tiene cómo tocarlos**: cero push, casi cero teléfono. El dinero que falta no es un
bug de facturación, es gente que la app perdió antes de que la plata entrara en juego.

## Los 3 más grandes

1. 🔴 **12 de 13 auto-registrados nunca han pagado, y la app no puede alcanzar a ninguno para intentarlo**
   - Evidencia: `SELECT` sobre `user_data.profile` (payments, selfReg) — de los **13 asesorados con
     `selfReg:true`** (incluida Valery, que está en cortesía y no cuenta), **solo Yeison Valbuena
     pagó alguna vez** (un pago de $20.000 el 1-jul) y hoy lleva **32 días vencido** — muy por fuera
     de los 7 de gracia. Los otros 12 (Chema, Cristian, Daniel, diana, Felipe, jhojan, jose Daniel,
     maria rubio, Nicolás, Santiago, Sharith, Sofía) tienen `payments: null`: nunca ha habido un
     cobro. Contraste limpio: de los **9 creados por el coach**, los **9 han pagado**.
   - Y no es que la app no lo intente en general (el recordatorio de renovación funciona, ver
     hallazgo 3): es que **estos 12+1 nunca llegan a esa etapa**, porque ninguno entrenó lo
     suficiente para que el coach quisiera cobrarles, y la reachability lo confirma:
     `SELECT ... exists(select 1 from push_subscriptions p where p.client_id = u.user_id::text)`
     sobre los 13 auto-registrados → **0 con push**. Teléfono: solo **maria rubio** lo tiene
     guardado (1 de 13). Yeison, el único que sí pagó, tampoco tiene teléfono ni push — ni siquiera
     a él se le puede avisar hoy que está vencido.
   - Intenté tumbarlo así: pensé que `wantsCoach` (el lead que pide coach) podría estar
     compensando esto — Cristian lo tenía en `true`. Lo verifiqué contra `coach_settings->'ld'`
     (el mapa de leads atendidos) y **el coach SÍ lo marcó atendido el 22-jul** (11 días después
     de que Cristian pidiera coach): el mecanismo de leads (v387) funcionó como se diseñó. No es
     un hueco de producto — es que atenderlo no lo hizo entrenar. La app hizo su parte.
   - Qué cuesta arreglarlo: no es una línea de código. Es decisión del PO: ¿vale la pena pedirle el
     teléfono a quien se auto-registra ANTES de dejarlo entrar (hoy es opcional en el asistente),
     dado que sin teléfono ni push esa persona es, para efectos prácticos, invisible tanto para
     cobrarle como para rescatarla?

2. 🟡 **El estado `courtesy` (y en general el estado de cuenta) se puede falsificar desde el propio
   teléfono del asesorado — no es nuevo el hueco, pero courtesy hereda una consecuencia más fuerte**
   - Evidencia: `pg_policies` sobre `user_data` — la policy `user_data_update` solo exige
     `auth.uid() = user_id`, sin ninguna restricción de columna ni `CHECK` sobre el contenido de
     `profile` (jsonb). El camino de escritura del propio asesorado (`app-1-infra.js:935-938`,
     rama `k==='ax_c'` de `sv()`) toma `DB.clients[0]` — su propio objeto en memoria — y sube
     **el `profile` completo** vía `UD.upsertOwn({profile: row.profile, ...})`. `courtesy` es un
     campo más de ese objeto: nada en el cliente ni en el servidor le impide a alguien poner
     `DB.clients[0].courtesy = true` en la consola y sincronizar.
   - Por qué pesa distinto que el hueco ya aceptado de `payments`: `MS.getStatus` revisa
     `courtesy` **antes que nada** (`avi-core.js:4100`, justo después de `suspended`) y
     `canLogin` deja pasar `courtesy` **incondicionalmente** (`avi-core.js:4123`). Alguien 32 días
     vencido (como Yeison) que se pusiera `courtesy:true` en su propio perfil recuperaría el
     acceso sin que el coach se entere — y de paso saldría de las cifras de ingresos, del banner
     de vencimientos y del recordatorio de renovación (los tres filtran por `clientIsBillable`).
     Con `payments` ya se podía lograr algo parecido editando una `dueDate` futura, así que el
     hueco de fondo (perfil client-writable, clase F7) no es nuevo — pero `courtesy` es un atajo
     de una sola propiedad, más difícil de notar en una auditoría a ojo del coach que una fecha
     rara en el historial de pagos.
   - Intenté tumbarlo así: revisé si hay algún trigger o `CHECK` en `user_data` que valide el
     contenido de `profile` — no hay ninguno (solo hay policies de fila, no de columna/contenido).
     Confirmé que `toggleCourtesy` (la única vía LEGÍTIMA) vive exclusivamente en el panel del
     coach (`app-6-extra.js:2769`) — un asesorado no tiene ningún botón para esto; la vía que
     encontré es enteramente por fuera de la interfaz.
   - Riesgo real, con honestidad: bajo. Son 22-24 personas conocidas personalmente por el coach en
     un pueblo, no una plataforma anónima. No lo propongo como incendio — lo reporto porque me
     pidieron explícitamente verificar si `courtesy` es infalsificable, y no lo es.
   - Qué cuesta arreglarlo: un `CHECK` o trigger en Postgres que solo permita `courtesy=true` si
     quien escribe es `coach_id` de esa fila (mismo patrón que ya se usó para blindar
     `community_moderators` en `c13c`). Decisión técnica, no de producto — bajo costo si se decide
     hacer.

3. 🟡 **El recordatorio de renovación es SOLO push, sin la red de seguridad que ya tiene el resto de
   la app, y hoy nadie le dice al coach cuándo ese push no va a llegar**
   - Evidencia: `daily-notifs/index.ts:386` dispara el único push de renovación cuando
     `renewDays === RENEW_NOTICE_DAYS` (exactamente 3 días antes) — **no hay ninguna vía de
     respaldo** (WhatsApp, mensaje en el chat) si la persona no tiene `push_subscriptions`. Grep
     de `coachCanReach`/reachability en `app-6-extra.js` (donde vive la tarjeta de membresía y el
     botón manual "WhatsApp" que el coach ya usa para otros cobros): **0 resultados** — la ficha
     del asesorado que está por vencer no le avisa al coach «a esta persona el push no le va a
     llegar, avísale tú». Es el mismo patrón que v520 ya resolvió para «Sin entrenar»
     (separar quién es alcanzable de quién no), pero no se aplicó aquí.
   - Verificado en los datos de HOY (2-sep, `SELECT` sobre `user_data`+`push_subscriptions`
     replicando `MS.getStatus`): los 5 personas en ventana de renovación esta semana (Astrid,
     Claudia, Kathe, Luz — vencen mañana; Samuel — en 4 días) **las 5 tienen push activo**, así
     que hoy el hueco no le está costando nada a nadie. Pero es una propiedad de HOY, no del
     diseño: en cuanto alguien sin push entre en esa ventana (y hay 13 auto-registrados con 0
     push), el aviso automático se pierde en silencio y nada en el panel del coach lo delata.
   - Intenté tumbarlo así: confirmé que si el push falla por endpoint muerto, `daily-notifs`
     SÍ poda la suscripción (410/404) — pero eso no ayuda: podar una suscripción muerta no genera
     ningún aviso al coach, solo limpia la basura de la tabla.
   - Qué cuesta arreglarlo: extender `coachCanReach` (ya existe, avi-core) a la tarjeta de
     membresía/vencimientos — mismo patrón que v520, bajo costo porque el motor de reachability
     ya está construido y probado.

## Todos los hallazgos

4. 🟢 **La gracia de 7 días no deja a nadie en silencio, verificado leyendo el flujo completo.**
   - Evidencia: `MS.getStatus` (`avi-core.js:4095-4109`) — al día 8 (cuando `daysLeft < -7`) el
     estado pasa a `overdue`, `canLogin` devuelve `false`, y `app-2-login.js:1177-1186` muestra
     **un mensaje explícito**: «Tu plan venció. Habla con tu coach para continuar entrenando 💪» y
     enfoca el campo de usuario — no es una pantalla en blanco ni un error técnico. Durante los 7
     días de gracia, `renderGraceBand` (`app-4-entreno.js:1342`) le dice cuántos días le quedan,
     en TODAS las pantallas (arriba de los `return` de descanso/sin-rutina, según el propio
     comentario del código).
   - Intenté tumbarlo así: revisé si el bloqueo del día 8 depende de algo que el propio teléfono
     del asesorado escribe (`payments` es client-writable, hallazgo #2) — si alguien editara su
     `dueDate` a futuro evitaría el bloqueo, pero eso es el mismo hueco ya aceptado del punto 2,
     no un defecto nuevo de la gracia en sí.
   - No requiere acción — lo reporto porque el briefing pide medir esto explícitamente y quedó
     verificado, no solo asumido.

5. 🟢 **El recordatorio cumple EXACTO lo que pidió el PO: al asesorado, 3 días antes, sin monto ni
   cuenta.**
   - Evidencia: `RENEW.body` en `daily-notifs/index.ts:198-209` (7 variantes de texto) — ninguna
     menciona cifra ni número de cuenta; el botón de la banda en la app
     (`app-4-entreno.js:1326-1339`) dice «Hablar con mi coach» y abre `cn-messages`. `renewalNotice`
     (`avi-core.js:4170-4183`) excluye correctamente al coach mismo, a quien está en cortesía, a
     quien nunca ha pagado (`pending`) y al suspendido — los 4 casos que el propio comentario del
     código enumera y que verifiqué contra los datos reales (ninguno de los 12 `pending` recibe
     nada, Valery en cortesía tampoco).
   - Intenté tumbarlo así: comparé la constante `RENEW_NOTICE_DAYS` entre `avi-core.js` y el
     espejo en `daily-notifs/index.ts` — **ambas en 3**, consistentes. Comparé la fórmula de
     `days`/`renewDays` (mismo `Math.ceil` sobre milisegundos en los dos lados) — idéntica.
   - No requiere acción.

6. 🟢 **`renderPaymentCard` sigue siendo letra muerta en v563 — confirmado con dato fresco, sin
   impacto porque ya fue reemplazada.**
   - Evidencia: `SELECT coach_settings->>'nequi' FROM user_data WHERE role='coach'` sobre la fila
     real de Andrés Martínez → **`''` (vacío)**, hoy, 2-sep. `renderPaymentCard`
     (`app-2-login.js:1411-1431`) sigue con el guard `if(!nequi||st!=='expiring')` que la deja en
     blanco siempre, y aunque el campo se llenara, el asesorado no puede leer `coach_settings`
     porque vive en la fila del COACH y la policy `user_data_select` solo deja leer la fila propia
     o la de tus asesorados (nunca al revés). Sigue llamándose desde
     `app-4-entreno.js:458` en cada render de «Hoy» — trabajo de balde, sin daño visible.
   - Intenté tumbarlo así: busqué otras pantallas de plata que dependan de datos de la fila del
     COACH leídos desde el celular del ASESORADO (mismo patrón que mató esta tarjeta) — no
     encontré ninguna otra; el recordatorio de renovación (v540) se construyó a propósito para NO
     repetir este error (usa solo datos de la propia fila del asesorado).
   - Qué cuesta arreglarlo: borrar la función y su llamada (limpieza, no bloqueante). Decisión del
     PO si algún día quiere resucitar el cobro por Nequi dentro de la app — hoy no vale la pena
     tocarlo.

7. 🟡 **El monto de los pagos no es sospechoso, pero hay dos pagos de $0 y uno de $1.000 sin nota
   clara — probablemente cortesías informales previas a que existiera el estado `courtesy`.**
   - Evidencia: Kathe (pago del 25-may, `amount:0`), Miguel (pago del 4-ago, `amount:0`,
     además está `suspended:true` hoy), Natalia Martínez (pago del 11-jul, `amount:1000`). No hay
     `note` que explique estos tres. No los trato como bug — son datos históricos que el coach
     tecleó a mano, y el estado `courtesy` (v539) es justamente la solución correcta para esto
     hacia adelante.
   - No es defecto de código — lo dejo anotado como dato curioso, no como hallazgo accionable.

## Sospechas sin medir

- **No pude confirmar si algún envío de renovación por push realmente llegó** — intenté leer
  `function_edge_logs`/`function_logs` con `query_logs` para los turnos del 30-ago (cuando a
  Astrid/Claudia/Kathe/Luz les tocaba el push de -3 días) y la herramienta devolvió
  `"Backend error"` en las 4 consultas que probé, incluida una tan simple como
  `select count(*) from function_edge_logs`. No pude distinguir si es la retención de logs del
  proyecto (probablemente free tier, corto) o un problema de la herramienta. Lo que SÍ verifiqué
  es que la lógica que decide el envío es correcta y espejada; lo que no pude verificar es la
  ENTREGA real en el mundo (¿el push efectivamente salió esos días?).
- **No revisé si el asistente de auto-registro pide teléfono y por qué el 92% de quienes se
  auto-registran no lo dejan** (12 de 13 sin teléfono). Es la palanca más barata para arreglar el
  hallazgo 1, pero entender POR QUÉ no lo dejan (¿el campo es opcional y lo saltan? ¿da miedo? ¿no
  se explica para qué es?) es trabajo de UX/onboarding, no until until until de negocio — se lo
  paso a A5 o al PO como pregunta abierta.
- **No medí el impacto de negocio de que Yeison (el único auto-registrado que pagó) esté 32 días
  vencido e inalcanzable** — ya está documentado en gotchas como una de las dos bajas reales del
  experimento de v528; no lo repito como hallazgo nuevo, solo lo uso como evidencia del punto 1.

## Qué NO miré y por qué
- **Precios y planes de la web de venta** — explícitamente de A8, no los toqué.
- **Nutrición** — cerrada por decisión del PO, no la reabrí ni de pasada.
- **Concentración de vencimientos** — el PO ya la corrigió como no-problema; no la remedí ni la
  usé como argumento en ningún hallazgo.
- **El estado de Valery (courtesy)** — verifiqué que el mecanismo general de cortesía funciona
  para ella (excluida de ingresos, banner y recordatorio), pero no cuestioné la decisión en sí —
  está cerrada por el PO.
- **MRR proyectado / cohortes de retención con Mateo** — sigue en el backlog del roadmap, no
  construido; no es parte de esta auditoría (es una feature futura, no un defecto del código
  actual).
- **El detalle completo del flujo de `_verify-renovacion.mjs` y `_sabotaje-gracia.py`** — ya
  existen como harnesses versionados y, según CLAUDE.md, ya pasaron con sabotaje aplicado cuando
  se construyó la feature (v540/v528); no los re-corrí porque el briefing pide no re-medir lo que
  ya está en la línea base, y mi propia verificación por SQL directo contra producción confirma
  que el comportamiento sigue siendo el documentado.
- **Los correos/notificaciones que el coach recibe cuando alguien paga (`notifyPaid`)** — lo leí
  (`app-2-login.js:1437-1448`) pero no medí si el push `type:'payment'` realmente llega al coach;
  es la misma limitación de logs que me impidió verificar la entrega del recordatorio de
  renovación.
- **Un iPhone real** — como el resto de la auditoría de 2026-09-01, no hay uno en el banco de
  pruebas; todo lo de reachability lo medí contra la base de datos (push_subscriptions/phone), no
  contra un dispositivo real.
