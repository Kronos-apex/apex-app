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

> **⚖️ CONTRATO DE EJECUCIÓN → `docs/reglas-opus.md` (LECTURA OBLIGATORIA antes de ejecutar
> cualquier feature/fix).** Reglas INVIOLABLES estipuladas por Fable a pedido del PO (2026-07-18):
> qué hacer antes de tocar código (supuestos vs datos reales), cómo ejecutar (pureza, vías
> sancionadas, barra premium), cómo verificar (sabotaje obligatorio, prohibido callar tests,
> cinturón por zona caliente) y el ciclo con Fable (nada está "hecho" sin su veredicto).
> Actualizables SOLO por enmienda de Fable/PO (§E del doc).

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
├── supabase/functions/refresh_snapshot/   ← Edge Function: snapshot de constancia server-side de comunidad (decisión #7)
├── supabase/community/                     ← Migraciones+harness de Comunidad (c1/c2/c3, aplicadas por MCP; artefactos versionados)
├── app-7-community.js                      ← Módulo COMUNIDAD (idea #5, Fase 1): pestaña #cn-community del asesorado
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
- `#p-home` — Dashboard: MRR, activos, sesiones semanales, retención SVG, banner de vencimientos próximos, asesorados prioritarios (vencidos primero). **v369/fix v371 tarjeta `#h-mytraining` «Mi entrenamiento»:** Camilo entrena con «Mi entrenamiento» (COACH_SELF, guardado en SU PROPIA fila `COACH_OWN_ROW`, NO en un cliente) → la tarjeta lee de ahí AUTOMÁTICAMENTE (sin marcar nada) y muestra racha/semana/último + «Ver mi entrenamiento →» (`openMyTraining`). `myTrainingSummary` puro en avi-core; `renderMyTrainingCard` en app-2. (v369 leía de un cliente marcado `ax_selfclient` — assumption errada: Camilo no entrena en un cliente → la tarjeta NUNCA salía; fix v371 eliminó la designación)
- `#p-clients` — Lista con búsqueda + badge de membresía
- `#p-detail` — Detalle: rutinas, mensajes, historial, progreso, mensualidad, nutrición, medidas, fotos
- `#p-templates` — Biblioteca de plantillas reutilizables
- `#p-exercises` — 212 ejercicios precargados (e1–e214, sin e32/e38; e141–e164 = principiante peso corporal casa/parque; **e165–e214 = 50 nuevos: 16 movilidad/calentamiento + 25 HIIT/funcional + 9 antebrazo/trapecio/grip**, con imagen 1:1 + mapa muscular + modalidad), filtros por músculo. El generador aplica **gate por nivel** (`EX_LEVEL`/`_levelGate` en avi-core.js): Principiante solo P, Intermedio P+I, Avanzado todo
- `#p-msgs` — Bandeja con badges de no leídos

### Secciones del Asesorado (6)
- `#cn-today` — Entrenamiento del día + activación auto + timer. **v366/v367:** si ya TERMINÓ un entreno hoy (`finishedTrainingToday` → exige sesión FINALIZADA `finishedAt`, CUALQUIER rutina cuenta) → colapsa el entreno en la tarjeta `.trained-card` («Ya entrenaste hoy» + «Entrenar otra vez»/«Ver rutinas»); agua/pasos quedan arriba sin scrollear. **Fix v367 (bug cazado por Fable):** una sesión PARCIAL en curso (el auto-guardado de la 1ª serie fecha hoy) NO debe disparar la tarjeta — antes pisaba el entreno al re-renderizar (cambiar ánimo/reordenar/dolor/poll del coach). `sessionFinished(s)` = `finishedAt` o 100%. `CUR.trainAgain`/`overrideRoutine` permiten entrenar de nuevo. **v368 «día que se corrió»:** si una rutina de un día YA PASADO de esta semana quedó sin entrenar → tarjeta `#cn-missday` («Te quedó pendiente esta semana») con 3 acciones: «Entrenar hoy» (override, plan intacto, reusa `startRoutineNow`) · «Mover a hoy en mi plan» (`missMoveToday` = SWAP de días + `sv('ax_c')`) · «Hoy no» (`missMute`, mute por-rutina-por-semana en `ax_missmute_<cid>`, LOCAL). Motor puro `weeklyMissed(client,sessions,now)` en avi-core (día real dayOrder<hoy, no entrenada esta semana por id/nombre). Se calla con override/trainAgain/finishedTrainingToday
- `#cn-routines` — Todas sus rutinas (no solo la del día)
- `#cn-messages` — Chat con el coach
- `#cn-history` — Historial (hasta 365 sesiones) + gráfica volumen + progreso por ejercicio/modalidad
- `#cn-profile` — Foto de perfil propia, peso corporal, PRs, datos, fotos progreso, medidas (progressive disclosure: oculta tarjetas vacías)
- `#cn-gamif` — Gamificación: nivel permanente (1–5, no se reinicia) + logros (el descuento por adherencia se eliminó el 2026-07-06)
- `#cn-community` — **COMUNIDAD (idea #5, Fase 1 · C3, avi-v373)** — 6ª pestaña. Perfil público OPT-IN (apodo/avatar/código) + amigos por código + ❤️ + bloquear/reportar. **Online-only** (degrada con «Conéctate para ver a tu gente», nunca bloquea entrenar), **gratis para todos los tiers**. Todo en `app-7-community.js` (objeto `CMTY` + `renderCommunity`). Los datos SENSIBLES (peso/fotos/salud/kilos) NUNCA salen de `user_data`: la comunidad vive en tablas `community_*` (C1, RLS estricta). **Snapshot de constancia (racha/nivel/hoy) es SERVER-SIDE** (edge `refresh_snapshot`, decisión #7 → el cliente no lo infla), refrescado con debounce (`cmtyShouldRefresh` 30min) al abrir la pestaña y al terminar entreno. Toda escritura por `AUTH.client()` y SELLADA en localhost (`_cmtySealed`). `esc()` en handle/bio; avatares solo si `cmtyAvatarOk` (prefijo del bucket). NADA en SB_KEYS. Consentimiento propio `CMTY_CONSENT_V` + gate 18/representante. **Solicitud pendiente:** su identidad se muestra vía `friendships.req_handle` (el trigger la graba del perfil del solicitante — la RLS solo deja leer el perfil de un amigo ACEPTADO). **Falta C4 (legal/cierre).**

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
    v362: el turno de la tarde APENDE «¿ya registraste tu agua y tus pasos?» si no registró hoy (lee profile.habits de user_data)
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
// ax_msgreads viaja en coach_settings (está también en _COACH_SETTINGS_KEYS)
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
  → recuperar el ritmo (caso real de Astrid). `shockTargets(sessions,client,now)`: con 3+ estancados
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
- **PowerShell 5.1 `Set-Content`/`Out-File -Encoding UTF8` METE BOM** (EF BB BF al inicio) → rompe el arranque si cae en index.html/sw.js. Al hacer un replace masivo (ej. bump `?v=`) usar `[System.IO.File]::WriteAllText($p,$t,[System.Text.UTF8Encoding]::new($false))`, y verificar los 3 primeros bytes después (bug 2026-07-15 en el deploy v352: el bump metió BOM, se re-guardó sin él).
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
- **Un guard anti-ráfaga por timestamp (`ts > _msgNotifSince`) NO debe usar `Date.now()` como fallback cuando falta el timestamp** — un ítem SIN fecha (legacy/degradado) tomaría la hora actual, siempre parecería "nuevo" y RE-NOTIFICARÍA en cada sesión (bug v359: el coach recibía los 21 leads viejos de "quiere coach" cada vez que abría la app, porque los leads sin `wantsCoachAt` burlaban el guard). Fallback correcto = **0** (época): sin fecha = no es nuevo. Además el poll del coach NO persiste `local.wantsCoach` a `ax_c` → re-detecta los leads cada sesión (benigno una vez arreglado el guard). Para reproducir lógica de polls: harness que stubbea `UD.loadCoachClients` y espía `notifNewMessage` (`_verify-coachlead.mjs`); usar `ev` (awaitPromise+returnByValue), NO `evj`, para expresiones async (evj hace `JSON.stringify` sobre la promesa sin resolver → `[object Object]`).
- Timers SIEMPRE por **timestamp absoluto** (`endAt`), nunca por conteo de ticks — iOS congela intervalos en background.
- **`new Date(null)` devuelve EPOCH (1970-01-01), NO `Invalid Date`** — así que `isNaN(new Date(x).getTime())` NO ataja un `null`/campo faltante (sí ataja `undefined`, `''` y strings basura). Un `date:null` colado como fecha válida da resultados absurdos silenciosos («Entrena desde diciembre de 1969», hallazgo #5 `training_since` 2026-07-23). **Regla: al derivar un mínimo/primera-fecha de una lista, atajar `raw == null || raw === ''` ANTES de `new Date(raw)`, no solo `isNaN`.** Inofensivo para agregados de ventana (epoch nunca cae en «últimos 28 días» ni es «hoy»), venenoso para min/antigüedad. Espejo en avi-core + edge `refresh_snapshot` + `c2_parity_snapshot.cjs` (la paridad exige el mismo guard en los tres).
- Push: tras cambios de auth, los asesorados/coach recuperan la suscripción **al ABRIR la app una vez** — quien no la abra queda sin notificaciones hasta entonces. **v318:** la del COACH murió en el cutover y no se auto-reinsertaba → tarjeta "Activa notificaciones" en su home + `ensureCoachPush` self-heal forzado + `send-push` poda 410/404. La RLS `push_ins_own` permite `_coach` solo con el UID del coach.
- **Escrituras AUTENTICADAS a Supabase van por el CLIENTE (`AUTH.client().from('tabla').upsert/insert`), NUNCA por `fetch` crudo con `Bearer ${getSession().access_token}`.** El token extraído a mano se VENCE y no se refresca → PostgREST lo trata como anónimo → la RLS rechaza (bug v323: `subscribePush` con fetch crudo → CERO asesorados suscritos por meses, cientos de "violates RLS" en logs). El cliente refresca el JWT solo. Para filas atadas al usuario, usa `auth.getUser().id` como client/user_id, no un valor local que pueda desfasarse.
- **Un `upsert` (`.upsert()` / `INSERT ... ON CONFLICT DO UPDATE`) EXIGE política de SELECT, no solo INSERT/UPDATE.** Postgres necesita LEER la fila para resolver el conflicto → sin policy SELECT, RLS la oculta y el upsert se rechaza con `insufficient_privilege` (HTTP 403). **Root cause REAL de los meses sin push (cazado 2026-07-12):** `push_subscriptions` tenía `push_ins_own` + `push_upd_own` pero **NO** una policy SELECT → TODO upsert de suscripción (coach y asesorados) daba 403, aun con el cliente autenticado y el UID correcto. v323 (fetch→cliente auth) era necesario pero NO suficiente: el token nunca fue el bloqueante final, era la policy que faltaba. Fix = migración `push_subscriptions_add_select_policy` (`push_sel_own`, mismo alcance que ins/upd). Síntoma diagnóstico: en logs API `POST /rest/v1/<tabla>?on_conflict=... → 403` mientras `POST /rest/v1/user_data → 200` en la MISMA sesión (user_data SÍ tiene policy SELECT). Verificación de raíz: impersonar el JWT con `set local role authenticated` + `set_config('request.jwt.claims', ...)` y probar el upsert en una transacción que hace `rollback` — INSERT suelto pasa, upsert falla, con policy SELECT temporal pasa. **Para GATEAR pertenencia/permisos NUNCA uses un campo que el CLIENTE escribe.** `user_data.coach_id` y `profile.tier` son **escribibles por el cliente** (verificado 2026-07-20, PATCH→200; `coach_id` así lo usa `requestCoach`, `tier` vive en `profile` jsonb que el cliente sincroniza). Derivar «es de mi gym» / «es premium» de ellos = un extraño se auto-asigna y se cuela (hallazgo Fable F7 en C5). La membresía/permiso debe vivir en una tabla que **solo el rol autorizado escriba** (C5: `community_gym_members`, INSERT solo del coach + el miembro debe tenerlo como `coach_id` para que el coach real pueda agregarlo pero no un «gym falso»). **Al crear cualquier tabla nueva con upsert desde el cliente: policies INSERT + UPDATE + SELECT, las tres.** **(2026-07-20: la MISMA regla aplica a STORAGE — el bucket `avatars` de comunidad daba HTTP 400 "new row violates RLS" en la subida con `x-upsert:true` por faltarle policy SELECT; el upsert necesita LEER el objeto para resolver el conflicto. Fix = `avatars_select_own` SELECT ACOTADA a `foldername[1]=auth.uid()` → arregla el upsert sin habilitar enumeración. Reproducido: x-upsert→400, sin upsert→200; con la policy→200.)**
- 🔴 **Una policy de INSERT restrictiva NO basta si el grant de UPDATE es amplio: el cliente edita la fila hasta el estado que el INSERT le prohibía.** `cpost_ins` exigía `kind='routine'` al publicar, pero `authenticated` tenía `grant update` sobre TODAS las columnas de `community_posts` y `cpost_upd` solo pedía `user_id=auth.uid()` → un cliente publicaba una rutina legítima y luego `UPDATE ... SET kind='streak', payload='{"weeks":52}'` se fabricaba un hito falso «Cumplió 52 semanas» (el trigger valida el payload como hito bien formado y lo acepta). Reproducido contra prod (hallazgo de Fable al estipular v3, hotfix `c13c` 2026-07-22). **Regla: cuando una policy de INSERT restringe un valor (kind/tier/role/estado), el grant de UPDATE debe recortarse por COLUMNA a lo que el cliente realmente necesita editar** — aquí solo `visible` (`revoke update ... ; grant update(visible) ...`). El frontend solo insertaba/borraba posts; nadie los editaba, así que el UPDATE amplio era superficie muerta explotable. Al crear una tabla con INSERT gateado: audita SIEMPRE el grant de UPDATE en paralelo.
- 🔴 **`community_profiles` tiene el SELECT a nivel de COLUMNA (`c10_grant_hardening`) → toda columna NUEVA que el cliente deba LEER necesita su `grant select(col)` explícito. El `grant update(col)` NO implica lectura.** Si falta, pedir esa columna da `permission denied for table community_profiles` → `cmtyLoad` lanza → **la pestaña Comunidad entera cae al estado «Conéctate para ver a tu gente»** (parece un problema de red del usuario; no lo es). Pasó con `show_milestones` en c13 (2026-07-22): la migración dio UPDATE pero no SELECT y rompió Comunidad para TODOS en producción hasta el hotfix `c13b`. Reproducido y probado load-bearing revocando/re-otorgando el grant en una tx. **Checklist al agregar una columna a `community_profiles`: (1) ¿la lee el cliente? → `grant select`; (2) ¿la escribe? → `grant update`; (3) correr `_verify-feed`/`_verify-community` CONTRA PROD, no solo con el cliente falso del harness — los harness stubbean `AUTH.client()` y por eso NO cazan un grant faltante.**
- **Matrices de sabotaje RLS: 3ª trampa — un fixture que un TRIGGER reescribe.** Al montar el estado de prueba con un `insert` directo, si la tabla tiene un trigger de estado, el valor que pusiste NO es el que queda: `follows` con `state='active'` hacia un perfil PRIVADO queda en `pending` (`_community_follow_state`) → el "seguidor aprobado" nunca existió y el caso debe-PASAR sale falso (parece bug de visibilidad, es el fixture). Un seguidor aprobado se crea como en la app: insert (pending) + **UPDATE a 'active'** (lo que hace `cmtyApproveFollow`). Regla: tras montar el fixture, **SELECT el estado real** antes de concluir nada (R2 hitos, 2026-07-22). Bonus del hallazgo: quedó probado que un seguidor `pending` no ve nada.
- **Matrices de sabotaje RLS (impersonación en tx con rollback): 2 trampas que dan falsos resultados.** (1) **Falso-positivo por relación previa:** al elegir actores REALES para probar "quién ve a quién", si el par ya es amigo/mismo-gym la visibilidad es LEGÍTIMA (no fuga) — el 1er test de ④ dio `_profile_visible(seguidor,menor)=true` y parecía fuga; era que `0a64`↔menores YA eran amigos+gym. Regla: para probar UNA rama de visibilidad, usa actores **100% sintéticos SIN relación previa** (insert a `auth.users` solo pide `id`; a `community_profiles` `user_id`+`handle`+`consent_v`), no actores reales cuyo grafo no controlas. (2) **Todos los inserts fallan uniformemente por FK, no por policy:** `community_reactions.from_user/to_user` tienen FK a `community_profiles` → para reaccionar hay que ser MIEMBRO; un actor sin perfil hace fallar el INSERT por FK ANTES de evaluar la policy → los "debe-bloquear" salen bien y los "debe-pasar" mal (patrón delator: TODO falla). Da perfil a TODOS los actores del test de reacciones. Verifica que un caso "debe-PASAR" efectivamente pasa (si falla, distingue FK de policy antes de concluir).
- **Un ajuste del coach que deba SINCRONIZAR a la nube va en `SB_KEYS` Y en `_COACH_SETTINGS_KEYS`** (app-1-infra). Estar solo en `_COACH_SETTINGS_KEYS` NO sube: el portón de subida en `sv()` exige `SB_KEYS.includes(k)` primero (bug v321: `ax_msgreads` se quedó fuera de SB_KEYS → el leído no subía). Los 5 ajustes viejos estaban en ambas por casualidad.
- **`tabular-nums` es INERTE en fuentes sin la feature OpenType `tnum`** — 'Anton' (stats del coach `.smv`, `.sescard-sets b`) la ignora (medido: mismo ancho con y sin). Solo aplica a fuentes que la traen ('Plus Jakarta Sans', 'JetBrains Mono' es mono de por sí). Para alinear dígitos en una fuente sin tnum: mono, o ancho fijo — no `font-variant-numeric` (v319).
- **`wa.me/<número>` EXIGE indicativo de país** (E.164 sin '+'). Un móvil colombiano guardado sin `+57` («300 123 4567») da `wa.me/3001234567` = enlace INVÁLIDO que WhatsApp no reconoce (bug de clase v365 que afectaba `whatsappReminder`/`whatsappNudge`/`coachInviteOpenApp`). **Fix único:** `waPhone(raw)` (avi-core, puro) normaliza — móvil CO de 10 dígitos que empieza por 3 → antepone 57; ya con indicativo o internacional → intacto; vacío → '' (caller cae a `wa.me/?text=`). **Cualquier `wa.me` nuevo pasa por `waPhone`, jamás por `replace(/\D/g,'')` a pelo.**
- TWA: Chrome **cachea la verificación** de assetlinks — el celular puede necesitar reinstalar o reiniciar Chrome.
- Fotos de ejercicio: verificar el **CONTENIDO** de cada imagen, no el nombre del archivo.
- Al cambiar cualquier texto de `legal/`: **subir `LEGAL_V`** (app-3-coach.js) para que la evidencia de consentimiento diga qué versión se aceptó.
- **`var()` NO funciona en ATRIBUTOS SVG** (`fill="var(--x)"` es inválido → cae a NEGRO). En SVG generado por JS, todo color con token va en `style="fill:var(--x)"`. Y `var()` TAMPOCO existe en canvas (`fillStyle`) — los lienzos (imagen compartible, export rutina) usan hex propios a propósito. Tokens de gráfica: `--chart-g`/`--chart-or` (v351).
- 🔴 **Todo estado en MEMORIA o en localStorage que dependa de QUIÉN inició sesión debe limpiarse en `logout()` — y llevar el uid en el nombre de la clave.** Bug reportado por el PO (2026-07-25: «en el perfil de Astrid aparecía el mío») y **ARREGLADO en avi-v398**. `logout()` limpiaba `ax_session` y `_pushCtx` pero **no recarga la página** y no tocaba `CMTY`: como `renderCommunity()` corta con `if(!CMTY.loaded) cmtyLoad()`, la 2ª cuenta de la misma pestaña veía los datos de la 1ª (perfil, código, amigos y la **bandeja de DMs**). Gemelo en disco: `ax_cmty_cache`/`ax_cmty_probe`/`ax_cmtynudge`/`ax_cmty_refresh` eran claves GLOBALES del dispositivo con datos de terceros y sobrevivían al logout Y a la recarga. **Las 4 reglas que dejó el fix, aplicables a cualquier módulo nuevo:** (1) el estado inicial se declara en una **fábrica** (`_cmtyBlank()`), no en un literal suelto, y el reset lo vuelve a pedir entero + borra las claves que no estén en el molde → un campo nuevo queda cubierto solo; (2) toda clave local con datos de otra persona lleva el uid (`cmtyLocalKey(base,uid)`, PURA en avi-core; **sin uid devuelve null y no se lee ni se escribe** — callar es mejor que mostrar lo del anterior); (3) el reset se llama desde `logout()`, que además limpia el uid de sesión (`_authUid`); (4) **un candado de identidad no basta en el camino asíncrono**: `renderCommunity()` corta ANTES de `cmtyLoad`, así que un cambio de cuenta que no pasa por `logout()` (sesión vencida, vuelta de OAuth, otra pestaña) exige un candado **SÍNCRONO** en el render (`_cmtyIdentityGuard()`, uid de sesión vs. guardado) además del asíncrono en `cmtyLoad`/`cmtyAdoptionProbe`. Regresión permanente: `scripts/e2e/_repro-cmty-identity.mjs` (6 checks, incluye cambio de cuenta sin logout y separación real de claves en disco).
- **Un valor que vive DUPLICADO entre `avi-core.js` y una edge function necesita un check ESTÁTICO que los compare** — no se pueden importar entre sí (navegador vs Deno) y nada avisa cuando se separan. `STREAK_MILESTONES` está en los dos lados: si se desalinean, la app le PROMETE al asesorado un logro que el servidor nunca emite (A4, 2026-07-25 → test que lee la edge y compara). Mismo patrón que la paridad de `communitySnapshot` (`c2_parity_snapshot.cjs`), pero dentro de la suite, que sí corre en cada commit.
- **`weekStreak(sessions, target, now)` devuelve un OBJETO `{weeks,thisWeekDays,target,metThisWeek}`, NO un número.** Pasarlo entero a algo que espera semanas da `NaN` en silencio y la feature simplemente no aparece nunca (cazado por harness en A4 antes de producción; se usa `.weeks`). Ojo con las funciones de avi-core que devuelven objeto: `weekStreak`, `myTrainingSummary`, `communityPeersLine`, `shockPlan`.
- **Al BORRAR una función, `grep` en `scripts/` antes: un harness puede estar usándola como SONDA.** `scripts/smoke.mjs` afirmaba que app-6-extra había cargado con `typeof openGuidedMode==='function'`; esa función se borró en la auditoría de v350 (`6f8af92`) y **el smoke quedó en rojo permanente de v350 a v393** sin que nadie lo notara — un gate que siempre falla deja de ser señal y se vuelve ruido que se aprende a ignorar (arreglado 2026-07-25: sonda → `openGuidedEmbedded`, el sucesor vivo, probada por sabotaje). `docs/metodologia.md` YA advertía «no borres `openGuidedMode` sin actualizar el smoke» y pasó igual → la advertencia en prosa no basta. **Regla: sonda rota se arregla en el MISMO commit que borra la función.** Corolario al diagnosticar: si un gate falla, primero repróducelo en un **worktree limpio en HEAD** (`git worktree add`) antes de culpar a tu cambio — y si el arreglo es tocar la aserción, di POR QUÉ en el commit (nunca callar un test para que pase, R2.2).
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
- [~] 🌐 **COMUNIDAD (idea #5) → plan vivo en `docs/plan-comunidad.md`** (Fase 1 en curso). **C1+C2+C3 EN PROD (avi-v373, PENDIENTE re-verificación de Fable).** C1 tablas+RLS (community_profiles/friendships/community_reactions/community_reports + RPC resolve_share_code), C2 snapshot server-side (edge `refresh_snapshot`, decisión #7) + bucket `avatars` + delete-account v4, **C3 UI del asesorado (6ª pestaña `#cn-community`, `app-7-community.js`): opt-in+consentimiento, amigos por código, ❤️, bloquear/reportar, offline**. **Falta C4** (texto legal + `LEGAL_V` + radar de adopción). Ranking/feed = Fase 2 (solo si Fase 1 pega). Migraciones en `supabase/community/` (aplicadas por MCP).
- [~] 🧠 **COACH INTELIGENTE ("alguien pendiente de ti") → plan vivo en `docs/plan-coach-inteligente.md`** (idea de Camilo 2026-07-13). **Fases 1+2+3+4+4.1+4.2 EN PROD (avi-v356, 2026-07-16):** Capa A = `adapt.care` (bienestar por ánimo) → "Para cuidarte hoy" en `moodBannerHtml`; Capa B = motor puro `coachInsight` (8 señales: inactivo/deload/récord/racha/estancado/adaptación/peso/agua, prioridad+mute+free/premium) → tarjeta `#cn-coach-card` en Hoy; **Pulso del coach** = `coachPulse` puro → tarjeta `#h-pulse` en el Inicio del coach (motivos positivos para escribirle a cada asesorado, sin inactividad). **Fase 4 = PLAN DE CHOQUE** (`shockPlan`/`applyShockOption` puros → `#d-shock` en la ficha): al detectar una meseta, AVI propone 2-3 protocolos (descarga y remonta / 5×5 / rotar variante) con candados de dolor y limitación; el coach aplica en 1 toque y el chat le queda PRELLENADO (lo envía él). **Fase 4.1 = MÚLTIPLES ESTANCAMIENTOS** (`shockTargets` puro → tarjeta multi-sección o modo descarga global): mismo músculo=uno primero, distintos=en paralelo, 3+=fatiga sistémica→semana de descarga. **Fase 4.2 = GATE DE CONSTANCIA (v356)**: el «3+→descarga» solo si viene entrenando parejo (`_recentCadence`); si se estancó por faltas → modo `rebuild` (recuperar ritmo, no descarga). Decisiones de Camilo cerradas (§9). **Falta:** capa LLM opcional (futuro) y push (cuando suba la adopción). 📷 Análisis de técnica por CÁMARA = apuesta futura SEPARADA (rompe single-file/offline, riesgo legal; escalón intermedio = grabar video para el coach).
- [x] 💧 Hábitos parte 2: 👟 PASOS — **HECHO (SESIÓN J, avi-v362, 2026-07-17).** `stepsToday/stepsSet/stepsAdd/stepsWeek` puros en avi-core (meta 8.000 OMS, input SET el total + atajo +1.000, clamp 100.000, poda 30d) → fila verde en `#cn-habits` (ícono `footprints`) + AVI_NEWS v362 + recordatorio server-side en el cron de las 5pm (`daily-notifs`, coletilla si no registró hoy). Falta verificación de Fable. (Google Fit NO viable — API apagada; Health Connect solo apps nativas → registro MANUAL, decidido.)
- [ ] 💧 Hábitos parte 3: 🍽️ COMIDAS = check-in de adherencia al plan (✅/más o menos/❌) + foto opcional al coach. DECISIÓN 2026-07-09: NO construir base de datos de alimentos
- [x] 📊 Coach: adherencia de hábitos (agua) del asesorado en p-detail — **HECHO (SESIÓN I, avi-v361, 2026-07-16, verificado por Fable §25 de plan-coach-inteligente).** Helpers puros `waterAdherence(habits, goal, now)` (⚠️ `now` = objeto `Date`, NO timestamp — hace `getTime()`) y `waterGoalFor(client, nut)` (réplica pura de `_waterGoalFor`) en avi-core; `renderCoachHabitsCard` pinta `#d-habits` en `p-detail` (7 puntos, oculta si 0 días registrados). Harness `_shot-coach.mjs detail` con aserciones duras (exit 1).
- [~] 🔔 Asesorados: subir las suscripciones a push (mecánica ya arreglada en v320: toast honesto + self-heal + denied con instrucciones). ADOPCIÓN (producto): (b) pedir permiso al FIN del entreno **YA EXISTE (v325, `renderWfPushNudge`)** — verificado en la Sesión J. (c) que el coach invite a abrir la app **HECHO (v364, 2026-07-17):** botón 🔔 en la barra de `#coach-chat` → `coachInviteOpenApp()` → WhatsApp si hay teléfono (canal que SÍ alcanza al no-suscrito; el chat interno solo pushea a quien ya está suscrito), si no prellena el chat interno. Queda (a) copy más fuerte de la tarjeta de "Hoy". El iPhone real sin PWA instalada no entra hasta que la instale (Lucas v320)
- [ ] 🔔 Feature "programar notificaciones" (app-5-salud fireNotifAt) es POCO CONFIABLE: el disparo es `setTimeout` en el dispositivo del coach → solo corre con la app ABIERTA (si la cierra, no dispara), y el push va a asesorados sin suscripción. La vía confiable son los notifs server-side (daily-notifs cron). Evaluar mover el scheduling al servidor o marcar la feature como "requiere app abierta" (v322 solo quitó el bucle que spameaba al coach)
- [x] 💬 Coach: UNIFICAR el chat inline del perfil con el chat de pantalla completa v321 — **HECHO (SESIÓN K, avi-v363, 2026-07-17).** La sección Mensajes de `p-detail` deja de tener input propio: PREVIEW de solo lectura (últimos 2 + nota «+N más») + botón «Abrir chat» → `openCoachChat`. Borrada `sendCoachMsg` y el textarea `#msg-in`; un solo lugar para escribir. `renderDetailMsgs` reescrita a preview; `sendCoachChatMsg` ya refrescaba el preview. Harness `_verify-chatunified.mjs` (13) + coach-back 20/20 + shock OK. Falta verificación de Fable.
- [x] 🔔 Coach: priorizar MENSAJE SIN LEER del asesorado en el orden de `#p-clients` — **HECHO (SESIÓN H, avi-v360, 2026-07-16).** `clientAttentionRank`/`sortClientsByAttention` (avi-core) ganaron un `opts={msgs,lastReadTs}` aditivo (puro; sin opts = v317 idéntico). Nuevos tiers: **2 💬 mensaje sin leer** (sev=ms desde el más viejo) · **3 🙋 pidió coach** (lead, sev=días desde `wantsCoachAt`, sin fecha al final — lección v359). `renderClients` arma `optsById` desde `DB.msgs`+`ax_msgreads`. Decisión Camilo D1/D3: ambos debajo de dolor/vencido; unread encima del lead. Suite 376, `_verify-v317` +5 V360.
- [x] 🙋 **Leads «quiere coach» pegados — HECHO (avi-v387, 2026-07-22).** `wantsCoach` vive en la fila del ASESORADO (client-writable, clase F7) → no puede ser el estado de «ya lo atendí»: el celular del asesorado lo revive. El estado se mudó al lado del coach (`ax_leadsdone`, las 3 vías: SB_KEYS + `_COACH_SETTINGS_KEYS` + `_coachSettingsObj().ld` + hidratación con fusión). Motor puro `leadPending(client,leadsDone)` (reaparece si vuelve a pedir DESPUÉS de ser atendido; marca ilegible → fail-VISIBLE). Botón «Ya lo atendí» + cualquier cambio de plan marca atendido (antes solo la rama 'coach' — por eso Hernán y Cristian quedaron pegados desde julio). **ABIERTO:** el PO reporta esos avisos como PUSH AL CELULAR, que esta vía NO explica (`daily-notifs` descartado); hallazgo colateral: **2 dispositivos `_coach` → todo push al coach le llega DUPLICADO**. Falta captura del push para rastrear el emisor.
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

*Última actualización: 2026-07-26 · Marca: **AVI** · **v2.x (auth real + RLS + guiado único, EN PRODUCCIÓN)** · **avi-v401** (edge `refresh_snapshot` **v6**) · Catálogo **212 ejercicios** (e1–e214, todos con foto) · Suite **445/445** verde · QA: hook 11 checks (`scripts/hooks/`, `core.hooksPath`) + CI + harnesses `scripts/e2e/` (`_verify-water` = agua+pasos, `_verify-news` = tour de novedades, `_verify-chatunified` = chat unificado + invitar a abrir la app, `_shot-trained` = ya entrenaste hoy, `_fable-repro-midsession` = regresión tarjeta a media sesión, `_verify-missday` = día que se corrió, `_verify-selftraining` = mi entrenamiento del coach, `_verify-share` = comparte AVI, `_verify-community` = comunidad C3+C5 + A1 prueba social (19, +CM18 pertenencia real al gym), `_verify-cmtynudge` = A2 puerta a Comunidad desde «Hoy» (17), `_verify-gyminvite` = A3 el coach invita al gym por WhatsApp (19, +F4/F5/F6/F14), `_verify-milestoneask` = A4 opt-in de logros en el hito (23, +sesión típica, 0 filas, scroll del cierre), `_verify-dm` = comunidad v2 ① chat en vivo (22), `_verify-lastactive` = comunidad v2 ② última conexión (14), `_verify-public` = ③c-2 cuenta pública (10), `_verify-follow` = ③c-3 descubrir+seguir (11), `_verify-feed` = comunidad v2 ④ muro/feed + re-forma + R2 hitos + entreno terminado (32), `_verify-workoutshare` = compartir entreno (8), `_verify-reports` = bandeja de reportes del coach (11), `_verify-comments` = comentarios del muro v3-a #4 (17), `_repro-cmty-identity` = la identidad de Comunidad NO se hereda entre cuentas (6, P0)) · repo local: `Desktop/AVI/apex-app` · Tagline: "Entrenamiento con nombre propio" · PO: Camilo Andrés*

*COMUNIDAD v3-a #4 COMENTARIOS EN PROD (avi-v390, migración `c16_comments`, PENDIENTE verif Fable): las 3 tarjetas del muro (rutina/entreno/hito) se comentan (regla PO: cualquiera-que-VE; candados de menor en AMBAS direcciones vía `_can_comment`, patrón c8). Sin UPDATE (no se edita). `communityCommentText` pura (espejo del CHECK). Fila común `_cmtyActionsHtml` (❤️+💬+eliminar). Borrador por post sobrevive al repintado. **2 desviaciones:** D1 = el moderador borra por RPC `cmty_mod_delete_comment` (un DELETE de cliente ve 0 filas — misma trampa de c14b, reproducida K10b); D2 = CHECK `btrim<>''`. Matriz K 36/36 contra prod + harness `_verify-comments` 17/17 (sabotaje ×2). Reportar comentario = `context='comment:<id>'`, NO auto-bloquea.*

*COMUNIDAD v3-a #5 PERFIL RICO EN PROD (avi-v391, migración `c17_profile_rich` + edge `refresh_snapshot` v5, PENDIENTE verif Fable — CIERRA el lote v3-a): «N entrenos» en las tarjetas (amigo/gym/descubrir) + «Entrena desde <mes año>» en el perfil propio. 2 columnas server-only `total_sessions`/`training_since` (grant SELECT en el MISMO DDL, lección c13b; sin UPDATE → el cliente no infla). `communityTrainingSinceText` pura (null si falta/ilegible/futura). GOTCHA nuevo: `new Date(null)===epoch`, no NaN → atajar `raw==null||''` antes de parsear (aplicado en core/edge/parity). Paridad core↔edge total. Sabotajes P (P1 write-path, P2 UPDATE denied column-level, P5 c10 intacto) + `_verify-community` CM13 (sabotaje ✓). Diferido §8.4.2: hitos en el perfil (no hay vista de perfil-ajeno aún).*

*COMUNIDAD #6 PR PILOTO EN PROD (avi-v392, migración `c18_pr_posts`, PENDIENTE verif Fable — Opus escribió la estipulación §8-BIS porque Fable la reservó y está sin créditos): compartir un RÉCORD de peso («Sentadilla — 100 kg»), **SOLO EL COACH** por ahora (§6-BIS.3). `kind='pr'`; `cpost_ins` permite pr solo si `_is_moderator AND NOT _is_minor` (gate server-side no falsificable); rama del validador allow-list `{exercise_name,value_kg}` + candado `_is_minor(new.user_id)`. `communityPrPayload` pura = anti-cheat de UX honesto (el valor sale de un PR ya registrado en ax_pr, unit kg; NO se teclea). UI en Ajustes solo-moderador (`CMTY.isModerator` de community_moderators) → confirmación activa por publicación → `cmtyPublishPr`; tarjeta `_cmtyPrCard`. Camilo entra por «Mi entrenamiento». Sabotajes PR1-PR6 contra prod (PR3 candado de menor muerde solo) + harness `_verify-pr` 10/10 (sabotaje ×2). Legal §9 + LEGAL_V/CMTY_CONSENT_V a `2026-07-23-borrador` (pendiente abogado). Desviación D1: sin toggle persistente (confirmación activa es más fuerte para piloto de 1 cuenta). **Lote v3 (0-6) COMPLETO;** falta grupos (arco aparte) + abogado. GOTCHA: la Comunidad del coach se accede vía `openMyTraining` (vista de asesorado con su fila propia).*

*COMUNIDAD PERFIL DE OTRA PERSONA + FOTO EN GRANDE EN PROD (avi-v393, migración `c19_follow_counts`, PENDIENTE verif Fable — pedido repetido del PO que faltaba): tocar nombre/avatar de un amigo/gym/descubrir/autor-de-post → `cmtyOpenProfile(uid)` → vista `CMTY.view='profile'` con avatar grande (zoom si tiene foto vía `cmtyZoomAvatar`, solo bucket propio), handle, insignia coach, bio, rejilla racha/nivel/entrenos/logros/**seguidores/sigue-a**, «entrena desde», y «Sus publicaciones» (reusa `_cmtyPostCard`). `_cmtyAvatarHtml(prof,size,opts)` gana `opts.open`/`opts.zoom`; `_cmtyNameLink`. Backend: RPC DEFINER `cmty_follow_counts(target)` gateada por `_profile_visible` (la RLS `fo_sel` solo deja ver tus propias filas → nadie contaba seguidores de otro; devuelve SOLO conteos, jamás la lista=grafo social de terceros). Harness `_verify-profile` 12/12 (sabotaje). **DECISIÓN pendiente del PO:** ver la LISTA de seguidores de otro (no solo el número) = expone grafo social. Esta es la VISTA DE PERFIL DEDICADA que se difería → candidata para los hitos-en-perfil de #5 y el toggle de PR. GOTCHA reafirmado: `innerText` aplica `text-transform` (etiqueta «Seguidores»→«SEGUIDORES»).***

> ✅ **PLAN DE CORRECCIONES DE ADOPCIÓN: EJECUTADO COMPLETO (2026-07-26)** →
> `docs/plan-correcciones-adopcion.md`. El lote A1-A4 había sido **RECHAZADO** por la verificación;
> los 15 puntos están corregidos y en producción: **P0+F1** avi-v398 (identidad de Comunidad pegada
> entre cuentas — el bug del PO) · **F2+F11** avi-v399 (la pregunta de logros era inerte en la
> sesión típica y confirmaba sin publicar) · **F3+F4-F6** avi-v400 (pertenencia real al gym vía
> `cmty_gym_peers`; el modal del gym dejó de mentir) · **F14, F7-F13 y §P3** avi-v401 (WhatsApp ya no
> abre chat con un desconocido; la puerta se cierra al cruzarla; la sonda no miente; «Hoy» no se cae
> por un dato corrupto; el cierre del entreno scrollea y muestra UN pedido; huecos de harness).
> **Lo ÚNICO pendiente es el veredicto vinculante de Fable (R4.1/R4.2)** sobre todo el bloque
> v386→v401, más las 3 decisiones de producto del §«⚖» del plan (caras del gym a quien no ha
> aceptado nada, retroactividad del catch-up, subir `CMTY_CONSENT_V`).

*COMUNIDAD — LOTE DE ADOPCIÓN A1-A4 EN PROD (2026-07-25, avi-v394→v397 + edge `refresh_snapshot` v6, PENDIENTE verif Fable). Nace de MEDIR el embudo, no de una idea: 23 en el directorio del gym → **6 perfiles** → **1 publicación**. Se construyó Comunidad entera y casi nadie la usa; el PO eligió adopción sobre features nuevas. **A1 (v394)** prueba social en la bienvenida (`communityPeersLine`; la RLS ya dejaba ver a los compañeros de gym sin perfil propio — el `if(prof)` de `cmtyLoad` era el que tapaba). **A2 (v395)** la puerta desde «Hoy» (`communityNudgeEligible` + sonda `ax_cmty_probe` 1×/día; jamás a quien ya tiene perfil, jamás a un cuarto vacío; cede el turno a «Comparte AVI»). **A3 (v396)** el coach ve «N de M ya crearon su perfil» y los invita por WhatsApp desde `#m-gym` (`communityGymAdoption`+`communityInviteMsg`, `waPhone`, el coach envía). **A4 (v397+edge v6)** el opt-in de logros se pide EN el hito, al terminar el entreno (`milestoneAskEligible`+`highestStreakMilestone`) — con **catch-up** en la edge, porque `crossedStreak` exige `antes < umbral` y sin él decir «sí, celébralo» no publicaba NADA (probado en vivo contra prod con usuario sintético). 3 harnesses nuevos (`_verify-cmtynudge` 13 · `_verify-gyminvite` 11 · `_verify-milestoneask` 13), suite 423→437, 9 sabotajes. **2 defectos reales cazados por los propios harnesses** (G9: el modal del coach inventaba «0 activaron» si la consulta fallaba; M1: `weekStreak` devuelve objeto → NaN silencioso). **DESVIACIÓN para Fable:** el catch-up de A4 roza la decisión «sin retroactivo» de R2 — publica UN hito, el vigente, solo por acción explícita del usuario.*

*COMUNIDAD RE-FORMA (post-benchmark, `docs/plan-comunidad-reforma.md`): **R1 (avi-v383)** dio vuelta la pestaña (router `CMTY.view` feed/settings/inbox; muro arriba, ajustes en ⚙️, DMs en ✉️). **R3 PULIDO (avi-v384, 2026-07-22)**: estado vacío ÚNICO — motor puro `communityEmptyState(counts)` en avi-core (`none`/`quiet`/`lonely`) + `_cmtyCounts`/`_cmtyEmptyHtml` en app-7, y `_cmtyFriendsHtml` ya no apila su propio vacío; el vacío 'lonely' trae sus 2 acciones (compartir/pegar código). **Verbo honesto:** hay DOS relaciones distintas y se nombran distinto — **Conectar** (mutuo: código + gym, inserta `friendships`) y **Seguir** (una vía: descubrir, inserta `follows`); el plan pedía «seguir por código» pero eso habría MENTIDO sobre la mecánica (desviación documentada; unificarlo de verdad = cambio de backend, decisión de Fable/PO). **El ítem del banner «Instalar app» se DESCARTÓ con medición real** (10px de aire; `.cnbody` ya reserva 64px desde v335 — no había bug). **🟢 VEREDICTO DE FABLE (2026-07-22, commit `070de89`): ④ APROBADO · R1 APROBADO · R3 APROBADO CON RESERVA MENOR** (`plan-comunidad.md` §17 + veredicto en `plan-comunidad-reforma.md`) — 35 sabotajes suyos en tx con rollback contra prod real, todos mordieron (candado de menor reproducido como fuga al quitarlo y cascadeando a `cpost_sel`; trigger de allow-list probado desactivándolo → `kg:999` pasó → reactivado y rechazó; re-midió él mismo el banner). **RESERVA CERRADA en avi-v385:** `communityEmptyState` contaba `discover` (desconocidos públicos) como gente conectada → empujaba a «publica» a quien no tiene a nadie; ahora `discover` NO decide (+1 test con dientes, +check `R3-bis` en `_verify-feed`). **R2 HITOS EN EL MURO EN PROD (avi-v386, migración `c13_milestones` + edge `refresh_snapshot` v4, PENDIENTE verificación de Fable)** — el muro ya no depende de que alguien publique a mano: celebra constancia («Cumplió 4 semanas seguidas 🔥», «Subiste al nivel 3 ⭐»). Candado: `cpost_ins` exige `kind='routine'` → **el cliente NO puede insertarse un hito**; los emite la edge con service_role comparando streak/level antes vs después. Misma tabla `community_posts` (hereda `cpost_sel`/`_profile_visible`/reacciones); allow-list del trigger por kind (solo `{weeks}`/`{level}` numéricos — jamás pesos ni texto libre); índices únicos parciales + `on conflict do nothing` = idempotente; opt-in NUEVO `show_milestones` (default FALSE, toggle en Ajustes, sin retroactivo); poda 90 días (los posts de rutina NO se podan). Puro en avi-core: `communityMilestoneText` (null si el hito es ilegible → jamás tarjeta rota). **Decisiones del PO: umbrales 2/4/8/12/24/52 semanas · `'pr'` FUERA de v1** (peso autoreportado, Fable §R2(c)). 3 desviaciones documentadas (DDL set-returning inválida en el sketch · solo el umbral MÁS ALTO si se cruzan varios de golpe · no se celebra el nivel 1 de arranque). Sabotajes del checklist §R2 corridos con dientes (incl. la trampa del fixture: `_community_follow_state` fuerza `pending`, un seguidor aprobado se crea con UPDATE). AVI_NEWS v386.*

*COMUNIDAD v2 ④ MURO / FEED (avi-v382, 2026-07-21, §13-BIS.5 + §16.11). Publicar rutinas + muro de a quien sigo (active) + míos, con ❤️. Backend `c12_posts_feed`: tabla `community_posts` (payload allow-list por trigger `_community_post_validate` — SOLO name/days/exercises[name,muscle,sets,reps,type], jamás pesos/kg/salud), RLS reusa `private._profile_visible` (v2 + rama `_is_approved_follower AND NOT _is_minor` = §16.11 pto1 adulto privado ve, pto2 menor JAMÁS); reacciones sobre `community_reactions.context=post.id` + índice único. **Decisiones PO 2026-07-21:** reacciones = cualquiera que VE reacciona (desviación documentada vs Fable §13-BIS.5); follow hacia menor NO se bloquea (el menor decide). Frontend app-7: `_cmtyLoadFeed`/`_cmtyFeedHtml`/`cmtyPublish`/`cmtyPostHeart`/`cmtyDeletePost`; mapeador puro `communityPostPayload` en avi-core. Verificación de Opus con dientes (matriz visibilidad 11/11 sintéticos, candado menor load-bearing por saboteo, allow-list 11/11, reacciones 5/5 impersonadas, 0 advisors nuevos), harness `_verify-feed` 15/15. **PENDIENTE re-verificación de Fable.***

*COMUNIDAD v2 ② ÚLTIMA CONEXIÓN (avi-v378, 2026-07-21, §13-BIS.4). Etiqueta REDONDEADA opt-in ('ahora'/'hoy'/'esta semana'/'hace tiempo'), NUNCA el timestamp crudo. Backend: cols `last_active` (server-set por edge `refresh_snapshot` v3) + `show_last_active` (opt-in, default OFF) en community_profiles; RPC `cmty_activity_labels(uuid[])` DEFINER en lote con chequeo de visibilidad = espejo `cp_sel` (self/amigo/gym), revocada de public/anon. `last_active` sin grant (fix `c7b`: el SELECT era table-level → lo exponía; ahora column-level excluyéndolo → `select *` crudo falla, el perfil propio pide columnas explícitas). Frontend app-7: `_cmtyLoadActivity`+toggle+`_cmtyActivityHtml` en tarjetas/chat. Harness `_verify-lastactive` 14/14. Sabotajes DB (matriz opt-in/opt-out/extraño + last_active crudo denegado) verificados. **NOTA ③:** unificar el chequeo de visibilidad con `private._profile_visible` cuando llegue. **🟢 VEREDICTO DE FABLE: APROBADO (docs/plan-comunidad.md §15, 2026-07-21).** Ambas desviaciones (DEFINER en vez de INVOKER; el hallazgo `c7b`) reproducidas desde cero con actores reales — el `c7b` se confirmó load-bearing re-otorgando el grant de tabla y viendo la fuga real a un AMIGO (no un extraño), luego revirtiendo. Los 7 sabotajes de la matriz pasan contra prod real, base limpia en cada paso. Sin correcciones pendientes. Sigue ③ perfil coach+seguir →④ feed.*

*COMUNIDAD v2 ① CHAT EN VIVO (DMs Realtime) — BACKEND `c6_community_messages` (commit 37792ad) + FRONTEND (avi-v377, 2026-07-21). Camilo eligió chat + bandeja. Tabla `community_messages` (RLS: solo amigos 'accepted' O mismo gym vía `private._can_dm`; un bloqueo corta el DM; solo el destinatario marca leído; anti-flood 30/min; Realtime respeta `cm_sel` por-suscriptor). UI en `app-7-community.js`: bandeja `_cmtyInboxHtml` + overlay `#cmty-chat` (reusa `.cchat` del coach) + suscripción Realtime (`cmtyDmSubscribe`/`cmtyDmRealtime`). Escrituras por `AUTH.client()`, selladas en localhost, NADA en SB_KEYS. **🟡 VEREDICTO DE FABLE: APROBADO CON RESERVA (docs/plan-comunidad.md §14, 2026-07-21).** Los 12 sabotajes de §13-BIS.8 re-verificados desde cero (incluida la prueba VIVA de 2 sesiones reales del #9 — la que Opus no pudo cerrar — con `supabase-js` + usuarios QA desechables: extraño=0 eventos, relacionado=evento en <4s). Reserva única: `_community_msg_rate_limit()` sin `revoke execute ... from public` (2 WARN nuevos en el advisor, inofensivos —confirmado que la invocación RPC directa es imposible por ser función `RETURNS TRIGGER`— pero corregibles gratis con una línea, ver §14.2). Fuente: `docs/plan-comunidad.md §13-BIS` + `§14`. Orden v2 restante: ②última conexión →③perfil coach+seguir →④feed.*

*COMUNIDAD Fase 1 (idea #5) COMPLETA EN PROD avi-v374 (C1+C2+C3+C4, PENDIENTE re-verificación de Fable del arco C3+C4): C1 (tablas+RLS) + C2 (snapshot server-side `refresh_snapshot` + bucket `avatars` + delete-account) + C3 (UI del asesorado, 6ª pestaña `#cn-community`, `app-7-community.js`) + **C4 (legal: sección 9 «Comunidad» en `legal/politica-tratamiento-datos.md`, `LEGAL_V=2026-07-20-borrador`, `CMTY_CONSENT_V`, enlace legal en el opt-in; §11 resuelto: `show_today`+gate 18)**. Fuente: `docs/plan-comunidad.md` §9-BIS. Snapshot server-side = decisión #7 (no inflable). Escrituras selladas en localhost; nada en SB_KEYS. Textos legales = BORRADOR pendiente de abogado. Ranking/feed = Fase 2 SOLO si Fase 1 pega.*

*COMUNIDAD C5 — DIRECTORIO DEL GYM (avi-v375, cambio de concepto del PO): membresía CONTROLADA POR EL COACH en tabla nueva `community_gym_members` (NI `coach_id` NI `tier` sirven de gate — ambos client-writable, hallazgo F7 de Fable). `private._same_community` (SECURITY DEFINER) extiende `cp_sel`. Coach: tarjeta «Comunidad de mi gym» → modal `#m-gym`. Asesorado: sección «Tu gimnasio» en `#cn-community`. **RESERVA de Fable CERRADA (avi-v376):** el bloqueo ahora oculta también DENTRO del gym — `private._is_blocked` + `_same_community = mismo gym AND NOT bloqueado` (migración `c5_block_hides_in_gym`) + `cmtyLoad` excluye `blockedIds` del directorio (defensa en profundidad). Harness `_verify-community` 13/13 (+CM13). **PENDIENTE re-verificación de Fable de C5+reserva.** Fase B = DMs en vivo (sin construir).*

*Hábitos: 💧 agua (v300) + 👟 PASOS (SESIÓN J, v362, 2026-07-17, VERIFICADO por Fable §VERDICTO SESIÓN J) en la tarjeta `#cn-habits` — meta 8.000, input SET + atajo +1.000, recordatorio en el cron de las 5pm. Adopción push al fin del entreno ya existía (v325).*

*Chat unificado del coach (SESIÓN K, v363, 2026-07-17, VERIFICADO por Fable §VERDICTO SESIÓN K `9d543aa`): la ficha `p-detail` muestra un PREVIEW de solo lectura (últimos 2 mensajes + «Abrir chat») en vez del input inline; `sendCoachMsg`/`#msg-in` borrados. Un solo lugar para escribir = el chat de pantalla completa `#coach-chat` (v321). Harness `_verify-chatunified.mjs`.*

*Adopción push ítem (c) (v364, 2026-07-17, VERIFICADO por Fable §VERDICTO ADOPCIÓN v364 `85e21da`): botón 🔔 «Invitar a abrir la app» en la barra de `#coach-chat` → `coachInviteOpenApp()` → WhatsApp si hay teléfono (el chat interno solo pushea a suscritos; WhatsApp alcanza al no-suscrito), si no prellena `#cchat-in` (el coach envía). +7 checks en `_verify-chatunified.mjs`.*

*Fix WhatsApp (v365, 2026-07-17, VERIFICADO por Fable §VERDICTO FIX WHATSAPP v365 `d0542e8`): `waPhone(raw)` puro en avi-core normaliza el teléfono para `wa.me` — móvil CO sin +57 daba enlace roto en los 3 nudges (pago/adherencia/invitar). Ver GOTCHAS VIGENTES.*

*«Ya entrenaste hoy» (v366 + fix v367, 2026-07-17): `finishedTrainingToday(sessions,now)` + `sessionFinished(s)` puros → `renderClientToday` colapsa el entreno en `.trained-card` cuando ya TERMINÓ (cualquier rutina cuenta; exige `finishedAt`), dejando agua/pasos arriba. **v366 RECHAZADA por Fable** (`e48323d`): el auto-guardado parcial de la 1ª serie hacía que la tarjeta pisara el entreno EN CURSO al re-renderizar (ánimo/reordenar/dolor/poll). **Fix v367:** `finishedAt` marcado por los 2 flujos de fin (100% + Finalizar temprano); la tarjeta exige sesión finalizada. Harnesses `_shot-trained.mjs` (8/8, +T7 override +T8 parcial) y `_fable-repro-midsession.mjs` (regresión A/B/C/D + positivo). Suite 388. Pendiente re-verificación de Fable. **LOTE DE IDEAS de Camilo (bitácora parte 71): (2) sugerencia al correrse los días [híbrido elegido, diseño listo] · (3) perfil propio del coach en sus stats · (4) banner compartir · (5) comunidad (proyecto aparte).** FOLLOW-UP menor: la edge `daily-notifs` tiene su propio `trainedToday` local con el mismo patrón (impacto = una notificación; no bloqueante).*

*«Comparte AVI» (v370, 2026-07-18, idea Camilo #4, crecimiento orgánico): banner ocasional `#cn-share` en «Hoy» (al final, no intrusivo) para que el asesorado invite a alguien. Aparece SOLO tras engagement real — motor PURO `shareBannerEligible(sessions,now,snoozeUntil)` en avi-core exige ≥`SHARE_MIN_SESSIONS`(=3) sesiones FINALIZADAS (reusa `sessionFinished`) y respeta el snooze. `shareApp()` (app-4) usa `navigator.share` nativo (móvil) y cae a WhatsApp `wa.me/?text=` (elige contacto) con `AVI_SHARE_URL`; `dismissShare()` pospone `SHARE_SNOOZE_DAYS`(=45) en `ax_sharesnooze` (LOCAL). +1 test → suite 396. Harness NUEVO `_verify-share.mjs` (SH1-SH6 + shots, stubea navigator.share/window.open). NO lleva AVI_NEWS (se explica solo). `_prodcheck 370`. **Pendiente re-verificación de Fable.***

*«Mi entrenamiento» del coach (v369 + FIX v371, 2026-07-18, idea Camilo #3): la tarjeta `#h-mytraining` en el Inicio del coach resume SU propio entreno (racha/esta-semana/último + «Ver mi entrenamiento →» = `openMyTraining`). Motor PURO `myTrainingSummary(client,sessions,now)` en avi-core (reusa `weekStreak`/`daysSinceLastSession`/`planDays`; +3 tests → suite 396). `renderMyTrainingCard` (app-2, en `renderHome`). **BUG v369→v371 (Camilo lo reportó: "entrené hoy y no aparece"):** v369 leía de un CLIENTE marcado (`ax_selfclient`, con toggle en la ficha) — assumption errada. Diagnóstico forense vía Supabase (read-only): Camilo entrena con «Mi entrenamiento» (COACH_SELF), guardado en SU PROPIA fila `COACH_OWN_ROW` (43 sesiones, 1 hoy), NO en un cliente; `selfclient` vacío, ninguno de sus 21 clientes es él. Como el coach NUNCA es su propio cliente, la tarjeta jamás alcanzaba su data. **Fix v371:** la tarjeta lee de `COACH_OWN_ROW` (misma fuente que `openMyTraining`) AUTOMÁTICAMENTE, sin marcar nada; ELIMINADA toda la designación (`ax_selfclient` de SB_KEYS/_COACH_SETTINGS_KEYS/_coachSettingsObj/hidratación, `renderSelfAcctToggle`/`toggleSelfAcct`, `#d-selfacct`). Se oculta sola sin historial propio. Harness `_verify-selftraining.mjs` reescrito (ST1-ST4 + shots, sin login, setea COACH_OWN_ROW). `_prodcheck 371`. **Pendiente re-verificación de Fable.** GOTCHA: al surgir un patrón «el coach hace X consigo mismo», verificar en datos reales CÓMO lo hace antes de asumir (COACH_SELF guarda en la fila propia, no en un cliente).*

*«Día que se corrió» (v368, 2026-07-18, idea Camilo #2 — HÍBRIDO elegido por él): motor puro `weeklyMissed(client,sessions,now)` en avi-core (rutina con día real cuyo `dayOrder < hoy` esta semana y sin sesión de esta semana por id/nombre; hoy NO cuenta como perdido; orden por antigüedad). Tarjeta `#cn-missday` («Te quedó pendiente esta semana») en Hoy con 3 acciones: **«Entrenar hoy»** = `missTrainToday`→`startRoutineNow` (override, plan INTACTO) · **«Mover a hoy en mi plan»** = `missMoveToday` (SWAP: la perdida toma hoy, la que ocupaba hoy toma el día que ella dejó; `sv('ax_c')` → misma vía sancionada `upsertOwn` perfil+rutinas de la fila propia, NADA de sync nuevo; si el desplazado cae en día pasado se auto-mutea) · **«Hoy no»** = `missMute` (mute por-rutina-por-semana en `ax_missmute_<cid>`, LOCAL, NO en SB_KEYS). Se calla con override/`CUR.trainAgain`/`finishedTrainingToday`. Colocada en `_todayOrder` (tras el entreno en día de entreno, arriba en descanso). Suite 392 (+4 `weeklyMissed`). Harness NUEVO `_verify-missday.mjs` (MD1-MD9 + shots, sin login, cloud sellado). AVI_NEWS v368 (corrí `_verify-news` esta vez → verde). **Pendiente re-verificación de Fable.** RADAR: un asesorado PREMIUM que «mueve» reescribe el plan del coach (el coach lo ve al siguiente poll) — aceptado por el PO (Camilo entrena consigo mismo), pero es la primera vez que el asesorado edita el plan; vigilar si conviene un aviso al coach. Quedan ideas #3 (perfil propio del coach en sus stats — antes aclarar cómo registra sus entrenos), #4 (banner compartir), #5 (comunidad, proyecto aparte).*

*Coach Inteligente Fases 1+2+3+4+4.1 EN PROD (v355, 2026-07-16): Capa A `adapt.care` + Capa B `coachInsight` (8 señales, `#cn-coach-card` en Hoy) + Pulso del coach `coachPulse` (`#h-pulse` en Inicio) + **PLAN DE CHOQUE** `shockPlan`/`applyShockOption` (`#d-shock` en la ficha) + **MÚLTIPLES ESTANCAMIENTOS** `shockTargets` (v355: mismo músculo=uno primero con nota «también se plantó» · músculos distintos=en paralelo · 3+=fatiga sistémica→CTA semana de descarga que cablea el generador). Falta capa LLM opcional y push (futuro). Plan+verificación en `docs/plan-coach-inteligente.md`.*

*Elevación PREMIUM FASE 0 (fundación) COMPLETA v329-v332: #1 movimiento (tokens `--ease-out`/`--dur` + press-feedback), #2 elevación (borde tarjeta `--br2`, 3 niveles), #3 tipografía (escala `--fs-*`; tabular ya de v319), #4 táctil/foco (primitiva `.tap` overlay ≥40px WCAG). #5 iconos = fundación ya hecha (`aviIcon` 55 + `_coIco`) + aplicación por superficie. Siguiente: Grupos A-E superficie-por-superficie con `docs/plan-diseno-premium.md`. Hitos crudos → `docs/bitacora.md` (parte 36 la más reciente).*
