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

### 🟢 VEREDICTO DE FABLE — SESIÓN H APROBADA (verificación 2026-07-16, base `23ce911` → v360 `4497d29`)

- [x] **Diff completo leído** (10 archivos, 241+/39−): avi-core solo re-numera tiers e inserta
  los bloques unread(2)/lead(3); app-3 solo `_optsById` + chips + supresión del badge; index/sw
  solo bump v360; tests/harness/docs. Sin scope creep. **PURO verificado:** ni `localStorage` ni
  `DB` dentro de `clientAttentionRank`/`sortClientsByAttention` — el estado de lectura entra por
  `opts` y lo arma la vista. Labels del chip = texto fijo + entero (`d` calculado) → sin datos de
  usuario en innerHTML, no requiere `esc()`. Mutes/estado nuevos: ninguno (reusa `ax_msgreads`
  v321, que ya estaba en SB_KEYS+`_COACH_SETTINGS_KEYS`).
- [x] **Suite 376/376** re-corrida por Fable (antes y después de cada sabotaje). Baseline del
  hook 365→376 correcto.
- [x] **Sabotajes con árbol LIMPIO, ejecutados por Fable (no reusé los de Opus):**
  (a) corte de suspendido esquivable con mensajes (`c.suspended && !(opts&&opts.msgs)`) → mordió
  «SUSPENDIDO con mensaje sin leer SIGUE al fondo» (375/376); (b) lead sin `wantsCoachAt` con
  `sev:9999` → mordió «lead sin wantsCoachAt → sev 0 al FINAL» (375/376) — candado de la lección
  v359 vivo; (c) sabotaje PROPIO: unread ignorando `lastReadTs` (`t > 0` en vez de `t > readTs`)
  → mordió «lastReadTs posterior → ya leído, NO sube» (375/376). Restaurado tras cada uno;
  suite 376/376 y `git status` limpio al final.
- [x] **Harness `_verify-v317.mjs` 22/22, cero jsErrors.** Los +5 checks V360 ejercitan de
  verdad: Caro (unread) sube al TOPE sobre leads y sanos; leads por antigüedad **contra** el
  alfabeto (Beto −5d antes que Ana −1d — si mandara el nombre, Ana iría primero); chips
  «💬 Mensaje sin responder» y «🙋 Pidió coach hace 5d» presentes; `markCoachRead('unread')` +
  re-render BAJA a Caro del tier 2 (cae detrás de ambos leads). El harness usa el
  `markCoachRead` REAL (no un stub) → prueba el cableado completo lectura→orden.
- [x] **Fix v359 intacto:** `_verify-coachlead` 4/4 (lead nuevo notifica; viejos con/sin fecha
  callados; spam=0 en 2 sesiones).
- [x] **La MEDIDA de unread verificada a mano contra el código real:** cuenta mensajes
  `from!=='coach'` con `Date.parse(m.date)` FINITO y `> lastReadTs`; sin fecha parseable → NO
  cuenta (lección v359, cero fechas inventadas); `lastReadTs` null/NaN → 0 (época) = nunca leyó,
  todo cuenta (conservador: a lo sumo muestra un no-leído de más, jamás esconde uno). Forma REAL
  de `ax_msgreads` confirmada: `markCoachRead` escribe `{id: iso}` (app-3:1876) y `renderClients`
  lo consume con `_coachReads()` + `Date.parse(iso)` — mismo mapa, misma unidad. La hidratación
  cross-device (app-3:694) fusiona tomando el leído MÁS RECIENTE por asesorado → un chat leído
  en el celular NO resucita como no-leído en la PC. **Sin desajuste.** Todos los emisores de
  mensajes escriben `date: toISOString()` (7 sitios greppeados) → parsea siempre.
- [x] **Cinturón COMPLETO re-corrido por Fable:** suite 376/376 · `_verify-v317` 22/22 ·
  `_verify-coachlead` 4/4 · `_verify-pulse` 6/6 · `_verify-coach` 12/12 · `_test-coach-back` OK ·
  `_verify-modals` 12/12 · `_guiado-suite` 53/53 — cero jsErrors en todos. (El guiado dio 1
  falso rojo por rate-limit al colisionar con otro harness de login; en corrida limpia
  secuencial: 53/53 dos veces.)
- [x] **Prod re-verificada por Fable:** curl con nocache sirve `?v=360` (único) · primeros bytes
  SIN BOM (`<!D` index.html, `con` sw.js) · `_prodcheck.mjs 360` verde (boot limpio,
  login/core/renderToday true, cero jsErrors).
- [x] **Tono (cara del coach):** «💬 Mensaje sin responder» · «🙋 Pidió coach hace Xd» /
  «hoy» / a secas si no hay fecha (no afirma cuándo) — claros y accionables. **SIN AVI_NEWS**
  (grep del diff: solo menciones en docs). Commits con granularidad correcta (H1+tests · H2+harness
  · deploy · docs).

**Juicio de las 2 desviaciones declaradas por Opus — ambas ACEPTABLES, no son scope creep:**
1. *3 aserciones de tier absoluto ajustadas (idle 3→5, suspendido 5→7 ×2):* forzadas por la
   re-numeración que la PROPIA spec estipula — la frase de la spec «los 10 tests pasan sin
   tocarse» era internamente inconsistente con sus tiers nuevos (error de la spec, no del
   ejecutor). Lo que prueba el refactor (los `.reason`, los labels, el orden relativo del
   `sortClientsByAttention` viejo) quedó INTACTO — verificado en el diff línea a línea.
2. *Supresión del badge «🙋 Quiere coach» cuando el chip ya dice «Pidió coach»:* solo aplica si
   `reason==='lead'`. Verifiqué los otros caminos: lead con unread (reason='unread') CONSERVA el
   badge + gana el chip 💬; lead con dolor/vencido/suspendido conserva el badge; el 🆓 Libre no
   se toca. Ninguna señal se pierde; es de-duplicación visual dentro del alcance de la sesión.

**Observaciones para el radar (no bloquean):**
- La frase «sin opts = v317 idéntico» es IMPRECISA para leads: el tier 3 se detecta por
  `c.wantsCoach` (campo del cliente, no necesita opts) → un lead que en v317 rankeaba «ok» ahora
  rankea tier 3 aun sin opts. Es EXACTAMENTE lo estipulado (decisión D1) y el único caller es
  `renderClients`, pero que el próximo refactor no se fíe de esa frase al pie de la letra.
- Los 21 leads viejos SIN `wantsCoachAt` empatan en sev 0 → quedan al final del tier 3 en orden
  ALFABÉTICO, no por antigüedad (no hay fecha que ordenar — correcto, pero que Camilo lo sepa).
- Medida unread = `from!=='coach'` vs badge de bandeja = `from==='client'`: equivalentes HOY
  (todos los emisores usan uno de los dos), divergirían si algún día aparece un tercer `from`.
  Los mensajes automáticos `system:true` (aviso de dolor) cuentan como no-leídos en AMBOS →
  coherente.
- El sev del tier 2 va en ms y el de los demás tiers en días/enteros — nunca se comparan entre
  tiers (el tier corta primero), pero ningún test protege esa unidad; un refactor que compare
  sev cross-tier se rompería en silencio.

### 🟢 VEREDICTO: SESIÓN H APROBADA — los 3 sabotajes mordieron, la medida de unread coincide
punta a punta con lo que escribe `markCoachRead` (sin resurrecciones cross-device), el candado
del suspendido y la lección v359 siguen blindados, cinturón completo y prod v360 verdes.
Ciclo estipular→ejecutar→verificar CERRADO (1º del plan H-M).

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

## ✅ SESIÓN I — El coach ve la adherencia de hábitos (agua) en la ficha — HECHA (avi-v361, 2026-07-16)

> **Ejecutada por Opus.** I1 core `30daefc`: `waterAdherence(habits, goal, now)` →
> `{week:[{n,met}×7], metDays, loggedDays}` + `waterGoalFor(client, nut)` (réplica PURA del
> criterio de `_waterGoalFor`: plan del coach o peso) — ambos puros, reusan waterWeek/
> waterGoalGlasses. +5 tests (con/sin datos, meta plan vs peso, límites). Suite 376→381.
> I2 UI `8da58e0`: `renderCoachHabitsCard` pinta `#d-habits` en `p-detail` — tarjeta directa
> «💧 Hidratación» con mini-fila de 7 puntos (lleno = cumplió la meta) + «Cumplió X de los
> últimos 7 días · meta N vasos/día», OCULTA si 0 días registrados (progressive disclosure).
> Ambos temas premium, solo lectura, re-render tras carga pesada (afina la meta con el plan
> nutricional). GOTCHA: `waterWeek`/`waterAdherence` esperan un `Date` (no `Date.now()`).
> Harness `_shot-coach.mjs detail` con fixture de agua + verificación visible/oculto; shots OK;
> `_test-coach-back` OK. Deploy `08eff87` v361, `_prodcheck 361` verde. SIN AVI_NEWS. Detalle:
> bitácora parte 66. Spec original abajo (referencia).
>
> **🟢 VERIFICACIÓN DE FABLE: APROBADA (2026-07-16)** — veredicto completo en §25 de
> `docs/plan-coach-inteligente.md`. Resumen: 3 sabotajes de suite mordieron (tope 30, plan del
> coach ignorado, met sin meta); un 4º sabotaje (guard de progressive disclosure) destapó una
> brecha real de cobertura — el harness solo logueaba sin aserción — CERRADA dándole dientes a
> `_shot-coach.mjs detail` (exit 1 si c1 no muestra 4/7 llenos o c2 no oculta; verificado
> mordiendo). Réplica `waterGoalFor` fiel línea a línea a `_waterGoalFor`; contrato `Date`
> respetado (única llamada de prod con `new Date()`); render real OK ambos temas; cinturón
> completo y prod v361 verdes.

<details><summary>Spec original de la sesión I</summary>

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

</details>

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

## 🟢 § VERDICTO SESIÓN J (Fable) — v362: **APROBADA** (2026-07-17)

Verificación independiente completa contra la línea base `917ab86` (v361). Todo re-corrido
por mí; nada tomado de los números reportados por Opus.

1. **Diff (4 commits `86766a6`→`05e5c38`, 14 archivos):** SOLO lo estipulado — J1 core,
   J2 UI+news+bump, J3 edge fn, docs. CERO scope creep. Tests puramente ADITIVOS
   (`avi.test.js` numstat 46/0 — ningún test viejo borrado ni debilitado; los ajustes de
   `_verify-news` son la consecuencia CORRECTA de que v362 entra al top-3 de `newsToShow`
   — verifiqué la función: filter>seen, sort desc, slice 3 → [362,352,316], slide 1 = la
   más vieja = chat v316; y el re-scope de W1 a `.hb-dot:not(.st)` conserva la aserción).
2. **Decisión `stepsSet` de Opus: extensión mínima JUSTIFICADA, no scope creep.** El plan
   estipuló `stepsAdd` calcado del agua, pero los pasos se LEEN del celular como total —
   sumar deltas obliga a cuentas mentales y arriesga doble conteo. `stepsSet` son 6 líneas
   puras, `stepsAdd` se define encima de ella (=set(today+delta)), ambas con `now`
   determinista, clamp [0..100.000], basura→0, poda 30d compartida (`WATER_KEEP_DAYS`),
   inmutables y testeadas (fija-no-suma, techo, piso, poda, semana). Producto correcto.
3. **Suite re-corrida por mí: 385/385** (baseline hook 381→385 consistente con +4 tests).
4. **Harnesses re-corridos por mí:** `_verify-water` **12/12** (W1-W7 agua intactas +
   S1-S5 pasos: SET 6200, +1.000 suma→7200, meta 8.000, clamp 100.000, re-render vía
   `renderClientToday` conserva estado) y `_verify-news` **10/10** (N1 slide1=chat v316,
   N2 última=pasos v362, N5 3 dots, N9 libre filtra chat → v352+v362). Cero jsErrors.
5. **Sabotajes propios con árbol limpio (3/3 MORDIERON):** (a) quitar el techo
   `STEPS_MAX` de `stepsSet` → suite 384/385 (test «techo»); (b) `stepsAdd` fija el delta
   en vez de sumar → suite 384/385; (c) INVENTADO capa UI: `stepsQuick` suma 0 → la suite
   queda VERDE (no ve el cableado) pero el harness cazó FAIL S3 `{"n":6200}` — prueba que
   `_verify-water` vigila el puente UI→core, no solo el core. Árbol restaurado y verificado
   limpio tras cada uno (suite 385/385 final).
6. **Greps de seguridad:** SB_KEYS SIN claves nuevas (los pasos viajan dentro de
   `ax_c→habits`, patrón painCare — correcto); `_stepsBlockHtml` solo interpola números
   clampados por `parseInt` y claves de fecha generadas por `habitDayKey` — ningún dato de
   usuario crudo entra al innerHTML; cero secretos en el diff; mute/estado local fuera de
   SB_KEYS. BOM: index.html/sw.js locales y en prod arrancan `3c 21 44` (sin EF BB BF).
7. **Prod:** curl Pages sirve `?v=362` (×10 refs) + `CACHE_NAME='avi-v362'`;
   `_prodcheck.mjs 362` verde (boot real 4s, login/core/renderToday true, cero jsErrors).
8. **Edge Function `daily-notifs`:** dry-run (`{"slot":"afternoon","dry":true}`, sin envío)
   → `{ok:true, sent:7, failed:0, skipped:0, total:7}`. Verifiqué vía MCP que el código
   DESPLEGADO (versión 5, `verify_jwt:false`) es IDÉNTICO al del repo. Lógica revisada
   línea a línea: `habitsNudge` solo se enciende en postworkout-tarde y en la rama genérica
   de la tarde; rescate/comeback hacen `continue`/asignan SIN el flag; el guard
   `habitsNudge && st && !st.habitsLoggedToday` excluye al coach (`st===null`) y a quien ya
   registró agua O pasos hoy. Es coletilla apendada, jamás un push nuevo.
9. **Tono Sofía:** fila de pasos («Pasos de hoy», «¡Meta cumplida! 8.200 pasos 🎉»,
   placeholder «Escribe tus pasos de hoy»), toast («👟 ¡Meta de pasos cumplida! Bien
   hecho»), AVI_NEWS v362 («Ahora cuentas tus pasos») y los 7 copys de `HABITS_REMINDER`
   — humanos, cálidos, es-CO, cero jerga. Aprobados.
10. **J4 confirmado preexistente:** `renderWfPushNudge` (v325) vive en app-4:1527 y está
    cableado en el show del cierre (app-4:1516) — FUERA del diff v361→v362. Opus verificó
    en vez de reconstruir: correcto por doctrina.
11. **Desviación documentada (acepto):** el cierre estipulaba cinturón del guiado porque
    J4 iba a tocar workout-finish; al resultar J4 no-código, el diff NO toca app-4 ni el
    flujo de entreno → no re-corrí `_guiado-suite` (el path `renderClientToday`→tarjeta de
    hábitos queda cubierto por S5 del harness + `_prodcheck` con renderToday true).

**Radar (5):** (1) la Edge Function NO tiene test automatizado — un sabotaje en `index.ts`
no lo muerde NADA (mi verificación fue dry-run + fuente desplegada + lectura); si
`daily-notifs` sigue creciendo, extraer la segmentación a función pura testeable.
(2) Endoso el radar de Opus: la coletilla llega a cualquier suscrito sin registro hoy,
incluso a quien jamás usa la tarjeta — refinamiento futuro: gatearla a quien tenga
historial de hábitos. (3) `habitsLoggedToday` asume usuario en UTC-5 (correcto para
Colombia; si algún día hay usuarios fuera, el día no coincide — documentado en comentario).
(4) Footer de CLAUDE.md del Coach Inteligente sigue diciendo «Fases …+4.1 (v355)» — quedó
desactualizado desde v356, preexistente a esta sesión, corregir al próximo toque de
CLAUDE.md. (5) Solo hay 7 suscripciones push — el recordatorio sigue siendo un timbre con
pocas casas: los ítems (a) copy de la tarjeta de Hoy y (c) invitación del coach por chat
del backlog de adopción son el siguiente palanquazo real.

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

## 🟢 § VERDICTO SESIÓN K (Fable) — v363: **APROBADA** (2026-07-17)

Verificación independiente completa contra la línea base `05e5c38` (v362). Todo re-corrido
por mí; ningún número tomado del reporte de Opus.

1. **Diff (2 commits `7aeebd0` código + `ea8d8bd` docs, 7 archivos):** SOLO lo estipulado —
   index.html (sección Mensajes de `p-detail` + bump ×10 refs), app-3 (`renderDetailMsgs`
   reescrita a preview + `sendCoachMsg` BORRADA entera), harness nuevo, sw.js CACHE, docs.
   CERO scope creep. Confirmado por grep: `#msg-in` ya no existe (el único `cn-msg-in` que
   queda es el chat del ASESORADO, otra feature); `sendCoachMsg` sin rastro en código.
   `openCoachChat`/`sendCoachChatMsg`/`renderCoachChatThread`/`_shockChat` **INTACTOS**
   (fuera del diff — el puente `sendCoachChatMsg`→`renderDetailMsgs` línea 1953 ya existía
   de v321 y es lo que refresca el preview). `_pollAuthCoach` (app-1:594/689) sigue llamando
   `renderDetailMsgs` → ahora pinta el preview, con `if(!con)return` defensivo: adaptación
   correcta al spec. `updateMsgBadge` y `ar()` conservan callers (app-1/app-4, `#cn-msg-in`).
2. **Suite re-corrida por mí: 385/385** — `avi.test.js` SIN cambios en el diff (numstat
   vacío): ningún test borrado ni debilitado; K no añade funciones puras, consistente.
3. **Harnesses re-corridos por mí:** `_test-coach-back.mjs` **20/20** (zona de overlays
   sana: forward/atrás/pila en F1-F3) · `_verify-chatunified.mjs` **13/13** (K1 preview
   2 burbujas + «+1 más», K2 sin `#msg-in` ni `sendCoachMsg`, K3 «Abrir chat» abre
   `#coach-chat` del asesorado correcto y entra como LAYER, K3b atrás vuelve a la ficha,
   K4 enviar desde pantalla completa se refleja en el preview) · `_verify-shock.mjs`
   **TODO OK** (S1-S15: el chat sigue prellenándose SIN enviar — candado del coach vivo).
   Cero jsErrors en las tres corridas.
4. **Sabotajes propios con árbol limpio (3/3 MORDIERON):** (a) `slice(-2)`→`slice(-1)` →
   FAIL K1 ×2 (`bubbles=1`, sin nota «+1 más»); (b) el botón «Abrir chat» sin
   `CUR.clientId` → FAIL ×5 (chat no abre, `cchatId=null`, back-stack y K4 caen en
   cascada); (c) INVENTADO: borrar el puente de refresco `renderDetailMsgs(id)` dentro de
   `sendCoachChatMsg` → FAIL exactamente K4-preview (`"¿Subo el peso en sentadilla?"` en
   vez del mensaje nuevo) — prueba que el harness vigila el puente pantalla-completa→ficha,
   no solo el DOM inicial. Árbol restaurado con `git checkout` y verde re-confirmado
   (13/13) tras el último.
5. **Seguridad (greps + lectura):** el preview usa `textContent` para texto y meta de cada
   burbuja Y para la nota «+N» (número calculado, no dato de usuario); los dos `innerHTML`
   de la función son strings estáticos (vaciado + estado vacío). `openCoachChat` sigue con
   `textContent` para nombre e iniciales (sin XSS). SB_KEYS sin claves nuevas (K no añade
   datos — correcto). Cero secretos en el diff.
6. **Prod:** curl Pages sirve `?v=363` (×10 refs) + `CACHE_NAME='avi-v363'`; primeros 3
   bytes de index.html/sw.js = `3c2144`/`636f6e` (sin BOM) tanto LOCAL como SERVIDO;
   `_prodcheck.mjs 363` verde (boot real 4s, login/core/renderToday true, cero jsErrors).
7. **Tono/UX (cara del coach):** «Abrir chat» (directo), «Sin mensajes. Abre el chat para
   escribir el primero 👇» (el 👇 ahora apunta al botón — coherente), «+N mensaje(s) más —
   abre el chat para ver todo» (plural manejado). Casos borde revisados: 0 mensajes =
   estado vacío + botón (sano); 1 mensaje = 1 burbuja SIN nota «+0» (correcto,
   `msgs.length>prev.length` lo evita); mensajes larguísimos = burbujas con scroll dentro
   del contenedor de 200px, aterriza al final. Claro y humano. Aprobado.
8. **Desviación documentada (acepto):** el cierre estipulaba «cinturón completo», pero el
   diff NO toca app-4 ni el flujo de entreno (solo `p-detail` del coach + app-3) → el
   cinturón relevante era coach-back + shock + chatunified, y los tres están verdes.
   Misma lógica que la desviación aceptada en la Sesión J.

**Radar (5):** (1) la nota «+N mensajes más» se pinta ARRIBA de las burbujas y el preview
scrollea al fondo — con 2 mensajes largos la nota queda fuera de vista hasta scrollear;
menor (el botón «Abrir chat» siempre está visible), pero si Camilo no la ve, ponerla DEBAJO
o fuera del contenedor scrolleable. (2) El poll de 15s re-llama `renderDetailMsgs` con la
ficha abierta (app-1:689) — hoy es barato (2 burbujas), pero re-pinta aunque no haya
mensajes nuevos; si algún día el preview crece, comparar antes de re-render. (3) El botón
«Abrir chat» con `if(CUR.clientId)` silencioso: si `CUR.clientId` fuese null el tap no hace
NADA (sin toast) — hoy es imposible llegar a `p-detail` sin clientId, pero es un fallo mudo
si algo lo rompe; barato añadir telemetría o no-op visible. (4) Deuda preexistente que esta
sesión NO cierra: el backlog aún lista `renderClients` borrando el buscador en cada poll —
sigue siendo el roce diario más visible del panel del coach. (5) Oportunidad: con el chat ya
UNIFICADO, el ítem (c) de adopción push («que el coach invite por chat a abrir la app») tiene
ahora un solo punto de integración — buen candidato para sesión corta.

## 🟢 § VERDICTO ADOPCIÓN v364 (Fable) — invitar a abrir la app desde el chat: **APROBADA** (2026-07-17)

Sesión corta de adopción (ítem c del backlog push; nace de mi radar #5 en K). Verificación
independiente completa contra la línea base `9d543aa` (HEAD `d841b09`, código `7206735`).
Todo re-corrido por mí; ningún número tomado del reporte de Opus.

1. **Diff (`git diff 9d543aa HEAD`, 7 archivos, +70/−15):** SOLO lo estipulado — botón
   `.cchat-invite` en la barra de `#coach-chat` (index.html, `data-ic="bell"`, aria-label +
   title), 2 líneas de CSS (`.cchat-invite` + `:active{scale(.9)}`, tokens `--dur-fast`/
   `--ease-out`, 44px táctil), `coachInviteOpenApp()` en app-3 insertada JUSTO después de
   `sendCoachChatMsg` (la función vecina NO cambió ni una línea: el diff solo AÑADE tras su
   `}` de cierre), +7 checks A1-A3 en `_verify-chatunified.mjs`, bump ?v=364 ×10 + CACHE
   `avi-v364`, docs. **CERO scope creep.** `openCoachChat`/`renderDetailMsgs`/toda la
   Sesión K fuera del diff. Sin cambios en avi.test.js (nada borrado ni debilitado).
2. **Suite re-corrida por mí: 385/385** (sin funciones puras nuevas — consistente: la
   función es 100% DOM/window.open, correcta como no-pura).
3. **Harnesses re-corridos por mí:** `_verify-chatunified.mjs` **20/20** (13 K intactos +
   A1 botón en la barra · A2 con teléfono `+57 300 123 4567` → `window.open` stubbeado
   recibe `https://wa.me/573001234567?text=` con «Abre%20AVI»+«activar%20tus%20recordatorios»
   y `#cchat-in` queda VACÍO · A3 sin teléfono → cero window.open, chat prellenado con
   «Abre AVI un momentito», `DB.msgs` NO crece) · `_test-coach-back.mjs` **20/20** (la barra
   del chat tocada no rompió navegación). Cero jsErrors en ambas corridas.
4. **Sabotajes propios con árbol limpio (3/3 MORDIERON):** (a) invertir la rama
   `if(phone)`→`if(!phone)` → FAIL ×5 (A2 sin URL + chat ensuciado, A3 abre WhatsApp y no
   prellena — ambas ramas vigiladas); (b) quitar el `replace(/\D/g,'')` → FAIL A2 cazó la
   URL mal formada `wa.me/+57 300 123 4567?text=` (el regex exige el número LIMPIO); (c)
   INVENTADO: hacer que la rama sin teléfono llame `sendCoachChatMsg()` (enviar solo) →
   FAIL «A3 NADA se envía solo» con `count=5` — el candado «el coach revisa y envía» tiene
   diente real. Árbol restaurado con `git checkout` tras cada uno; verde 20/20 re-confirmado
   con corrida limpia final.
5. **Seguridad (greps + lectura):** dentro de `coachInviteOpenApp` hay CERO `innerHTML`/
   `insertAdjacentHTML`/`setAttribute` — el nombre del asesorado solo entra a un template
   string que pasa entero por `encodeURIComponent` (rama WA) o a `ta.value` (asignación de
   propiedad, no HTML; rama chat). El `onclick` del botón es estático sin datos. Número
   limpiado con `replace(/\D/g,'')` (mismo patrón que `whatsappReminder`/`whatsappNudge`,
   app-6:2335/2352). SB_KEYS intacto (no guarda datos — correcto). Cero secretos.
6. **Prod:** curl Pages ×10 sondas → `?v=364` en TODAS (10 refs c/u) + `CACHE_NAME='avi-v364'`
   servido; primeros 3 bytes de index.html/sw.js = `3c2144`/`636f6e` (sin BOM) LOCAL y
   SERVIDO; `_prodcheck.mjs 364` **verde a la 1ª corrida** (boot 7s, versión v364,
   login/core/renderToday true/true/true, cero jsErrors) — el gotcha del edge frío no
   apareció ya con el edge caliente, consistente con lo documentado por Opus.
7. **Tono Sofía (leído como el asesorado nervioso del primer día):** «Hola {nombre} 👋
   Abre AVI un momentito (solo entrar) para activar tus recordatorios y no perderte tus
   rutinas ni tu progreso 💪» — cálido, colombiano («un momentito»), pide UNA acción mínima
   («solo entrar»), sin culpa ni jerga («recordatorios», no «notificaciones push»). Sin
   `name` → «¡Hola! 👋 …» genérico digno (verificado en código: `split(' ')[0]||''` +
   saludo alterno). Toasts del coach claros: «📲 Invitación lista en WhatsApp» / «✍️
   Revísalo y envíaselo para invitarlo» (este último deja explícito que el coach envía).
   Aprobado.

**Radar (5):** (1) **El botón no sabe quién YA está suscrito** — el 🔔 sale siempre, aunque
el asesorado ya reciba push; el coach puede invitar a quien no lo necesita (roce menor) y,
peor, no tiene forma de saber a quién SÍ le urge. Oportunidad: exponer el estado de
suscripción en `p-detail`/chat (hoy la RLS `*_own` de push_subscriptions no deja al coach
leerlas — necesitaría edge function o policy de coach; medir antes de construir). (2) **No
se mide si el nudge funciona:** no queda rastro de CUÁNDO se invitó ni si el asesorado
abrió después — sin eso, en un mes nadie sabrá si esta feature movió la aguja. Barato:
timestamp local `invited_<cid>` + cruzarlo con la próxima suscripción/sesión. (3) **Deuda
de CLASE preexistente (no de v364):** los 3 usos de `wa.me/${phone}` asumen número CON
indicativo de país — un teléfono guardado como «300 123 4567» (sin +57) produce
`wa.me/3001234567`, que WhatsApp interpreta como internacional inválido. Normalizar una vez
(10 dígitos que empiezan por 3 → prefijar 57) en un helper compartido cerraría la clase.
(4) La rama de respaldo (sin teléfono) prellena el CHAT INTERNO, que por la propia raíz del
problema NO alcanza al no-suscrito hasta que abra la app — es la decisión de Camilo y es
honesta como respaldo, pero los nudges de app-6 ya tienen el patrón `wa.me/?text=` (abre
WhatsApp y el coach ELIGE el contacto): sería un respaldo que SÍ llega, sin pedir teléfono.
Considerarlo si el caso «sin teléfono» resulta frecuente. (5) A2 verifica que el chat no se
ensucia pero no que `DB.msgs` no crece en la rama WhatsApp — hueco teórico mínimo del
harness (hoy imposible por código); si alguien toca la función, añadir esa aserción espejo.

## 🟢 § VERDICTO FIX WHATSAPP v365 (Fable) — `waPhone` normaliza el teléfono: **APROBADA** (2026-07-17)

Fix de raíz del bug de clase que yo mismo señalé (radar #3 de mi verdicto v364): los 3
nudges de WhatsApp asumían número CON indicativo. Verificación independiente completa
contra la línea base `85e21da` (HEAD `aacddd0`, código `826fc6e`). Todo re-corrido por mí;
ningún número tomado del reporte de Opus.

1. **Diff (`git diff 85e21da HEAD`, 10 archivos, +62/−20):** SOLO lo estipulado — helper
   `waPhone(raw)` puro en avi-core (con comentario de raíz completo) + export dual; los 3
   callers cambiados a `waPhone(c.phone)` (app-3:1966 `coachInviteOpenApp`, app-6:2335
   `whatsappReminder`, app-6:2352 `whatsappNudge`); +1 test en avi.test.js (import + caso);
   harness A2 pasa a sembrar número PELÓN «300 123 4567»; baseline 385→386; bump ?v=365
   ×10 + CACHE `avi-v365`; CLAUDE.md (gotcha wa.me + footer) + bitácora 70. **CERO scope
   creep.** Greps re-corridos por mí: NINGÚN `wa.me/${...}` con número quedó fuera de
   `waPhone` — los únicos `wa.me` restantes son los fallback `wa.me/?text=` sin número
   (app-6 ×2 en los propios callers, app-5:447 = share del plan nutricional sin teléfono,
   correcto que no se toque) y el único `replace(/\D/g,'')` vivo en app-*.js es el de
   DENTRO de `waPhone` (avi-core:2583). La clase quedó cerrada de verdad.
2. **Suite re-corrida por mí: 386/386** (subió de 385 exactamente por el test `waPhone`;
   cero regresiones en el resto).
3. **Prueba de raíz — EL TEST MUERDE:** con árbol limpio saboteé `waPhone` al
   comportamiento viejo (`return d` sin normalizar) → **385/386 con SOLO el test `waPhone`
   en rojo**; restaurado con `git checkout` → 386/386. La regresión de clase tiene diente.
4. **Harness re-corrido por mí:** `_verify-chatunified.mjs` **20/20**, cero jsErrors. A2
   capturado con mis ojos: siembra `c.phone='300 123 4567'` (pelón) y `window.open`
   stubbeado recibe `https://wa.me/573001234567?text=Hola%20Ana%20…` — el fix cruza
   core→UI de punta a punta. Sin jitter de rate-limit esta vez.
5. **Sabotajes propios (2 inventados; 1 mordió, 1 CAZÓ UNA BRECHA):** (a) regla cambiada a
   `d[0]==='1'` (país equivocado) → FAIL 385/386, muerde. (b) **quitar el guard de longitud
   (`d.length===10`) → la suite quedó VERDE 386/386**: ningún caso del test empieza por 3
   con largo ≠ 10. El guard es load-bearing (un móvil español «34 612 345 678» guardado sin
   `+` son 11 dígitos que empiezan por 3; sin el guard se corrompería a `5734…`), pero HOY
   ningún test lo fija — un refactor futuro podría borrarlo en silencio. El código
   DESPLEGADO es correcto (el guard está); la brecha es de cobertura → radar #1, arreglo de
   1 línea. Árbol restaurado y re-verificado 386/386 + `git status` limpio.
6. **Cobertura de la regla (juicio de diseño): la decisión es CORRECTA y conservadora.**
   Fijos CO (60x, 10 dígitos): NO normalizarlos es lo correcto — WhatsApp es de móvil, un
   fijo con WhatsApp Business es rarísimo en el segmento de Camilo, y adivinar país sobre
   un patrón ambiguo crearía enlaces MAL dirigidos (peor que inválidos). Números con `00`
   inicial («0057300…»): quedan tal cual → enlace inválido, pero es un formato que en
   Colombia casi nadie escribe en un campo de teléfono; no vale código hoy (radar #2 como
   mejora de 1 línea si algún día aparece un caso real). El alcance «solo móvil CO pelón»
   ataca exactamente el caso real y nada más — sano, sin sobre-ingeniería.
7. **Seguridad/tono:** `waPhone` es pura, sin DOM ni sinks; el resultado solo entra a la
   URL vía template ya existente y el mensaje sigue pasando entero por `encodeURIComponent`.
   Cero texto visible nuevo; los 3 mensajes de los nudges NO cambiaron (verificado en el
   diff: solo la línea del `phone`). Cero secretos.
8. **Prod:** curl Pages → `?v=365` ×10 + `CACHE_NAME='avi-v365'` servido; primeros 3 bytes
   de index.html/sw.js = `3c2144`/`636f6e` (sin BOM); `_prodcheck.mjs 365` **verde a la 1ª
   corrida** (boot 6s, versión v365, login/core/renderToday true/true/true, cero jsErrors).

**Radar (4):** (1) **[del sabotaje 5b] Fijar el guard de longitud con 1 aserción**:
`assert.strictEqual(waPhone('34612345678'), '34612345678')` (11 dígitos que empiezan por 3
= internacional, NO se toca) — sin ella, borrar `d.length===10` deja la suite verde;
próxima sesión que toque avi.test.js la añade de pasada. (2) Si algún día un teléfono real
llega con prefijo internacional `00` («0057300…»), un `d.replace(/^00/,'')` al inicio de
`waPhone` lo cubre — NO construirlo hoy, solo si aparece el caso. (3) Sigue abierto mi
radar #2 de v364 (medir si el nudge funciona: timestamp de invitación + cruce con
suscripción) — el fix de hoy hace los enlaces válidos, pero seguimos sin saber cuántos
convierten. (4) El gotcha nuevo de CLAUDE.md («cualquier `wa.me` nuevo pasa por `waPhone`»)
es la única defensa contra reincidencia además del grep — si los nudges de WhatsApp siguen
creciendo, considerar un check del pre-commit hook que rechace `wa.me/${` sin `waPhone` en
la misma función; hoy con 3 callers no lo exijo.

## 🔴 § VERDICTO «YA ENTRENASTE HOY» v366 (Fable) — **RECHAZADA: se come el entreno EN CURSO** (2026-07-17)

Feature pedida por Camilo (lote de ideas, #1): colapsar el entrenamiento en la pantalla
Hoy cuando ya entrenó, para dejar agua/pasos a la mano. Verificación independiente completa
contra la línea base `3be63d2` (HEAD `16a6145`, código `64de694`). Todo re-corrido por mí.

**El happy path está bien hecho y bonito. El problema es que «ya entrenó hoy» se vuelve
verdad DESDE LA PRIMERA SERIE MARCADA (auto-guardado parcial, app-4:1385) — y el
corto-circuito no distingue «terminó» de «está entrenando AHORA». Reproduje 3 vías reales
en las que la tarjeta reemplaza el entrenamiento EN CURSO.** Detalle abajo (punto 6).

1. **Diff (`git diff 3be63d2 HEAD`, 11 archivos, +186/−18): CERO scope creep.** Solo lo
   estipulado: `trainedToday` puro + export dual (avi-core:916/2651); corto-circuito
   (app-4:639, orden CORRECTO: tras no-hay-rutinas:633, antes de descanso:656) +
   `_trainedTodayCardHTML` + `todayTrainAgain`; `.trained-card` con tokens (styles:1300);
   +1 test; harness nuevo `_shot-trained.mjs`; ajuste `_guiado-suite` S5 P10/S14; bump
   ?v=366 ×10 + CACHE `avi-v366`; baseline 386→387; CLAUDE.md + bitácora 71. Sin sesión
   hoy el flujo normal embebe como antes (verificado en mi repro: setup sin historial →
   `embedded:true, card:false`).
2. **Suite re-corrida por mí: 387/387** (subió exactamente por el test `trainedToday`).
3. **El test MUERDE:** con árbol limpio saboteé `trainedToday` (`===` → `!==`) →
   **386/387 con SOLO ese test en rojo**; `git checkout` → 387/387.
4. **Harnesses re-corridos por mí:** `_shot-trained.mjs` **6/6 + cero jsErrors**; capturas
   `trained-claro/oscuro.png` MIRADAS: tarjeta premium en ambos temas (check verde en
   círculo `--gl`, jerarquía clara, botones táctiles), agua/pasos ARRIBA de la tarjeta,
   «Hoy entrenaste **Espalda**» correcto (rutina de otro día cuenta). `_guiado-suite.mjs`
   **53/53, dos corridas completas**, cero jsErrors, sin rate-limit.
5. **Sabotajes propios (3; 2 mordieron, 1 CAZÓ UNA BRECHA):** (a) **quitar
   `!overrideRoutine` del corto-circuito → TODO VERDE** (`_shot-trained` 6/6; y
   `_guiado-suite` no ejercita overrides — grep: cero usos). El camino «abrir una rutina
   a propósito / entreno rápido con sesión ya guardada hoy» tiene CERO cobertura: un
   refactor podría romperlo en silencio → radar #2. (b) corto-circuito sin `return` →
   muerde (T1/T2/T3 caen). (c) inventado: `todayTrainAgain` sin poner `CUR.trainAgain` →
   muerde (T6 cae). Árbol restaurado y re-verificado (suite verde, `git status` limpio).
6. **🔴 BUG REAL REPRODUCIDO — la tarjeta colapsa el entrenamiento EN CURSO.** Desde la
   1ª serie marcada, `updateClientProgress` guarda la sesión parcial con fecha de HOY →
   `trainedToday=true` A MEDIA SESIÓN. El único guard que protege el embebido es el de
   TIMER VIVO (app-4:609); cualquier `renderClientToday` sin timer y sin override pasa por
   el corto-circuito. Repro CDP (`scripts/e2e/_fable-repro-midsession.mjs`, sin login,
   guiado embebido real con 1 serie marcada, `liveTimer:false`):
   - **A — «Cambiar cómo me siento»** (`gmChangeMood` embebido, app-6:592) →
     `card:true, embedded:false`: el entreno desaparece y NO hay chooser para re-elegir.
   - **B — reordenar ejercicio** (`gmMoveEx`→`todayMoveEx`, app-4:1287) → `card:true`.
     La MISMA llamada vive en `_applySubstitute` (app-4:1304) = **sustituir un ejercicio,
     incluido el flujo de DOLOR** («🩹 reportaste dolor… cámbialo», app-6:474): el
     asesorado reporta dolor, cambia el ejercicio, y la app le contesta «¡Ya entrenaste
     hoy! 💪 …descansa» borrándole el entreno en curso.
   - **C — el coach cambia el plan** (poll 15s, app-1:647) → `card:true` a media sesión
     (antes: refresco diferido del plan, comportamiento diseñado en F2).
   - **Control D — con timer de descanso vivo** → `card:false, embedded:true` (el guard
     F2 sub-3 sí protege, pero solo mientras el timer corre).
   No hay pérdida de datos (claves `done_/log_` y parcial intactos; «Entrenar otra vez»
   recupera), pero es una rotura de flujo real en la ZONA MÁS CALIENTE de la app, con un
   caso (dolor) donde el mensaje es activamente equivocado.
7. **El ajuste de `_guiado-suite` — juicio dividido:** S5 P10 (día nuevo) es **FIEL**: en
   un día nuevo real la sesión sí sería de ayer; re-fecharla simula bien. **S14 TAPA el
   problema real**: su escenario es «mismo día, mid-sesión, el coach cambió el plan» — en
   producción ese render mostraría la TARJETA, no el plan nuevo (mi repro C es exactamente
   S14 sin el re-fechado). El comentario de Opus («aquí probamos el refresco diferido, no
   un entreno completado») elude que a media sesión SIEMPRE hay una sesión parcial de hoy
   en el historial. El fix debe hacer que S14 vuelva a pasar SIN re-fechar.
8. **Seguridad/tono:** `routineName` entra a innerHTML **CON `esc()`** (app-4:582,
   verificado en el diff); el resto de la tarjeta es estático; onclick sin datos de
   usuario. Tono Sofía correcto y cálido («Tu cuerpo ya hizo el trabajo — hidrátate,
   registra tus pasos y descansa»). Cero secretos.
9. **Prod:** curl Pages → `?v=366` ×10 + `CACHE_NAME='avi-v366'`; sin BOM (`3c 21 44`);
   `_prodcheck.mjs 366` **verde en 2 corridas** (boot 11s/13s, v366, login/core/renderToday
   true×3, cero jsErrors).

**VEREDICTO: RECHAZADA — el ciclo NO se cierra hasta corregir el punto 6.** NO exige
rollback inmediato (happy path correcto, sin pérdida de datos, recuperación en 1 toque),
pero el fix es OBLIGATORIO y pronto: cada asesorado que a media sesión cambie el ánimo,
reordene o sustituya (incl. dolor) pierde la vista del entreno.

**FIX ESTIPULADO para Opus (mínimo, de raíz):** el corto-circuito debe exigir además que
NO haya sesión EN CURSO — la señal más fiel es «la sesión activa de hoy NO está finalizada»
(p.ej. guiado embebido montado con sesión activa, o sesión de hoy con el mismo
`session_id_` vivo y sin finalizar). «Terminó» (100% o Finalizar temprano) SÍ muestra la
tarjeta al volver; «va por la serie 3» JAMÁS. Con el fix: (i) revertir el re-fechado de
S14 (debe pasar con la sesión parcial fechada HOY — esa es la prueba de que el fix
funciona); S5 P10 se queda como está; (ii) +1 check en `_shot-trained` o en el repro:
sesión parcial de hoy + `gmChangeMood`/`todayMoveEx` → el embebido sobrevive; (iii) +1
check del camino override (cierra mi sabotaje (a)). Mi repro queda en
`scripts/e2e/_fable-repro-midsession.mjs` (sin commitear) para verificar el fix.

**Radar (5):**
1. 🔴 **El fix del punto 6** — prioridad sobre el resto del lote de ideas de Camilo; es
   regresión de flujo en producción, no deuda.
2. 🟡 **Cobertura cero del camino override** (sabotaje (a) invisible para TODO el cinturón):
   1 check al hacer el fix — abrir rutina a propósito con sesión de hoy → NO tarjeta.
3. 🟡 **AVI_NEWS**: la regla de la casa dice que toda feature visible al asesorado lleva
   entrada (v302); Opus la omitió «por ahora». La tarjeta se descubre sola, pero el
   anuncio le daría contexto («si ya entrenaste, ahora la app te lo celebra») y haría
   descubrible «Entrenar otra vez». Decisión de Camilo al aprobar el fix.
4. 🟢 Matiz de producto aceptable pero consciente: un Finalizar temprano con 1 de 20
   series también dice «¡Ya entrenaste hoy!» — fue decisión explícita del usuario
   (Finalizar), lo doy por bueno; si Camilo ve quejas, el umbral vive en un solo lugar.
5. 🟢 Preexistente (zona v362, NO de esta feature): el botón «+1.000» de pasos se recorta
   ~2px a 390px en tema claro (visto en `trained-claro.png`). Arreglo cosmético de 1 línea
   cuando se toque esa tarjeta.

## 🟡 § VERDICTO FIX «YA ENTRENASTE HOY» v367 (Fable) — **APROBADA CON RESERVAS** (2026-07-17)

Re-verificación del fix que estipulé al RECHAZAR v366 (mi radar #1). Verificación
independiente completa contra la línea base `e48323d` (HEAD = código `033648b`). Todo
re-corrido por mí; ningún número tomado del reporte de Opus.

**El fix es de RAÍZ y está bien hecho: mi bug original ya NO reproduce por ninguna de las
3 vías, y la prueba reina (S14 destapado) pasa. La reserva no es del fix: Opus tocó
AVI_NEWS y dejó su harness `_verify-news.mjs` EN ROJO (5 checks viejos) sin correrlo.**

1. **Diff (`git diff e48323d HEAD`, 12 archivos, +225/−56): CERO scope creep.** Todo lo
   estipulado por mí + lo sancionado en mi radar: `sessionFinished(s)` (finishedAt O 100%
   legacy) + `finishedTrainingToday` REEMPLAZA a `trainedToday` (renombre limpio — grep:
   cero referencias vivas, solo comentarios históricos) + export dual; `saveSessionToHistory`
   gana `finished` y los DOS flujos de fin lo marcan (100% app-4:1373, Finalizar temprano
   app-4:1455); el corto-circuito exige sesión FINALIZADA; `_trainedTodayCardHTML` filtra
   por `sessionFinished` (el conteo «N sesiones» ya no cuenta parciales — detalle fino);
   AVI_NEWS v367 sin clave `coach` = para todos (filtro app-6:2404, correcto); S14
   DESTAPADO; S5 P10 conserva su re-fechado (fiel, lo confirmé en v366); `_shot-trained`
   +T7 override +T8 parcial; mi repro convertido en `_fable-repro-midsession.mjs` asertivo
   (8 checks, exit 1); +2 tests; baseline 388; bump ?v=367 + `avi-v367`; docs.
2. **Suite re-corrida por mí: 388/388** (los 2 tests nuevos: `sessionFinished` 7 aserciones
   + `finishedTrainingToday` 9, incl. «parcial hoy → false» = EL FIX).
3. **El test MUERDE + MI REPRO ORIGINAL CONTRA EL FIX (sabotaje a):** con árbol limpio
   quité `&& sessionFinished(s)` de `finishedTrainingToday` (= conducta v366) →
   **suite 387/388** (solo ese test rojo) **Y `_fable-repro-midsession` 4 checks rojos**
   (PASO 1 + REPRO A/B/C vuelven a `card:true` = mi bug de v366 reproducido EXACTO).
   Restaurado → 388/388 y 8/8. La regresión tiene diente doble (unit + E2E).
4. **Harnesses re-corridos por mí (árbol limpio):** `_fable-repro-midsession.mjs` **8/8**
   (setup sin historial → embebido sin tarjeta · parcial 1ª serie → `finishedAt:false`,
   `finishedTrainingToday:false` · gmChangeMood/todayMoveEx/poll → `card:false`, el
   entreno SIGUE · control timer vivo · POSITIVO: `finishSessionEarly` → `finishedAt:true`
   → tarjeta SÍ). `_shot-trained.mjs` **8/8**; capturas MIRADAS: tarjeta premium ambos
   temas, agua/pasos arriba, y ahora la siembra es un fin TEMPRANO (6/8 con finishedAt) →
   prueba que la marca manda, no el 100%. `_guiado-suite.mjs` **53/53 × 2 corridas con S14
   SIN re-fechar** — la parcial fechada HOY ya no tapa el refresco diferido del plan: la
   prueba reina de que el enmascaramiento que señalé quedó eliminado de verdad.
5. **Sabotajes propios (4; 3 mordieron, 1 sondeo confirmó redundancia benigna):**
   (a) el del punto 3 (muerde doble). (b) `finishSessionEarly` sin marcar `finished` →
   POSITIVO del repro cae (`finishedAt:false, card:false`) — el cableado del fin temprano
   tiene diente. (c) quitar `!overrideRoutine` (el que en v366 fue INVISIBLE para todo el
   cinturón) → **T7 lo caza** (`card=true workout=false`) — mi radar #2 cerrado con diente
   real. (d) SONDEO: quitar el `finished` del flujo 100% → suite y ambos harnesses VERDES:
   el fallback `doneSets>=totalSets` de `sessionFinished` lo cubre (por eso el historial
   viejo también funciona). Redundancia benigna y hasta protectora (si luego DES-marca una
   serie, `finishedAt` conserva el estado terminado) — no es brecha, no exijo nada.
   Árbol restaurado y re-verificado tras cada uno (`git status` limpio).
6. **🟡 LA RESERVA — `_verify-news.mjs` quedó EN ROJO (5 checks) tras añadir la entrada
   AVI_NEWS v367:** `newsToShow` muestra las **3 más recientes** sin ver (avi-core:1450,
   diseño de v302/«podar las viejas») → v367 empuja a v316 (chat) fuera de la ventana y
   las aserciones del harness siguen fijadas a «v316+v352+v362, slide 1 = chat» (N1, N2,
   N5, N7 — su CTA vive en la slide del chat que ya no entra —, N9). **El PRODUCTO está
   correcto** (N2 de hecho confirma que la slide v367 renderiza con «¡Listo, entendido!»
   y cierra bien; N3/N4/N6/N8 verdes), pero es una violación de la barra premium: se tocó
   AVI_NEWS sin correr su cinturón, y un harness rojo en `scripts/e2e/` = falsas alarmas
   para la próxima sesión. **Estipulado para Opus:** actualizar las aserciones a la
   ventana viva (v352/v362/v367) y, mejor, derivar dots/orden/última-slide del propio
   `AVI_NEWS` para que el harness no envejezca con cada entrada nueva. Sin deploy (solo
   harness). Nota de producto: que v316 salga de la ventana es el diseño (tope 3).
7. **Seguridad/tono:** ningún dato de usuario nuevo entra a innerHTML (`finishedAt` es ISO
   local; `esc()` de `routineName` intacto); el texto de la slide v367 es tono Sofía
   correcto («la pantalla Hoy se despeja…»). Cero secretos. Follow-up de Opus verificado
   por mí: la edge `daily-notifs` tiene su `trainedToday` local que cuenta parciales
   (index.ts:257-261) — impacto = el TEXTO de un push (podría decir «ya entrenaste» a
   alguien a media sesión), no la UI; no bloqueante, va al radar.
8. **Prod:** curl Pages → `?v=367` ×10 + `CACHE_NAME='avi-v367'`; sin BOM (`3c 21 44`);
   `_prodcheck.mjs 367` **verde en 2 corridas** (v367, login/core/renderToday true×3,
   cero jsErrors).

**VEREDICTO: APROBADA CON RESERVAS.** Mi radar #1 de v366 (el bug) queda CERRADO con
evidencia dura; #2 (override) cerrado con T7; #3 (AVI_NEWS) cumplido a medias — la entrada
existe y renderiza, pero dejó su harness rojo. La reserva es puntual y sin deploy:
actualizar `_verify-news.mjs`. El ciclo v366→v367 se cierra al quedar ese harness verde.

**Radar (5):**
1. 🟡 **`_verify-news.mjs` rojo** (punto 6) — arreglo de aserciones, sin deploy; hacerlo
   ANTES de la siguiente feature para no acostumbrarse a un cinturón con falsas alarmas.
2. 🟢 **Edge `daily-notifs`**: su `trainedToday` local cuenta parciales — 1 línea (exigir
   `finishedAt` o 100%) la próxima vez que se toque la edge; impacto = texto de un push.
3. 🟢 Edge consciente: recarga de la app con la 1ª sesión TERMINADA y una 2ª EN CURSO
   («Entrenar otra vez» + reload) → `CUR.trainAgain` no sobrevive y la tarjeta vuelve a
   tapar la 2ª sesión parcial; se recupera con un toque y el estado queda intacto. Raro y
   benigno; si algún día molesta, persistir `trainAgain` en sessionStorage.
4. 🟢 La ventana de 3 del tour deja fuera v316 (chat) para quien no la vio — es el diseño;
   si Camilo quiere podar de verdad, borrar entradas viejas del array (regla del backlog).
5. 🟢 Sigue pendiente el recorte del «+1.000» de pasos en claro (radar #5 de mi verdicto
   v366, zona v362).

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
