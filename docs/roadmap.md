# 🗺️ ROADMAP — backlog, estudios y lo congelado

> Movido de `CLAUDE.md` el 2026-10-12 para que cada sesión no cargue 635 KB (pedido del PO:
> «adelgaza el claude md sin perder información»). **El texto de abajo es el original, sin cambios.**
> Ítem nuevo o completado → aquí.

## 🗺️ ROADMAP

> 📜 El historial completo de versiones y sesiones (v1.0 → hoy, con TODOS los hitos por sesión)
> vive en **`docs/bitacora.md`** — movido el 2026-07-07 para adelgazar este archivo.

### 🧊 CONGELADO POR DECISIÓN DEL PO — no se construye más aquí
- **COMUNIDAD (2026-09-02).** No se le añade funcionalidad. Lo que está en producción sigue vivo
  y se **mantiene** (seguridad y correcciones sí; features nuevas no). Fase 2 —feed de logros,
  ranking de constancia— suspendida. **El número que lo decidió:** de 45 publicaciones, **0 las
  escribió una persona** (las 5 clases son automáticas: `workout`/`streak`/`level`/`routine`/`pr`);
  **1 comentario** en toda la historia (24-jul), **3 mensajes directos** (21-jul), reacciones en
  cero desde el 12-ago, **0 reportes jamás**. Son 2.230 líneas vivas. **Se reabre** si ≥3 personas
  distintas publican/comentan/se escriben en 30 días, si el PO decide empujarla, o si llega el
  primer reporte. **Deuda anotada, no tapada:** un **comentario** reportado no se puede borrar
  desde la bandeja del coach (`app-3-coach.js:3223` solo pinta el botón para `post:`; la RPC
  `cmty_mod_delete_comment` existe y no la llama nadie) — se arregla el día que llegue un reporte.
  Detalle y evidencia: `docs/plan-comunidad.md` (cabecera) y
  `docs/auditoria-areas-2026-09-01/A9-comunidad.md`.
- **REGISTRO DE ALIMENTOS (2026-08-27).** Mismo criterio, misma razón: 5 personas, 7 días, nadie
  desde el 13-ago. Criterio de corte en `docs/plan-registro-alimentos.md` §8.4.
- **Regla general:** congelar **no** es esconder ni borrar. La funcionalidad sigue visible para
  quien la use y sus candados se siguen manteniendo — sobre todo si guarda datos de menores.

### 🔥 CALENTAMIENTO POR RECETA — lo que sigue a v721 (aprobado por el PO el 24-oct)
Fuente: `docs/calentamiento-2026-10-23/` (Coach Pro, Valery, consolidado y el dictamen de Laura).
- **v722 · que la app LEA postparto, diástasis y piso pélvico** (clave `core_central`, Laura prioridad ALTA) y, con
  prioridad media, osteopenia (`hueso`) e hipertensión (`presion`). Toca `GEN_LIMIT_KWS` y el ENTRENO (sin impacto
  ni flexión de tronco), así que antes de escribir: Laura dicta la regla del entreno para cada clave, y al tocar
  `GEN_ZONE_EXCL` se vuelve a barrer la matriz del calentamiento (su candado 7). Mientras no exista, el día de core
  de mujer no arranca con el dead bug y `we5`, `wf1` y `wg4` no entran en ninguna receta.
- **v723 · las series de aproximación por implemento** (el paso 4): barra de pierna 40/60/80 %, tren superior 50/75 %
  (+90 % solo a ≤6 reps y NUNCA con hombro, pecho, codo, cuello u operado), prensa/Smith 2 series, máquina 1 al 60 %,
  aislamiento 1 al 50 % solo si es el primero de su músculo, peso corporal ninguna; tope 3 ejercicios y ~6 series;
  base al 90 % si el último registro tiene >4 semanas o hubo dolor en 14 días (**que lo confirme Andrés Hyp**). Toca el
  guiado (zona caliente): hoy es UNA fila `w0` al 50 %. El candado 6 de Laura va con esta versión.
- ✅ **Decidido (24-oct):** `wr1` y `we3` salieron del todo (con `wa2`); sus listas a mano las pierden solas.

### ✅ Hecho (resumen ejecutivo)
- **v1.0–v1.3** (2025 – mayo 2026): base PWA single-file + Supabase sync, push VAPID, mensajes coach↔asesorado, pagos/membresía, nutrición con macros, analytics, dark mode, hardening XSS, gates QA.
- **v1.4–v1.5** (junio 2026): modalidades `track` por ejercicio, auto-generador con adaptación, auto-registro modo libre, gamificación, catálogo 212 ejercicios con foto propia (pipeline Gemini), rediseño interior.
- **v2.0** (junio 2026, EN PROD): Supabase Auth real (email + Google) + RLS por usuario, SMTP propio, registro público.
- **v2.x** (julio 2026): guiado embebido ÚNICO (plan F0→F5 cerrado; la clásica murió en avi-v291), racha semanal consciente del plan, telemetría `app_errors`, backup doble, push resucitado, consentimiento Habeas Data (v292), CI + hook de 11 checks, harnesses E2E versionados (`scripts/e2e/`).

### 🔬 ESTUDIO DE COMPETENCIA — Fitia y MyFitnessPal (2026-08-12) → `docs/estudio-fitia-mfp-2026-08-12.md`
Encargo del PO. **Tesis: AVI no puede ganarles en base de datos ni en IA, y no lo necesita — las dos
gastan fortunas en SIMULAR lo que AVI tiene de verdad (un entrenador humano).** Lo que sí hay que
copiarles es la mecánica del día a día. **6 patrones a traer**, por impacto÷costo: (1) **el plan se
MARCA, no se re-escribe** — en Fitia el plan ES el registro, un toque por comida; hoy AVI pide 3-5
anotaciones y *el vaso de agua, que es UN toque, lo usan 6 de 24*; (2) **el objetivo como FRANJA**
con ✓ en vez de cifra exacta (nuestros márgenes son ±10% y están medidos); (3) **la semana en una
fila** de 7 días (el dato ya existe, no se enseña); (4) **la lista del mercado** salida del plan
—Fitia COBRA por ella y AVI ya tiene todo lo necesario—; (5) **el sello de «revisado» visible**
(F6 ya va por delante: aquí el que revisa es SU entrenador, no un moderador anónimo); (6) **decir lo
que QUEDA**, no lo que llevas. **NO copiar:** foto con IA (rompe las 3 restricciones y sus reseñas
dicen que hay que corregir a mano), coach de IA (diluye lo único diferencial), micronutrientes (no
tenemos fuente → clase de la yuca), **cobrar por lo ya dado gratis** (MFP movió el escáner a Premium
= su queja nº1), medicamentos GLP-1. ⚠️ Y su trampa: kcal con precisión de unidad, que finge una
exactitud que ningún plan tiene — si se trae, **con la franja**. **Dónde AVI ya gana:** coach real ·
el plan completo sin pagar (Fitia lo cobra) · catálogo verificable (el de MFP lo escriben usuarios
sin validar: *«validez pobre»*, estudio 2024) · **entrenamiento y comida en la misma app** (ellas no
tienen la rutina).

### ✅ F7 — EL PLAN DE COMIDA SE MARCA, NO SE RE-ESCRIBE (avi-v477, 2026-08-12)
Patrón 1 del estudio de competencia, y el que más cambia el producto. Plan y registro eran **dos
mundos**: la app dictaba qué comer con sus gramos y luego pedía buscarlo y teclearlo otra vez, 3-5
veces al día — *y el vaso de agua, que es UN toque, lo usan 6 de 24*. Ahora **cada comida se marca
con un toque** en las DOS superficies (la tarjeta «Tu comida de hoy» y la habitación del registro,
donde el hueco «Sin registrar» pasa a ser una acción), y se puede **deshacer**.
- Motor puro: **`nutPlanMealEntries`** convierte una comida del plan en entradas NORMALES del
  registro (mismo `foodLogEntry`, mismo snapshot) → totales, progreso, ficha del coach, poda y
  merge siguen funcionando sin enterarse. `foodLogMarkPlanMeal` / `foodLogUnmarkPlanMeal` /
  `foodLogPlanMealDone` / `foodLogIsPlanEntry`.
- 🔒 **Id DETERMINISTA `pl-<día>-<comida>-<n>`**: marcar dos veces no duplica y dos teléfonos
  producen las MISMAS entradas → el merge (E4) las une en vez de servir el desayuno dos veces.
- 🔒 **Los acompañantes CUENTAN**: `nutDayPlan` mapeaba sus ids a nombres y los perdía → ahora
  expone también **`acompIds`**. Registrar solo el plato dejaba el registro por debajo de lo que el
  propio plan dice que se come (v470 al revés).
- 🔒 Marcar **ES registrar**: pasa por el aviso de que el coach ve el detalle y por el gate Premium.
- 📊 **Medido (315 días × 5 comidas):** con el plan ENTERO marcado la barra cae en **93-111%** de la
  meta (mediana 101%), **0 días bajo el 90%** — dentro de la franja ±10% que la app ya declara. Sin
  eso, la app le diría «te faltan 400 kcal» a quien comió justo lo que le mandó (familia v435/v444).
- ⚠️ **Deuda conocida:** `foodLogTotals` suma el `kcal` **de la tabla** (Atwater de la fuente) y el
  plan deriva el suyo como `4p+4c+9f` → el registro lee **0,4-5,7% por debajo** de lo que el plan
  dice servir. Hoy NO se ve (las dos pantallas comparan contra la META, no entre sí) y el registro
  es el más exacto de los dos, pero son **dos definiciones de caloría vivas en la misma app**.
- ⏭️ Falta de los 6 patrones: la **franja** en vez de la cifra, **«te quedan X»**, la **fila de 7
  días** y la **lista del mercado**.

### ✅ LA FRANJA, «TE QUEDAN X» Y LA SEMANA EN UNA FILA (avi-v478, 2026-08-12)
Patrones 2, 3 y 6 del estudio, en un lote de PANTALLA (no tocan el motor del plato).
- **La franja en vez de la cifra exacta.** `foodLogBandFor(meta,hecho)` → `{lo,hi,estado,falta,sobra}`.
  🔴 **El ancho está MEDIDO** (12-ago, ruta `nutBaseFor` contra la nube): 25 filas → 21 resuelven →
  **17 que en producción SÍ ven el plan** (6 son `tier:'libre'`), 119 días-plan. El plato sirve
  **94,7%-110,2%** de lo que promete → ±5% deja 28 días fuera, ±8% deja 6, **±10% deja 1 (Nayla,
  110,2%)** y **±12% deja 0** ← elegido. **Una franja más estrecha de lo que el plato entrega le
  diría «te pasaste» a quien comió lo que la app le mandó.** Solo kcal: por macro es mucho más
  ancho (grasa 80,9%-129,2%) y una franja de ±29% no dice nada.
- **«Te quedan X»** cuenta hasta la FRANJA, no hasta la cifra exacta.
- **La semana en una fila** (`foodLogWeekStates`): 7 días con su estado. 🔴 Un día sin registrar es
  un HUECO («no sabemos»), jamás un cero — la misma regla que protege el promedio del coach.
- 🔴 **El umbral de desvío de la ficha del coach se DERIVA del ancho de la franja** (`_FL_DESVIO_MEDIO`).
  Era un `12` a mano contra el `0.12` de avi-core: el coach podía ver una alerta naranja por el
  mismo día en que la app le decía a ella «✓ vas en tu franja».
- ⏭️ **El coach sigue viendo su fila de 7 días en clave «registró / no registró»**, no en clave de
  franja. No se contradicen (responden preguntas distintas), pero está sin unificar.

### ✅ LA LISTA DEL MERCADO (avi-v479, 2026-08-12) — el estudio queda CERRADO
Patrón 4, el último que faltaba. Fitia **la cobra**; AVI ya tenía los 7 días con sus alimentos y
sus gramos. `nutShoppingList(base,routines)` los suma y agrupa por sección; `nutShoppingText`
arma la versión de WhatsApp **desde la lista ya hecha** (no un segundo cálculo). Vive en «Ver mi
plan en grande», con acceso directo desde «Tu comida de hoy».
🔴 **Lo que se COMPRA no es lo que se SIRVE — las tres cosas que hubo que resolver:**
1. **`maxG` NO se aplica**: es el tope de UNA ración, no de la compra de la semana. Reusar
   `nutPortionText` (el reflejo obvio) habría pedido **200 g de clara para siete días**.
2. **La medida de ración no es la de compra.** Sumada a la semana da «13 octavos de aguacate»,
   «32 claras», «13 vasos de yogur». Al mercado se va **con el peso**, salvo lo que de verdad se
   compra por unidad → **`compra:'un'` en la tabla (14 alimentos)**, donde el PO y Andrés lo
   pueden revisar; no es deducible de la etiqueta. Cada línea, UN número con el que actuar.
3. **La tabla habla de comida LISTA PARA COMER.** 1 kg de arroz cocido no es 1 kg de arroz crudo.
   **No se inventa el factor** (sin fuente citable = la clase de la yuca): se MARCA, derivado del
   propio nombre, y la pantalla lo dice. ⏭️ **Cerrarlo de verdad = traer los factores con fuente,
   decisión de Andrés.**

### 🎯 Backlog vigente (2026-07-10)

> 🗺️ **ARRANQUE DE SESIÓN: leer `docs/plan-sesiones.md`** — plan VIVO con las próximas
> sesiones ya diseñadas (objetivo, pasos, trampas y verificación por sesión: mejoras 7-8
> del estudio, deuda técnica, simulacro de restore, XSS, pasos manuales, adherencia coach)
> + el protocolo de arranque/cierre. Escrito 2026-07-10 al desplegar v314→v316.
- [ ] 🎨 Íconos SVG de marca F2-F5 (plan vivo en **`docs/plan-iconos-svg.md`**; F1 hecha en v303 — sistema `aviIcon` en app-1). F4 (guiado) = zona caliente, harness completo obligatorio
- [ ] 🎨 **ELEVACIÓN PREMIUM (programa completo) → plan vivo en `docs/plan-diseno-premium.md`** (FASE 0 fundación: tokens de movimiento/press-feedback, elevación, tipografía, foco, SVG; luego superficie por superficie con método repetible). Nace de la auditoría Isabella con skills web-design-guidelines/emil-design-eng/ui-ux-pro-max, 2026-07-12; shots en `Temp/avi-design`. Top: (1) 🔴 banner "Instalar app" tapa contenido en login Y coach-home (incl. warning de planes por vencer) + duplicado en login → anclar sobre el bottom-nav + reservar padding [VERIFICAR primero si es artefacto del preview forzado]; (2) 🟡 **tokens de MOVIMIENTO** (`--ease-out`/`--dur`) + `:active{transform:scale(.97)}` global — AVI no tiene press-feedback, es EL lever "se siente premium" de Emil; (3) 🔴 emojis como iconos FUNCIONALES (el mood-selector del cierre es un rating) → SVG + `aria-pressed`; (4) 🟡 `tabular-nums` en stats/timers — OJO: ya hecho en `.wf-stat-val` (v319); los KPIs del coach usan 'Anton' que IGNORA tnum (gotcha v319) → ahí mono/ancho fijo; (5) 🟡 separación de tarjetas débil en light (subir borde a `--br2`); 🟢 2 CTAs iguales en login, "DURACION"→"DURACIÓN", comillas curvas, X de cerrar inconsistente. Aplicable en CSS vanilla con tokens.
- [~] 🌐 **COMUNIDAD (idea #5) → plan vivo en `docs/plan-comunidad.md`** (Fase 1 en curso). **C1+C2+C3 EN PROD (avi-v373, PENDIENTE re-verificación de Fable).** C1 tablas+RLS (community_profiles/friendships/community_reactions/community_reports + RPC resolve_share_code), C2 snapshot server-side (edge `refresh_snapshot`, decisión #7) + bucket `avatars` + delete-account v4, **C3 UI del asesorado (6ª pestaña `#cn-community`, `app-7-community.js`): opt-in+consentimiento, amigos por código, ❤️, bloquear/reportar, offline**. **Falta C4** (texto legal + `LEGAL_V` + radar de adopción). Ranking/feed = Fase 2 (solo si Fase 1 pega). Migraciones en `supabase/community/` (aplicadas por MCP).
- [~] 🧠 **COACH INTELIGENTE ("alguien pendiente de ti") → plan vivo en `docs/plan-coach-inteligente.md`** (idea de Camilo 2026-07-13). **Fases 1+2+3+4+4.1+4.2 EN PROD (avi-v356, 2026-07-16):** Capa A = `adapt.care` (bienestar por ánimo) → "Para cuidarte hoy" en `moodBannerHtml`; Capa B = motor puro `coachInsight` (8 señales: inactivo/deload/récord/racha/estancado/adaptación/peso/agua, prioridad+mute+free/premium) → tarjeta `#cn-coach-card` en Hoy; **Pulso del coach** = `coachPulse` puro → tarjeta `#h-pulse` en el Inicio del coach (motivos positivos para escribirle a cada asesorado, sin inactividad). **Fase 4 = PLAN DE CHOQUE** (`shockPlan`/`applyShockOption` puros → `#d-shock` en la ficha): al detectar una meseta, AVI propone 2-3 protocolos (descarga y remonta / 5×5 / rotar variante) con candados de dolor y limitación; el coach aplica en 1 toque y el chat le queda PRELLENADO (lo envía él). **Fase 4.1 = MÚLTIPLES ESTANCAMIENTOS** (`shockTargets` puro → tarjeta multi-sección o modo descarga global): mismo músculo=uno primero, distintos=en paralelo, 3+=fatiga sistémica→semana de descarga. **Fase 4.2 = GATE DE CONSTANCIA (v356)**: el «3+→descarga» solo si viene entrenando parejo (`_recentCadence`); si se estancó por faltas → modo `rebuild` (recuperar ritmo, no descarga). Decisiones de Camilo cerradas (§9). **Falta:** capa LLM opcional (futuro) y push (cuando suba la adopción). 📷 Análisis de técnica por CÁMARA = apuesta futura SEPARADA (rompe single-file/offline, riesgo legal; escalón intermedio = grabar video para el coach).
- **v505 · EL TOPE DE TARJETAS (dirección B, 3 de 3 — el lote queda CERRADO):** la regla que no existía. `_applyTodayCap` (app-4, al final de `_todayOrder`, que es el ÚNICO punto por el que pasan todos los caminos de «Hoy») deja **máximo `TODAY_MAX_CARDS`=2 avisos** a la vez, por `TODAY_CARD_PRIORITY` (avi-core, puro: `todayCardPlan`). **APARTA, NO SILENCIA**: lo que no cabe baja a la fila `#cn-more` («Tienes N avisos más») que la abre en el sitio, sin mutear nada. **NUNCA topa** el entreno, la cabecera, la portada del día 1 ni las herramientas (hábitos, plan de comida, rápidos). Apaga con **clase propia `.cap-off`**, jamás con `style.display` (el modo día 1 gestiona el display de esos mismos contenedores). Curva medida escrita al lado de la constante. Harness `_verify-tope.mjs` (14).
- **v504 · LA TIRA DE 3 CHIPS (dirección B, 2 de 3):** `#cn-habits` abre como TIRA de una línea (`.hb-strip`: agua · pasos · plato) y el bloque completo de siempre queda a un toque (`habitsToggle`, preferencia LOCAL `ax_hbopen_<cid>`, fuera de SB_KEYS). **Cada chip conserva la acción de SU hábito** —el de agua SUMA UN VASO de un toque (medido: 8 personas y 71 días, el hábito con más adopción), el de comida abre la habitación, el de pasos despliega y enfoca el campo—. El chip del plato habla en **FRANJA** con las mismas palabras que la fila (v478). `habitPct` (avi-core) es la ÚNICA cuenta del avance para las 4 superficies. Harness `_verify-chips.mjs` (21). **🔻 v507: el chip del PLATO SALIÓ de la tira** (decisión del PO sobre esta misma medición: comida 5 personas/7 días y nadie desde el 13-ago, contra 8/71 del agua). Quedan 2 chips; el registro vive en la fila del detalle con su «+», en el «✓ Me lo comí» del plan (F7) y en la puerta nueva **«Anotar lo que comí hoy» de «Mi nutrición»** (`_foodLogDoorHtml`). C4 pasó a ser el candado de la BAJADA y C11 afirma que el plato sale UNA vez en «Hoy».
- [x] 💧 Hábitos parte 2: 👟 PASOS — **HECHO (SESIÓN J, avi-v362, 2026-07-17).** `stepsToday/stepsSet/stepsAdd/stepsWeek` puros en avi-core (meta 8.000 OMS, input SET el total + atajo +1.000, clamp 100.000, poda 30d) → fila verde en `#cn-habits` (ícono `footprints`) + AVI_NEWS v362 + recordatorio server-side en el cron de las 5pm (`daily-notifs`, coletilla si no registró hoy). Falta verificación de Fable. (Google Fit NO viable — API apagada; Health Connect solo apps nativas → registro MANUAL, decidido.)
- [ ] 💧 Hábitos parte 3: 🍽️ COMIDAS = check-in de adherencia al plan (✅/más o menos/❌) + foto opcional al coach. DECISIÓN 2026-07-09: NO construir base de datos de alimentos
- [x] 📊 Coach: adherencia de hábitos (agua) del asesorado en p-detail — **HECHO (SESIÓN I, avi-v361, 2026-07-16, verificado por Fable §25 de plan-coach-inteligente).** Helpers puros `waterAdherence(habits, goal, now)` (⚠️ `now` = objeto `Date`, NO timestamp — hace `getTime()`) y `waterGoalFor(client, nut)` (réplica pura de `_waterGoalFor`) en avi-core; `renderCoachHabitsCard` pinta `#d-habits` en `p-detail` (7 puntos, oculta si 0 días registrados). Harness `_shot-coach.mjs detail` con aserciones duras (exit 1).
- [~] 🔔 Asesorados: subir las suscripciones a push (mecánica ya arreglada en v320: toast honesto + self-heal + denied con instrucciones). ADOPCIÓN (producto): (b) pedir permiso al FIN del entreno **YA EXISTE (v325, `renderWfPushNudge`)** — verificado en la Sesión J. (c) que el coach invite a abrir la app **HECHO (v364, 2026-07-17):** botón 🔔 en la barra de `#coach-chat` → `coachInviteOpenApp()` → WhatsApp si hay teléfono (canal que SÍ alcanza al no-suscrito; el chat interno solo pushea a quien ya está suscrito), si no prellena el chat interno. Queda (a) copy más fuerte de la tarjeta de "Hoy". El iPhone real sin PWA instalada no entra hasta que la instale (Lucas v320)
- [ ] 🔔 Feature "programar notificaciones" (app-5-salud fireNotifAt) es POCO CONFIABLE: el disparo es `setTimeout` en el dispositivo del coach → solo corre con la app ABIERTA (si la cierra, no dispara), y el push va a asesorados sin suscripción. La vía confiable son los notifs server-side (daily-notifs cron). Evaluar mover el scheduling al servidor o marcar la feature como "requiere app abierta" (v322 solo quitó el bucle que spameaba al coach)
- [x] 💬 Coach: UNIFICAR el chat inline del perfil con el chat de pantalla completa v321 — **HECHO (SESIÓN K, avi-v363, 2026-07-17).** La sección Mensajes de `p-detail` deja de tener input propio: PREVIEW de solo lectura (últimos 2 + nota «+N más») + botón «Abrir chat» → `openCoachChat`. Borrada `sendCoachMsg` y el textarea `#msg-in`; un solo lugar para escribir. `renderDetailMsgs` reescrita a preview; `sendCoachChatMsg` ya refrescaba el preview. Harness `_verify-chatunified.mjs` (13) + coach-back 20/20 + shock OK. Falta verificación de Fable.
- [x] 🔔 Coach: priorizar MENSAJE SIN LEER del asesorado en el orden de `#p-clients` — **HECHO (SESIÓN H, avi-v360, 2026-07-16).** `clientAttentionRank`/`sortClientsByAttention` (avi-core) ganaron un `opts={msgs,lastReadTs}` aditivo (puro; sin opts = v317 idéntico). Nuevos tiers: **2 💬 mensaje sin leer** (sev=ms desde el más viejo) · **3 🙋 pidió coach** (lead, sev=días desde `wantsCoachAt`, sin fecha al final — lección v359). `renderClients` arma `optsById` desde `DB.msgs`+`ax_msgreads`. Decisión Camilo D1/D3: ambos debajo de dolor/vencido; unread encima del lead. Suite 376, `_verify-v317` +5 V360.
- [x] 🙋 **Leads «quiere coach» pegados — HECHO (avi-v387, 2026-07-22).** `wantsCoach` vive en la fila del ASESORADO (client-writable, clase F7) → no puede ser el estado de «ya lo atendí»: el celular del asesorado lo revive. El estado se mudó al lado del coach (`ax_leadsdone`, las 3 vías: SB_KEYS + `_COACH_SETTINGS_KEYS` + `_coachSettingsObj().ld` + hidratación con fusión). Motor puro `leadPending(client,leadsDone)` (reaparece si vuelve a pedir DESPUÉS de ser atendido; marca ilegible → fail-VISIBLE). Botón «Ya lo atendí» + cualquier cambio de plan marca atendido (antes solo la rama 'coach' — por eso Hugo y César quedaron pegados desde julio). **ABIERTO:** el PO reporta esos avisos como PUSH AL CELULAR, que esta vía NO explica (`daily-notifs` descartado); hallazgo colateral: **2 dispositivos `_coach` → todo push al coach le llega DUPLICADO**. Falta captura del push para rastrear el emisor.
- [ ] 🔎 Coach: `renderClients` limpia el buscador en CADA re-render (incl. el poll de 15s) → si Camilo está filtrando y llega un mensaje, pierde el filtro. Preexistente, pero la mejora 7 lo hace más notorio (además reordena). Preservar el término y re-aplicar `filterClients` tras el poll (distinguir poll de navegación-a-panel)
- [x] ⚡ Rondas configurables en Entrenamientos rápidos → HECHO en avi-v301 (+ preset HIIT en Máquina). REGLA NUEVA: al publicar feature visible al asesorado, agregar entrada a `AVI_NEWS` (app-6, v302) y podar las viejas
- [x] 🔐 2FA en GitHub y Supabase — **HECHO por Camilo (2026-07-11, con recovery codes guardados)**. Ya no recordar.
- [x] 📧 **Correo de confirmación de marca** — HECHO (Camilo confirmó 2026-07-12 que aplicó `docs/email-templates/confirm-signup.html` en Supabase → Auth → Email Templates → "Confirm signup"). Nació de un caso real: un usuario vio el enlace crudo larguísimo de Supabase, le dio MIEDO y NO abrió la app. Plantilla con botón grande, tono Sofía, copy que tranquiliza.
- [ ] 📧 **Otras 3 plantillas de correo con el mismo molde premium** (magic link, restablecer contraseña, invitación) — hoy siguen con el diseño crudo de Supabase. Menos visibles que el de confirmación → menor prioridad. Mismo patrón que `confirm-signup.html`. Opción fuerte a futuro: código OTP de 6 dígitos en vez de enlace (elimina el miedo de raíz).
- [ ] ⚖️ Legal: revisión de ABOGADO de `legal/` + botones "descargar mis datos" / "eliminar mi cuenta" (derecho de supresión). Al cambiar textos: subir `LEGAL_V`.
- [ ] 🏪 Play Store: política de privacidad con URL pública (`legal/` ya se sirve en Pages — validar si basta), borrado self-service (mismo item legal), formulario Data Safety, cuenta dev US$25
- [ ] 🎬 Videos: 106 ejercicios sin video (`Desktop/AVI/DOCUMENTOS/videos/videos-faltantes.json`; decisión vigente = UN video por ejercicio)
- [ ] 📸 Fotos: versión mujer 24/109; 22 stock por reemplazar (`Desktop/FOTOS-STOCK-POR-REEMPLAZAR.txt`); foto de victoria dedicada para workout-finish
- [ ] Stripe / Mercado Pago — cobro automático (Nequi es el parche actual)
- [ ] `payment.planType` para MRR segmentado + widget MRR proyectado
- [ ] Análisis de cohortes de retención (Mateo — requiere ≥10 asesorados)
- [ ] `completedAt` en sesiones de historial (`startedAt` ya existe)
- [x] Supabase Auth password hardening — **CERRADO 2026-07-13, NO volver a ponerlo en el radar.** Los requisitos server-side de contraseña (min 8 + minúscula/mayúscula/dígito, espejo exacto de `passwordProblem`) **YA ESTÁN ACTIVOS y verificados contra la API real** (signup de prueba: 422 weak_password por caracteres Y por largo). Los tenía configurados Camilo desde antes. ⚠️ El advisor de Supabase `auth_leaked_password_protection` va a seguir saliendo SIEMPRE: ese toggle (HaveIBeenPwned) es SOLO plan Pro (US$25/mes; la org está en Free) y se decidió NO pagar Pro solo por eso → **ignorar ese advisor en futuras auditorías**, no es accionable ni es un descuido.
- [x] Limpieza: `openGuidedMode` sin callers tras F5 — **BORRADO (auditoría 2026-07-13, avi-v350)** junto con su rama exclusiva de cierre en `_aviCloseTopOverlay`. Los `else` defensivos de `_gmIsEmbedded()` en funciones vivas (closeGuidedMode/gmChangeMood) se conservaron a propósito (fallbacks, no código muerto)
- [x] 🧯 SIMULACRO DE RESTORE — **HECHO 2026-07-12** → runbook en `docs/runbook-restore.md`. Ambas capas PROBADAS restaurando en tabla de prueba aislada + validando integridad vs prod viva (24 filas · 89 rutinas · 140 sesiones, idénticas, datos anidados intactos). Capa 1 (apex_data_backups) para corrupción; capa 2 (JSON local, incluye auth_users) para pérdida total. Deuda menor restante: el Escenario B (recrear proyecto + cuentas auth) no se ejecutó punta a punta — ensayar en proyecto de PRUEBA para certeza total.
- [x] 🔍 Re-barrido XSS — **HECHO 2026-07-12 (avi-v328)**: Julián auditó los 225 sinks; grueso limpio (chat=textContent, nutrición/perfil/fotos con esc/validación). Único hueco: nombre de ejercicio custom sin esc() en los 2 builders (`app-2:506`, `app-3:1417`) → fix + harness `_verify-xss.mjs` (con control negativo). Inventario en bitácora parte 32 → próximo barrido = DIFF, no censo. Deuda menor 🟢 verificada no-explotable: muscle/type/level/goal de `<select>` + avatar en CSS `.style` (no innerHTML).
- [ ] 📸 Fotos/avatares a Storage ROTOS (cazado 2026-07-12): `uploadPhotoToStorage` sube a la carpeta `${clientId}/` con `x-upsert:true`, pero (a) el `clientId` es el ID LEGACY del asesorado (`mpiru2b…`), NO su `auth.uid()` (uuid) → la policy INSERT `folder[1]=auth.uid()` NUNCA coincide; (b) el upsert necesitaría policy SELECT (FALTA, mismo patrón que el bug de push); (c) la policy SÍ tiene cláusula para que el coach suba fotos de sus asesorados (`EXISTS ... user_data.coach_id=auth.uid()`), pero el join es contra `user_data.user_id` (uuid) y la carpeta es el ID legacy → tampoco matchea por ahí. Impacto BAJO: cae a base64 (funciona; ~109 kB de bloat, ruido en logs). **DECISIÓN Camilo 2026-07-12: hacerlo BIEN, nada de aflojar la policy a "cualquier autenticado" (pañito) → re-arquitectura: rutas por `uuid` + propiedad real (subidas del coach vía edge function con service role, RLS estricta).** Preferible tocarlo cuando se trabaje el módulo de fotos en la app.
- [ ] 🧹 `EX_IMG_NAME`/`exIcon`/`exVidSrc`: lookup por nombre hereda del prototipo (un custom llamado `constructor`/`__proto__` da 404 inofensivo de imagen) → `Object.hasOwn` o `Object.create(null)` (hallazgo Julián v315)
- [ ] 📱 Cobertura iOS/Safari: hay al menos un usuario real en iPhone (telemetría 2026-07-06) y todas las pruebas son Chrome/Android

### 🚀 v2.0+ — Escala
- [~] Multi-coach → EN CURSO vía AVI GYM (proyecto separado, `Desktop/AVI-GYM`)
- [~] White-label → EN CURSO vía AVI GYM (config por gimnasio, piloto fundadora $150.000/mes)
- [ ] API pública para integraciones
- [ ] iOS nativa
