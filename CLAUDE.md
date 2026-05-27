# APEX — Plataforma de Entrenamiento Personal

> Este archivo es la memoria permanente del proyecto. Claude Code lo lee automáticamente al iniciar cada sesión en este directorio.

---

## 🎯 IDENTIDAD DEL PRODUCTO

**APEX** es una plataforma SaaS de entrenamiento personal en formato PWA, sincronizada con Supabase, lista para instalarse como app real en cualquier celular.

**Product Owner:** Andrés Bernal — Entrenador personal independiente en Guaduas, Cundinamarca, Colombia. Sus decisiones sobre funcionalidad son finales.

**Usuarios:**
- **Coach** — gestiona asesorados, rutinas, plantillas, mensualidades
- **Asesorados** — ejecutan rutinas, registran progreso, ven evolución

**Versión actual:** v1.3.2 — Mayo 2026

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
├── index.html                          ← APEX completo (~6,300 líneas, ~380 KB)
├── sw.js                               ← Service Worker ESTÁTICO (⚠️ NUNCA convertir a blob URL)
├── .git/hooks/pre-commit               ← Audit automático en cada git commit (7 checks)
├── .claude/agents/                     ← 10 agentes especializados del equipo
├── .claude/skills/                     ← apex-audit, apex-deploy
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
| `#apex-loading` | Overlay de carga — "Preparando tu entrenamiento..." |

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
- `#cn-history` — Historial (hasta 365 sesiones) + gráfica volumen + progreso por ejercicio
- `#cn-profile` — Peso corporal, PRs, datos, fotos progreso, medidas, racha semanal

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
  photos: {},      // ax_photos — fotos de progreso (base64)
}
```

### Schema cliente completo (v1.3.0)
```js
{
  id, name, email, password,        // password: SHA-256 con clientId como salt
  goal, level, days, weight, notes,
  phone,                            // ✅ v1.3.0 — teléfono para WhatsApp
  sex,                              // 'Hombre' | 'Mujer' | 'Otro' | ''
  age,                              // number | null
  activity,                         // Sedentario | Ligeramente activo | Moderadamente | Muy activo | Extremadamente
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
  'ax_photos',  // fotos
  'ax_cph',     // ✅ v1.3.0 — hash contraseña coach
  'ax_site',    // ✅ v1.3.0 — configuración del sitio
  'ax_ce',      // ejercicios custom
  'ax_cn',      // nombre del coach
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

## 🔑 FUNCIONES CLAVE (220 totales)

### Sync & Persistencia
- `ld(key, default)` — lee localStorage
- `sv(key, value)` — escribe localStorage + async Supabase upsert
- `sbSet(key, value)` — upsert asíncrono a Supabase
- `syncFromCloud()` — descarga todo al arrancar (usa `SB_KEYS`)

### Membresía
- `MS.getStatus(client)` → `active | expiring | overdue | inactive | pending`
- `MS.canLogin(client)` → solo `active` o `expiring` entran (pending BLOQUEADO)
- `MS.badge(status)` → `{label, color, bg}`
- `registerPayment(clientId)` — registra pago por 30 días
- `toggleSuspend(clientId)` — pausar/reactivar
- `whatsappReminder(clientId)` — abre WhatsApp con monto + fecha + CTA urgente

### Auth & Seguridad
- `hashClientPass(pass, clientId)` → SHA-256 con salt
- `isHashed(pass)` → detecta si ya migró a SHA-256
- `doLogin()` — auth dual coach/asesorado
- `canLogin(c)` — inclusión positiva: `active || expiring`
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

---

## 🔒 SEGURIDAD — ESTADO ACTUAL (v1.3.2)

| Área | Estado |
|---|---|
| XSS en innerHTML | ✅ `esc()` aplicado: nutrición, perfil, rutinas, progreso, notificaciones, fotos |
| `photo.src` en `<img>` | ✅ Validado que sea `data:image/...` antes de insertar |
| Sesión localStorage | ✅ `expiresAt: now + 30 días` — `tryAutoLogin` valida expiración |
| CORS Edge Functions | ✅ Restringido a `https://kronos-apex.github.io` (NO usar `*`) |
| Contraseña coach | ✅ SHA-256 en `ax_cph`, legacy `ax_cp` no sincroniza |
| Contraseñas asesorados | ✅ SHA-256 con clientId como salt, migración automática |
| Login con membresía vencida | ✅ Bloqueado — inclusión positiva `active || expiring` |
| VAPID private key | ✅ Solo en variables de entorno Supabase — jamás en frontend |
| send-push Edge Function | ✅ Verifica Authorization header antes de enviar |
| Pre-commit hook | ✅ Bloquea secrets hardcodeados antes de cualquier commit |
| Service Worker | ✅ Archivo estático `sw.js` — NUNCA blob URL (rompe Android Chrome) |

**Riesgos conocidos y aceptados (app privada ~8 clientes):**
- Auth solo en cliente — localStorage manipulable con DevTools (sin RLS en Supabase)
- Toda la DB se descarga al navegador antes del login (arquitectura offline-first)
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

### 🎯 v1.4 — Próxima iteración
- [ ] **Migración fotos → Supabase Storage** ⚡ PRIORITARIO — programado para el fin de semana (días sin asesorados activos). Reemplaza base64 en `ax_photos` por URLs públicas. Parche temporal de compresión activo hasta entonces (100KB/foto, MAX 800px).
- [ ] Pasos diarios: meta por asesorado, registro manual, recordatorio de caminar, gráfica semanal
- [ ] Tagline final — pendiente decisión de Andrés
- [ ] Logo nuevo — brief listo para Looka/Canva (brief en historial de chat)
- [ ] Stripe / Mercado Pago — cobro automático
- [ ] `startedAt` / `completedAt` en sesiones de historial
- [ ] `payment.planType` para MRR segmentado por plan
- [ ] Widget MRR proyectado en Home
- [ ] Análisis de cohortes de retención (Mateo — requiere ≥10 asesorados)

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

*Última actualización: 2026-05-27 · v1.3.2 · ~6,400 líneas · 238 funciones · 96 ejercicios (defaultExercises: e1-e96) + fb03/fb04 en Supabase · 9 asesorados activos (incl. Sofia prueba) · Agentes deportivos: Valery (femenino) + Andrés Hyp (hipertrofia+nutrición) + Laura (fisioterapia deportiva) · skill apex-generate activo · fotos comprimidas a 100KB (parche) — migración Supabase Storage pendiente este fds*
