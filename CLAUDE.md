# AVI — Plataforma de Entrenamiento Personal

> **Nota de marca (2026-06-01):** el producto se renombró de **AVI** a **AVI** (iniciales de los hijos del PO: Alexander, Valery, Isabella). El nombre visible es AVI; los identificadores internos siguen como `apex`/`ax_` (repo `apex-app`, tabla `apex_data`, claves `ax_*`, `avi-core.js`, caché `apex-vNN`) — NO renombrarlos (rompería datos/PWA). Handle redes: @avi.entrena. Pendiente: registro de marca en SIC.

> Este archivo es la memoria permanente del proyecto. Claude Code lo lee automáticamente al iniciar cada sesión en este directorio.

---

## 🎯 IDENTIDAD DEL PRODUCTO

**AVI** es una plataforma SaaS de entrenamiento personal en formato PWA, sincronizada con Supabase, lista para instalarse como app real en cualquier celular.

**Product Owner:** Camilo Andrés — Entrenador personal independiente en Guaduas, Cundinamarca, Colombia. Sus decisiones sobre funcionalidad son finales.

**Usuarios:**
- **Coach** — gestiona asesorados, rutinas, plantillas, mensualidades
- **Asesorados** — ejecutan rutinas, registran progreso, ven evolución

**Versión actual:** v2.x — Julio 2026 (auth real + RLS + guiado único, EN PRODUCCIÓN)

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

## 🛡️ DOCTRINA DE TRABAJO — LÉELA ANTES DE TOCAR NADA

Esta sección existe porque el PO lo pidió explícitamente (2026-07-07): *"no seas complaciente
conmigo, sé crítico, muéstrame lo que no estoy viendo, no quiero una app de juguete"*.
Obliga a CUALQUIER modelo/sesión que trabaje en AVI. No es decorativa.

### 1. Camilo es ENTRENADOR, no desarrollador — tú eres el ingeniero responsable
- Él NO va a detectar tus errores técnicos. Si algo sale mal en producción, lo sufren
  usuarios reales que le pagan. Verifica como si nadie fuera a revisarte — porque nadie lo hará.
- Tradúcele todo a lenguaje de producto (qué ve el usuario, qué riesgo corre el negocio).
  Los detalles técnicos van en la bitácora, no en la cara del PO.
- Sus decisiones de PRODUCTO son finales. Las decisiones TÉCNICAS son tuyas y las defiendes
  con evidencia. Si te pide algo técnicamente dañino, dile POR QUÉ y ofrece la alternativa.

### 2. Anti-complacencia (regla dura)
- **PROHIBIDO validar por validar.** "¡Excelente idea!" sin análisis = fallo de doctrina.
  Cada pedido se evalúa: ¿mejora el producto? ¿hay una forma mejor? ¿qué rompe?
- Si la mejor respuesta es "no lo hagas" o "hazlo distinto", esa es la respuesta. Con razones
  y con alternativa. Camilo prefiere un "no" argumentado a un "sí" que degrada la app.
- Recomienda la opción MEJOR para la app, no la más fácil de implementar ni la que
  Camilo insinuó. Si coinciden, perfecto; si no, dilo.

### 3. Bugs: se matan de RAÍZ o no se tocan
Protocolo obligatorio, en orden, sin saltos:
1. **Reproducir primero** — harness CDP o repro manual documentada. Sin repro no hay fix
   (solo excepciones: evidencia forense clara, como telemetría + datos de la nube).
2. **Causa raíz, no síntoma** — pregunta "¿por qué?" hasta llegar al diseño que lo permitió.
   Si el fix es un `if` defensivo sin entender el porqué, NO es un fix, es basura acumulada.
3. **El fix elimina la causa** y de paso la CLASE de bug (¿dónde más existe el mismo patrón?).
4. **Test de regresión** que falla sin el fix y pasa con él (suite o harness).
5. **Verificado en prod** (curl Pages) + hito en `docs/bitacora.md`.
- **PROHIBIDO**: código muerto comentado "por si acaso" (git history existe), parches
  cosméticos sobre síntomas, "arreglos" no reproducidos, TODOs sin tarea en el backlog.
- Al tocar CUALQUIER zona: si ves basura (código huérfano, duplicado, gotcha sin documentar),
  repórtala en el radar o límpiala si es segura — nunca la ignores en silencio.

### 4. Barra PREMIUM — Definition of Done de toda feature
Una feature NO está terminada hasta cumplir TODO esto. "Funciona en el happy path" = a medias.
- [ ] **Móvil primero**: perfecta a 360-390px, táctil ≥36px, probada con letra grande (data-fs xl)
- [ ] **Ambos temas**: light y dark, tokens CSS existentes (no colores hardcodeados)
- [ ] **Tono Sofía**: todo texto visible al asesorado es humano, cálido, español colombiano; cero jerga técnica
- [ ] **Estados no-felices**: vacío, error, offline, datos extremos — con mensaje accionable, nunca pantalla rota/blanca
- [ ] **Datos**: campo nuevo → SB_KEYS si sincroniza; claves de sesión intactas; `esc()` en todo innerHTML con datos de usuario
- [ ] **Timers por timestamp absoluto**; wake lock si aplica; sobrevive minimizar/volver
- [ ] **QA completo**: suite verde, hook 11/11, smoke, harness si toca flujo de entreno/timers/navegación
- [ ] **Verificada en producción** con curl, no "debería estar ya"
- Si el pedido de Camilo da para "versión de juguete" o "versión premium", implementa la
  premium o explícale el costo de la diferencia ANTES. Nunca entregues juguete en silencio.

### 5. Radar — lo que Camilo no está viendo (obligatorio al cerrar sesión)
Al final de cada sesión de trabajo, entrega un **radar honesto y priorizado** (máx. 5 puntos):
riesgos técnicos, deuda que crece, oportunidades de producto, cosas raras en los datos de
usuarios. Sin adornos. Si no hay nada relevante, dilo explícitamente ("radar limpio").
El radar NO es opcional y NO se reemplaza por complacencia.

> **🧠 CÓMO se opera esta doctrina → `docs/metodologia.md`** — instrucciones concretas
> (pedido de Camilo 2026-07-11): cómo cazar bugs antes de prod (capas de QA, harness por
> feature, subagentes Julián/Lucas), cómo matar el bug de raíz Y lo que lo causó (candado +
> check permanente + gotcha), y cómo pensar/verificar CADA área (interfaz con benchmarking
> de referentes + preview de variantes, features, coach, datos, seguridad, tono, deportivo).

### 6. Documentación viva (o el próximo modelo arranca ciego)
- Hitos de sesión → `docs/bitacora.md` (más reciente primero). NO a CLAUDE.md.
- CLAUDE.md solo cambia cuando cambia el CONTEXTO VIVO: arquitectura, esquema, gotchas
  nuevos (→ sección GOTCHAS VIGENTES), backlog, footer de versión.
- Memoria de sesión (`~/.claude/.../memory/`) actualizada al cerrar.
- Lección nueva que no expira → GOTCHAS VIGENTES, no enterrada en un hito.

### 7. Guardrails duros (violarlos = sesión fallida)
- **NUNCA** `--no-verify`, `push --force` a main, ni saltarse suite/hook "porque es un cambio chiquito"
- **NUNCA** deploy sin bump del PAR `?v=NNN` (index.html) + `CACHE_NAME` (sw.js) si cambió JS/CSS
- **NUNCA** confirmar "está en producción" sin el curl a Pages
- **NUNCA** secretos en el repo (es PÚBLICO): creds de prueba → `~/.avi/`, service role → `~/.avi/service-role.key`
- **NUNCA** renombrar identificadores internos `apex`/`ax_` ni el formato de claves de sesión
- **NUNCA** mezclar features en un commit, ni "aprovechar" para refactors no pedidos en zonas calientes
- **SIEMPRE** leer GOTCHAS VIGENTES antes de editar; suite antes Y después; Edit tool o python utf-8 (jamás perl/sed con tildes)

---

## 📐 ARQUITECTURA

### Archivos del proyecto
```
apex-app/
├── index.html                          ← AVI completo (~8,000 líneas, ~505 KB)
├── sw.js                               ← Service Worker ESTÁTICO (⚠️ NUNCA convertir a blob URL)
├── scripts/hooks/pre-commit            ← Audit automático en cada commit (11 checks; hook VIVO vía core.hooksPath=scripts/hooks — al clonar: git config core.hooksPath scripts/hooks)
├── scripts/e2e/                        ← Harnesses E2E de regresión (CDP; creds en ~/.avi/e2e-creds.json, JAMÁS hardcodeadas)
├── .claude/agents/                     ← 15 agentes especializados del equipo
├── .claude/skills/                     ← avi-audit, avi-deploy, avi-feature, avi-generate, avi-run
├── supabase/functions/send-push/       ← Edge Function push notifications
├── supabase/functions/daily-notifs/    ← Edge Function notificaciones diarias (3 cron jobs)
├── supabase/functions/delete-account/  ← Edge Function borrado de cuenta (service role)
├── supabase/functions/coach-create-client/ ← Edge Function: el coach crea cuenta de acceso pre-confirmada del asesorado
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
- `#p-exercises` — 212 ejercicios precargados (e1–e214, sin e32/e38; e141–e164 = principiante peso corporal casa/parque; **e165–e214 = 50 nuevos: 16 movilidad/calentamiento + 25 HIIT/funcional + 9 antebrazo/trapecio/grip**, con imagen 1:1 + mapa muscular + modalidad), filtros por músculo. El generador aplica **gate por nivel** (`EX_LEVEL`/`_levelGate` en avi-core.js): Principiante solo P, Intermedio P+I, Avanzado todo
- `#p-msgs` — Bandeja con badges de no leídos

### Secciones del Asesorado (5)
- `#cn-today` — Entrenamiento del día + activación auto + timer
- `#cn-routines` — Todas sus rutinas (no solo la del día)
- `#cn-messages` — Chat con el coach
- `#cn-history` — Historial (hasta 365 sesiones) + gráfica volumen + progreso por ejercicio/modalidad
- `#cn-profile` — Foto de perfil propia, peso corporal, PRs, datos, fotos progreso, medidas (progressive disclosure: oculta tarjetas vacías)
- `#cn-gamif` — Gamificación: nivel permanente (1–5, no se reinicia) + logros (el descuento por adherencia se eliminó el 2026-07-06)

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
  habits,                           // ✅ v300 — hábitos diarios: {water:{'YYYY-MM-DD':vasos}} (poda 30 días; viaja en el perfil como painCare)
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
session_date_{routineId}                → fecha último entreno (día → reset de banderas 'done')
session_id_{routineId}                  → id de la sesión activa; el historial matchea por él (2 entrenos de la misma rutina el mismo día = 2 entradas, no se pisan)
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
AVI usa localStorage como fuente de verdad y sincroniza **hacia** Supabase, no al revés. Si la app se abre en cualquier dispositivo con datos viejos en localStorage, esos datos sobrescriben Supabase.

**Consecuencia:** cambios hechos directamente en Supabase (SQL, Python, Dashboard) pueden perderse en el próximo sync de la app.

**Mitigación al editar Supabase directamente:**
- Asegurarse de que la app no esté abierta en ningún dispositivo del asesorado
- Hacer siempre REPLACE TOTAL del array (nunca append)
- Después de guardar, pedirle al asesorado que abra y cierre la app una vez (forza pull desde Supabase)
- Para cambios críticos: editar preferiblemente desde la UI de AVI para que localStorage quede actualizado

### Despliegue
```
Plataforma: GitHub Pages (github.com/Kronos-apex/apex-app)
Branch producción: main (NUNCA master, NUNCA --force)
Workflow: edit → pre-commit hook (7 checks) → git commit → git push → GitHub Pages automático
Backend: Supabase (apex_data, push_subscriptions, Edge Functions)
```

### Respaldos (2026-07-06 — doble capa, ambos verificados)
```
1. EN LA DB (no depende de la PC): pg_cron "apex-daily-backup" 8:00 UTC diario
   → apex_daily_backup() snapshotea apex_data + user_data en apex_data_backups.
   Retención: 14 diarios + domingos por 90 días. (Reemplazó al semanal 2026-07-06.)
2. FUERA de Supabase: scripts/backup-local.mjs + Tarea de Windows "AVI backup Supabase"
   (diaria 8:00 pm, corre al prender si estaba apagada) → exporta user_data, apex_data,
   push_subscriptions y cuentas auth (uid↔email) a Desktop\AVI\backups\ (45 días).
   Requiere service role key en %USERPROFILE%\.avi\service-role.key (JAMÁS en el repo).
Restaurar: corrupción de datos → snapshot de apex_data_backups; pérdida del proyecto → JSON local.
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

/* Verde marca (valores REALES corregidos 2026-07-13 — el doc decía #2D6A4F y no era) */
--g:#0A7C5B   --g2:#13B583   --gl:#D3F4E8   --gt:#06402E (claro) / #5FE3B0 (oscuro)

/* Gráficas SVG (v351) — conscientes del tema */
--chart-g: var(--g) claro / var(--gt) oscuro   --chart-or: var(--or)
/* Movimiento (FASE 0 v329) */
--ease-out:cubic-bezier(.23,1,.32,1)   --dur-fast:160ms   --dur:220ms

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

## 🔑 FUNCIONES CLAVE (334 totales — inline + avi-core.js)

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

### Hábitos diarios (v300 — 💧 agua por vasos)
- Tarjeta `#cn-habits` en Hoy (render `renderHabitsCard`/`waterTap` en app-5; llamada desde `renderClientToday` ANTES de los early-returns → sale también en descanso/sin rutina)
- Lógica pura en avi-core: `waterGoalGlasses(weightKg)` (~35ml/kg, vaso 250ml, clamp 6-12, fallback 8) · `waterToday`/`waterAdd` (clamp 0-30, poda 30 días, inmutable) · `waterWeek` (mini-fila 7 días) · `habitDayKey`
- La meta respeta `nut.water` del plan del coach (ya viene en vasos) vía `_waterGoalFor`; sin plan → peso
- Datos en `client.habits` → viajan en el perfil (clientToRow copia todo, patrón painCare); sync con `sv()` (debounce)
- Diseñada para crecer: pasos y adherencia de comidas van en esta MISMA tarjeta (decisión Camilo 2026-07-09)

### Gamificación (v1.4 — nivel permanente + logros)
- `gxLevel(total)` — nivel permanente 1–5 (`GX_LEVELS`), NO se reinicia
- `renderGamification(client)` — tarjeta de nivel + logros
- ⚰️ **Descuento por adherencia ELIMINADO (2026-07-06, decisión de Camilo):** `gxDiscount`/`gxNextTier`, la tarjeta del cliente, la del coach y su CSS (.gx-month) — tuvo poca recepción ("a nadie le importa mucho"). NO reconstruirlo sin pedido explícito.

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
- ✅ `push_subscriptions` con RLS propia para **authenticated** (policies `push_ins_own` + `push_upd_own` + `push_sel_own`, alcance `*_own` por UID) — el follow-up "mover a autenticado" se CUMPLIÓ en el fix de raíz del cero-suscritos (v320-v324; la policy SELECT faltante fue la causa final, 2026-07-12). Verificado contra `pg_policies` en la auditoría 2026-07-13.
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
9. **Actualizar CLAUDE.md** — parte obligatoria del deploy (Paso 6 del skill avi-deploy)

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

## 🧠 GOTCHAS VIGENTES (destilado 2026-07-07 — lecciones que NO expiran)

### Edición de código (Windows)
- **JAMÁS perl/sed sobre archivos con tildes/emojis** (corrupción UTF-8) → Edit tool o `python io` con `encoding='utf-8'` y `newline` LF. PowerShell: `[System.Text.UTF8Encoding]::new($false)` (sin BOM).
- Tras ediciones por regex en CSS, **revisar selectores compuestos**: al quitar tokens pueden quedar dos selectores PEGADOS (pasó con `html[data-theme]` duplicado en F5b).
- bash: `UID` es variable readonly del shell — no usarla como nombre propio.
- **Heredocs de Git Bash MANGLAN `\\`** en scripts python inline (2026-07-09: `s.index("log('\\njsErrors")` no encontraba el marcador). Scripts de reescritura con backslashes → escribirlos a ARCHIVO (Edit/Write tool) y correr `python archivo.py`; si no queda opción, construir el backslash con `chr(92)`.

### Deploy / GitHub Pages
- **NUNCA decirle al usuario "es tu caché" sin confirmar qué sirve producción**: `curl .../index.html?nocache=$(date +%s)` y grep del `?v=NNN`.
- El paso "deploy" de Pages falla flaky a veces → commit vacío lo relanza. `max-age=600` → hasta 10 min de desfase tras deploy.
- `?v=NNN` (index.html) y `CACHE_NAME` (sw.js) van SIEMPRE juntos — el check 10 del hook lo bloquea.

### Harnesses E2E / CDP
- Los gotchas operativos viven en **`scripts/e2e/README.md`** (rate limit de samuel ~2 min entre corridas, Chrome zombi, stub `UD.loadOwn`, `cnTodayGuard`, about:blank para re-parsear hash). Ampliaciones:
- `await` de nivel superior en `Runtime.evaluate` es error de sintaxis **SILENCIOSO** (result undefined) → envolver en `(async()=>{...})()` con `awaitPromise:true`.
- En escenarios del guiado **NO elegir ánimo "para quitarlo de encima"**: el chooser convive con las tarjetas y `pickMood` ADAPTA la rutina (cambia sets/ejercicios).
- NUNCA cortar un harness con `head` (deja el puerto zombi); matar listeners del puerto antes de correr.
- NUNCA reintentar `doLogin` encima de otro en curso (dispara `_enterAuthSession` doble — el bug real v283).
- Para probar REGISTRO sin crear cuentas ni rate limit: espiar `AUTH.signUpEmail` y `loginWithGoogle` (patrón `_verify-consent.mjs`).
- **"DOM presente" ≠ "app booteada".** El boot (`initPWA` + tema + remember-me + sesión auth) corre DENTRO de `syncFromCloud().then()` (app-2) → en PROD tarda ~4s por la red a Supabase. Los símbolos que define initPWA (`window._aviUpdateBusy`, etc.) NO existen hasta que el sync resuelve. Un check que espera `#s-login` o funciones top-level (listos al PARSEAR el HTML) mira DEMASIADO PRONTO y da falso rojo (bug 2026-07-12: el boot-check de prod dio ❌ a los 2.5s; era el CHECK, no la app). Regla: esperar el SÍMBOLO REAL post-boot (`_aviUpdateBusy`) con timeout amplio (≥30s), nunca la mera presencia del DOM.
- **Cada deploy lleva boot-check de prod, no solo curl** (adoptado 2026-07-12): `node scripts/e2e/_prodcheck.mjs <vNNN>` arranca headless contra la URL real, espera el boot real, y afirma versión servida + login/core + CERO errores JS. El curl confirma que el ARCHIVO salió; esto confirma que la app ARRANCA. "Está en producción" = curl `?v` + `avi-vNNN` **Y** `_prodcheck.mjs` verde.
- 🛑 **Los harness corren el index.html LOCAL, que apunta al Supabase de PRODUCCIÓN, y hacen login con cuentas REALES (samuel).** Antes del sello v298, mutar `DB` + `svNow('ax_c'/'ax_hist')` empujaba fixtures a la nube real (**incidente 2026-07-08: `_verify-pain` borró las 4 rutinas reales de Samuel** dejando solo una rutina de prueba). **Fix de raíz (v298):** `cloudWriteSealed(location.hostname)` (avi-core) sella `UD.upsertOwn/updateClientRow/deleteClientRow` en localhost → NINGÚN harness puede escribir a producción. Para probar sync a propósito: `window.AVI_ALLOW_CLOUD_WRITE=true` **y contra un proyecto de PRUEBA, jamás producción**. Complemento: `stripFixtureSessions` purga sesiones-fixture (rTest/rVis/rf5) del historial real al cargar (auto-cura los teléfonos ya contaminados). **Cinturón + tirantes:** desde 2026-07-08 los harness usan la **cuenta QA dedicada `qa-harness@apex.com`** (aislada bajo un coach QA que NO sale en el panel de Camilo — ver `~/.avi/qa-accounts.txt`), JAMÁS un asesorado real. El sello es el respaldo por si alguien apunta las creds a una cuenta real.

### App / datos
- Claves de sesión (`done_/log_/lastre_/wshow_/drop_/wu_` + tokens `w0/dN`, `session_id_<rid>`) — **NUNCA cambiar el formato** (rompe sesiones en curso de usuarios reales).
- Timers SIEMPRE por **timestamp absoluto** (`endAt`), nunca por conteo de ticks — iOS congela intervalos en background.
- Push: tras cambios de auth, los asesorados/coach recuperan la suscripción **al ABRIR la app una vez** — quien no la abra queda sin notificaciones hasta entonces. **v318:** la del COACH murió en el cutover y no se auto-reinsertaba → tarjeta "Activa notificaciones" en su home + `ensureCoachPush` self-heal forzado + `send-push` poda 410/404. La RLS `push_ins_own` permite `_coach` solo con el UID del coach.
- **Escrituras AUTENTICADAS a Supabase van por el CLIENTE (`AUTH.client().from('tabla').upsert/insert`), NUNCA por `fetch` crudo con `Bearer ${getSession().access_token}`.** El token extraído a mano se VENCE y no se refresca → PostgREST lo trata como anónimo → la RLS rechaza (bug v323: `subscribePush` con fetch crudo → CERO asesorados suscritos por meses, cientos de "violates RLS" en logs). El cliente refresca el JWT solo. Para filas atadas al usuario, usa `auth.getUser().id` como client/user_id, no un valor local que pueda desfasarse.
- **Un `upsert` (`.upsert()` / `INSERT ... ON CONFLICT DO UPDATE`) EXIGE política de SELECT, no solo INSERT/UPDATE.** Postgres necesita LEER la fila para resolver el conflicto → sin policy SELECT, RLS la oculta y el upsert se rechaza con `insufficient_privilege` (HTTP 403). **Root cause REAL de los meses sin push (cazado 2026-07-12):** `push_subscriptions` tenía `push_ins_own` + `push_upd_own` pero **NO** una policy SELECT → TODO upsert de suscripción (coach y asesorados) daba 403, aun con el cliente autenticado y el UID correcto. v323 (fetch→cliente auth) era necesario pero NO suficiente: el token nunca fue el bloqueante final, era la policy que faltaba. Fix = migración `push_subscriptions_add_select_policy` (`push_sel_own`, mismo alcance que ins/upd). Síntoma diagnóstico: en logs API `POST /rest/v1/<tabla>?on_conflict=... → 403` mientras `POST /rest/v1/user_data → 200` en la MISMA sesión (user_data SÍ tiene policy SELECT). Verificación de raíz: impersonar el JWT con `set local role authenticated` + `set_config('request.jwt.claims', ...)` y probar el upsert en una transacción que hace `rollback` — INSERT suelto pasa, upsert falla, con policy SELECT temporal pasa. **Al crear cualquier tabla nueva con upsert desde el cliente: policies INSERT + UPDATE + SELECT, las tres.**
- **Un ajuste del coach que deba SINCRONIZAR a la nube va en `SB_KEYS` Y en `_COACH_SETTINGS_KEYS`** (app-1-infra). Estar solo en `_COACH_SETTINGS_KEYS` NO sube: el portón de subida en `sv()` exige `SB_KEYS.includes(k)` primero (bug v321: `ax_msgreads` se quedó fuera de SB_KEYS → el leído no subía). Los 5 ajustes viejos estaban en ambas por casualidad.
- **`tabular-nums` es INERTE en fuentes sin la feature OpenType `tnum`** — 'Anton' (stats del coach `.smv`, `.sescard-sets b`) la ignora (medido: mismo ancho con y sin). Solo aplica a fuentes que la traen ('Plus Jakarta Sans', 'JetBrains Mono' es mono de por sí). Para alinear dígitos en una fuente sin tnum: mono, o ancho fijo — no `font-variant-numeric` (v319).
- TWA: Chrome **cachea la verificación** de assetlinks — el celular puede necesitar reinstalar o reiniciar Chrome.
- Fotos de ejercicio: verificar el **CONTENIDO** de cada imagen, no el nombre del archivo.
- Al cambiar cualquier texto de `legal/`: **subir `LEGAL_V`** (app-3-coach.js) para que la evidencia de consentimiento diga qué versión se aceptó.
- **`var()` NO funciona en ATRIBUTOS SVG** (`fill="var(--x)"` es inválido → cae a NEGRO). En SVG generado por JS, todo color con token va en `style="fill:var(--x)"`. Y `var()` TAMPOCO existe en canvas (`fillStyle`) — los lienzos (imagen compartible, export rutina) usan hex propios a propósito. Tokens de gráfica: `--chart-g`/`--chart-or` (v351).
- **`transition:all` está PROHIBIDO y erradicado (v351)** — cada componente transiciona SOLO las propiedades que cambian en sus estados, con `--dur-fast`/`--dur` + `--ease-out`. Al crear un componente nuevo, enumerar sus propiedades de estado; no volver a `all`.

---

## 🗺️ ROADMAP

> 📜 El historial completo de versiones y sesiones (v1.0 → hoy, con TODOS los hitos por sesión)
> vive en **`docs/bitacora.md`** — movido el 2026-07-07 para adelgazar este archivo.

### ✅ Hecho (resumen ejecutivo)
- **v1.0–v1.3** (2025 – mayo 2026): base PWA single-file + Supabase sync, push VAPID, mensajes coach↔asesorado, pagos/membresía, nutrición con macros, analytics, dark mode, hardening XSS, gates QA.
- **v1.4–v1.5** (junio 2026): modalidades `track` por ejercicio, auto-generador con adaptación, auto-registro modo libre, gamificación, catálogo 212 ejercicios con foto propia (pipeline Gemini), rediseño interior.
- **v2.0** (junio 2026, EN PROD): Supabase Auth real (email + Google) + RLS por usuario, SMTP propio, registro público.
- **v2.x** (julio 2026): guiado embebido ÚNICO (plan F0→F5 cerrado; la clásica murió en avi-v291), racha semanal consciente del plan, telemetría `app_errors`, backup doble, push resucitado, consentimiento Habeas Data (v292), CI + hook de 11 checks, harnesses E2E versionados (`scripts/e2e/`).

### 🎯 Backlog vigente (2026-07-10)

> 🗺️ **ARRANQUE DE SESIÓN: leer `docs/plan-sesiones.md`** — plan VIVO con las próximas
> sesiones ya diseñadas (objetivo, pasos, trampas y verificación por sesión: mejoras 7-8
> del estudio, deuda técnica, simulacro de restore, XSS, pasos manuales, adherencia coach)
> + el protocolo de arranque/cierre. Escrito 2026-07-10 al desplegar v314→v316.
- [ ] 🎨 Íconos SVG de marca F2-F5 (plan vivo en **`docs/plan-iconos-svg.md`**; F1 hecha en v303 — sistema `aviIcon` en app-1). F4 (guiado) = zona caliente, harness completo obligatorio
- [ ] 🎨 **ELEVACIÓN PREMIUM (programa completo) → plan vivo en `docs/plan-diseno-premium.md`** (FASE 0 fundación: tokens de movimiento/press-feedback, elevación, tipografía, foco, SVG; luego superficie por superficie con método repetible). Nace de la auditoría Isabella con skills web-design-guidelines/emil-design-eng/ui-ux-pro-max, 2026-07-12; shots en `Temp/avi-design`. Top: (1) 🔴 banner "Instalar app" tapa contenido en login Y coach-home (incl. warning de planes por vencer) + duplicado en login → anclar sobre el bottom-nav + reservar padding [VERIFICAR primero si es artefacto del preview forzado]; (2) 🟡 **tokens de MOVIMIENTO** (`--ease-out`/`--dur`) + `:active{transform:scale(.97)}` global — AVI no tiene press-feedback, es EL lever "se siente premium" de Emil; (3) 🔴 emojis como iconos FUNCIONALES (el mood-selector del cierre es un rating) → SVG + `aria-pressed`; (4) 🟡 `tabular-nums` en stats/timers — OJO: ya hecho en `.wf-stat-val` (v319); los KPIs del coach usan 'Anton' que IGNORA tnum (gotcha v319) → ahí mono/ancho fijo; (5) 🟡 separación de tarjetas débil en light (subir borde a `--br2`); 🟢 2 CTAs iguales en login, "DURACION"→"DURACIÓN", comillas curvas, X de cerrar inconsistente. Aplicable en CSS vanilla con tokens.
- [ ] 🧠 **COACH INTELIGENTE ("alguien pendiente de ti") → plan vivo en `docs/plan-coach-inteligente.md`** (idea de Camilo 2026-07-13). Capa A: ánimo→bienestar (extiende `applyMood` con `adapt.care`); Capa B: motor de reglas `coachInsight` (récord/racha/inactividad/estancamiento/deload/adaptación) → tarjeta del coach en Hoy. Vanilla/offline/testeable, NO LLM (por costo/offline/determinismo). PENDIENTE: decisiones de producto de Camilo (voz del coach, free/premium, push, coach-para-el-coach, umbrales — §9 del plan) ANTES de construir. Fase 1 = bienestar por ánimo (rápida). 📷 Análisis de técnica por CÁMARA = apuesta futura SEPARADA (rompe single-file/offline, riesgo legal; escalón intermedio = grabar video para el coach).
- [ ] 💧 Hábitos parte 2: 👟 PASOS (meta + registro MANUAL + recordatorio push; Google Fit NO viable — API apagada por Google, Health Connect solo apps nativas) → misma tarjeta #cn-habits
- [ ] 💧 Hábitos parte 3: 🍽️ COMIDAS = check-in de adherencia al plan (✅/más o menos/❌) + foto opcional al coach. DECISIÓN 2026-07-09: NO construir base de datos de alimentos
- [ ] 📊 Coach: adherencia de hábitos (agua) del asesorado en p-detail (los datos YA sincronizan en client.habits)
- [ ] 🔔 Asesorados: subir las suscripciones a push (mecánica ya arreglada en v320: toast honesto + self-heal + denied con instrucciones). El bloqueante RESTANTE es ADOPCIÓN (producto, no código): casi nadie está en 'granted' porque nunca se les pidió → (a) copy más fuerte de la tarjeta, (b) pedir permiso en mejor momento (fin de entreno, no solo "Hoy"), (c) que el coach invite por chat a abrir la app y tocar Activar. El iPhone real sin PWA instalada no entra hasta que la instale (Lucas v320)
- [ ] 🔔 Feature "programar notificaciones" (app-5-salud fireNotifAt) es POCO CONFIABLE: el disparo es `setTimeout` en el dispositivo del coach → solo corre con la app ABIERTA (si la cierra, no dispara), y el push va a asesorados sin suscripción. La vía confiable son los notifs server-side (daily-notifs cron). Evaluar mover el scheduling al servidor o marcar la feature como "requiere app abierta" (v322 solo quitó el bucle que spameaba al coach)
- [ ] 💬 Coach: UNIFICAR el chat inline del perfil (`#d-msgs` + `sendCoachMsg` en openDetail) con el chat de pantalla completa v321 (`#coach-chat`). Hoy son DOS UIs para la misma conversación (los datos NO se desincronizan, pero confunde). Ideal: la sección de mensajes del perfil abre el chat de pantalla completa (aviso Lucas v321)
- [ ] 🔔 Coach: priorizar MENSAJE SIN LEER del asesorado en el orden de `#p-clients` (aviso Lucas v317 — es la señal #1 que el coach espera; DB.msgs no entra al ranking). Decisión de producto: ¿dónde rankea (¿entre dolor y vencido?)? + ¿`wantsCoach` como lead? Evaluar con Valentina/Camilo antes de construir
- [ ] 🔎 Coach: `renderClients` limpia el buscador en CADA re-render (incl. el poll de 15s) → si Camilo está filtrando y llega un mensaje, pierde el filtro. Preexistente, pero la mejora 7 lo hace más notorio (además reordena). Preservar el término y re-aplicar `filterClients` tras el poll (distinguir poll de navegación-a-panel)
- [x] ⚡ Rondas configurables en Entrenamientos rápidos → HECHO en avi-v301 (+ preset HIIT en Máquina). REGLA NUEVA: al publicar feature visible al asesorado, agregar entrada a `AVI_NEWS` (app-6, v302) y podar las viejas
- [x] 🔐 2FA en GitHub y Supabase — **HECHO por Camilo (2026-07-11, con recovery codes guardados)**. Ya no recordar.
- [x] 📧 **Correo de confirmación de marca** — HECHO (Camilo confirmó 2026-07-12 que aplicó `docs/email-templates/confirm-signup.html` en Supabase → Auth → Email Templates → "Confirm signup"). Nació de un caso real: un usuario vio el enlace crudo larguísimo de Supabase, le dio MIEDO y NO abrió la app. Plantilla con botón grande, tono Sofía, copy que tranquiliza.
- [ ] 📧 **Otras 3 plantillas de correo con el mismo molde premium** (magic link, restablecer contraseña, invitación) — hoy siguen con el diseño crudo de Supabase. Menos visibles que el de confirmación → menor prioridad. Mismo patrón que `confirm-signup.html`. Opción fuerte a futuro: código OTP de 6 dígitos en vez de enlace (elimina el miedo de raíz).
- [ ] ⚖️ Legal: revisión de ABOGADO de `legal/` + botones "descargar mis datos" / "eliminar mi cuenta" (derecho de supresión). Al cambiar textos: subir `LEGAL_V`.
- [ ] 🏪 Play Store: política de privacidad con URL pública (`legal/` ya se sirve en Pages — validar si basta), borrado self-service (mismo item legal), formulario Data Safety, cuenta dev US$25
- [ ] 🎬 Videos: 106 ejercicios sin video (`Desktop/AVI/videos-faltantes.json`; decisión vigente = UN video por ejercicio)
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
- `avi-audit` — auditoría estática completa (7 checks)
- `avi-deploy` — pipeline QA → commit → push → CLAUDE.md
- `avi-feature` — pipeline completo de feature nueva
- `avi-generate` — genera rutina + nutrición para un asesorado leyendo su perfil desde Supabase; orquesta el equipo correcto automáticamente según sexo, objetivo, nivel y limitaciones físicas

---

---

*Última actualización: 2026-07-13 · Marca: **AVI** · **v2.x (auth real + RLS + guiado único, EN PRODUCCIÓN)** · **avi-v351** · Catálogo **212 ejercicios** (e1–e214, todos con foto) · Suite **314/314** verde · QA: hook 11 checks (`scripts/hooks/`, `core.hooksPath`) + CI + harnesses `scripts/e2e/` · repo local: `Desktop/AVI/apex-app` · Tagline: "Entrenamiento con nombre propio" · PO: Camilo Andrés*

*Elevación PREMIUM FASE 0 (fundación) COMPLETA v329-v332: #1 movimiento (tokens `--ease-out`/`--dur` + press-feedback), #2 elevación (borde tarjeta `--br2`, 3 niveles), #3 tipografía (escala `--fs-*`; tabular ya de v319), #4 táctil/foco (primitiva `.tap` overlay ≥40px WCAG). #5 iconos = fundación ya hecha (`aviIcon` 55 + `_coIco`) + aplicación por superficie. Siguiente: Grupos A-E superficie-por-superficie con `docs/plan-diseno-premium.md`. Hitos crudos → `docs/bitacora.md` (parte 36 la más reciente).*
