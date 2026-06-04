# AVI — Plataforma de Entrenamiento Personal

> **Nota de marca (2026-06-01):** el producto se renombró de **APEX** a **AVI** (iniciales de los hijos del PO: Alexander, Valery, Isabella). El nombre visible es AVI; los identificadores internos siguen como `apex`/`ax_` (repo `apex-app`, tabla `apex_data`, claves `ax_*`, `apex-core.js`, caché `apex-vNN`) — NO renombrarlos (rompería datos/PWA). Handle redes: @avi.entrena. Pendiente: registro de marca en SIC.

> Este archivo es la memoria permanente del proyecto. Claude Code lo lee automáticamente al iniciar cada sesión en este directorio.

---

## 🎯 IDENTIDAD DEL PRODUCTO

**AVI** es una plataforma SaaS de entrenamiento personal en formato PWA, sincronizada con Supabase, lista para instalarse como app real en cualquier celular.

**Product Owner:** Camilo Andrés — Entrenador personal independiente en Guaduas, Cundinamarca, Colombia. Sus decisiones sobre funcionalidad son finales.

**Usuarios:**
- **Coach** — gestiona asesorados, rutinas, plantillas, mensualidades
- **Asesorados** — ejecutan rutinas, registran progreso, ven evolución

**Versión actual:** v1.4 — Junio 2026

---

## 🚫 RESTRICCIONES NO NEGOCIABLES

| Restricción | Por qué |
|---|---|
| **Un solo archivo `.html`** | Portabilidad total — GitHub Pages, instalación local |
| **Vanilla JS puro** | Sin frameworks, sin build, sin npm en producción |
| **localStorage + Supabase** | localStorage como caché; Supabase como sync cross-device |
| **Mobile-first estricto** | Mínimo 360px sin romperse — la mayoría usa móvil |
| **Sin dependencias JS externas** | Si cabe en 20 líneas vanilla, va vanilla |
| **SVG nativo para gráficas** | No Chart.js, no D3 — todo dibujado a mano |

---

## 📐 ARQUITECTURA

### Archivos del proyecto
```
apex-app/
├── index.html                          ← APEX completo (~8,000 líneas, ~505 KB)
├── sw.js                               ← Service Worker ESTÁTICO (⚠️ NUNCA convertir a blob URL)
├── .git/hooks/pre-commit               ← Audit automático en cada git commit (7 checks)
├── .claude/agents/                     ← 15 agentes especializados del equipo
├── .claude/skills/                     ← apex-audit, apex-deploy, apex-feature, apex-generate, apex-run
├── supabase/functions/send-push/       ← Edge Function push notifications
├── supabase/functions/daily-notifs/    ← Edge Function notificaciones diarias (3 cron jobs)
└── CLAUDE.md                           ← Este archivo
```

### Pantallas (`.screen`)
| ID | Descripción |
|---|---|
| `#s-login` | Login dual coach/asesorado con remember-me |
| `#s-coach` | Panel del entrenador |
| `#s-client` | Vista del asesorado |
| `#apex-loading` | Overlay de carga — "Entrenamiento con nombre propio" |

### Paneles del Coach (6)
- `#p-home` — Dashboard: MRR, activos, sesiones semanales, retención SVG, banner de vencimientos próximos, asesorados prioritarios (vencidos primero)
- `#p-clients` — Lista con búsqueda + badge de membresía
- `#p-detail` — Detalle: rutinas, mensajes, historial, progreso, mensualidad, nutrición, medidas, fotos
- `#p-templates` — Biblioteca de plantillas reutilizables
- `#p-exercises` — 93 ejercicios precargados, filtros por músculo
- `#p-msgs` — Bandeja con badges de no leídos

### Secciones del Asesorado (5)
- `#cn-today` — Entrenamiento del día + activación auto + timer
- `#cn-routines` — Todas sus rutinas (no solo la del día)
- `#cn-messages` — Chat con el coach
- `#cn-history` — Historial (hasta 365 sesiones) + gráfica volumen + progreso por ejercicio/modalidad
- `#cn-profile` — Foto de perfil propia, peso corporal, PRs, datos, fotos progreso, medidas (progressive disclosure: oculta tarjetas vacías)
- `#cn-gamif` — Gamificación: nivel permanente (1–5, no se reinicia) + descuento del mes por adherencia (5/10/15%) + logros. El coach también ve el descuento ganado en su panel

### Modales activos
- `#m-client` — Crear/editar asesorado (nombre, email, contraseña, teléfono, sexo, edad, actividad, objetivo, nivel, días, notas)
- `#m-routine` — Constructor de rutinas con warmup auto-sugerido
- `#m-picker` — Selector de ejercicios filtrable
- `#m-ex` — CRUD ejercicio con URL imagen/video referencia
- `#m-settings` — Configuración del coach (nombre, email, pass)
- `#m-template` — Crear/editar plantilla de rutina
- `#m-tpl-picker` — Aplicar plantilla a asesorado
- `#m-notif` — Programar notificaciones locales
- `#m-exref` — Modal de referencia visual del ejercicio
- `#m-backup` — Backup/restore JSON con estadísticas

---

## 💾 ESQUEMA DE DATOS

```js
DB = {
  clients: [],     // ax_c — asesorados
  exercises: [],   // ax_e — 93 ejercicios precargados + custom
  msgs: {},        // ax_m — { clientId: [{from, text, date}] }
  history: {},     // ax_hist — { clientId: [hasta 365 sesiones] }
  prs: {},         // ax_pr — récords personales por ejercicio
  bodyweight: {},  // ax_bw — peso corporal histórico
  templates: [],   // ax_tpl — plantillas de rutinas
  nutrition: {},   // ax_nut — planes nutricionales por asesorado
  medidas: {},     // ax_med — medidas corporales históricas
  photos: {},      // ax_photos — fotos de progreso (URLs Supabase Storage desde v1.3.3, base64 legacy migrado automático)
  nequi: '',       // ax_nequi — número Nequi del coach para cobros
}
```

### Schema cliente completo (v1.3.0)
```js
{
  id, name, email, password,        // password: SHA-256 con clientId como salt
  goal, level, days, weight, notes,
  height,                           // cm — usado por bodyLoadProfile (IMC)
  phone,                            // ✅ v1.3.0 — teléfono para WhatsApp
  sex,                              // 'M' | 'F' | ''
  age,                              // number | null
  activityFactor,                   // 1.2 | 1.375 | 1.55 | 1.725 | 1.9
  selfReg,                          // true = se auto-registró (modo libre)
  tier,                             // 'libre' (free) | 'premium' (activado por coach) | undefined (creado por coach = acceso completo)
  wantsCoach, wantsCoachAt,         // true cuando un libre pide coach → lead caliente para el coach
  startDate,                        // opcional — inicio de entreno (ventana de adaptación); si falta usa 1ª sesión/createdAt
  suspended: false,
  payments: [{
    date, dueDate, amount, note
  }],
  routines: [{
    id, name, day, restSec, note,
    warmup,                         // activación previa auto-sugerida
    exercises: [{
      id, name, muscle, type,
      sets, reps, icon, desc, descSimple,
      imgUrl
    }]
  }]
}
```

### Schema sesión activa (localStorage dinámico)
```
log_{routineId}_{exIdx}_{setIdx}_kg
log_{routineId}_{exIdx}_{setIdx}_reps
done_{routineId}_{exIdx}_{setIdx}      → "1" | "0"
session_date_{routineId}                → fecha último entreno
```

---

## ☁️ INFRAESTRUCTURA CLOUD

### Supabase
```
URL: https://eoebhrxbokyllqalyecj.supabase.co
Tablas: apex_data (key-value), push_subscriptions
Edge Functions:
  - send-push       → envía push a un clientId específico
  - daily-notifs    → notificaciones diarias 7am/10am/5pm (Colombia UTC-5)
    Cron: 3 jobs activos — morning / midmorning / afternoon
    CORS: restringido a https://kronos-apex.github.io (⚠️ NO usar * en producción)
```

### ⚠️ Supabase — riesgo de sync con offline-first
APEX usa localStorage como fuente de verdad y sincroniza **hacia** Supabase, no al revés. Si la app se abre en cualquier dispositivo con datos viejos en localStorage, esos datos sobrescriben Supabase.

**Consecuencia:** cambios hechos directamente en Supabase (SQL, Python, Dashboard) pueden perderse en el próximo sync de la app.

**Mitigación al editar Supabase directamente:**
- Asegurarse de que la app no esté abierta en ningún dispositivo del asesorado
- Hacer siempre REPLACE TOTAL del array (nunca append)
- Después de guardar, pedirle al asesorado que abra y cierre la app una vez (forza pull desde Supabase)
- Para cambios críticos: editar preferiblemente desde la UI de APEX para que localStorage quede actualizado

### Despliegue
```
Plataforma: GitHub Pages (github.com/Kronos-apex/apex-app)
Branch producción: main (NUNCA master, NUNCA --force)
Workflow: edit → pre-commit hook (7 checks) → git commit → git push → GitHub Pages automático
Backend: Supabase (apex_data, push_subscriptions, Edge Functions)
```

### VAPID Keys (push notifications)
```
PUBLIC:  BDf4sPyqahfUqJxuWpgCwFopVoX5jivStXpjyrrtDG1QP9Bxf3pVbcFSisPBsFL3bCac9c-jrkLvGgchgPfg7d8
PRIVATE: solo en variables de entorno Supabase → Edge Functions → send-push
```

### SB_KEYS — claves que se sincronizan a Supabase
```js
SB_KEYS = [
  'ax_c',       // clientes
  'ax_e',       // ejercicios
  'ax_m',       // mensajes
  'ax_hist',    // historial
  'ax_pr',      // PRs
  'ax_bw',      // peso corporal
  'ax_tpl',     // plantillas
  'ax_nut',     // nutrición
  'ax_med',     // medidas
  'ax_photos',  // fotos (URLs Supabase Storage desde v1.3.3)
  'ax_cph',     // hash contraseña coach
  'ax_site',    // sitio web del coach
  'ax_ce',      // ejercicios custom
  'ax_cn',      // nombre del coach
  'ax_nequi',   // ✅ v1.3.3 — número Nequi del coach
]
// ax_cp ELIMINADO — contraseña legacy del coach no debe sincronizarse
```

---

## 🎨 SISTEMA DE DISEÑO

### Tokens CSS — los 3 bloques `:root` (light / dark-auto / dark-manual)
```css
/* Fondos */
--bg:#F4F4F0   --w:#FFF   --br:#E5E5DF   --br2:#D0D0C8
--surface:#F9F9F6                          /* ✅ v1.3.0 */

/* Tipografía */
--t1:#1A1A1A   --t2:#6A6A6A   --t3:#B0B0B0

/* Verde marca */
--g:#2D6A4F   --g2:#40916C   --gl:#D8F3DC   --gt:#1B4332

/* Semánticos */
--or:#E76F51   --orl:#FDE8E0   /* alerta */
--bl:#457B9D   --bll:#E0EBF4   /* info */
--yl:#E9C46A   --yll:#FEF6DE   /* advertencia */
--rd:#E63946   --rdl:#FCE4E6   /* error */
--accent3:#A855F7               /* ✅ v1.3.0 — acento terciario */

/* Forma */
--r:12px   --rsm:8px   --rlg:18px
--sh:0 2px 10px rgba(0,0,0,.06)
--sh2:0 6px 28px rgba(0,0,0,.10)
```

### Dark mode
- **Auto:** `@media (prefers-color-scheme: dark)` — sigue el sistema
- **Manual:** clase `.dark` en `<body>` — toggle ☀️/🌙/⚙️ persistido en `ax_theme`

### Clases reutilizables — SIEMPRE usar antes de crear nuevas
`.btn .bp .bg .bd .bo .bsm` — botones
`.card .ch .cb .ctitle` — tarjetas
`.tag .tg .tb .to` — etiquetas
`.inp .sel .ilbl .llbl` — formularios
`.ph .ptitle .psub` — encabezados de página
`.empty .eico .etxt .esub` — estados vacíos
`.mdbg .md .mdlg .mdtitle .mdfooter` — modales
`.cntab .cnp` — tabs del asesorado
`.cli .cav .cn .cm` — list items

---

## 🔑 FUNCIONES CLAVE (334 totales — inline + apex-core.js)

### Sync & Persistencia
- `ld(key, default)` — lee localStorage
- `sv(key, value)` — escribe localStorage + async Supabase upsert
- `sbSet(key, value)` — upsert asíncrono a Supabase
- `syncFromCloud()` — descarga todo al arrancar (usa `SB_KEYS`)

### Membresía
- `MS.getStatus(client)` → `active | expiring | overdue | inactive | pending`
- `MS.canLogin(client)` → entran `active`, `expiring` y `pending` (asesorado nuevo sin pago — onboarding/tier libre). `overdue` (plan vencido) e `inactive` (suspendido) BLOQUEADOS
- `MS.badge(status)` → `{label, color, bg}`
- `registerPayment(clientId)` — registra pago por 30 días
- `toggleSuspend(clientId)` — pausar/reactivar
- `whatsappReminder(clientId)` — abre WhatsApp con monto + fecha + CTA urgente

### Auth & Seguridad
- `hashClientPass(pass, clientId)` → SHA-256 con salt
- `isHashed(pass)` → detecta si ya migró a SHA-256
- `doLogin()` — auth dual coach/asesorado
- `canLogin(c)` — inclusión positiva: `active || expiring || pending` (pending = nuevo sin pago, entra)
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

### Auto-generador de rutinas (v1.4–v1.5 — en `apex-core.js`)
- `generarRutinas(client, lib, opts)` — borrador completo de la semana; el coach SIEMPRE revisa antes de asignar (innegociable)
- Splits por sexo+días, scheme por objetivo+nivel, exclusiones por limitación física (`parseLimitations`) y por entorno (`inferExerciseEnv`)
- **Fase de adaptación (v1.5):** `isInAdaptation(client, history, now)` → principiante en sus primeras ~3 semanas (`ADAPT_DAYS=21`, por `startDate`→1ª sesión→alta). `genSchemeFor(goal, level, adaptation)` sobrescribe a 15 reps / 3 series / 60s, carga suave, sin importar el objetivo. Full body se conserva.
- **Personalización por composición (v1.5):** `bodyLoadProfile(client, cintura)` → 'high' si IMC≥30 (`bmiFrom`) o relación cintura-talla≥0.60. 'high' → `opts.loadProfile` prioriza variantes guiadas/asistidas (`GEN_ASSISTED_RE`) y excluye alto impacto/pliométricos (`GEN_HIIMPACT_RE`).
- `opts`: `{idFn, now, seed, tier, place, methodBias, adaptation, loadProfile}`. Retorna `{routines, needsReview, limitations, place, envGaps, adaptation, loadProfile}`.
- Botón ✨ "Generar semana" en el detalle del asesorado (coach). En modo libre: `_autoGenerateWeek(c)` (reusa el motor) al registrarse y botón "✨ Regenerar mi semana".

### Auto-registro y modo libre (v1.5 — `apex-core.js` + inline)
- `validateSignup(data, clients, coachEmail)` — valida email/único/no-coach/contraseña.
- `signupClient()` (inline) — crea cuenta `selfReg:true, tier:'libre'` (password hasheada) → auto-login → `_autoGenerateWeek`. Form `#cin-signup` en la landing (botón "Crear cuenta").
- `isFreeClient(client)` = `tier==='libre'` — **gating Premium**. Free conserva entrenar + rutina auto-generada + historial básico. SOLO Premium (con coach): chat (`renderClientMsgs`), nutrición (`renderNutritionClient`), fotos+medidas (`renderPhotosClient`/`renderMedidasClient`), analítica (`renderVolChart`/`renderPRsInProfile`/`renderClientExProgress`). Bloqueo = `premiumLockHTML()` (candado + "Quiero un coach").
- `requestCoach()` — libre pide coach: `wantsCoach=true` + escribe mensaje al chat → le LLEGA al coach (su `pollMessages` re-trae `ax_c` con merge aditivo y notifica). Upsell `coachUpsellHTML`/`renderCoachUpsell` en "Hoy" y "Perfil".
- `convertToPremium(cid)` — el coach activa Premium a un lead (`tier:'premium'`, limpia `wantsCoach`) → desbloquea todo. Botón "⭐ Activar Premium" en el detalle (`#d-freelead`).
- Editar perfil de un libre (place/goal/level/days) ofrece **regenerar** su rutina para que coincida (`saveClient`).

### Agregados de actividad por fecha (v1.5 — `apex-core.js`, deterministas, reciben `now`)
- `retentionByDay(history, now)` — barras de retención por **día de calendario real** (no `getDay()`; arregla el bug de entrenos fantasma del mismo día de la semana pasada).
- `weeklyActiveCount` / `clientsTrainedToday` / `daysSinceLastSession` / `sortRoutinesByDay` (rutinas ordenadas Lunes→Domingo, migración de arranque).

### Gamificación (v1.4 — visible al asesorado, descuento visible también al coach)
- `gxLevel(total)` — nivel permanente 1–5 (`GX_LEVELS`), NO se reinicia
- `gxDiscount(client, hist)` — adherencia del ciclo de renovación → tramo de descuento (≥60%→5%, ≥80%→10%, 100%→15%). **Informativo**: el coach lo aplica a mano, sin movimiento automático de dinero
- `gxNextTier(d)` — cuántas sesiones faltan para el siguiente tramo
- `renderGamification(client)` — tarjetas de nivel + descuento del mes + logros

---

## 🔒 SEGURIDAD — ESTADO ACTUAL (v1.4)

| Área | Estado |
|---|---|
| XSS en innerHTML | ✅ `esc()` aplicado: nutrición, perfil, rutinas, progreso, notificaciones, fotos |
| `photo.src` en `<img>` | ✅ Validado que sea `data:image/...` o `https://` antes de insertar |
| Sesión localStorage | ✅ `expiresAt: now + 30 días` — `tryAutoLogin` valida expiración |
| CORS Edge Functions | ✅ Restringido a `https://kronos-apex.github.io` (NO usar `*`) |
| Contraseña coach | ✅ SHA-256 en `ax_cph`, legacy `ax_cp` no sincroniza |
| Contraseñas asesorados | ✅ SHA-256 con clientId como salt, migración automática |
| Login con membresía vencida | ✅ `overdue`/`inactive` bloqueados; `pending` (nuevo sin pago) SÍ entra (onboarding/tier libre) |
| VAPID private key | ✅ Solo en variables de entorno Supabase — jamás en frontend |
| send-push Edge Function | ✅ Verifica Authorization header antes de enviar |
| Pre-commit hook | ✅ Bloquea secrets hardcodeados antes de cualquier commit |
| Service Worker | ✅ Archivo estático `sw.js` — NUNCA blob URL (rompe Android Chrome) |

**Estado de auth (v2.0, Fase 4 completa):**
- ✅ Auth real Supabase + RLS por usuario en `user_data` (`auth.uid()=user_id OR =coach_id`). El login client-side legacy fue eliminado.
- ✅ `apex_data`/`apex_data_backups` cerradas a anon (blob legacy solo como respaldo). Ya NO se descarga toda la DB antes del login.
- ⚠️ `push_subscriptions` solo-escritura para anon (tradeoff: conserva registro de push; follow-up = mover a autenticado).
- Bearer token de Edge Functions = anon key pública (solo riesgo: spam de notificaciones)

---

## ⚖️ PRINCIPIOS INVIOLABLES

1. **No romper nada existente** — cada cambio retro-compatible con datos en localStorage y Supabase
2. **Sin dependencias JS externas** — si cabe en 20 líneas vanilla, va vanilla
3. **Mobile-first siempre** — 360px mínimo, touch targets ≥36px, sin hover-only
4. **Un solo archivo HTML** — jamás proponer múltiples archivos para producción
5. **Tokens CSS del sistema** — nunca valores hardcodeados nuevos
6. **IDs sagrados** — si una función referencia un ID, ese ID no se cambia sin actualizar la función
7. **Roles separados** — jamás mezclar lógica de coach con asesorado
8. **`esc()` en todo innerHTML con datos del usuario** — sin excepciones
9. **Deploy = Lucas QA + Julián QA + pre-commit hook** — los tres, siempre
10. **Mensajes en español neutro** — sin tecnicismos para el asesorado

---

## 🩺 PROTOCOLO — ASESORADO CON LIMITACIÓN FÍSICA

Este protocolo reemplaza el flujo estándar cuando hay lesión activa, postoperatorio o limitación crónica documentada. Aplica también si el historial menciona dolor recurrente o restricción médica.

### Paso 1 — Intake clínico (antes de cualquier diseño)
Recolectar ANTES de invocar agentes deportivos:
- [ ] Diagnóstico: qué articulación, qué estructura (menisco, LCA, manguito, hernia, etc.)
- [ ] Intervención: cirugía / rehabilitación / tratamiento conservador
- [ ] Tiempo post-lesión u operación (semanas o meses exactos)
- [ ] Dolor actual: escala 0-10 en reposo y con actividad
- [ ] Alta médica o fisioterapéutica: sí / no / parcial
- [ ] Ejercicios que el asesorado ya hace sin dolor vs. los que evita

### Paso 2 — Laura audita PRIMERO (veredicto vinculante)
Laura recibe el intake completo + objetivo del asesorado antes de que cualquier otro agente diseñe ejercicios.
- ❌ = no incluir en ningún caso
- 🟡 = modificar antes de continuar
- ✅ = seguro con los parámetros dados

**No diseñar y luego auditar — diseñar CON los límites de Laura ya marcados.**

### Paso 3 — Diseño con restricciones aplicadas
Coach Pro (hombres) o Valery (mujeres) diseña la rutina completa con las restricciones de Laura ya incorporadas. No hay vuelta atrás al auditor para ejercicios que no cambiaron.

### Paso 4 — Revisión nutricional (si hay cambio de carga o protocolo terapéutico)
Andrés Hyp revisa macros y agrega suplementos terapéuticos si aplica (colágeno hidrolizado + Vit C para articulaciones, por ejemplo).

### Paso 5 — Escritura en Supabase (procedimiento seguro)
⚠️ **CRÍTICO — arquitectura offline-first:** el próximo sync de la app sobrescribe cualquier cambio directo en Supabase con los datos de localStorage del dispositivo.

Reglas obligatorias:
1. Siempre hacer **REPLACE TOTAL** de `routines[]` — nunca append de rutina individual
2. Confirmar con el usuario que la app no está abierta en ningún dispositivo del asesorado
3. Verificar con SELECT después de insertar — antes de dar la operación por completa
4. Si el asesorado tiene la app instalada: pedirle que abra y cierre una vez tras la actualización (forza sync desde Supabase → localStorage)

### Paso 6 — Comunicación al asesorado (Sofía revisa tono)
- Mensaje 1: explicar el cambio de rutina — qué cambió, por qué, qué esperar
- Mensaje 2 (si aplica): protocolo nutricional terapéutico con instrucciones claras
- Incluir siempre criterios de automonitoreo: "Para si sientes X, avísame"
- Sin tecnicismos en el texto que lee el asesorado

---

## 🤖 PIPELINE AUTOMÁTICO — REGLA CARDINAL

**El orquestador activa el equipo correcto automáticamente. El usuario no necesita nombrar agentes.**

### Ruteo automático por señal en el pedido

| Si el pedido menciona... | Agente obligatorio |
|---|---|
| lesión, rodilla, hombro, columna, limitación física, postoperatorio, dolor, rehabilitación | **Laura** audita seguridad primero — su veredicto es vinculante |
| ejercicio, rutina, serie, músculo, calentamiento, progresión | **Coach Pro** valida primero |
| asesorada mujer, programa femenino, glúteos, postparto, recomposición femenina | **Valery** valida primero |
| hipertrofia, ganar músculo, masa, bulk, macros, proteína, calorías, suplemento, creatina, periodización, deload | **Andrés (Hyp)** valida primero |
| plan nutricional, macros, calorías para un asesorado, nutrición deportiva | **Andrés (Hyp)** calcula y aprueba |
| apariencia, diseño, color, se ve, layout, dark mode | **Isabella** propone → Diego implementa |
| mensaje al asesorado, texto visible, toast, onboarding | **Sofía** revisa tono |
| precio, cobro, plan, retención, prospecto | **Camilo** analiza |
| Supabase, SQL, tabla, sync, Edge Function | **Andrés DBA** |
| feature nueva / "quiero que..." / "necesito..." | **Valentina** prioriza primero |
| datos, métricas, cohortes, churn | **Mateo** (mínimo 10 asesorados) |

### Secuencia obligatoria antes de CUALQUIER deploy

```
Cambio implementado
    ↓
Lucas QA (funcional) — flujos, visibilidad, edge cases
    ↓ solo si 🟢
Julián QA (estático) — sintaxis, IDs, duplicados, SB_KEYS, secrets
    ↓ solo si 🟢
pre-commit hook — 7 checks automáticos (bloquea si falla)
    ↓ solo si 🟢
git push origin main
```

**Nunca se despliega sin Lucas + Julián. Ni hotfixes "simples". Ni cambios de texto.**

---

## 📝 PROTOCOLO DE TRABAJO

### Antes de tocar código
1. Lee `index.html` para entender el estado actual
2. Identifica exactamente qué funciones/IDs/secciones se van a tocar
3. Describe el plan: qué cambia Y qué NO cambia

### Al ejecutar
4. Cambios quirúrgicos — solo lo necesario, nada más
5. `esc()` en cualquier `innerHTML` que reciba datos del usuario
6. Campo nuevo en DB → actualizar SB_KEYS si debe sincronizar
7. Sin funciones duplicadas — verificar antes de añadir

### Al entregar (deploy)
8. Lucas QA funcional → Julián QA estático → deploy si ambos 🟢
9. **Actualizar CLAUDE.md** — parte obligatoria del deploy (Paso 6 del skill apex-deploy)

### Al cerrar sesión
10. Revisar si algo relevante ocurrido en la sesión **no llegó a deploy** pero debería quedar documentado:
    - Decisiones de arquitectura tomadas
    - Campos o funciones nuevas que ya existen en el código
    - Bugs conocidos identificados pero no resueltos
    - Cambios en el roadmap
11. Si hay algo: actualizar CLAUDE.md y commitear con `docs: notas de sesión`
12. Si no hay nada nuevo: confirmarlo — "CLAUDE.md revisado al cierre, sin cambios."

**El CLAUDE.md desactualizado es tan peligroso como el código sin QA — la próxima sesión arranca con contexto falso.**

---

## 🗺️ ROADMAP

### ✅ v1.0 — Base (2025)
- Arquitectura single-file PWA + Supabase sync
- Login dual coach/asesorado
- Constructor de rutinas con ejercicios
- Historial de entrenamientos

### ✅ v1.1 — Funcionalidades core
- Push notifications con VAPID real (Edge Function send-push)
- Sistema de mensajes coach ↔ asesorado
- Fotos de progreso, medidas corporales, peso corporal
- Plantillas de rutinas reutilizables
- PWA instalable (manifest + SW)
- TWA nativo para Android (assetlinks.json)

### ✅ v1.2 — Negocio y contenido
- Sistema completo de pagos y membresía (estados, fechas manuales)
- Dashboard analytics del coach (MRR, activos, retención SVG)
- Plan nutricional completo (macros automáticos, templates, exportar PNG)
- 88 ejercicios con validación Coach Pro
- RCT e ICC reemplazando IMC (métricas con evidencia)
- Racha de entrenamiento semanal
- Alerta de inactividad automática
- Asesorado puede elegir cualquier rutina

### ✅ v1.3 — Calidad y UX (Mayo 2026)
- Dark mode automático + toggle manual (☀️/🌙/⚙️)
- Hardening de seguridad: XSS, canLogin, SHA-256, send-push auth
- Pre-commit hook — 7 checks automáticos en cada git commit
- Pipeline de deploy con gates obligatorios Lucas QA + Julián QA
- Campo `phone` en asesorado para WhatsApp directo
- WhatsApp reminder mejorado (monto + fecha + CTA urgente)
- Banner proactivo de vencimientos en Home (≤5 días)
- History limit 60 → 365 sesiones
- `delClient()` limpia todos los datos huérfanos (nutrition, medidas, photos)
- exportData() exporta las 10 colecciones
- 7 textos humanizados (Sofía): loading, sync-dot, toasts, push title, wizards
- Tokens CSS `--surface` y `--accent3` en los 3 bloques `:root`
- Touch targets ≥36px (WCAG 2.5.5)
- Experiencia primer día asesorado (Mayo 2026): badge login removido, hint de credenciales, estados vacíos accionables con CTA a mensajes, día de descanso con mensaje maduro, botón "Empezar" renombrado, pills de perfil con guard, mensaje fin de sesión orientado al progreso, typo Bíceps, warmup simplificado, onboarding Slide 1 recontextualizado, push delay 4s

### ✅ v1.3.1 — Notificaciones + Marca (Mayo 2026)
- Notificaciones diarias personalizadas: 7am / 10am / 5pm (Colombia UTC-5)
- Edge Function `daily-notifs` desplegada en Supabase — 3 cron jobs activos
- Mensajes según día de entreno (training_days) y turno por rutina (training_shift JSONB)
- 4 variantes del mensaje de 5pm: post-workout / pre-workout / noche / neutral
- Pool de 7 mensajes por franja, rotación por día de semana
- Formulario de rutina: campo "Horario habitual" (rf-shift) al lado de "Día asignado"
- Fix instalación PWA: instrucciones permanentes en login para iOS y Android
- Rebranding: emoji 💪 eliminado del wordmark, nuevo tagline en evaluación
- Agente Lucía Brand & Copy Strategist creado (.claude/agents/lucia-brand.md)
- Tagline actual: "Entrenamiento con tu coach, en tu bolsillo" (en revisión)
- Candidatos evaluados por Lucía: "Tu coach real, en tu celular" / "Entrena con quien sabe"

### ✅ v1.3.1 — Sesión 2026-05-24 (rutinas + fixes)
- Rutinas personalizadas creadas para 5 asesorados vía Python → Supabase directo
- Criterio de orden en rutinas: **Compuesto → Funcional → Aislamiento → Cardio** (regla permanente)
- Criterio de diseño: mujeres → glúteo+piernas primero; hombres → tren superior; menores 16 → sin carga axial
- 4 ejercicios nuevos: Remo Australiano (fb01), Swing Mancuerna (fb02), Thruster (fb03), PM Rumano Mancuernas (fb04)
- Fix: `capture="environment"` eliminado de `dob-photo-input` — asesorado ya puede elegir galería en onboarding
- agent-browser instalado globalmente (`~/.claude/agents/agent-browser.md`) + Chrome 149 en `~/.agent-browser/`
- Pipeline de rutinas reutilizable en `C:\Users\KRONOS\AppData\Local\Temp\crear_rutinas.py`

### ✅ v1.3.2 — Sesión 2026-05-25 (push notifications + rutinas + seguridad)

**Push notifications — causa raíz resuelta:**
- Blob URL SW no registra en Android Chrome moderno → `navigator.serviceWorker.ready` nunca resuelve → push falla
- Fix definitivo: `sw.js` ahora es archivo estático registrado como `/apex-app/sw.js` con scope `/apex-app/`
- `subscribePush` refactorizado para ser idempotente: `window._swReg || await navigator.serviceWorker.ready` → reusa suscripción existente sin `unsubscribe()`
- Botón "Reactivar push" en modal de notificaciones (cuando permiso ya fue concedido)
- `tryAutoLogin` llama `subscribePush` con delay 3s (coach) / 4s (cliente) — siempre con guard de permiso

**Rutinas — auditoría y corrección completa (8 asesorados):**
- 3 asesorados nuevos detectados: Astrid Beltran, Nataly, Cristian Calderon
- Formato roto `{exId, reps:"10-12"}` corregido en: Astrid (Jueves), Nataly (Ma/Ju/Vi), Cristian (todos)
- `reps` como string (`"12"`, `"1"`, `"20"`) corregido a number en Andrés Martínez y Astrid Beltran
- Fix `daily-notifs/index.ts` línea 235: icon path `/icons/icon-192.png` → `/apex-app/icons/icon-192.png`

**Seguridad (hardening sin refactor arquitectural):**
- XSS cerrado en 10 puntos: nutrición (coach+cliente), perfil, rutinas cliente, progreso ejercicios, notificaciones programadas, fotos
- `photo.src` validado como `data:image/...` antes de insertar en `<img>`
- Sesión con expiración: `expiresAt: now + 30 días` al hacer login; `tryAutoLogin` lo valida
- CORS `*` → `https://kronos-apex.github.io` en `send-push` y `daily-notifs`

### Asesorados actuales y sus rutinas (2026-05-25)
| Nombre | Sexo | Edad | Nivel | Días/sem | Objetivo | Rutinas | Push sub |
|---|---|---|---|---|---|---|---|
| Kathe Beltran | F | 28 | Principiante | 4 | Perder grasa | Lu/Ma/Ju/Vi | ❌ |
| Samuel Cifuentes | M | 14 | Principiante | 3 | Perder grasa | Full Body Lu/Mi/Vi — sin carga axial | ❌ |
| Miguel Pulido | M | 29 | Intermedio | 5 | Ganar músculo | Empuje Superior (Lu) / Pierna A (Ma) / Hombros+Brazos (Mi) / Jalar Superior (Ju) / Glúteo+Bisagra+Core (Vi) — ⚠️ rodilla derecha operada, sin impacto, RDL en progresión desde patrón | ❌ |
| Andrés Martínez | M | 37 | Avanzado | 5 | Ganar músculo | Pierna/Push/Pull/Hombros+Brazos/Cardio | ✅ |
| Natalia Martinez | F | 34 | Principiante | 3 | Recomposición | Lu/Mi/Vi | ❌ |
| Astrid Beltran | F | — | Principiante | 5 | — | 5 rutinas | ❌ |
| Nataly | F | — | — | 4 | — | Lu/Ma/Ju/Vi | ❌ |
| Cristian Calderon | M | — | — | 4 | — | Lu/Ma/Ju/Vi | ❌ |

**Regla de formato de ejercicios en rutinas (CRÍTICO):**
- Formato CORRECTO: `{id, icon, name, reps (number), sets, type, muscle}`
- Formato ROTO (no renderiza): `{exId, reps: "10-12", sets, muscle, restSec}` — si aparece, hay que corregirlo
- IDs válidos: `e1`–`e88` (defaultExercises en index.html) + `fb03`/`fb04` (en Supabase ax_e)

### ✅ v1.3.3 — Sesión 2026-05-28

**Fotos → Supabase Storage (commit f261e03):**
- Bucket `apex-photos` creado en Supabase (público, 5MB, jpeg/png/webp)
- RLS policies para anon: INSERT, SELECT, DELETE
- `uploadPhotoToStorage(clientId, photoId, base64)` → retorna URL pública
- `deletePhotoFromStorage(clientId, photoId)` → borra archivo al eliminar foto
- `migratePhotosToStorage()` → migra base64 existentes en background (3s post-arranque)
- `savePhoto()` y `_dobSavePhoto()` ahora suben a Storage con fallback a base64
- `renderPhotosClient()` y `viewPhoto()` aceptan `https://` además de `data:image/`
- `deletePhoto()` limpia archivo del bucket además del registro en `ax_photos`

**Cobros por Nequi (commit 076c85c):**
- `ax_nequi` en SB_KEYS — número Nequi del coach visible para todos los clientes
- Campo Nequi en ⚙️ Configuración del coach
- `renderPaymentCard(client)` — card automática al cliente cuando plan vence en ≤7 días
- `notifyPaid()` — push a `_coach` + mensaje en chat como historial
- `copyNequi(num)` — copia al portapapeles, fallback toast

**Identidad de marca (commits a485c78, d7aa7ae):**
- Tagline confirmado: **"Entrenamiento con nombre propio"** — loading screen y login
- Íconos PWA verificados: ya tienen la Letra de Hierro (A con barra de pesas dorada)
- `BRAND.md` creado — brief completo de marca: paleta, tipografía, logo, tono, reglas

### ✅ v1.4 — Self-serve, modalidades y rediseño (Mayo–Junio 2026)

**Modalidades de entrenamiento (commits 0e0b48f, fc66b83):**
- Campo `track` por ejercicio: `peso_reps` / `reps` / `tiempo` / `cardio` / `hiit`
- Arregla el bug histórico de pedir "kg" en cardio HIIT y peso corporal
- Timer HIIT (intervalos + pitido/vibración + Wake Lock) y cronómetro isométrico
- PRs y gráficas de progreso por modalidad con unidad propia (back-compat con datos viejos en kg)
- `migrateExTypes()` reclasifica 15 defaults a Bodyweight + e74 a HIIT, una sola vez

**Auto-generador de rutinas — Paso 1 self-serve (commit 98c418e):**
- `generarRutinas()` en `apex-core.js` (función pura, testeada) + botón ✨ "Generar semana"
- Splits por sexo+días, scheme por objetivo+nivel, exclusiones por limitación física y por entorno
- El coach SIEMPRE revisa/aprueba el borrador antes de asignar (innegociable por seguridad)
- Modelo self-serve de 2 niveles definido (libre gratis + coach pago) — NO se quita el coach

**Entornos y estilos de equipo (commits 631348b, 004ef6f, 2609e23):**
- Eje `env` independiente de `goal` y `tier`: corporal / casa / parque / gym
- `inferExerciseEnv()` propone entorno por nombre+tipo; generador y picker filtran por entorno
- Selector de estilo (preset entorno+metodología) + editor de env en la UI
- +13 ejercicios sin gym para llenar el hueco de peso corporal

**Gamificación (commits 1acb042, 832b73c):**
- Nivel permanente 1–5 que no se reinicia + logros
- Descuento del mes por adherencia (5/10/15%) — visible al asesorado y al coach (informativo, se aplica a mano)

**Rediseño Noir Esmeralda (commits varios, apex-v37):**
- Marca esmeralda `#10E0A0` + oro + casi-negro; login cinematográfico con video real
- Pantalla de carga con imagen, intro editorial de la semana, bienvenida personalizada
- Tarjetas de ejercicio estilo Nike con imágenes reales + lightbox al tocar
- Ícono ala esmeralda (Noir Esmeralda); el asesorado puede poner su propia foto de perfil
- Auditoría de imágenes de ejercicios (14 corregidas / 4 quitadas)

**UX para no técnicos (commits 79e9251, d2600ac, 3bcfd96):**
- Ayuda contextual ❓ re-accesible por sección; empty states accionables
- Progressive disclosure del perfil del asesorado (oculta tarjetas vacías)
- Vista de adherencia accionable en el coach ("necesitan un empujón")

**Robustez (commits d03b343, aa46da6, 0fccb0f):**
- Boot blindado contra `apex-core.js` viejo en caché (no cuelga el arranque)
- Bloqueo de escritura a la nube desde `file://` + anti-borrado de `ax_c`/`ax_e`
- apex-core.js cubierto por los checks de sintaxis/duplicados del audit
- Suite de tests: 41 → **56 tests** (incluye generador + entornos)

### ✅ Sesión 2026-06-01 — Integridad de datos, auditoría, marca AVI

**🔴 Blindaje de pérdida de datos (incidente real: se perdieron entrenos de Nataly y Andrés Martínez):**
- `mergeHistory` / `mergeClientArrays` / `mergePRs` en `apex-core.js`: `syncFromCloud` ya NO sobrescribe `ax_hist`/`ax_m`/`ax_bw`/`ax_med`/`ax_pr` — los FUSIONA nube+local (commits 95e91cc, 8e224b3). +14 tests → **72/72**.
- Cola de reintento `_pendingPush` + `flushPendingSync()` en `online`/`pagehide`/`visibilitychange` (un envío fallido por mala señal se reintenta solo). Sin keepalive (límite 64KB).
- Guardado PARCIAL: botón "Finalizar entrenamiento" (`finishSessionEarly`) guarda aunque no se marque el 100%. `saveSessionToHistory` reconstruye snapshot siempre.
- Calentamiento PERSISTE (`wu_{routineId}_{exId}` en localStorage; antes se borraba al re-render). Commit d403eb6.
- Tarjeta **"Entrenaron hoy"** con nombres en el dashboard del coach (commit 4a7a542).
- `MS.canLogin` ahora permite `pending` (asesorado nuevo entra → onboarding + tier libre).

**🔍 Auditoría de equipo completa → `docs/auditoria-2026-06-01.md`** (seguridad/DBA, deportivo, QA, CS, ing, diseño, PM). Backlog priorizado. Crítico abierto: **RLS permisivo** = toda la DB es pública con la key anon (no se arregla sin auth real; bloqueador del arrendamiento). Arreglados: login `pending` + mensaje honesto de lesiones genéricas (`parseLimitations.hasExclusions`).

**⚖️ + 🔐 Modo libre público (v2.0) — arrancado:**
- Decisión: abrir el modo libre a personas reales (no-coaches) con **login real Supabase Auth (Google + Email)**; usuario libre independiente que luego conecta coach. Ver [[memoria estrategia self-serve]].
- Borradores legales en `legal/` (Habeas Data Ley 1581 — pendiente abogado + datos del responsable; SIN push).
- Guía de config Google en `docs/setup-login-google.md` (clics de Camilo en Google Cloud + Supabase).
- Decisión técnica pendiente: supabase-js (CDN) vs OAuth a mano (rompe "sin dependencias").

**🏷️ RENOMBRE APEX → AVI (commit 83db4ae, apex-v44):** nombre visible cambiado en toda la app (login, carga, manifest, notificaciones, imágenes, WhatsApp, gamificación). **Internos INTACTOS** (`ax_*`, `apex_data`, `apex-core.js`, `#apex-loading`, caché `apex-vNN`, repo `apex-app`) — NO renombrar. AVI = iniciales de los hijos (Alexander/Valery/Isabella). Handle @avi.entrena. Dominios libres: avi.lat + holaavi.com (sin comprar aún). Pendiente: registro SIC. La PWA instalada conserva el nombre viejo hasta reinstalar (no es bug).

### ✅ Sesión 2026-06-02 — Fixes, personalización del generador y modo libre completo (apex-v44 → apex-v55)

**🐛 Fixes (commit ea21854):**
- Barra de retención mostraba entrenos fantasma: agrupaba por día de la semana (`getDay`) en ventana de 7 días → el mismo día de la semana pasada caía en "hoy". Ahora por día de calendario real.
- Auto-guardado PARCIAL automático desde la 1ª serie marcada (antes solo al 100% o con "Finalizar") — sync con debounce.
- Cronómetro de descanso por **timestamp absoluto** + recalcula en `visibilitychange` (iOS suspende `setInterval` con pantalla bloqueada → se congelaba). Límite iOS: no suena con pantalla bloqueada (necesita push nativo).

**🧪 Refactor testeable (commit 676329a):** lógica de fechas del dashboard extraída a `apex-core.js` (era inline sin tests). Regla: funciones de fecha reciben `now`, nunca `new Date()` implícito.

**📅 Orden de días (commit acf5fe9):** rutinas Lunes→Domingo (`sortRoutinesByDay`) + migración de arranque + ordena al crear/editar/generar.

**🌱 Fase de adaptación (commit 925c542) + ⚖️ composición IMC/cintura (commit e996e2f):** ver sección "Auto-generador". Decisión metodológica: full body para principiantes es correcto; lo que faltaba era el esquema de carga (adaptación) y personalizar por composición (dos personas con misma estatura pero 50 vs 85 kg ya NO reciben la misma rutina).

**🆓 Modo libre completo (commits c0bd44f, 229a813, ffaad0e, 73faee8, d102d44):** auto-registro público (`signupClient`) con rutina auto-generada al instante; invitación a Premium + `requestCoach` que LE LLEGA al coach (mensaje + poll de `ax_c`); gating Premium (`isFreeClient` + `premiumLockHTML`); `convertToPremium`; editar libre ofrece regenerar. Ver sección "Auto-registro y modo libre". **NOTA:** sigue escribiendo en `ax_c` compartido (RLS permisiva) — aislamiento multi-trainer real = v2.0.

**Tests:** 72 → **111/111**. Caché `apex-v55`. Pendiente verificación visual en navegador (bloqueada por RAM/pagefile de la PC de Camilo — ver memoria). Idea Premium aprobada (parked): valoración inicial completa del principiante.

**🔐 Seguridad — evaluación + plan Auth+RLS APROBADO (👉 ARRANCAR AQUÍ la próxima sesión):**
- **Hallazgo crítico:** `apex_data` y `push_subscriptions` tienen políticas RLS `USING(true)` → la key `anon` (en el `index.html` público) da **acceso TOTAL** a toda la base (confirmado por `get_advisors(security)`). El "login" es client-side; passwords SHA-256. **No se puede compartir el enlace a usuarios reales** sin esto. Consejo vigente: mantener AVI en **círculo cerrado** hasta tener auth.
- **Plan APROBADO** (archivo: `~/.claude/plans/quiet-hatching-teapot.md`; memoria: `project_avi_auth_rls_plan`). Decisiones del PO: **puente pragmático** (tabla `user_data` con fila por usuario, RLS `auth.uid()=user_id OR =coach_id`), **un coach (Camilo) + libres** ahora (multi-trainer después, dejar `coach_id` listo), usuarios actuales **re-crean clave vía enlace** (SHA-256 no migra). Usar **supabase-js por CDN**.
- **Fase 0 HECHA (2026-06-02):** eliminada tabla `apex_coaches` (vacía/sin uso) → -2 alertas; `apex_data_backups` verificada (RLS sin política = bloqueada, OK). Diferidos: mover `pg_net` (no expone datos; riesgo cron) y privatizar bucket `apex-photos` (solo 2 fotos; necesita código de URLs firmadas → hacerlo con la auth).
- **Próximo: Fase 1** — requiere clics de Camilo: habilitar Supabase Auth (Email+Google) + credenciales OAuth en Google Cloud (guía: `docs/setup-login-google.md`); luego cargar supabase-js + crear `user_data`+RLS. Fases 2-4: reescribir capa de datos a fila-por-usuario, migrar, quitar políticas `USING(true)`.

### ✅ v2.0 — Auth real + RLS (Junio 2026) — rama `feat/auth-rls`, cutover en curso
**El cambio más grande del proyecto.** AVI pasa de "todo en blobs globales públicos (`apex_data`, RLS `USING(true)`)" a **login real con Supabase Auth + datos aislados por usuario (RLS)**. Convive con el sistema legacy durante la transición (rollout gradual).

**Arquitectura nueva (coexiste con la legacy):**
- **supabase-js** por CDN (`<script defer>` en `<head>`) + wrapper inline **`AUTH`** (init lazy `sbAuthClient()`; signUpEmail/signInEmail/signInGoogle/sendMagicLink/resetPassword/getSession/onChange/signOut). El boot offline-first NO depende del CDN.
- Tabla **`user_data`** (Supabase): 1 fila por usuario — `user_id` (PK→auth.users), `coach_id`, `role` ('coach'|'client'), `profile/routines/history/prs/bodyweight/medidas/nutrition/photos/msgs` jsonb. **RLS por operación:** SELECT/UPDATE = `auth.uid()=user_id OR =coach_id`; INSERT = solo `user_id`; DELETE = solo propia.
- Capa **`UD`** (inline): `loadOwn/upsertOwn/createFromClient/loadCoachClients/updateClientRow` (RLS con el JWT).
- Helpers puros en `apex-core.js`: **`clientToRow`/`rowToClient`** (mapeo cliente↔fila; la contraseña NO viaja, la maneja Auth) + `USER_DATA_COLLECTIONS`. +7 tests de mapeo → **118 tests** (la lógica de UD/auth/coach es de runtime, no unit-test).
- **`AUTH_MODE`** (flag): true cuando se entró por Auth. En modo auth, `sbSet` y `pollMessages` son no-op (no tocan el blob global legacy) y `sv`/`svNow` enrutan a `user_data` (cliente→su fila vía `_persistAuthUser`; coach→fila del cliente que cambió vía `_persistCoachWrite` con diff `_coachSnap`). `AUTH_ROLE` distingue cliente/coach.
- **`doLogin` auth-primero con respaldo legacy:** intenta `AUTH.signInEmail`; si la cuenta no existe en Auth, cae al login legacy intacto (coach `coach@apex.com` + clientes con SHA-256 en `ax_c`). Boot entra en modo auth si hay sesión Supabase. Helpers: `_enterAuthSession`/`_enterCoachAuth`/`_provisionFreeClient`/`_applyAuthClientDB`/`_profileFromMeta`.
- Registro libre (`signupClient`) → `AUTH.signUpEmail` (perfil en metadata) → provisiona rutina + fila. **Confirmación de correo DESACTIVADA** (temporal, para pruebas; reactivar con SMTP propio antes del público).

**Identidades:** coach real = `camilo06197@gmail.com` (role coach). Los **7 asesorados reales migrados** del blob global → `auth.users`+`auth.identities`+fila `user_data` (coach_id=Camilo), emails placeholder `@apex.com`, claves temporales (Camilo las reparte). `apex_data` se conserva INTACTO como respaldo.

**Crear usuarios por SQL (sin service_role):** insert en `auth.users` (instance_id `0…`, aud/role 'authenticated', `encrypted_password=crypt(pass,gen_salt('bf'))`, raw_app/user_meta_data) **+ `auth.identities`** (provider 'email', provider_id=uid::text) **+ columnas de token a `''` NO NULL** (confirmation_token/recovery_token/email_change*/phone_change*/reauthentication_token — su NULL ROMPE el login). Confirmar cuenta = `email_confirmed_at=now()`.

**Estado del cutover (2026-06-03): ✅ PUBLICADO a producción** (main, GitHub Pages, **SW apex-v63**). Auth real corriendo con respaldo legacy (auth-primero → si la cuenta no existe en Auth, cae al login viejo; nadie se bloquea). Verificado en celular: login viejo y nuevo conviven.

**Migración:** **6 asesorados reales** (Kathe, Samuel, Miguel, Natalia, Astrid, Nataly) en `auth.users`+`user_data` (coach_id = Camilo `camilo06197@gmail.com`). **OJO:** `andres@apex.com` ("Andres Martínez") **era Camilo** → su data se copió a la fila del coach (su "Mi entrenamiento") y la cuenta se ELIMINÓ. `apex_data` legacy INTACTO como respaldo.

**Features desplegadas post-cutover (apex-v56→v63):** quitado logo viejo "A" (solo wordmark AVI) · verdes unificados a esmeralda (`--g/--g2/--gl/--gt`=esmeralda oscuro, acento `#10E0A0`) · fix botón ☰ invisible en claro · 👁 ver-contraseña (login/registro/coach, `togglePass`) · **Login con Google** (`loginWithGoogle`/`AUTH.signInGoogle`) en login y registro · **Conectar Google** a cuenta existente (`linkGoogle`/`linkIdentity`; **"Manual linking" YA habilitado** vía Management API; VERIFICADO sin pérdida de datos) · fix UX: signups por Google preguntan perfil (`showProfileSetup`/`needsProfile`) antes de generar · **"Mi entrenamiento" del coach** (`openMyTraining`/`backToCoachPanel`/`COACH_SELF`; botón "← Panel" en la cntopbar).

**✅ FASE 4 COMPLETADA (2026-06-03, sesión 2) — candados cerrados:**
- **RLS:** eliminadas las 4 políticas `USING(true)` de `apex_data` (`apex_access`, `apex_open`) y `push_subscriptions` (`apex_access`, `push_access`). `apex_data`/`apex_data_backups` quedan con RLS ON sin política = **bloqueadas a anon** (el blob legacy se conserva INTACTO como respaldo, solo deja de ser legible). **La fuga crítica (anon leía toda la DB) está CERRADA.**
- **push_subscriptions:** NO se cerró del todo — `subscribePush` hace upsert con la key anon, cerrarla rompería el registro de dispositivos nuevos. Quedó con política **solo-escritura** (`push_write_insert` + `push_write_update`, sin SELECT/DELETE) → anon ya no puede enumerar tokens/clientes, pero sigue registrando. Envío de push sigue por service_role (Edge Functions). Advisor lo marca WARN (permissive write) — **tradeoff aceptado**; follow-up: mover push a cliente autenticado (RLS `client_id=auth.uid()`).
- **doLogin:** respaldo legacy ELIMINADO (líneas ~2533-2598). Login = SOLO Supabase Auth. Si supabase-js (CDN) no cargó → mensaje "No se pudo conectar" (no "contraseña incorrecta"). `verifyClientPass`/`verifyCoachPass`/`getCoachEmail` siguen definidas (las usa ⚙️ Configuración del coach) pero ya no se llaman en login.
- **Migración de datos blindada antes de cerrar:** se verificó cliente por cliente que `user_data` ≥ legacy (Miguel/Samuel tenían MÁS en auth; Astrid idéntica; Camilo conserva las 6 sesiones de "Andres Martínez"). **Nataly reconciliada** (su sesión 03-jun se guardó parcial 15:36 en user_data y final 17:38 en legacy → `mergeHistory`/`mergePRs` = versión legacy, superconjunto; fijada en su fila). Cero pérdida.
- **Astrid y Nataly** (no habían entrado al sistema nuevo): claves Auth reseteadas a valores conocidos — **Astrid → `Astrid2026`**, **Nataly → `Nataly2026`** (su email `@apex.com` es placeholder sin bandeja, así que el reset por enlace no les llega; Camilo les pasa la clave). ⚠️ Su PWA sigue en sesión legacy (auto-login desde caché) hasta que **cierren sesión y entren por Auth** — mientras tanto NO sincroniza. Camilo debe avisarles.
- **Cuentas de prueba BORRADAS** (auth.users + identities + user_data): `valery@avi.com`, `nuevo@avi.com`, `andres@avi.com`, `pavedwings38@gmail.com`, `stevang1204@gmail.com`. Quedan solo 7 reales: Camilo (coach) + 6 asesorados.
- **`COACH_UID` de Camilo (coach real) = `0a6484ed-42af-449d-9903-e440ac683ecf`** (útil para el cabo de `requestCoach`).
- Advisor final: crítico cerrado. Quedan WARN menores: 2× push write (tradeoff), `pg_net` en public (diferido), leaked-password-protection off (toggle Auth). INFO: apex_data/backups RLS sin política (= deseado).

**👉 RETOMAR MAÑANA (2026-06-04):** el plan Auth+RLS quedó TERMINADO; no hay nada urgente de código. Orden sugerido al arrancar:
1. **Chequear si Astrid y Nataly ya entraron** al sistema nuevo: `select email,last_sign_in_at from auth.users where email in ('astrid@apex.com','nataly@apex.com')`. Si su `last_sign_in_at` sigue null, recordarle a Camilo que les pase la clave (`Astrid2026`/`Nataly2026`) y que cierren sesión + entren por Auth (su PWA sigue en legacy sin sincronizar hasta entonces).
2. **Camino "abrir al público"** (lo único que falta del plan): conectar SMTP propio en Supabase + reactivar "Confirm email" (hoy OFF) + (opcional) borrar cuentas de prueba que reaparezcan.
3. **Camino "pulir auth"** (cabos menores, sin bloquear): mover push a cliente autenticado (cierra los 2 WARN de `push_subscriptions`); `requestCoach` que setee `coach_id` (ya hay `COACH_UID=0a6484ed-…`); chat en vivo (realtime/poll sobre user_data) en modo auth; ajustes nivel-coach (`ax_e`/`ax_tpl`) aún globales; cola de reintento de upserts; CSS muerto `.apex-logo`.

Plan completo: `~/.claude/plans/quiet-hatching-teapot.md` · memoria: `project_avi_auth_rls_plan`.

### 🎯 v1.5 — Próxima iteración
- [ ] Pasos diarios: meta por asesorado, registro manual, recordatorio de caminar, gráfica semanal
- [ ] Stripe / Mercado Pago — cobro automático (Nequi es el parche actual)
- [ ] `startedAt` / `completedAt` en sesiones de historial
- [ ] `payment.planType` para MRR segmentado por plan
- [ ] Widget MRR proyectado en Home
- [ ] Análisis de cohortes de retención (Mateo — requiere ≥10 asesorados)
- [ ] Footer de versión visible (`index.html` línea ~920) sigue en `v1.3.1 · May 2026` — actualizar al deployar
- [ ] **🔐 Auth real + RLS (plan APROBADO, Fase 0 hecha):** el RLS permisivo (DB pública a `anon`) es el bloqueador #1 para compartir AVI. Plan completo arriba en "Sesión 2026-06-02" + `~/.claude/plans/quiet-hatching-teapot.md`. Próximo: Fase 1 (Supabase Auth Email+Google + tabla `user_data`)

### 🚀 v2.0 — Escala
- [ ] Multi-coach (cada coach con sus asesorados aislados)
- [ ] White-label — vender APEX a otros coaches
- [ ] API pública para integraciones
- [ ] iOS nativa

---

## 🎓 EQUIPO

### 🛠️ Técnico
- **Camila** (Engineer) → cambios JS/HTML quirúrgicos
- **Diego R.** (UX/UI) → CSS, tokens, implementación visual
- **Isabella** (Design Strategist) → dirección visual, audit de experiencia — propone, no implementa
- **Andrés Q.** (DBA) → Supabase, SQL, Edge Functions
- **Julián** (QA) → audit estático: sintaxis, IDs, duplicados, SB_KEYS, secrets
- **Lucas** (QA Funcional) → flujos reales, visibilidad DOM, edge cases UX

### 📈 Producto
- **Valentina** (PM) → roadmap, priorización, specs

### 💪 Deportivo
- **Laura** → fisioterapeuta deportiva — audita seguridad en asesorados con lesiones o limitaciones físicas; su veredicto es vinculante antes de cualquier otro agente deportivo
- **Coach Pro / Diego R.** → validación fisiológica de rutinas y ejercicios
- **Valery** → especialista en transformación corporal femenina — valida todo lo relacionado con asesoradas mujeres
- **Andrés (Hyp)** → coach jefe de hipertrofia y nutrición deportiva — el único que aprueba macros, bulk/cut/recomp, periodización avanzada, suplementación y planes nutricionales

### 💬 Negocio
- **Sofía** (CS) → fricción del usuario, onboarding, mensajes
- **Camilo** (Growth) → precios, adquisición, retención, MRR
- **Mateo** (Data) → métricas, cohortes — mínimo 10 asesorados activos

Agentes en `.claude/agents/`. Skills en `.claude/skills/`.

### Skills del proyecto
- `apex-audit` — auditoría estática completa (7 checks)
- `apex-deploy` — pipeline QA → commit → push → CLAUDE.md
- `apex-feature` — pipeline completo de feature nueva
- `apex-generate` — genera rutina + nutrición para un asesorado leyendo su perfil desde Supabase; orquesta el equipo correcto automáticamente según sexo, objetivo, nivel y limitaciones físicas

---

*Última actualización: 2026-06-03 (sesión 2, cierre) · Marca: **AVI** · **v2.0 (auth real + RLS, EN PRODUCCIÓN — Fase 4 COMPLETA)** · **apex-v64** · Suite **118/118** verde · 7 cuentas reales (coach camilo06197@gmail.com + 6 asesorados) · Tagline: "Entrenamiento con nombre propio" · PO: Camilo Andrés*
*Hitos sesión 2026-06-03 #2: 🔒 FASE 4 — candados RLS cerrados (eliminadas las 4 políticas `USING(true)` de apex_data + push_subscriptions; fuga crítica anon resuelta) · respaldo legacy de `doLogin` eliminado (login = SOLO Supabase Auth) · migración blindada verificada cliente por cliente + Nataly reconciliada (cero pérdida) · Astrid/Nataly con claves Auth nuevas (`Astrid2026`/`Nataly2026`, Camilo las reparte) · 5 cuentas de prueba borradas · push_subscriptions solo-escritura (tradeoff para no romper registro) · COACH_UID = 0a6484ed-… · caché apex-v63→v64*
