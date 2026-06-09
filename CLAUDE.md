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
2. **Camino "abrir al público"** ✅ **HECHO (2026-06-04):** SMTP Brevo conectado + "Confirm email" ACTIVADO + plantillas en español. Registro público DESBLOQUEADO (ver sesión 2026-06-04 abajo).
3. **Camino "pulir auth"** (cabos menores, sin bloquear): mover push a cliente autenticado (cierra los 2 WARN de `push_subscriptions`); `requestCoach` que setee `coach_id` (ya hay `COACH_UID=0a6484ed-…`); chat en vivo (realtime/poll sobre user_data) en modo auth; ajustes nivel-coach (`ax_e`/`ax_tpl`) aún globales; cola de reintento de upserts; CSS muerto `.apex-logo`.

Plan completo: `~/.claude/plans/quiet-hatching-teapot.md` · memoria: `project_avi_auth_rls_plan`.

### ✅ Sesión 2026-06-04 — SMTP propio + Confirm email + plantillas en español (registro público DESBLOQUEADO)

**Lo único que faltaba del plan Auth+RLS para abrir al público quedó hecho.** Todo es **configuración de Supabase Auth** (server-side, vía Management API con PAT temporal ya revocado) — **NO hubo cambios de código** en el repo; `index.html` ya manejaba el flujo de confirmación.

**SMTP — proveedor Brevo** (gratis, no requiere dominio; verificación de remitente único):
- Config en Supabase auth (`PATCH /v1/projects/eoebhrxbokyllqalyecj/config/auth`): `smtp_host=smtp-relay.brevo.com`, `smtp_port="587"` (⚠️ **STRING**, no number — la API rechaza el número con "Expected string"), `smtp_user=ad8dd7001@smtp-brevo.com`, `smtp_admin_email=aviapptraining2020@gmail.com` (remitente del rebrand AVI, **verificado** en Brevo), `smtp_sender_name=AVI`, `rate_limit_email_sent=30`/h (era 2 — el SMTP de prueba con 2/h era el bloqueador original).
- ⚠️ **Un PATCH parcial de campos `smtp_*` BORRA el bloque SMTP completo** → reenviar SIEMPRE todo el bloque (incluido `smtp_pass`).
- Tropezones resueltos (en orden): (1) Brevo bloqueaba por **"IPs autorizadas"** (error SMTP `525 5.7.1 Unauthorized IP address`) → Camilo apagó el filtro en `app.brevo.com/security/authorised_ips` ("Desactivar para claves SMTP"). (2) **Remitente no verificado** (error Brevo "sender is not valid") → verificar el sender en `app.brevo.com/senders/list` (clic en el enlace que Brevo manda a esa bandeja). **NO era DMARC** (gmail.com usa `p=none`, sí entrega una vez verificado el remitente).
- Verificado **end-to-end**: el magic link de Supabase llegó a `aviapptraining2020@gmail.com`.

**Confirm email ACTIVADO** (`mailer_autoconfirm=false`). La app ya lo soporta: `signupClient` (index.html ~L3934-3941) — si `signUp` no devuelve sesión, muestra toast "📧 Te enviamos un correo para confirmar tu cuenta" y provisiona la rutina en el 1er login. **Sin cambio de código.**

**Plantillas de correo en español + branding AVI** (4: confirmación, magic link, recuperar contraseña, cambio de correo) vía `mailer_subjects_*` + `mailer_templates_*_content`. Diseño: logo **AVI** + lema oficial **"Entrenamiento con nombre propio"** debajo + botón esmeralda `#10E0A0` + cierre cálido **"Tu entrenamiento, contigo. 💚"** (combinación elegida por el PO).

**Nota:** los 6 asesorados con email `@apex.com` (placeholder falso) ya están confirmados → el confirm-email nuevo NO les afecta, pero NO pueden recibir reset por correo (Camilo gestiona sus claves a mano). **Técnica útil documentada:** capturar la pantalla de Camilo con `powershell.exe` + `System.Drawing.CopyFromScreen` (vía Bash→powershell.exe; el tool PowerShell directo dio "not available") para leer su panel de Brevo en vivo.

### 🔍 Auditoría profunda pre-lanzamiento (2026-06-04) — VEREDICTO: 🟢 APTA para abrir a más personas
Área por área, sin huecos que bloqueen el lanzamiento. (1) **Estático:** 7/7 checks + 118/118 tests. (2) **Backend:** 7 usuarios bien formados, 6 clientes→Camilo, 0 fugas de password en jsonb, 0 huérfanos, respaldo legacy intacto. (3) **Infra:** cron 7/10/17h + backup semanal activos, CORS de las 2 Edge Functions restringido a kronos-apex.github.io; **borrada la Edge Function huérfana `dynamic-responder`** (ejemplo "Hello {name}" de Supabase que quedó en prod). (4) **Seguridad código:** XSS cubierto (grep de interpolación de campos de usuario sin `esc()` = vacío; chat/nombre/notas pasan por `esc`), 0 secretos hardcodeados (solo key anon, acotada por RLS). (5) **Release:** SW apex-v64 y footer v2.0 sincronizados, sin deuda TODO/FIXME real. (6) **Auth/RLS:** aislamiento por usuario verificado, confirm-email enforced, 0 alertas de rendimiento.

**📋 AGENDADO — fix push a autenticado (cierra 2 WARN `rls_policy_always_true` de `push_subscriptions`).** Hoy `push_subscriptions` es escribible por anon (INSERT/UPDATE con `true`) → anon puede insertar/sobrescribir (no leer/borrar); ya acumuló **36 filas** para 7 usuarios (suscripciones viejas). **Alcance del fix:** (a) `subscribePush(clientId)` en index.html hace upsert con key anon → cambiarlo a usar el cliente Supabase autenticado (JWT de la sesión `AUTH`); (b) migración: añadir columna dueño ligada a `auth.uid()` + reemplazar políticas `push_write_insert`/`push_write_update` por RLS `client_id = auth.uid()` (INSERT/UPDATE/SELECT/DELETE propias); (c) limpiar las 36 filas viejas; (d) `send-push` (service_role) NO se afecta. **Riesgo:** no romper el registro de push de dispositivos existentes durante el cambio (hoy la tabla se keyea por clientId legacy, no por uid) → migrar/mapear con cuidado. Relacionado: cabos menores abajo.

### ✅ Sesión 2026-06-05 — Fotos de marca AVI en el wizard (DESPLEGADO el 2026-06-07, apex-v65)
**Contexto:** el wizard de onboarding premium (7 pasos, modo libre, módulo `WZ`, IDs `su-*` ocultos) ya estaba implementado en `index.html` pero **sin commitear** desde una sesión previa (+420/−61 líneas). Esta sesión añadió **fotografía de marca** a las pantallas grandes.

**Hecho:**
- Camilo generó 12 imágenes (ChatGPT/Gemini) en `Desktop/IMAGENES AVI`. Elegidas 4 (las de Gemini, las que clavan el ADN Noir Esmeralda). Las de torso desnudo/tono cálido → para **redes**, no para el wizard.
- Grade Noir Esmeralda + optimización con **ffmpeg** → `media/brand/`: `hero.jpg` (iij4u, trae logo AVI dorado), `reveal.jpg` (m0wvpb, de pie+glow), `ob-1.jpg` (5kovd, manos/barra, recorte 2:1), `ob-3.jpg` (o3hkpa, sentado+neón, recorte 2:1). **316 KB las 4** (fuentes pesaban ~28 MB; 1536×2752 c/u).
  - Grade usado: `eq=contrast=1.07:saturation=0.95,curves=master='0/0 0.25/0.19 0.5/0.5 0.85/0.88 1/1',colorbalance=bs=0.05:gs=0.02:bm=-0.02,noise=alls=4:allf=t+u` (versión `_GOLD` más suave para el hero, para no apagar el oro).
- **4 ediciones quirúrgicas en `index.html`** usando los hooks que ya existían: (1) `<video class="cin-vid">` ahora con `poster="media/brand/hero.jpg"`; (2) `showPlanReveal` cae por defecto a `media/brand/reveal.jpg` (`window.AVI_REVEAL_PHOTO` sigue como override); (3) ob-photo slide 1 → `has-img` + `--img:url('media/brand/ob-1.jpg')`; (4) ob-photo slide 3 → `has-img` + `--img:url('media/brand/ob-3.jpg')`. **Slide 2 ("Registra tu peso") se dejó con su ícono dorado a propósito** (variedad + acento oro).
- Verificado visualmente: los 4 assets + composite del Reveal con texto encima (legibilidad perfecta sobre el espacio negativo superior).

**Pendiente al retomar:**
- [ ] **Commitear** `media/brand/*` + `index.html` (sugerido: `feat(brand): fotos AVI en hero/reveal/onboarding`). OJO: el commit arrastra también el **wizard de 7 pasos** sin commitear de la sesión previa.
- [ ] **Captura real en navegador** quedó BLOQUEADA por RAM (322 procesos de Chrome, ~108 MB libres; el agente NO tocó el Chrome del usuario). Re-correr cuando libere memoria; mock fiel en `_preview-fotos.html` (untracked, **NO commitear**).
- [ ] QA Lucas (funcional) + Julián (estático) antes de deploy.
- [ ] **SW**: cache-first runtime sin lista de precache → las imágenes se cachean solas; solo **bump `apex-v64`→`apex-v65`** al deployar.
- [ ] Opcional: limpiar la marca **✦** del generador (esquina inf-der de las 4 fotos; el scrim casi la tapa).
- [ ] Footer de versión visible sigue en `v1.3.1 · May 2026` (pendiente histórico).
- Untracked que NO entran al commit de fotos: `_preview-fotos.html`, `scripts/demo/`.

### ✅ Sesión 2026-06-07 — Mega-sesión: wizard+fotos a prod, fix Google, rediseño interior dark, BUG coach, 109 fichas premium (apex-v65 → v79)
> ⚠️ **Nota de ruta:** la carpeta del repo en el Desktop se renombró `apex` → **`AVI`**. Ruta local ahora `C:\Users\KRONOS\Desktop\AVI\apex-app`.

**Todo desplegado a producción.** Lo de la sesión 06-05 (wizard 7 pasos + fotos de marca) por fin se commiteó/desplegó, más mucho trabajo nuevo:

1. **Wizard + fotos de marca DESPLEGADOS** (apex-v65, `4929a0f`): onboarding premium (módulo `WZ`, reveal del plan, 17 íconos SVG propios, 4 fotos `media/brand/`) a producción.
2. **🐛 Fix registro con Google** (apex-v66, `86f5039`): el paso 7 con Google redirigía y perdía las respuestas del wizard → caía al formulario viejo. Fix: `wzGoogle()` guarda los `su-*` en `localStorage['ax_wz_pending']` antes de redirigir; `_pendingWizard()`+`_profileFromMeta` los recuperan al volver → genera semana → reveal nuevo (caduca 30 min).
3. **📸 Primeras 10 fotos de ejercicio AVI** (apex-v67, `f645441`): Gemini (modelo propio ♂/♀, físico natural) + grade Noir Esmeralda + recorte 720² + delogo ✦ → `media/exercises/`. Reasignación: e85 (aperturas polea ALTA) ≠ e3; e71 cambiada luego a variante de mancuernas inequívoca.
4. **🎨 Rediseño interior DARK** (apex-v68→v71, +v79). **Causa raíz: el interior estaba en tema CLARO por defecto** (solo oscuro si el celular lo estaba) → chocaba con el onboarding oscuro. (a) tema dark Noir por DEFECTO (`initTheme` `'auto'`→`'dark'`); (b) hero "Hoy" Aurora + eyebrow Anton dorado; (c) foto del ejercicio en cada tarjeta (`.cex-thumb`); (d) detalle de ejercicio con foto full-bleed + scrim; (e) callouts/tintes coherentes en dark (override `--yll/--bll/--orl/--rdl` + browns hardcodeados → vars). **Lección:** texto sobre las fotos de ejercicio (siempre oscuras) va blanco fijo, no `var(--t1)` (fix modo claro del título, v79).
5. **🔴→✅ BUG CRÍTICO: solicitudes de coach invisibles** (apex-v72/v73, `57c456d`/`fc06484`). Un usuario libre se creaba con `coach_id=NULL` → el coach (RLS select `coach_id=auth.uid()`) NUNCA veía la solicitud ni los mensajes (lo de la sesión 06-02 "le llega vía ax_c compartido" dejó de servir al cerrar el RLS en Fase 4). **Lead real perdido: Cristhian Calderón, 6-jun.** Fix: `requestCoach()` y `_provisionFreeClient` asignan `coach_id=COACH_UID`. **Decisión de Camilo: TODOS los self-reg entran al pipeline del coach** (ve cada registro con tag 🆓 Libre / 🙋 Quiere coach). Backfill SQL de los existentes. `COACH_UID=0a6484ed-…ecf`.
6. **📝 LAS 109 FICHAS DE EJERCICIO a estándar premium** (apex-v74→v78): nombre específico + descripción que NOMBRA el músculo trabajado (cabeza/zona enfatizada) + criterio, en versión técnica (coach) y simple (asesorado). Patrón: reescribir solo las flacas, dejar intactas las ya buenas (mucho del catálogo ya estaba bien); cardio no lleva "músculo". 118/118 tests en cada deploy.

**Fotos de ejercicio — flujo DEFINITIVO (Camilo decidió):** **GEMINI hace TODO el look** (oscuro Noir + verde + logo AVI impreso en la tela — lo integra mejor que cualquier post). Claude **no** puede generar personas ni debe estampar el logo (se ve plano/artificial; Camilo lo rechazó). Claude SOLO quita la ✦ + resize 720². Guía completa en `Desktop/AVI/PROMPTS-EJERCICIOS-BIBLIOTECA.md` (Paso 1 = bloque+foto **una vez**; Paso 2 = **solo la línea** del ejercicio). Skills de IA para el logo (RunComfy) descartadas por ser de pago.

**Pendiente al retomar:**
- [ ] Generar las **~99 fotos de ejercicio restantes** en Gemini (con la guía nueva) → Claude las procesa (✦ + 720²) e integra por lotes a `media/exercises/`.
- [ ] Fotos correctas aún faltantes: **e27** (jalón agarre neutro — Gemini no dibuja el maneral), **e86** (aperturas polea baja), **e3** (aperturas con cable genérica).
- [ ] Opcional: nav inferior de emojis (`.ctico`) → íconos SVG propios.

### ✅ Sesión 2026-06-07 (cont.) — Fotos lote 2, fix mapeo, Nota del coach (109/109), descripciones (apex-v80 → v84)
> Ruta del repo: `C:\Users\KRONOS\Desktop\AVI\apex-app`. Carpeta de fotos que dejó Camilo esta sesión: **`Desktop/IMAGENES EJERCICIO AVI`** (distinta a la documentada `fotos-nuevas`).

1. **📸 23 fotos de ejercicio — lote 2** (apex-v80, `fa5fb06`): 22 reemplazos (e4,e5,e8,e9,e11,e14,e16,e19,e21,e22,e27,e28,e30,e38,e53,e54,e55,e57,e79,e84,e98,e99) + **e97 Pike Push-up**. ⭐ e97 YA EXISTÍA en el catálogo pero **faltaba en `EX_IMG_NAME`** → sin esa entrada `exImgSrc` no resuelve la foto aunque exista el archivo. **e27 (jalón neutro) ya quedó con foto** (sale de la lista de pendientes).
2. **🔧 Fix e9 + recortes que comían la técnica** (apex-v81, `ef16be0`): `e9` mostraba MANCUERNAS en vez de barra — el archivo fuente venía **mal nombrado por Gemini**; corregido con la imagen de barra real. Las 4 fuentes **verticales** (e14,e16,e21,e38) se recortaban al cuadrado y perdían pies/manos (a un calf raise le comía los talones). **`scripts/process-photos.sh` endurecido:** detecta orientación y, si NO es cuadrada, hace **fit completo + relleno de fondo desenfocado** (no recorta el sujeto). **Lección (memoria `feedback-avi-imagenes-verificar-contenido`): MIRAR el contenido de cada imagen, no confiar en el nombre del archivo.**
3. **⭐ NUEVA FEATURE — "Nota del coach" por ejercicio** (apex-v82 lote 1 `fc5761f` → apex-v83 completo `a338303`): callout esmeralda en el detalle del ejercicio, **visible para el asesorado**, con un cue profesional corto por movimiento (técnica/excéntrico/seguridad). Mecánica = mapa estático **`EX_COACHTIP`** (junto a `EX_IMG_NAME`), resuelto por id al renderizar (`ex.coachTip || EX_COACHTIP[id]` en `_showExSheet`) — **sin migración ni sync, retro-compatible** (mismo patrón que las imágenes). UI: sección `#exd-coachtip-wrap` + CSS `.exdetail-coachtip`/`.ctip-*`. **109/109 ejercicios cubiertos.**
4. **📝 22 descripciones enriquecidas** (apex-v84, `510805b`): mejoradas las `descSimple` más cortas (<140c) con setup + cue de error/seguridad. **Criterio honesto:** 87 de 109 ya eran sólidas → NO reescritura ciega (sería churn arriesgado); se mejoró solo lo flaco.

**Pendiente al retomar:**
- [ ] Seguir generando las **fotos de ejercicio restantes** en Gemini (33/109 con foto real). Aún sin foto correcta: **e86** (aperturas polea baja), **e3** (aperturas con cable genérica). Camilo sigue revisando → pueden salir más mismatches de contenido.
- [ ] Opcional: reforzar descripciones puntuales que Camilo marque (las 22 cortas ya están; las 87 buenas se dejaron).

### ✅ Sesión 2026-06-08 — Onboarding full-bleed + fotos AVI con logo + limpieza Nota del coach (apex-v85)
> Ruta del repo: `C:\Users\KRONOS\Desktop\AVI\apex-app`.

1. **🧹 Eliminada la "Nota del coach" DUPLICADA en el detalle de ejercicio** (`510805b`…): el detalle mostraba DOS cajas de nota — la nueva esmeralda `EX_COACHTIP` ("Nota del coach", visible al asesorado) **y** la vieja gris "Notas técnicas (coach)" (`#exd-tech-wrap`, mostraba `ex.desc`, solo-coach). Camilo pidió dejar solo la esmeralda. Quitado el bloque HTML `#exd-tech-wrap` + su JS en `_showExSheet`. El coach ya no ve la descripción técnica larga en el detalle (queda el cue esmeralda). `ex.desc` sigue como dato y como fallback de `descSimple`.
2. **🎨 Onboarding intro (`#onboarding`, primer uso) rediseñado a FULL-BLEED inmersivo.** Causa: las fotos vivían en una cajita de 188px (tirita) → poco impacto. Ahora cada slide = **foto de marca a pantalla completa** (cover) + degradado inferior + texto (eyebrow/título 30px/cuerpo) anclado abajo en `.ob-copy` + dots y botones flotando encima. Mecánica del slider intacta (`translateX`, `obGoTo/obNext`). Slide 2 pasó de ícono dorado a foto.
3. **📸 3 fotos de marca AVI con logo en la camiseta** (`media/brand/ob-1/2/3.jpg`), **1536×2752 nativo**, ~220–248 KB c/u, grade Noir Esmeralda + ✦ eliminado (delogo). Flujo: re-cortadas de los originales verticales Gemini (1536×2752, mucho mejor que el recorte 2:1 viejo) → **Camilo regeneró en Gemini con el logo AVI horneado en la tela** (NO estampado por Claude — sigue la regla [[feedback-avi-imagenes-verificar-contenido]] de que Gemini hace el logo) → Claude solo delogo+grade+nativo. ob-1=peso muerto (13uqux, AVI arriba), ob-2=de pie (euuvec, AVI grande), ob-3=sentado (aehg39, AVI). Originales con logo archivados en `Desktop/IMAGENES AVI/AVI_logo_*.png`. Descartadas: pose "modo bestia" (xt5odg) y la de barra "plasma" sci-fi (8jovz2) por romper el tono premium / vibe Gravl.

**Pendiente al retomar:**
- [ ] Aplicar el estilo full-bleed a más **momentos** (NO pantallas de uso diario, se diluye): top picks = **Fin de entrenamiento 🏆** + **upsell Premium/"Quiero un coach" ⭐** + descanso entre series + subir de nivel. Idea aprobada en concepto; falta implementar.
- [ ] Variedad de sujetos: meter **atleta mujer** en esas pantallas (Camilo genera en Gemini, Claude procesa).
- [ ] Footer de versión visible sigue en `v1.3.1 · May 2026` (histórico).

### ✅ Sesión 2026-06-08 (cont.) — Fin de entrenamiento full-bleed 🏆 (apex-v86)
**Primer "momento" full-bleed fuera del onboarding** (ver principio: el estilo se reserva para picos emocionales, no uso diario). Overlay `#workout-finish` (z-900) que salta al completar el **100%** de una rutina: foto de marca a pantalla completa + scrim + 🏆 + "¡Lo lograste, {nombre}!" + chips de resumen (**series · volumen · récords**) + PRs nuevos (máx 3 + "+N más") + confetti + botón "Continuar".
- **Disparo:** `showWorkoutFinish(routine,{done,total,totalVol,newPRs})` reemplaza al banner inline `#congrats` en los DOS puntos de completado: `updateClientProgress` (marcado normal) y `checkAndShowCongrats` (modo guiado). Guard `_wfShownFor=routineId|día` evita re-pop al re-marcar la última serie.
- **Foto:** `WF_DEFAULT_PHOTO='media/brand/ob-2.jpg'` (de momento reusa la de pie del onboarding) con override `window.AVI_FINISH_PHOTO`. **Pendiente:** foto de VICTORIA dedicada (Gemini, atleta triunfante NO posando, camiseta AVI) → swap de 1 línea por escasez/variedad.
- **Dead code inerte (a propósito, sin riesgo):** `#congrats` (banner viejo) + `showPRCelebration` quedan definidos pero ya no se muestran; las llamadas `congrats.classList.add('hide')` son no-ops.
- 118/118 tests + audit 8/8.

### ✅ Sesión 2026-06-08 (cont. 2) — Cierre con datos + "¿Cómo te sentiste?" para el coach (apex-v87)
Sobre la pantalla "Fin de entrenamiento" (benchmark: captura real de Gravl "Detalles del entrenamiento" en `Downloads/_avi_review_extract/` — muestra Fecha, Duración, Energía/Kcal, Volumen, Récords, Músculos, Ejercicios + estrellas "¿Cómo fue tu entrenamiento?").
1. **Datos nuevos en el cierre:** ⏱️ **Duración** (desde la 1ª serie, `startedAt` en la entrada de historial) + 🔥 **Calorías aprox.** (MET 5.5 × peso × horas; fallback 70 kg) + 📅 **Fecha** (locale es-CO). Se persisten en la sesión (`startedAt`/`durationSec`/`kcal`). Chips 2×2: Duración · Calorías · Series · Volumen. Helper `fmtDuration`.
2. **⭐ FOSO vs Gravl — "¿Cómo te sentiste hoy?"** 5 caritas (😫😕😐🙂😄 = `feeling` 1-5) en el cierre → se guarda en la sesión + sincroniza. **El COACH la ve** en el historial del asesorado (`renderCoachClientHistory`: carita + duración + kcal por sesión). Gravl pide la calificación pero su coach es IA; AVI la usa un humano real. `WF_FEELINGS`/`feelingEmoji`/`feelingLabel`/`wfRate`/`_wfEntry`. Sin migración (retro-compatible).
3. Identidad mantenida (no copia de Gravl): foto full-bleed + "¡Lo lograste, {nombre}!" + esmeralda/oro + 🏆 + confetti, vs la tarjeta plana fría de Gravl.
- 118/118 tests + audit 8/8.

### ✅ Sesión 2026-06-08 (cont. 3) — Fotos de ejercicio GENDER-AWARE, Fase 1 (apex-v88)
**Feature nueva:** la asesarada ve la demo del ejercicio en MUJER; coach/hombre ven el default. Mecánica en `exImgSrc(e,sex)`: si `sex==='F'` y el id está en `EX_IMG_F`, devuelve `media/exercises/{id}_f.jpg`; si no, el `{id}.jpg` de siempre. `sex` por defecto = `_viewSex()` (en vista del asesorado sigue su `client.sex`; coach → default). **Sin tocar los ~8 call-sites** (exIcon/exImgSrc heredan el default). Retro-compatible y aditivo.
- **Fase 1:** 3 fotos de mujer procesadas (delogo ✦ + 720²) → `e2_f.jpg` (press inclinado), `e26_f.jpg` (jalón amplio), `e50_f.jpg` (buenos días). `EX_IMG_F={e2,e26,e50}`.
- **Origen:** Camilo dejó 43 fotos en `Desktop/AVI/fotos-seleccionadas/` (16 con nombre eN-...__variante + 27 `Gemini_*` de atleta MUJER sin mapear). Todas premium Noir + logo AVI.
- **PENDIENTE Fase 2:** (a) las **27 fotos de mujer sueltas** → necesitan ID de ejercicio (Camilo renombra como las 16, o Claude propone mapeo para que confirme) → procesar a `{id}_f.jpg` + ampliar `EX_IMG_F`. (b) **7 upgrades de hombre** seleccionados (e6,e11,e13,e71,e77,e83,e85; tienen variantes de ángulo) → reemplazar `{id}.jpg` si Camilo lo aprueba. 118/118 + audit 8/8.

### ✅ Sesión 2026-06-08 (cont. 4) — Gender-aware Fase 2: 21 fotos mujer + 4 hombre (apex-v89)
De las 43 fotos de `fotos-seleccionadas/`, procesadas las 27 `Gemini_*` (delogo ✦ + 720², tamaños mixtos cuadrado/apaisado/vertical manejados). **Claude identificó cada una a resolución full contra `DB.exercises`** (no miniaturas, no EX_IMG_NAME).
- **21 fotos de MUJER** → `{id}_f.jpg`: e96,e73,e38,e93,e40,e18,e58,e14,e41,e106,e35,e48,e37,e62,e42,e89,e13,e17,e80,e44,e92. `EX_IMG_F` ampliado a 24 ids (con los 3 de Fase 1: e2,e26,e50).
- **4 fotos de HOMBRE** (modelo masculino, no mis-sorted) → reemplazo de `{id}.jpg` default: e36 prensa, e4 dominadas, e47 rueda abdominal, e94 abducción de pie con banda (e94 era nueva).
- **e89, e93, e94 AÑADIDAS a `EX_IMG_NAME`** (existían en DB.exercises pero faltaban en el mapa → si no, la foto no resolvería; misma trampa que e97). Lección guardada en memoria [[feedback-verificar-catalogo-ejercicios]].
- Descartadas 2 fotos mujer duplicadas (2ª toma de e73 y de e44).
- 118/118 tests + audit 8/8.

**✅ 7 upgrades de HOMBRE aplicados (apex-v90):** reemplazado `{id}.jpg` de e6 (jalón espalda), e11 (extensión tríceps abajo), e13 (sentadilla barra), e71 (press mancuernas abajo), e77 (flexiones pared), e83 (lagartijas alt), e85 (aperturas polea cerrado). Multi-ángulo: elegido el frame más representativo por ejercicio. delogo + 720².
**Pendiente:** más fotos de mujer para cubrir más ejercicios (24/109 con versión mujer).

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

*Última actualización: 2026-06-08 · Marca: **AVI** · **v2.0 (auth real + RLS, EN PRODUCCIÓN)** · **apex-v103** · Suite **123/123** verde · repo local: `Desktop/AVI/apex-app` · Tagline: "Entrenamiento con nombre propio" · PO: Camilo Andrés*
*Hitos sesión 2026-06-08 (cont. 18): ⏱️ pantalla de carga dura más — el hold final pasó de 100/350ms a 1800/2200ms (sesión/registro) para que se vea la marca + se lea el mensaje (Camilo: "no dura ni un segundo"). (apex-v103)*
*Hitos sesión 2026-06-08 (cont. 17): 🖼️ `media/loading-bg.jpg` (fondo de la pantalla de carga) reemplazado por foto nueva de Camilo (sentado en banca, AVI, neón "DISCIPLINA ENFOQUE RESULTADOS"). Procesada: delogo de la ✦ (caja x1315 y2510 w200 h205) + escala 900×1600 + JPG q3 (~95KB). Reemplaza la foto vieja del jalón. SW bump invalida la caché de la imagen. (apex-v102)*
*Hitos sesión 2026-06-08 (cont. 16): 🎬 hero-montage del login ajustado — Camilo no convencido con la técnica del clip press hammer (e84): reemplazado por e9 curl con barra. Montaje ahora = e13,e5,e22,e9,e6 (pierna→espalda→hombro→bíceps→espalda). El video de detalle e84 sigue intacto. (apex-v101)*
*Hitos sesión 2026-06-08 (cont. 15): 🎬 `media/hero-montage.mp4` (fondo del login cinematográfico) REGENERADO con nuestros videos AVI — montaje vertical 720×1280/30fps/11s/1.4MB de 5 clips (e13 sentadilla, e5 remo, e22 press militar, e84 press hammer, e6 jalón) escalados a cover + concat. Antes era genérico. La regla SW `.mp4` network-first ya sirve la versión nueva. (apex-v100)*
*Hitos sesión 2026-06-08 (cont. 14): 🎨 íconos de la barra inferior del asesorado (`.cntab .ctico`) de EMOJI a SVG de línea propios (Hoy=mancuerna, Rutinas=lista, Mensajes=burbuja, Historial=barras, Perfil=persona). Heredan color por `currentColor` (gris t3 → esmeralda al activar) + stroke-width sube en `.on`; badge de mensajes intacto (`#msg-badge` sigue con data-count). (apex-v99)*
*Hitos sesión 2026-06-08 (cont. 13): 🎬 +2 videos limpios (logo AVI correcto) — e22 Press militar con mancuernas + e84 Press en máquina hammer. EX_VID = e5,e6,e9,e11,e13,e22,e27,e84 (8 videos) (apex-v98).*
*Hitos sesión 2026-06-08 (cont. 12): 🎬 +1 video — e27 Jalón al pecho agarre neutro (back-view, limpio). EX_VID = e5,e6,e13,e11,e9,e27 (apex-v97). ❌ e28 (jalón agarre cerrado) NO desplegado: el video tiene el LOGO ROTO ("ANGLE/ZIBLE", no AVI) → Camilo lo regenera. e9 quedó con logo "AVi" (aceptable). Regla firme: revisar el logo de CADA video, Veo rompe el texto a veces.*
*Hitos sesión 2026-06-08 (cont. 10): 🎬 PILOTO de VIDEO de ejercicio — 4 videos generados por Gemini/Veo a partir de nuestras fotos (e5 remo, e6 jalón, e13 sentadilla, e11 tríceps). Procesados con ffmpeg: recorte del morpheo inicial (-ss 2), crop centrado a 720² (de 1280×720), sin audio, H.264 faststart (~400KB c/u) → `media/exercises/eN.mp4`. Registro `EX_VID` + `exVidSrc()`; `_showExSheet` reproduce `<video autoplay loop muted playsinline>` con la foto de `poster` en el detalle (la lista sigue con foto). SW: `.mp4` network-first (range requests iOS). Descartado el de Vidu (marca de agua). Pendiente: ver en celular y, si OK, seguir con los 109. (apex-v95)*
*Hitos sesión 2026-06-08 (cont. 9): 👋 cabecera del "Hoy" rediseñada — saludo GRANDE con el nombre (`#cn-today-head`/`renderTodayHead`) + chip de RACHA 🔥 (días de calendario consecutivos con sesión, terminando hoy/ayer). Nueva fn `workoutStreak(sessions,now)` en apex-core (testeada, +5 tests → 123). 🧹 3 cuentas de prueba borradas de `user_data` por SQL (Tocino AbusaMadres, Sam Blux, AVI); quedan 8 clientes reales. (apex-v94)*
*Hitos sesión 2026-06-08 (cont. 8): 🎨 hero del "Hoy" (`.wohero`) ahora con FOTO de marca (`media/brand/ob-1.jpg`, agarre de peso muerto) a la derecha + degradado oscuro a la izquierda (texto legible) — cierra el gap visual con onboarding/finish full-bleed. 🆓 cliente LIBRE puede editar su propia rutina: flag `canEdit=COACH_SELF||isFreeClient(client)` en `renderClientAllRoutines` → "+ Nueva rutina" + ✏️/🗑️ + "Crear rutina manual" en empty state; refresco al guardar/borrar gateado por `CUR.loggedAs==='client'`. Las gráficas siguen Premium (gating intacto); los ejercicios/edición ya están disponibles para quien solo quiere registrar. (apex-v93)*
*Hitos sesión 2026-06-08 (cont. 7): 🐛 BUG el coach no podía editar SU PROPIA rutina en "Mi entrenamiento" (sí la de asesorados). Causa: la vista de asesorado (`renderClientAllRoutines`) no expone editor a propósito, y "Mi entrenamiento" la reusa → coach sin botones. Fix UI: con `COACH_SELF` se muestran "+ Nueva rutina" + ✏️ Editar/🗑️ por tarjeta (reusan openNewRoutine/openEditRoutine/delRoutine; DB.clients=[coach] ya apunta a su fila, persistencia vía upsertOwn ya estaba OK) + refresco de su vista al guardar/borrar (apex-v92).*
*Hitos sesión 2026-06-08 (cont. 6): 🐛 BUG usuarios eliminados reaparecían — al borrar un cliente desde el panel, en modo auth la fila `user_data` quedaba en la nube y volvía al re-loguear. Fix: política RLS `user_data_delete_coach` (DELETE si `coach_id = auth.uid()`) + `UD.deleteClientRow()` + `delClient()` ahora borra la fila en la nube (apex-v91). 🎬 99 prompts de video (imagen→video) en `Desktop/PROMPTS-VIDEO-EJERCICIOS.txt`. 📋 faltan 10 fotos de ejercicio: e45,e63,e72,e74,e75,e76,e90,e91,e108,e109.*
*Hitos sesión 2026-06-08 (cont. 5): 👨 7 upgrades de foto de hombre aplicados (e6,e11,e13,e71,e77,e83,e85 → default {id}.jpg, frame más representativo por ejercicio) (apex-v90)*
*Hitos sesión 2026-06-08 (cont. 4): 👩 gender-aware Fase 2 — 21 fotos de ejercicio MUJER (`{id}_f.jpg`, EX_IMG_F=24 ids) + 4 de hombre (e36/e4/e47/e94); e89/e93/e94 añadidas a EX_IMG_NAME (faltaban, trampa tipo e97). Claude identificó cada foto a full-res contra DB.exercises. Lección: verificar catálogo real, no EX_IMG_NAME (apex-v89)*
*Hitos sesión 2026-06-08 (cont. 3): 👩 fotos de ejercicio GENDER-AWARE (la asesorada ve la demo en mujer) — `exImgSrc(e,sex)` + `EX_IMG_F` + `_viewSex()`, sin tocar call-sites; Fase 1 = 3 fotos mujer (e2_f/e26_f/e50_f). Pendiente Fase 2: mapear las 27 fotos de mujer sueltas (necesitan ID) + 7 upgrades hombre. 43 fotos en `fotos-seleccionadas/` (apex-v88)*
*Hitos sesión 2026-06-08 (cont. 2): cierre de entreno con ⏱️ Duración (startedAt) + 🔥 Calorías (MET·peso·h) + 📅 Fecha (referencia: captura real Gravl "Detalles del entrenamiento") · ⭐ "¿Cómo te sentiste?" 5 caritas (feeling 1-5) que el COACH ve en el historial (foso vs Gravl IA) · identidad propia (foto full-bleed + personal + esmeralda) (apex-v87)*
*Hitos sesión 2026-06-08 (cont.): 🏆 pantalla "Fin de entrenamiento" full-bleed (overlay #workout-finish al 100%: foto + 🏆 + series/volumen/récords + PRs + confetti); primer momento full-bleed fuera del onboarding; default foto = ob-2 (pendiente foto de victoria dedicada vía Gemini); reemplaza el banner inline #congrats (apex-v86)*
*Hitos sesión 2026-06-08: 🧹 eliminada la "Nota del coach" duplicada (quitada la vieja gris "Notas técnicas (coach)" `#exd-tech-wrap`, queda solo el cue esmeralda `EX_COACHTIP`) · 🎨 onboarding intro rediseñado a FULL-BLEED inmersivo (foto a pantalla completa + texto abajo; antes cajita de 188px) · 📸 3 fotos de marca AVI con logo horneado en la camiseta por Gemini, 1536×2752 nativo + ✦ eliminado (ob-1 peso muerto, ob-2 de pie, ob-3 sentado); Claude solo delogo+grade (regla: Gemini hace el logo, no Claude) (apex-v85)*
*Hitos sesión 2026-06-07 (cont.): 📸 fotos de ejercicio lote 2 (23: 22 reemplazos + e97 Pike Push-up; e97 faltaba en EX_IMG_NAME) (v80) · 🔧 fix e9 (mostraba mancuernas, archivo Gemini mal nombrado→barra real) + 4 fuentes verticales reprocesadas con fit+relleno (no recorte; el calf raise perdía los pies); process-photos.sh detecta orientación (v81) · ⭐ NUEVA FEATURE "Nota del coach" por ejercicio (callout esmeralda visible al asesorado; mapa `EX_COACHTIP` resuelto por id sin migración; 109/109) (v82 lote 1→v83 completo) · 📝 22 descripciones cortas enriquecidas, 87 ya sólidas se dejaron (v84) · lección: verificar CONTENIDO de cada imagen, no el nombre del archivo*
*Hitos sesión 2026-06-07: 🚀 wizard+fotos de marca a prod (apex-v65) · 🐛 fix registro Google (pierde-datos→reveal, v66) · 📸 primeras 10 fotos de ejercicio AVI (v67) · 🎨 rediseño interior DARK Noir por defecto + hero/tarjetas/detalle/callouts (v68-v71,v79; causa raíz = interior en tema claro) · 🔴→✅ BUG CRÍTICO solicitudes de coach invisibles por `coach_id=NULL` + RLS → todos los self-reg al pipeline + backfill (lead real Cristhian recuperado, v72/v73) · 📝 LAS 109 fichas de ejercicio a estándar premium (músculo nombrado + criterio, v74-v78) · flujo fotos definitivo: GEMINI hace look+logo, Claude solo ✦+720²*
*Hitos sesión 2026-06-05: 📸 fotos de marca AVI (Camilo) integradas en hero/reveal/onboarding del wizard vía grade Noir Esmeralda + ffmpeg → `media/brand/` (316 KB las 4) · 4 ediciones quirúrgicas en index.html sobre hooks ya existentes · ⚠️ TODO SIN COMMITEAR Y SIN DEPLOY (arrastra el wizard de 7 pasos previo) · captura en navegador bloqueada por RAM (no se tocó el Chrome del usuario) · ver sección "Sesión 2026-06-05 — RETOMAR AQUÍ"*
*Hitos sesión 2026-06-04: 📧 SMTP propio (Brevo, remitente verificado aviapptraining2020@gmail.com) + "Confirm email" ACTIVADO + plantillas de correo en español con branding AVI (4) · todo config server-side vía Management API (sin cambios de código; la app ya soportaba confirm-email) · registro público DESBLOQUEADO · ⚠️ `smtp_port` debe ser STRING y un PATCH parcial de `smtp_*` borra el bloque entero*
*Hitos sesión 2026-06-03 #2: 🔒 FASE 4 — candados RLS cerrados (eliminadas las 4 políticas `USING(true)` de apex_data + push_subscriptions; fuga crítica anon resuelta) · respaldo legacy de `doLogin` eliminado (login = SOLO Supabase Auth) · migración blindada verificada cliente por cliente + Nataly reconciliada (cero pérdida) · Astrid/Nataly con claves Auth nuevas (`Astrid2026`/`Nataly2026`, Camilo las reparte) · 5 cuentas de prueba borradas · push_subscriptions solo-escritura (tradeoff para no romper registro) · COACH_UID = 0a6484ed-… · caché apex-v63→v64*
