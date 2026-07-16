# 🗺️ Plan de sesiones — AVI (plan VIVO)

> Escrito el 2026-07-10 al cierre de la sesión v314→v316 (Fable 5), para que las
> próximas sesiones (Opus o cualquier modelo) arranquen con objetivo claro y cero
> arqueología. **Al completar una sesión: marcarla aquí, mover el hito a
> `docs/bitacora.md` y actualizar el footer de CLAUDE.md.** Este archivo se poda
> cuando todo esté hecho.

---

## ⚡ PROTOCOLO DE ARRANQUE (cada sesión, sin excepción)

1. Leer `CLAUDE.md` completo — en especial **🛡️ DOCTRINA** (anti-complacencia, bugs
   de raíz, barra PREMIUM, radar al cierre) y **🧠 GOTCHAS VIGENTES**. Y **`docs/metodologia.md`**
   — el CÓMO se trabaja con el nivel de inteligencia que Camilo exige (caza de bugs,
   fix de raíz, y las instrucciones por área). No es opcional: es el estándar de la sesión.
2. Leer `scripts/e2e/README.md` — gotchas operativos de los harnesses. Los 3 que más
   duelen: (a) el rate-limit del login QA se REINICIA con cada intento fallido →
   **sondear con POST directo a `auth/v1/token` antes de quemar una corrida**;
   (b) matar los Chrome headless huérfanos ANTES de diagnosticar un login que no
   completa; (c) el headless nuevo trae `prefers-reduced-motion:reduce` → emular
   `no-preference` para checks de animación.
3. `git log --oneline -5` + footer de CLAUDE.md → confirmar versión actual.
4. Al desplegar: skill **avi-deploy** (Julián QA + Lucas QA como subagentes + hook +
   bump PAR `?v=NNN`/`CACHE_NAME` + curl a Pages + bitácora). Los agentes SÍ
   encuentran cosas (v314: doble rebote; v316: sobrepromesa al libre) — no saltarlos.
5. Feature visible al asesorado → entrada en `AVI_NEWS` (app-6) con poda de viejas
   (⚠️ `_verify-news.mjs` tiene expectativas ATADAS al contenido — actualizarlo en el
   mismo cambio). Re-skins visuales sin capacidad nueva NO llevan entrada (criterio
   fases de íconos / v315).
6. Al cerrar: **RADAR** honesto (máx 5), memoria de sesión, bitácora, CLAUDE.md.

**2FA en GitHub y Supabase: ✅ ACTIVADO por Camilo (confirmado 2026-07-11, con
recovery codes guardados). Ya no recordar.**

---

# 🎯 PLAN DE ACCIÓN 2026-07-16 (Fable estipula → Opus ejecuta → Fable verifica)

> Estipulado por Fable 5 el 2026-07-16 (línea base **avi-v359**, commit `c7c699a`, suite 365/365)
> tras verificar el estado REAL de cada pendiente contra el código. Decisiones de producto de
> Camilo tomadas HOY con AskUserQuestion: **(D1)** leads "pidió coach" rankean debajo de
> dolor/vencidos, por antigüedad · **(D2)** pasos = meta 8.000 **CON recordatorio push** ·
> **(D3)** mensaje sin leer SÍ sube en el orden, debajo de dolor/vencido · **(D4)** pagos =
> comparativa primero, no se construye nada hasta que Camilo elija.
>
> **Contexto verificado (no re-verificar):** el programa premium (`plan-diseno-premium.md`)
> está COMPLETO incl. habitaciones · el borrado self-service YA existe (m-delacct + edge
> delete-account) · `clientAttentionRank` NO rankea leads ni mensajes (gap real) · agua en
> p-detail y pasos = 0 código · Sesiones C/E de la lista vieja YA se hicieron (v350/v328).
>
> **Orden de ejecución: H → I → J → K → L → M.** Una sesión = un deploy = un ciclo de
> verificación de Fable. Reglas obligatorias de SIEMPRE: las de §11/§14 del plan del coach
> inteligente (un bloque=un commit con sus tests, suite antes/después, sabotaje de candados
> con árbol limpio, bump python sin BOM, curl+prodcheck, sin AVI_NEWS salvo que se estipule).

## ✅ SESIÓN H — Leads + mensajes sin leer en el orden inteligente — HECHA (avi-v360, 2026-07-16)

> **Ejecutada por Opus.** H1 core `aac8347`: `clientAttentionRank(c,history,now,opts)` +
> `sortClientsByAttention(...,optsById)` aditivos y puros (sin opts = v317 idéntico); tiers
> re-numerados con 2=💬 mensaje sin leer (sev=ms desde el más viejo) y 3=🙋 pidió coach
> (sev=días desde `wantsCoachAt`, sin fecha al final — lección v359), suspendido tier 7 al
> fondo. +11 tests (suite 365→376). H2 UI `dd4996a`: `renderClients` arma `optsById` desde
> `DB.msgs`+`ax_msgreads`, chips unread(azul)/lead(naranja), se suprime el badge «Quiere coach»
> redundante cuando el chip ya dice «Pidió coach»; `_verify-v317` +5 checks V360. Sabotajes
> (corte de suspendido · lead sin fecha rankeando primero) mordieron y se restauraron. Cinturón
> completo verde (v317 22/22, coachlead 4/4, pulse, coach 12/12, coach-back, modales 12/12,
> guiado 53/53). Deploy `ea23727` v360, `_prodcheck 360` verde. Desviaciones menores
> documentadas: 3 aserciones de tier absoluto de v317 ajustadas al re-numerar; cohesión del
> badge duplicado. SIN AVI_NEWS. Detalle: bitácora parte 65. Falta verificación de Fable.
> Spec original abajo (referencia).

**Por qué primero:** los 21 leads "quiere coach" son conversiones a Premium enterradas en la
lista; el mensaje sin leer es la señal #1 que un coach espera (aviso Lucas v317). Ambos son
la MISMA función (`clientAttentionRank`) → una sesión.

**H1 — Core (avi-core, commit 1 con tests).** Re-numerar tiers de `clientAttentionRank`
(hoy: 0 dolor · 1 vencido · 2 por-vencer · 3 inactivo/no-estrena · 4 ok · 5 suspendido):
- **0** dolor (igual) · **1** vencido (igual) · **2 NUEVO 💬 mensaje sin leer** ·
  **3 NUEVO 🙋 pidió coach** · **4** por vencer · **5** inactivo/no-estrena · **6** ok ·
  **7** suspendido (siempre el FONDO, candado Lucas v317 intacto).
- Mensaje-sin-leer ENCIMA del lead a propósito: un lead recién llegado TAMBIÉN escribió al
  chat (requestCoach empuja un mensaje) → entra por tier 2 hasta que el coach lo lea, y
  DESPUÉS persiste en tier 3 hasta convertirlo. Coherente, sin doble conteo.
- `sev` del tier 2 = ms desde el mensaje sin leer MÁS VIEJO (quien más lleva esperando
  respuesta, primero). `sev` del tier 3 = días desde `wantsCoachAt` (el lead más antiguo
  primero; sin `wantsCoachAt` → sev 0, va al final del tier, NUNCA inventar fechas —
  lección del bug v359). Labels: `💬 Mensaje sin responder` · `🙋 Pidió coach hace ${d}d`
  (con d≥1; "hoy" si 0). Emoji en pills de atención = patrón establecido (avi-core, capa
  lógica) — NO convertir a SVG.
- Firma ADITIVA: `clientAttentionRank(c, history, now, opts)` con
  `opts = { msgs: [...], lastReadTs: number|null }` — opcional; sin opts el comportamiento
  actual es idéntico (los 10 tests v317 pasan SIN tocarse = prueba del refactor).
  `sortClientsByAttention(clients, history, now, optsById)` igual de aditiva. PURO: nada de
  localStorage/DB adentro — el estado de lectura entra por opts.
- **Tests estipulados:** unread rankea entre vencido y lead · lead sin unread rankea tier 3
  y por antigüedad · lead sin `wantsCoachAt` al final del tier 3 (no adelante) · suspendido
  con unread SIGUE al fondo (tier 7 corta antes — candado) · dolor sigue arriba de todo ·
  sin opts = comportamiento v317 idéntico · determinismo.
**H2 — UI (commit 2).** `renderClients` (y el home si usa el sort) arma `optsById` desde
`DB.msgs` + las marcas de leído del coach (`ax_msgreads`, v321 — verificar su forma REAL en
`markCoachRead` antes de cablear). Chip de razón ya existe (v317) → solo los 2 labels nuevos.
Extender `_verify-v317.mjs` (+3: unread sube, lead por antigüedad, leer el chat lo baja).
**Cierre:** suite ≥365+nuevos · `_verify-v317` · `_verify-coachlead` 4/4 (no romper el fix
v359) · cinturón estándar · deploy v360 · bitácora. **SIN AVI_NEWS** (cara del coach).

## 📋 SESIÓN I — El coach ve la adherencia de hábitos (agua) en la ficha (avi-v361)

**Chica, alto valor.** Los datos YA sincronizan en `client.habits`.
- **I1 — Core:** helper puro `waterAdherence(habits, goal, now)` → `{week:[{n,met}×7], metDays,
  loggedDays}` (reusa `waterWeek`/`waterGoalGlasses`; la meta respeta el plan del coach vía el
  mismo criterio de `_waterGoalFor` — OJO: esa función vive en app-5, el criterio se REPLICA
  puro en core, no se importa DOM). Tests: con/sin datos, meta del plan vs peso, límites.
- **I2 — UI:** bloque `#d-habits` en `p-detail` (patrón tarjeta colapsable v345/v346 si ocupa
  espacio; si es una fila compacta, directa): mini-fila 7 días (punto lleno = cumplió la meta)
  + «Cumplió X de los últimos 7 días». **Oculto si 0 días registrados** (progressive
  disclosure, sin regañar). Ambos temas. Harness: fixture con hábitos en `_shot-coach.mjs
  detail` + shots a ojo.
**Cierre:** suite · shots · deploy v361 · bitácora. SIN AVI_NEWS.

## 📋 SESIÓN J — Hábitos parte 2: 👟 PASOS + recordatorio push + adopción (avi-v362)

**Decisión D2 de Camilo: CON push.** ⚠️ Candado de realidad: el push solo llega a
SUSCRITOS y hoy casi nadie lo está (v320) → esta sesión incluye el empujón de adopción
(backlog (b)) o el recordatorio sería un timbre en casa vacía.
- **J1 — Core (patrón agua v300):** `STEPS_GOAL_DEFAULT=8000` · `stepsToday/stepsAdd`
  (entrada NUMÉRICA, no tap-por-vaso: nadie toca 8.000 veces; clamp 0-100.000, poda 30d,
  inmutable) · `stepsWeek` · datos en `client.habits.steps` `{'YYYY-MM-DD': n}` (viaja como
  painCare — clientToRow ya copia todo). Tests calcados de agua.
- **J2 — UI:** misma tarjeta `#cn-habits` (decisión Camilo 2026-07-09): fila de pasos con
  input + botones rápidos (+1.000) + mini-semana. **AVI_NEWS SÍ** (capacidad nueva visible;
  actualizar `_verify-news.mjs` EN EL MISMO COMMIT — expectativas atadas). Tono Sofía.
- **J3 — Recordatorio push SERVER-SIDE:** integrarlo al cron VESPERTINO EXISTENTE de
  `daily-notifs` (5pm Colombia) — NO crear cron nuevo ni scheduling client-side (el
  `fireNotifAt` client-side es poco confiable, backlog): el copy de la tarde incluye el
  recordatorio de hábitos («¿ya registraste tu agua y tus pasos?») solo si el asesorado no
  registró hoy. Verificar con la suscripción real `_coach` antes de darlo por bueno.
  CORS restringido como está (JAMÁS `*`).
- **J4 — Adopción:** al TERMINAR un entreno (workout-finish, el mejor momento — backlog (b)),
  si `Notification.permission==='default'` → tarjeta/CTA «Activa recordatorios» 1 sola vez
  (mute local, no SB_KEYS). Reusa el flujo honesto v320 (`subscribePush` + toast honesto).
**Cierre:** suite · `_verify-water` como plantilla + checks de pasos · `_verify-news` ·
harness del guiado (workout-finish es zona caliente → cinturón completo) · deploy v362.

## 📋 SESIÓN K — Chat unificado: la ficha abre el chat de pantalla completa (avi-v363)

**Aviso Lucas v321:** hoy hay DOS UIs para la misma conversación (inline `#d-msgs` en la
ficha + pantalla completa `#coach-chat`). Los datos no se desincronizan, pero confunde.
- La sección de mensajes de `p-detail` pasa a: PREVIEW de los últimos 2 mensajes (solo
  lectura, mismo render de burbujas) + botón «Abrir chat» → `openCoachChat(cid)`. Se ELIMINA
  el input/send inline (`sendCoachMsg` del detalle) — un solo lugar para escribir.
- ⚠️ Zona de overlays: `openCoachChat` desde un panel interno toca la pila del botón-atrás →
  `_test-coach-back.mjs` OBLIGATORIO antes y después. Verificar que `_pollAuthCoach` ya no
  necesite `renderDetailMsgs` (o adaptarla al preview). El prellenado del plan de choque
  (`_shockChat`) NO se toca (ya usa `openCoachChat`).
- **Tests/harness:** coach-back 20/20 · `_verify-shock` (usa el chat) · check nuevo: enviar
  desde pantalla completa se refleja en el preview al volver.
**Cierre:** suite · cinturón completo · deploy v363. SIN AVI_NEWS (cara del coach).

## 📋 SESIÓN L — Pagos: COMPARATIVA Colombia (investigación, CERO código)

**Decisión D4:** Camilo elige con datos; no se construye nada aún.
- Investigar (WebSearch + docs oficiales): **Wompi, Mercado Pago, Stripe, PayU/ePayco** para
  persona natural en Colombia: comisión por transacción · soporte Nequi/PSE/tarjetas ·
  requisitos (RUT, cuenta bancaria, cámara de comercio ¿sí/no?) · días de payout · link de
  pago simple vs API · **cobro RECURRENTE** (suscripciones — el caso de AVI) · reputación.
- **Entregable:** `docs/pagos-comparativa.md` + tabla resumida y UNA recomendación
  argumentada (y qué la cambiaría). Camilo decide; recién ahí se estipula la sesión de
  implementación. SIN deploy.

## 📋 SESIÓN M — Play Store readiness (código parcial + checklist Camilo) (avi-v364)

Verificado HOY: el borrado self-service YA existe ✓ (requisito Play cumplido en código).
- **M1:** política de privacidad con URL PÚBLICA legible: Pages sirve `legal/*.md` como texto
  crudo → generar `legal/politica-de-privacidad.html` estática (misma fuente, tokens de
  marca, sin build). Al tocar textos legales: **subir `LEGAL_V`** (gotcha vigente).
- **M2:** botón «Descargar mis datos» del ASESORADO (JSON de su perfil+historial+hábitos;
  el exportData actual es solo del coach) — derecho de portabilidad, lo pide el item legal.
- **M3:** checklist Data Safety (doc para que Camilo lo llene en la consola) + lista de lo
  que SOLO Camilo puede hacer: cuenta dev US$25, ficha de la tienda, screenshots.
- El empaquetado TWA (bubblewrap + assetlinks) se estipula DESPUÉS de M1-M3 (gotcha: Chrome
  cachea la verificación de assetlinks).

## 🧍 Tareas de CAMILO (paralelas, sin código — recordar en cada cierre)
- Probar en su celular: plan de choque multi (v355) · «recuperar ritmo» con Astrid (v356-358)
  · abrir la app para recibir v359 (fin del spam de leads).
- **Trabajar los 21 leads** cuando la Sesión H se los ordene por antigüedad.
- Videos (106 faltantes) y fotos versión mujer — contenido, pipeline aparte.
- Cuenta dev de Play Store (US$25) cuando llegue la Sesión M.

## 🔍 Protocolo de VERIFICACIÓN de Fable (después de CADA sesión H-M)
Protocolo estándar de los 5 ciclos previos (§18/§21/§24 del plan del coach inteligente):
1. Diff completo desde la línea base de la sesión — solo lo estipulado, sin scope creep;
   tests ADITIVOS (los viejos pasan sin tocarse).
2. Suite + harnesses re-corridos POR FABLE (no confiar en los números reportados).
3. **Sabotajes propios con árbol limpio** (≥2 por sesión + 1 inventado) — deben morder.
4. Greps de seguridad: `esc()` en innerHTML con datos de usuario · claves nuevas en SB_KEYS
   solo si sincronizan · mutes locales FUERA de SB_KEYS · sin secretos.
5. Prod: curl + bytes sin BOM + `_prodcheck` re-corrido.
6. Tono Sofía en todo texto visible (leer como el asesorado nervioso del primer día).
7. Veredicto en ESTE doc (sección por sesión) + memoria + radar.

---

## ✅ SESIÓN A — Mejora 7: orden inteligente de asesorados (coach) — HECHA (avi-v317, 2026-07-11)

> Desplegada: `clientAttentionRank`/`sortClientsByAttention` (avi-core, puro, 10 tests) +
> orden en `renderClients` + chip de razón. Lucas cazó 2 bugs (suspendido al fondo; ícono 📉
> anti-doble-luna). Pendientes de PRODUCTO que dejó Lucas (en el backlog de CLAUDE.md, decidir
> con Camilo, NO construir a ciegas): priorizar mensaje sin leer; preservar el buscador en el
> poll. Detalle: bitácora parte 19. Texto original de la sesión abajo (referencia).

<details><summary>Plan original de la sesión A</summary>

### 📋 SESIÓN A — Mejora 7 del estudio: orden inteligente de asesorados (coach)

**Objetivo:** en `#p-clients` (y de paso el orden de "prioritarios" del home si aplica),
la lista se ordena por quién necesita atención: **dolor reportado → vencimientos
próximos/vencidos → inactivos (sin entrenar ≥7 días) → resto**. Tamaño: mediano.

- **Por qué:** hoy solo existe "Prioritarios" en el home; con 20+ asesorados la lista
  plana no escala. Los datos YA existen: reportes de dolor (painCare en el cliente),
  `MS.getStatus` (vencimientos), `daysSinceLastSession` (avi-core).
- **Cómo lo haría yo:**
  1. Función PURA en `avi-core.js` (p. ej. `clientAttentionRank(c, history, now)` →
     número/razón), con tests unitarios en `avi.test.js` (suite hoy: 297 — el hook
     check 11 exige no bajar).
  2. `renderClients` (app-3-coach.js) ordena por ese rank; la búsqueda sigue
     funcionando encima. Chip/etiqueta sutil de la RAZÓN ("🤕 reportó dolor",
     "⏳ vence en 3 días") reusando los chips de estado existentes.
  3. Decisión de producto que NO es mía: ¿toggle para volver a orden alfabético?
     Preguntar a Camilo ANTES de construir el toggle (YAGNI si no lo pide).
- **Verificación:** unit tests del rank (casos: dolor+vencido junto, sin historial,
  suspendido…) + harness E2E con clientes fake inyectados en el panel coach
  (patrón `_shot-f5.mjs` para el login de coach QA — ver `~/.avi/qa-accounts.txt`)
  + shot visual del orden. Zona del coach: NO toca el guiado → no exige suite 53.
- **Trampas:** `_test-coach-back.mjs` (20 checks del atrás del coach) puede tener
  expectativas del ORDEN de la lista — correrlo; el poll del coach re-renderiza la
  lista cada 15s (el orden debe ser estable/determinista para no "saltar" en vivo:
  desempatar por nombre).
- **AVI_NEWS:** NO (es del coach, no del asesorado).

</details>

## ✅ SESIÓN B — Mejora 8: transiciones + números tabulares — HECHA (avi-v319, 2026-07-11) → **ESTUDIO 8/8 COMPLETO**

> Hallazgo honesto: el grueso ya estaba hecho. Transiciones de pestaña YA existían y funcionan
> para ambos roles (.panel.on/.cnp.on fadeIn, reduced-motion global). Los timers que "bailaban"
> YA eran JetBrains Mono (tabulares). Se MIDIÓ que tabular-nums es INERTE en Anton (stats del
> coach) → se acotó la regla a `.wf-stat-val` (Plus Jakarta, cierre de entreno). Detalle:
> bitácora parte 21; gotcha Anton/tnum en CLAUDE.md. Texto original abajo.

<details><summary>Plan original de la sesión B</summary>

**Objetivo:** (a) fade/slide de ~150ms al cambiar de pestaña (asesorado y coach) para
sensación "de app"; (b) `font-variant-numeric: tabular-nums` en cronómetros y stats
(los timers dejan de "bailar"). Tamaño: pequeño.

- **Cómo lo haría yo:**
  1. Tabulares primero (riesgo cero): regla CSS sobre los timers del guiado
     (gm-rest, HIIT, crono plancha), `#workout-finish` chips, statBox del coach y
     `.sescard-sets`. La fuente ya es JetBrains Mono en algunos números — verificar
     cuáles superficies NO son mono y ahí aplicar tabular-nums.
  2. Transición de pestaña: `.cnp.on` ya tiene `animation:fadeIn .28s` — la mejora
     real es REVISAR si falta en el panel del coach (`#s-coach .panel`) y si el
     fadeIn actual cumple; no inventar un sistema nuevo de transiciones. **Respetar
     `prefers-reduced-motion`** (patrón v314) y NO animar mientras hay timer vivo
     (gotcha `_todayOrder` v313: jamás re-anclar/animar con timer corriendo).
- **Verificación:** shots antes/después + suite 53 SOLO si se toca CSS del guiado
  (los timers lo son → sí correrla) + P-checks de reduced-motion.
- **Trampas:** los harness leen `textContent` de timers — cambiar solo CSS, jamás
  formato de texto. `zoom` de letra grande convive con animations — probar data-fs xl.
- **AVI_NEWS:** NO (polish visual).
- **Al terminar:** el estudio queda 8/8 → anotarlo en bitácora y avisar a Camilo
  con el resumen del antes/después completo.

</details>

## ✅ SESIÓN C — Deuda técnica corta — HECHA (auditoría 2026-07-13, avi-v350)

> Punto 1 (`openGuidedMode` huérfano) = C3 de la auditoría (`6f8af92`) · punto 2 (quirk
> prototype `EX_IMG_NAME`) = C4 (`419853d`, null-proto en el ORIGEN) · punto 3 (barrido tema
> claro) quedó cubierto por el programa premium v334-v349 (TODAS las superficies auditadas en
> ambos temas con harness). Texto original abajo.

<details><summary>Plan original de la sesión C</summary>

**Objetivo:** pagar 3 deudas pequeñas ya diagnosticadas, en un solo pase.

1. **`openGuidedMode` huérfano** (backlog desde F5): borrarlo junto con la rama
   overlay de `closeGuidedMode`/`_aviCloseTopOverlay`. OJO: `scripts/smoke.mjs`
   usa `openGuidedMode` como sonda de "extra cargado" — actualizar el smoke en el
   mismo commit o el gate rompe.
2. **Quirk prototype** (hallazgo Julián v315): `EX_IMG_NAME[nf(e.name)]` hereda del
   prototipo (`constructor`/`__proto__` → 404 inofensivo). Fix de clase:
   `Object.hasOwn` en TODOS los lookups por nombre (exImgSrc, y auditar exVidSrc/
   exIcon y cualquier otro mapa por-nombre). Test unitario del caso.
3. **Barrido de tema claro** (estudio §3): pasada por las pantallas restantes con el
   ojo del bug v311 (texto fijo sobre fondo variable). Shots claro/oscuro de las 5
   pestañas del asesorado + 6 paneles del coach; corregir lo que aparezca.
- **Verificación:** suite completa (toca zona del guiado por el punto 1) + hook +
  shots. Sin AVI_NEWS.

</details>

## ✅ SESIÓN D — Simulacro de RESTORE — HECHA (2026-07-12) → runbook en `docs/runbook-restore.md`

> Ambas capas probadas restaurando en tabla de prueba aislada + validando integridad vs prod
> viva (24 filas · 89 rutinas · 140 sesiones, idénticas). Deuda menor: el Escenario B (recrear
> proyecto + cuentas auth) no se ejecutó punta a punta — ensayar en proyecto de PRUEBA. Texto original abajo.

<details><summary>Plan original de la sesión D</summary>

### 📋 SESIÓN D — Simulacro de RESTORE (crítico, nunca ensayado)

**Objetivo:** probar que los backups sirven. "Un backup sin restore probado no es
un backup" (auditoría 2026-07-07 — sigue pendiente y es el mayor riesgo real).

- **Cómo:** (1) snapshot de `apex_data_backups` → restaurar `user_data` en una
  TABLA/PROYECTO DE PRUEBA (jamás producción); (2) validar integridad (conteo de
  clientes, rutinas, historial de un cliente muestra); (3) hacer lo mismo desde el
  JSON local de `Desktop\AVI\backups\`; (4) documentar el RUNBOOK paso a paso en
  `docs/` (si mañana se corrompe todo, Camilo o cualquier modelo debe poder seguirlo).
- **Trampas:** riesgo de sync offline-first (CLAUDE.md ☁️): NUNCA escribir a las
  tablas reales; service role key vive en `~/.avi/service-role.key`. Coordinar con
  Camilo la ventana (aunque sea solo lectura de prod, mejor avisado).

</details>

## ✅ SESIÓN E — Re-barrido XSS — HECHA (2026-07-12, avi-v328)

> Julián auditó los 225 sinks; único hueco real (nombre de ejercicio custom en 2 builders)
> corregido + harness `_verify-xss.mjs` con control negativo. Inventario en bitácora parte 32
> → el próximo barrido es DIFF, no censo.

## ♻️ SESIÓN F (pasos) y SESIÓN G (adherencia coach) — ABSORBIDAS por el plan de acción 2026-07-16

> F = **SESIÓN J** (con las decisiones de Camilo ya tomadas: meta 8.000 + push + adopción) ·
> G = **SESIÓN I**. Ver el plan de acción arriba — esas versiones mandan.

---

## 🧍 PENDIENTES QUE DEPENDEN DE CAMILO (histórico — la lista VIVA está en el plan de acción)

- ~~🔐 2FA GitHub + Supabase~~ ✅ HECHO 2026-07-11.
- ~~Supabase leaked-password protection~~ ✅ CERRADO 2026-07-13 (es Pro-only, se decidió no
  pagar Pro por eso — ignorar ese advisor, no volver a listarlo).
- ⚖️ Abogado para `legal/` (el botón eliminar-cuenta YA existe; descargar-datos = Sesión M2).
- 📉 Retención: ~8/22 nunca entrenaron; lead caliente josegutierrezpe19@gmail.com.

## 📦 CONTEXTO RÁPIDO DE LO RECIÉN DESPLEGADO (v313→v316)

Estudio de interfaz (Artifact aprobado por Camilo) — 6 de 8 mejoras EN PROD:
Hoy reordenado + cierre compartible (v313) · anclas Progreso + micro-pop (v314) ·
Rutinas con foto (v315) · respuestas rápidas chat (v316). Detalle: bitácora partes
15-18. Deudas conscientes anotadas ahí: chevron claro si foto 404 futura (v315),
COACH_SELF chatea consigo mismo (preexistente), doble tap repite chip (aceptado),
toast optimista offline (patrón global).
