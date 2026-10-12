# 🔑 FUNCIONES CLAVE — referencia por área

> Movido de `CLAUDE.md` el 2026-10-12 para que cada sesión no cargue 635 KB (pedido del PO:
> «adelgaza el claude md sin perder información»). **El texto de abajo es el original, sin cambios.**
> Consultar antes de crear una función que quizá ya existe. Función importante nueva → aquí.

## 🔑 FUNCIONES CLAVE (334 totales — inline + avi-core.js)

### Sync & Persistencia
- `ld(key, default)` — lee localStorage
- `sv(key, value)` — escribe localStorage + async Supabase upsert
- `sbSet(key, value)` — upsert asíncrono a Supabase
- `syncFromCloud()` — descarga todo al arrancar (usa `SB_KEYS`)

### Membresía
- `MS.getStatus(client)` → `active | expiring | overdue | inactive | pending`
- `MS.canLogin(client)` → **entra todo el mundo MENOS `inactive`** (v564). `active`, `expiring`, `pending` (nuevo sin pago), `grace` (v528) y `courtesy` (v539) entran de siempre; **`overdue` también entra desde v564, pero cae en AVI FREE** — el descenso lo deriva `premiumLocked`, no toca `client.tier`. `inactive` (el coach lo pausó a mano) es el ÚNICO bloqueado
- `MS.badge(status)` → `{label, color, bg}`
- `registerPayment(clientId)` — registra pago por 30 días
- `toggleSuspend(clientId)` — pausar/reactivar
- `whatsappReminder(clientId)` — abre WhatsApp con monto + fecha + CTA urgente

### Auth & Seguridad
- `passwordProblem(pass, who)` — LA regla de contraseña (espejo de la política de Supabase). Con `who` ({name, email, self}) también rechaza el nombre o el correo de la persona (`passwordMentionsPerson`, v692); su espejo vive en `coach-create-client` (`mentionsPerson`) y la suite compara los dos. `generatePassword(who)` → «Generar una» del alta. 🔴 **Cambiar la contraseña de alguien CIERRA todas sus sesiones** (Supabase): avisarle o que entre con Google.
- 🔴 **«La nube no me reconoce» NO es «no hay red»** (v693, R17): `authClosedByServer` las distingue (la librería borra la sesión solo si el servidor la rechaza). Todo cierre propio va por `AUTH.signOut` (marca `_aviSaliendo`); cualquier otro `SIGNED_OUT` lo atiende `_aviVigilarSesion` y saca al login con el aviso `#lclosed`. `logout()` jamás borra `ax_udcache_*` ni `ax_udirty_*`: es lo que se sube al volver a entrar.
- `hashClientPass(pass, clientId)` → SHA-256 con salt
- `isHashed(pass)` → detecta si ya migró a SHA-256
- `doLogin()` — auth dual coach/asesorado
- `canLogin(c)` — **exclusión única: `getStatus(c) !== 'inactive'`** (v564). Antes era lista blanca; dejar fuera al vencido incumplía la promesa pública del FAQ («vuelves a AVI FREE y tu historial sigue ahí»)
- `esc(str)` — sanitización XSS obligatoria en todo innerHTML con datos de usuario

### Renderizado principal
- `renderHome()` — dashboard coach con banner de vencimientos ≤5 días
- `renderClients()` — lista asesorados con `esc()` en todos los campos
- `renderClientToday()` — vista del día con warmup y timer
- `renderClientHistory()` — historial + gráfica SVG de volumen
- `exportRoutineAsImage()` — canvas con rutina exportable como PNG
- `exportData()` — exporta las 10 colecciones en JSON

### Limpieza de datos
- `delClient()` — elimina cliente Y limpia history, prs, bodyweight, nutrition, medidas, photos en DB y localStorage

### Notificaciones
- `checkInactivity()` — detecta sin entreno >7 días, push title: "💪 Tu coach te extraña"
- `pushToClient(clientId, title, body)` — llama Edge Function send-push
- `subscribePush(clientId)` — registra dispositivo en push_subscriptions

### Modalidades de entrenamiento (v1.4 — campo `track` por ejercicio)
- 5 modalidades: `peso_reps` · `reps` (peso corporal, lastre opcional) · `tiempo` (isométrico) · `cardio` · `hiit`
- `exTrack(ex)` / `hiitCfg()` / `holdSecsOf()` — derivan la modalidad y su config
- `startHiit()` / `stopHiit()` — timer de intervalos con pitido+vibración + Wake Lock
- `startHoldTimer()` — cronómetro regresivo para isométricos (reusa rest-banner)
- `migrateExTypes()` — guard `ax_track_migrated`, reclasifica defaults una sola vez sin pisar al coach
- `buildExerciseProgress()` — métrica por track con unidad (kg/reps/s/min/rondas); PRs y gráficas conscientes de modalidad (back-compat: datos viejos = kg)

### Auto-generador de rutinas (v1.4–v1.5 — en `avi-core.js`)
- `generarRutinas(client, lib, opts)` — borrador completo de la semana; el coach SIEMPRE revisa antes de asignar (innegociable)
- Splits por sexo+días, scheme por objetivo+nivel, exclusiones por limitación física (`parseLimitations`) y por entorno (`inferExerciseEnv`)
- **Fase de adaptación (v1.5):** `isInAdaptation(client, history, now)` → principiante en sus primeras ~3 semanas (`ADAPT_DAYS=21`, por `startDate`→1ª sesión→alta). `genSchemeFor(goal, level, adaptation)` sobrescribe a 15 reps / 3 series / 60s, carga suave, sin importar el objetivo. Full body se conserva.
- **Personalización por composición (v1.5):** `bodyLoadProfile(client, cintura)` → 'high' si IMC≥30 (`bmiFrom`) o relación cintura-talla≥0.60. 'high' → `opts.loadProfile` prioriza variantes guiadas/asistidas (`GEN_ASSISTED_RE`) y excluye alto impacto/pliométricos (`GEN_HIIMPACT_RE`).
- `opts`: `{idFn, now, seed, tier, place, methodBias, adaptation, loadProfile}`. Retorna `{routines, needsReview, limitations, place, envGaps, adaptation, loadProfile}`.
- Botón ✨ "Generar semana" en el detalle del asesorado (coach). En modo libre: `_autoGenerateWeek(c)` (reusa el motor) al registrarse y botón "✨ Regenerar mi semana".

### Auto-registro y modo libre (v1.5 — `avi-core.js` + inline)
- `validateSignup(data, clients, coachEmail)` — valida email/único/no-coach/contraseña.
- `signupClient()` (inline) — crea cuenta `selfReg:true, tier:'libre'` (password hasheada) → auto-login → `_autoGenerateWeek`. Form `#cin-signup` en la landing (botón "Crear cuenta").
- `isFreeClient(client)` = `tier==='libre'` — **gating Premium**. Free conserva entrenar + rutina auto-generada + historial básico. SOLO Premium (con coach): chat (`renderClientMsgs`), nutrición (`renderNutritionClient`), fotos+medidas (`renderPhotosClient`/`renderMedidasClient`), analítica (`renderVolChart`/`renderPRsInProfile`/`renderClientExProgress`). Bloqueo = `premiumLockHTML()` (candado + "Quiero un coach").
- `requestCoach()` — libre pide coach: `wantsCoach=true` + escribe mensaje al chat → le LLEGA al coach (su `pollMessages` re-trae `ax_c` con merge aditivo y notifica). Upsell `coachUpsellHTML`/`renderCoachUpsell` en "Hoy" y "Perfil".
- `convertToPremium(cid)` — el coach activa Premium a un lead (`tier:'premium'`, limpia `wantsCoach`) → desbloquea todo. Botón "⭐ Activar Premium" en el detalle (`#d-freelead`).
- Editar perfil de un libre (place/goal/level/days) ofrece **regenerar** su rutina para que coincida (`saveClient`).

### Agregados de actividad por fecha (v1.5 — `avi-core.js`, deterministas, reciben `now`)
- `retentionByDay(history, now)` — barras de retención por **día de calendario real** (no `getDay()`; arregla el bug de entrenos fantasma del mismo día de la semana pasada).
- `weeklyActiveCount` / `clientsTrainedToday` / `daysSinceLastSession` / `sortRoutinesByDay` (rutinas ordenadas Lunes→Domingo, migración de arranque).

### Hábitos diarios (v300 — 💧 agua por vasos · v362 — 👟 pasos)
- Tarjeta `#cn-habits` en Hoy (render `renderHabitsCard` en app-5, arma `_waterBlockHtml`+`_stepsBlockHtml` en el mismo `.hb-card` con divisor `.hb-sep`; llamada desde `renderClientToday` ANTES de los early-returns → sale también en descanso/sin rutina)
- **Agua:** `waterGoalGlasses(weightKg)` (~35ml/kg, vaso 250ml, clamp 6-12, fallback 8) · `waterToday`/`waterAdd` (clamp 0-30, poda 30 días, inmutable) · `waterWeek` · `waterTap`. La meta respeta `nut.water` del plan del coach (en vasos) vía `_waterGoalFor`; sin plan → peso. Acento AZUL (`--bl`).
- **Pasos (v362):** `STEPS_GOAL_DEFAULT=8000` (OMS, FIJA — no depende del peso) · `stepsToday`/`stepsSet` (fija el total del día, clamp [0..`STEPS_MAX`=100.000], inmutable, poda 30d) / `stepsAdd` (=set+delta, para el atajo +1.000) · `stepsWeek`. **DECISIÓN de diseño:** el input NUMÉRICO FIJA el total (se LEE del celular, no se suma vaso a vaso) vía `stepsSetInput`; el botón +1.000 SUMA vía `stepsQuick`. Acento VERDE (`--gl`/`--g2`/`--g`), ícono `footprints`. Formato de miles es-CO con `_fmtSteps`.
- Datos en `client.habits.{water,steps}` → viajan en el perfil (clientToRow copia todo, patrón painCare); sync con `sv()` (debounce)
- **Recordatorio push (v362):** el cron VESPERTINO (`daily-notifs`, 5pm) APENDE una coletilla «¿ya registraste tu agua y tus pasos?» al push de la tarde SOLO si el asesorado no registró hoy (lee `profile.habits` de `user_data`; solo ramas normales/postworkout, nunca rescate/comeback ni coach). NO es un push nuevo.
- Falta (parte 3): 🍽️ adherencia de comidas en esta MISMA tarjeta (decisión Camilo 2026-07-09)

### Coach Inteligente (v352-v353 — "alguien pendiente de ti")
- `applyMood` (avi-core) devuelve `adapt.care` = 1-3 consejos de BIENESTAR por ánimo (voz AVI, jamás médicos ni cifras; el estado 🤕 dolor empuja a PARAR). `moodBannerHtml` (app-4) pinta el bloque "Para cuidarte hoy" — UNA función, cubre la vista clásica Y el guiado embebido.
- `coachInsight(client, sessions, prs, now, opts)` (avi-core) — función PURA, devuelve el insight priorizado o null. Prioridad (v353): **inactivo(≥4d) > deload(≥4 sem plan, premium) > récord(PR ≤48h) > racha(≥2 sem) > estancado(kg, ≥6 puntos planos, premium) > adaptación > peso(premium, `opts.bw`, SOLO en positivo — dirección contraria = SILENCIO) > agua(`opts.waterGoal`/`waterWeek` sin contar hoy, candado anti-regaño)**. Umbrales = constantes `INSIGHT_*`. Recibe `now` siempre (determinista). `renderCoachCard` (app-4) la pinta en `#cn-coach-card` (Hoy). "Entendido" silencia N días por tipo (`coachmute_<cid>_<type>` localStorage, LOCAL — NO en SB_KEYS a propósito).
- **PLAN DE CHOQUE (v354)** — detectar un estancamiento y no proponer nada es medio producto
  (Camilo tras probar el pulso v353). `shockPlan(client, exName, sessions, lib, now)` (avi-core,
  PURA) → `null` si ese ejercicio no está estancado, o `{ex, analysis:{bestKg,flatPoints,sinceStr},
  warnings, options}` con 2-3 protocolos: `remonta` (siempre, la recomendada), `pesado` 5×5
  (**JAMÁS con dolor activo**), `variante` (mismo músculo, gate de nivel, excluye `GEN_ZONE_EXCL`
  de limitaciones Y de zonas con dolor; determinista). `applyShockOption(routines, exName, option,
  lib)` (PURA) → copia nueva; el swap conserva sets/reps. Constantes `SHOCK_*`. UI: tarjeta
  `#d-shock` en `p-detail` (`renderShockCard`/`applyShock`/`shockWrite`/`dismissShock` en app-3;
  mute `shockmute_<cid>_<exNorm>` 21d LOCAL, NO en SB_KEYS). **CANDADO: AVI propone, el coach
  aprueba** — "Aplicar" cambia la rutina y PRELLENA el chat (`openCoachChat` + `#cchat-in`), pero
  el mensaje lo envía él; nada llega al asesorado sin su tap. El plan vive en `CUR.shock` y los
  onclick van por índice → ningún dato de usuario entra a un atributo. Harness `_verify-shock.mjs`.
- **MÚLTIPLES ESTANCAMIENTOS (v355, Fase 4.1)** — proponer plan solo para el PRIMER estancado es
  medio producto. `shockTargets(sessions)` (avi-core, PURA, sin `now`) agrupa TODOS los ejercicios
  plantados y decide el modo con criterio del coach profesional: `{mode:'multi',targets:[{name,
  muscle,also}]}` para 1-2 músculos (por músculo gana el de más `_flatPointsOf` — helper extraído
  de `shockPlan`, sin duplicar; desempate nombre asc; hermanas en `also`), o `{mode:'global',count,
  names}` para ≥`SHOCK_GLOBAL_MIN`(=3) = fatiga sistémica. UI: `renderShockCard` multi-sección
  (`CUR.shock={mode,targets}`, `applyShock(ti,oi)`/`shockWrite(ti)` por índice; mute POR ejercicio →
  aplicar a uno NO oculta al otro; «Descartar todos» mutea los visibles). Modo global = tarjeta SIN
  protocolos por ejercicio + CTA «Generar semana de descarga» → `shockDeload()` cablea el generador
  YA existente (`openGenRutinas`+`#mg-deload`+`toggleGenDeload`, cero lógica nueva) + chat prellenado
  + mute global `shockmute_<cid>__global` 7d (`SHOCK_GLOBAL_MUTE_DAYS`). Candados intactos.
- **GATE DE CONSTANCIA (v356, Fase 4.2)** — «3+ estancados = descarga» SOLO vale si viene entrenando
  parejo (fatiga). Si se estancó por FALTAS, una descarga baja aún más el volumen = consejo equivocado
  → recuperar el ritmo (caso real de Andrea). `shockTargets(sessions,client,now)`: con 3+ estancados
  mide `_recentCadence` (días/sem en los últimos `SHOCK_CONSISTENCY_DAYS=28`, hasta `now`; puro,
  calendario-agnóstico, preferido sobre `weekStreak`); si `< planDays*SHOCK_CONSISTENCY_MIN_RATIO(0.7)`
  → modo `rebuild` (tarjeta «recuperar ritmo», NO descarga, `shockWriteRebuild` prellena el chat) en
  vez de `global`. El gate NO afecta al modo multi (1-2). Sin `now` → `global` (contrato base).
- `coachPulse(clients, history, prs, now, opts)` (avi-core, v353) — función PURA para EL COACH: hasta 5 filas `{id,name,type,label}` con motivos POSITIVOS para escribirle a cada asesorado (record>estancado>deload>racha). **NO inactividad** (el banner de adherencia ya la grita). Determinista (desempate por nombre — el poll de 15s no debe saltar). `renderPulse` (app-2) → `#h-pulse` en Inicio; ✕ silencia la fila 3 días (`coachpulse_<cid>_<type>`). Detectores `_insRecordOf`/`_insStallOf` compartidos con `coachInsight`.

### Gamificación (v1.4 — nivel permanente + logros)
- `gxLevel(total)` — nivel permanente 1–5 (`GX_LEVELS`), NO se reinicia
- `renderGamification(client)` — tarjeta de nivel + logros
- ⚰️ **Descuento por adherencia ELIMINADO (2026-07-06, decisión de Camilo):** `gxDiscount`/`gxNextTier`, la tarjeta del cliente, la del coach y su CSS (.gx-month) — tuvo poca recepción ("a nadie le importa mucho"). NO reconstruirlo sin pedido explícito.

---
