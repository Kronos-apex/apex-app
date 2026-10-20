# AVI — Plataforma de Entrenamiento Personal

> **Nota de marca (2026-06-01):** el producto se renombró de **AVI** a **AVI** (iniciales de los hijos del PO: Alexander, Valery, Isabella). El nombre visible es AVI; los identificadores internos siguen como `apex`/`ax_` (repo `apex-app`, tabla `apex_data`, claves `ax_*`, `avi-core.js`, caché `apex-vNN`) — NO renombrarlos (rompería datos/PWA). Instagram: @avientrena (el usuario disponible, igual que el dominio; 1-oct-2026). Pendiente: registro de marca en SIC.

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
| **El % de grasa NUNCA sale de su pantalla** | Regla de Valery (11-sep-2026, v607): no entra a la vitrina pública (`avi_showcase`), ni a gamificación (niveles, logros, rachas), ni como «meta de % objetivo» en ningún texto. *«Los kilos que alguien levanta se pueden presumir; el % de grasa de alguien, no — ni con su permiso, porque abre la puerta a que otra persona compare el suyo contra el de ella.»* |

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
5. **Verificado en prod** (curl a app.avientrena.com) + hito en `docs/bitacora.md`.
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
- CLAUDE.md solo cambia cuando cambia el CONTEXTO VIVO (arquitectura, esquema, la línea de versión del pie)
  y se mantiene CORTO: gotchas nuevos → `docs/gotchas.md` · backlog → `docs/roadmap.md` · historia de cada
  versión → `docs/historial-versiones.md` (entrada nueva arriba) · funciones → `docs/funciones-clave.md`.
- Memoria de sesión (`~/.claude/.../memory/`) actualizada al cerrar.
- Lección nueva que no expira → `docs/gotchas.md` (GOTCHAS VIGENTES), no enterrada en un hito.

### 7. Guardrails duros (violarlos = sesión fallida)
- **NUNCA** `--no-verify`, `push --force` a main, ni saltarse suite/hook "porque es un cambio chiquito"
- **NUNCA** deploy sin bump del PAR `?v=NNN` (index.html) + `CACHE_NAME` (sw.js) si cambió JS/CSS
- **NUNCA** confirmar "está en producción" sin el curl a app.avientrena.com
- **NUNCA** secretos en el repo (es PÚBLICO): creds de prueba → `~/.avi/`, service role → `~/.avi/service-role.key`
- **NUNCA** nombres, correos ni datos de asesorados REALES en el repo (es PÚBLICO): se escribe su **seudónimo** (tabla privada en `~/.avi/seudonimos.json`; el check [13] del hook bloquea los reales con la lista privada `~/.avi/nombres-reales.json`). Desde el 29-sep todo el repo va seudonimizado.
- **NUNCA** renombrar identificadores internos `apex`/`ax_` ni el formato de claves de sesión
- **NUNCA** mezclar features en un commit, ni "aprovechar" para refactors no pedidos en zonas calientes
- **SIEMPRE** buscar en `docs/gotchas.md` lo de la zona que se va a tocar antes de editar; suite antes Y después; Edit tool o python utf-8 (jamás perl/sed con tildes)

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
- `#p-home` — Inicio: cifras, retención, vencimientos, prioritarios, «Mi entrenamiento» (`#h-mytraining`), pulso y avisos con tope.
- `#p-clients` — Lista de asesorados con búsqueda y estado de membresía.
- `#p-detail` — Ficha del asesorado en 5 pestañas (v707): Resumen · Entreno · Comida · Cuerpo · Pagos (`detailTab`).
- `#p-templates` — Plantillas de rutina.
- `#p-exercises` — Biblioteca de 374 ejercicios (buscador, tandas de 30, gate de nivel en el generador).
- `#p-msgs` — Bandeja de mensajes.

### Secciones del Asesorado (6 — la barra de abajo lleva 5 desde v710: Comunidad se entra desde Progreso)
- `#cn-today` — Hoy: héroe del entreno, guiado embebido, hábitos, avisos con tope (`TODAY_MAX_CARDS`).
- `#cn-routines` — Todas sus rutinas.
- `#cn-messages` — Chat con el coach.
- `#cn-history` — Progreso en 4 pestañas (v709): Resumen · Historial · Récords · Logros (`progTab`); al final del Resumen, la fila «Comunidad» (`#pg-cmty`).
- `#cn-profile` — Perfil en filas (v708) que abren su pantalla (`perfilAbrir`); Ajustes en habitaciones (v704).
- `#cn-gamif` — Nivel permanente y logros.
- `#cn-community` — Comunidad (congelada desde 2-sep): fuera de la barra desde v710, se entra con `cnOpenCommunity`; la barra marca «Progreso» (`CN_TAB_HOST`).

### Modales activos
`#m-client` (alta/edición de asesorado) · `#m-routine` (constructor) · `#m-picker` (selector de ejercicios) · `#m-ex` (ejercicio) · `#m-template` · `#m-tpl-picker` · `#m-notif` · `#m-exref` · `#m-backup`. `#m-settings` se borró en v704 (Ajustes). Toda ventana `.mdbg` sobre una habitación sube por `om()`.

> **Detalle completo** de cada panel, sección y modal (con la historia de cada uno): [`docs/arquitectura.md`](docs/arquitectura.md).

---

## 💾 ESQUEMA DE DATOS

```js
DB = {
  clients: [],     // ax_c — asesorados
  exercises: [],   // ax_e — 374 ejercicios precargados + custom
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
    CORS: los dos orígenes de la app — https://kronos-apex.github.io y https://app.avientrena.com (`conCors`, v657/v662) (⚠️ NO usar * en producción)
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
Producción: https://app.avientrena.com (proyecto Vercel avi-app) — la ÚNICA dirección de la app.
Repo: github.com/Kronos-apex/apex-app · Branch: main (NUNCA master, NUNCA --force)
Workflow: edit → pre-commit hook (14 checks) → git commit → git push → node scripts/publicar-hogar.mjs
         (un push NO publica nada) → _prodcheck.mjs vNNN (por defecto ya apunta a app.avientrena.com).
         CI (job `produccion`) espera 20 min a que app.avientrena.com sirva la versión del commit y
         comprueba que la dirección vieja siga apagada; si no, ROJO.
Dirección vieja: kronos-apex.github.io/apex-app se APAGÓ el 11-oct-2026 (decisión del PO). GitHub Pages
         publica la rama `pages-mudanza` —página «AVI se mudó» + un sw.js que borra la caché y se da de
         baja en los teléfonos que tenían la app instalada ahí—, NO main. No volver a apuntar Pages a main.
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
--t1:#1A1A1A   --t2:#636363   --t3:#6C6C6C   /* claro; oscuro: --t2:#8FAF98 --t3:#669B74.
   Valores REALES verificados el 12-oct-2026: --t3 ya NO es el gris claro #B0B0B0 (la FASE 3 lo
   oscureció para que se lea) — un sabotaje de contraste con --t3 no apaga nada */

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
--accent3:#10E0A0               /* acento terciario — el doc decía #A855F7 y NO era
                                   (verificado 2026-08-19 en los 3 bloques :root) */
--emerald-hdr / --on-emerald / --on-accent3   /* superficie esmeralda: topbar + héroe de «Hoy».
                                   Declaradas UNA vez: es oscura en los DOS temas. */

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

## 🔑 FUNCIONES CLAVE — en [`docs/funciones-clave.md`](docs/funciones-clave.md)
Referencia por área (sync y persistencia, membresía, auth, renderizado, notificaciones, modalidades, generador de
rutinas, auto-registro, hábitos, coach inteligente, gamificación). Consultarla antes de crear una función que quizá ya existe.

## 🔒 SEGURIDAD — ESTADO ACTUAL (v1.4)

| Área | Estado |
|---|---|
| XSS en innerHTML | ✅ `esc()` aplicado: nutrición, perfil, rutinas, progreso, notificaciones, fotos |
| `photo.src` en `<img>` | ✅ Validado que sea `data:image/...` o `https://` antes de insertar |
| Sesión localStorage | ✅ `expiresAt: now + 30 días` — `tryAutoLogin` valida expiración |
| CORS Edge Functions | ✅ Solo los dos orígenes de la app: `https://kronos-apex.github.io` y `https://app.avientrena.com` (`conCors` por petición, v657; desplegado v662). NO usar `*` |
| Contraseña coach | ✅ SHA-256 en `ax_cph`, legacy `ax_cp` no sincroniza |
| Contraseñas asesorados | ✅ SHA-256 con clientId como salt, migración automática |
| Login con membresía vencida | ✅ **`overdue` SÍ entra, en AVI FREE** (v564, `premiumLocked` apaga lo premium sin tocar su tier); `inactive` bloqueado; `pending` (nuevo sin pago) SÍ entra |
| Consentimiento de MENORES | ✅ **v565:** la edad decide qué permiso se pide y `consentEvidence` **no puede firmar `adulto:true` con edad de menor**; sin nombre del acudiente no emite evidencia. Ambas altas (auto-registro y coach) capturan. Antes había UNA sola casilla obligatoria («soy mayor de 18») y el menor **tenía** que mentir |
| VAPID private key | ✅ Solo en variables de entorno Supabase — jamás en frontend |
| send-push Edge Function | ✅ **v426:** resuelve al usuario por su JWT (`auth.getUser`) + autoriza el destinatario (a sí mismo · a `_coach` sus asesorados · a un asesorado solo su coach). Antes el candado era la anon key PÚBLICA (hallazgo H1) |
| Pre-commit hook | ✅ Bloquea secrets hardcodeados antes de cualquier commit. **[14] (29-sep):** también las contraseñas literales y todo valor que viva en `~/.avi`, leído al correr (antes el propio hook llevaba una contraseña real escrita) |
| Service Worker | ✅ Archivo estático `sw.js` — NUNCA blob URL (rompe Android Chrome) |
| Sesión que viaja en la mudanza (`#avimv=`) | ✅ **v669:** la llegada solo la acepta si `document.referrer` es el origen viejo, host exacto (`mudanzaReferrerOk`). Antes un enlace armado por otra persona dejaba a quien lo abría dentro de la cuenta ajena (fijación de sesión, auditoría 25-sep) |
| Código de terceros | ✅ **v677:** supabase-js vive en la app (`vendor/supabase-js-2.117.2.js`, el original del paquete de npm, huella afirmada en la suite, `.gitattributes` `vendor/** -text`). Antes venía de un CDN pidiendo «la última 2.x»: 19 versiones en 30 días sin revisión. **Actualizarla es una decisión**: bajar, verificar contra el registro, cambiar nombre + huella + línea del SW |
| Regla de orígenes (CSP) | ✅ **v678:** `<meta>` antes del primer script. Scripts solo de la app; datos solo a Supabase (https+wss) y a `app.avientrena.com`; `object-src 'none'`. `'unsafe-inline'` por los `onclick` (el candado de XSS sigue siendo `esc()`). **Un sitio nuevo se añade a propósito** (la suite fija las directivas) y se re-corre `_verify-csp` |

**Estado de auth (v2.0, Fase 4 completa):**
- ✅ Auth real Supabase + RLS por usuario en `user_data` (`auth.uid()=user_id OR =coach_id`). El login client-side legacy fue eliminado.
- ✅ `apex_data`/`apex_data_backups` cerradas a anon (blob legacy solo como respaldo). Ya NO se descarga toda la DB antes del login.
- ✅ `push_subscriptions` con RLS propia para **authenticated** (policies `push_ins_own` + `push_upd_own` + `push_sel_own`, alcance `*_own` por UID) — el follow-up "mover a autenticado" se CUMPLIÓ en el fix de raíz del cero-suscritos (v320-v324; la policy SELECT faltante fue la causa final, 2026-07-12). Verificado contra `pg_policies` en la auditoría 2026-07-13.
- ✅ **Edge Functions: las 6 exigen identidad real.** `send-push` fue la última (v426): su Bearer era la anon key pública y con eso cualquiera mandaba un push con el texto que quisiera. `daily-notifs` usa un secreto que vive en la BD (v418); las otras 4 resuelven al usuario por su JWT.

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

## 🧠 GOTCHAS VIGENTES — en [`docs/gotchas.md`](docs/gotchas.md)
Las ~200 lecciones que no expiran viven ahí, por zona: **Seguridad física del asesorado · Navegación y botón atrás ·
Edición de código (Windows) · Deploy / producción · Harnesses E2E / CDP · App / datos** (la más larga).
**Antes de tocar una zona: `grep -n "<función o tema>" docs/gotchas.md` y leer lo que salga. No se lee entero (~390 KB).**
Gotcha nuevo → `docs/gotchas.md`, dentro de su zona. Aquí solo se resumen las que muerden en CADA sesión:
- **Windows:** jamás perl/sed sobre archivos con tildes; los scripts con barras invertidas van a ARCHIVO (los heredocs de Git Bash las comen); escritura atómica (`.tmp` + `rename`); los finales de línea no son estables (CRLF en la copia de trabajo, LF en el checkout de CI) — editar respetando el del archivo.
- **Versión:** `?v=NNN` (index.html) y `CACHE_NAME` (sw.js) siempre juntos (check [10] del hook).
- **Publicar:** un `git push` NO publica — `node scripts/publicar-hogar.mjs` y `_prodcheck.mjs vNNN`; tras cada push, mirar CI.
- **Harnesses:** corren el index.html local contra el Supabase de PRODUCCIÓN con la cuenta QA; `cloudWriteSealed` impide escribir desde localhost. Esperar el arranque real (`_aviUpdateBusy`), no la presencia del DOM. En festivos colombianos fallan los del entreno del día (la app no programa entreno: no es un defecto).
- **Pruebas:** toda sonda lleva su CONTROL (cobertura y discriminación); un candado puede aprobar por casualidad. Un sabotaje verde es una pregunta: test débil, código sobrante, rama que falta o no se aplicó.
- **Suite:** un test nuevo va ANTES del bloque RESUMEN de `avi.test.js` (debajo no cuenta) y el contador tiene que subir; todo check estático sobre código pasa por `sinComentarios`.
- **Matrices de sabotaje:** commitear ANTES de correrlas (reescriben archivos del repo; un corte de luz los dejó en ceros) y no editar mientras corren; se leen por su CONTROL antes que por sus filas.
- **Datos:** la app es offline-first — arreglar solo en la nube no dura (el teléfono pisa): la auto-cura va en el cliente. Escrituras autenticadas por `AUTH.client()`, nunca `fetch` crudo; todo upsert necesita policy SELECT. `new Date(null)` es 1970 y `Date.parse(0)` es el año 2000: atajar «no hay fecha» antes de construirla.

## 🗺️ ROADMAP — en [`docs/roadmap.md`](docs/roadmap.md)
Backlog vigente, estudios (Fitia/MyFitnessPal), lo hecho por fases y lo congelado. Lo que no se puede olvidar:
- 🧊 **CONGELADOS por decisión del PO:** COMUNIDAD (desde 2026-09-02) y REGISTRO DE ALIMENTOS (desde 2026-08-27). Se mantienen (seguridad y correcciones), no se les añade funcionalidad. Congelar no es esconder ni borrar.
- Ítem nuevo o completado → `docs/roadmap.md`.

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

*Última actualización: 2026-10-20 — **v716 «con letra grande ninguna cifra se parte ni se corta» en producción** · suite 1497. El historial de cada versión (qué cambió, qué cazó el QA, con qué se verificó) está en [`docs/historial-versiones.md`](docs/historial-versiones.md), la más nueva arriba.*
