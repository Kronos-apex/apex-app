# APEX — Plataforma de Entrenamiento Personal

> Este archivo es la memoria permanente del proyecto. Claude Code lo lee automáticamente al iniciar cada sesión.

---

## 🎯 IDENTIDAD DEL PRODUCTO

**APEX** es una plataforma SaaS de entrenamiento personal en formato PWA, sincronizada con Supabase, lista para instalarse como app real en cualquier celular.

**Product Owner:** Andrés Bernal — Entrenador personal independiente en Guaduas, Cundinamarca, Colombia. Conoce el negocio desde adentro. Sus decisiones sobre funcionalidad son finales.

**Usuarios:**
- **Coach** — gestiona asesorados, rutinas, plantillas, mensualidades
- **Asesorados** — ejecutan rutinas, registran progreso, ven evolución

**Versión actual:** v1.2.0 — Mayo 2026

---

## 🚫 RESTRICCIONES NO NEGOCIABLES

| Restricción | Por qué |
|---|---|
| **Un solo archivo `.html`** | Portabilidad total — Netlify, GitHub Pages, instalación local |
| **Vanilla JS puro** | Sin frameworks, sin build, sin npm en producción |
| **localStorage + Supabase** | localStorage como caché; Supabase como sync cross-device |
| **Mobile-first estricto** | Mínimo 360px sin romperse — la mayoría usa móvil |
| **Sin dependencias JS externas** | Si cabe en 20 líneas vanilla, va vanilla |
| **SVG nativo para gráficas** | No Chart.js, no D3 — todo dibujado a mano |

---

## 📐 ARQUITECTURA

### Archivos del proyecto
```
apex/
├── index.html        ← APEX completo (3,993 líneas, 228 KB)
├── sw.js             ← Service Worker (push + cache offline)
├── send-push.ts      ← Edge Function en Supabase
└── CLAUDE.md         ← Este archivo
```

### Pantallas (`.screen`)
| ID | Descripción |
|---|---|
| `#s-login` | Login dual coach/asesorado con remember-me |
| `#s-coach` | Panel del entrenador |
| `#s-client` | Vista del asesorado |
| `#apex-loading` | Overlay de carga sincronizando con Supabase |

### Paneles del Coach (6)
- `#p-home` — Dashboard con asesorados prioritarios (vencidos primero)
- `#p-clients` — Lista con búsqueda + badge de membresía
- `#p-detail` — Detalle: rutinas, mensajes, historial, progreso, **mensualidad**, plan nutricional, medidas, fotos
- `#p-templates` — Biblioteca de plantillas reutilizables
- `#p-exercises` — 69 ejercicios precargados, filtros por músculo
- `#p-msgs` — Bandeja con badges de no leídos

### Secciones del Asesorado (5)
- `#cn-today` — Entrenamiento del día + activación auto + timer
- `#cn-routines` — Todas sus rutinas asignadas
- `#cn-messages` — Chat con el coach
- `#cn-history` — Historial + gráfica volumen + progreso por ejercicio
- `#cn-profile` — Peso corporal, PRs, datos, fotos progreso, medidas

### Modales (8)
- `#m-client` — Crear/editar asesorado (con sexo, edad, actividad)
- `#m-routine` — Constructor de rutinas con warmup auto-sugerido
- `#m-picker` — Selector de ejercicios filtrable
- `#m-ex` — CRUD ejercicio con URL de imagen/video referencia
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
  clients: [],     // ax_c — asesorados con membresía y nuevos campos
  exercises: [],   // ax_e — 69 ejercicios precargados + custom
  msgs: {},        // ax_m — { clientId: [{from, text, date}] }
  history: {},     // ax_hist — { clientId: [sesiones completadas] }
  prs: {},         // ax_pr — récords personales por ejercicio
  bodyweight: {},  // ax_bw — peso corporal histórico
  templates: [],   // ax_tpl — plantillas de rutinas
  nutrition: {},   // ax_nut — planes nutricionales por asesorado
  medidas: {},     // ax_med — medidas corporales históricas
  photos: {},      // ax_photos — fotos de progreso (base64)
}
```

### Schema cliente actualizado
```js
{
  id, name, email, password,        // password en Base64 (enc/dec)
  goal, level, days, weight, notes,
  sex,                              // 'Hombre' | 'Mujer' | 'Otro' | ''
  age,                              // number | null
  activity,                         // 5 niveles: Sedentario → Extremadamente activo
  suspended: false,                 // membership control
  payments: [{                      // membership tracking
    date, dueDate, amount, note
  }],
  routines: [{
    id, name, day, restSec, note,
    warmup,                         // ✨ activación previa (auto-sugerida)
    exercises: [{
      id, name, muscle, type,
      sets, reps, icon, desc,
      imgUrl                        // ✨ URL imagen/YouTube referencia
    }]
  }]
}
```

### Schema sesión activa (claves dinámicas en localStorage)
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
Tablas: apex_data, push_subscriptions
Edge Functions: send-push (notificaciones push reales)
```
> Las credenciales (SB_KEY, VAPID) viven en index.html (anon key) y en las
> variables de entorno de Supabase (VAPID_PRIVATE). No se documentan aquí.

### Despliegue
```
Plataforma: GitHub + GitHub Pages
Branch: main
Workflow: edit → git commit → git push → deploy automático
```

### VAPID Keys (push notifications)
```
PUBLIC:  BDf4sPyqahfUqJxuWpgCwFopVoX5jivStXpjyrrtDG1QP9Bxf3pVbcFSisPBsFL3bCac9c-jrkLvGgchgPfg7d8
PRIVATE: ver variables de entorno en Supabase Dashboard → Edge Functions → send-push
```

### Claves Supabase sincronizadas
```js
SB_KEYS = ['ax_c','ax_e','ax_m','ax_hist','ax_pr','ax_bw','ax_tpl','ax_nut','ax_med','ax_photos','ax_ce','ax_cn']
// ax_cp eliminado — contraseña legacy del coach no debe sincronizarse
```

---

## 🎨 SISTEMA DE DISEÑO

### Tokens CSS (`:root`)
```css
/* Fondos */
--bg:#F4F4F0   --w:#FFF   --br:#E5E5DF   --br2:#D0D0C8

/* Tipografía */
--t1:#1A1A1A   --t2:#6A6A6A   --t3:#B0B0B0

/* Verde marca */
--g:#2D6A4F   --g2:#40916C   --gl:#D8F3DC   --gt:#1B4332

/* Semánticos */
--or:#E76F51   --orl:#FDE8E0   /* alerta */
--bl:#457B9D   --bll:#E0EBF4   /* info */
--yl:#E9C46A   --yll:#FEF6DE   /* advertencia */
--rd:#E63946   --rdl:#FCE4E6   /* error */

/* Forma */
--r:12px   --rsm:8px   --rlg:18px
--sh:0 2px 10px rgba(0,0,0,.06)
--sh2:0 6px 28px rgba(0,0,0,.10)
```

### Mapa de colores musculares (MC)
```js
const MC = {
  pecho:'#E76F51', espalda:'#457B9D', hombros:'#A855F7',
  biceps:'#2D6A4F', triceps:'#C77DFF', piernas:'#00BFA5',
  gluteo:'#F4845F', core:'#E63946', cardio:'#FF6B6B', otro:'#6B6B6B'
}
```

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

## 🔑 FUNCIONES CLAVE (157 totales)

### Sync & Persistencia
- `ld(key, default)` — lee localStorage
- `sv(key, value)` — escribe localStorage + dispara Supabase
- `sbSet(key, value)` — upsert asíncrono a Supabase
- `syncFromCloud()` — descarga todo de Supabase al arrancar

### Membresía (Nuevo)
- `MS.getStatus(client)` — active/expiring/overdue/inactive/pending
- `MS.canLogin(client)` — bloquea login si vencido/inactivo
- `MS.badge(status)` — devuelve `{label, color, bg}`
- `registerPayment(clientId)` — registra pago de $X por 30 días
- `toggleSuspend(clientId)` — pausar/reactivar
- `whatsappReminder(clientId)` — abre WhatsApp con mensaje pre-redactado

### Auth & Seguridad
- `enc(s)` / `dec(s)` — ofuscación Base64
- `doLogin()` — auth dual + verifica membresía
- `requestNotifPermission()` — pide permiso push

### Notificaciones
- `subscribePush(clientId)` — suscribe dispositivo a push
- `pushToClient(clientId, title, body)` — llama Edge Function
- `fireNotifAt()` — notificaciones locales programadas

### Renderizado (las 15 más largas)
1. `exportRoutineAsImage` (168 chars) — canvas con header, warmup, ejercicios, frase
2. `renderClientExList` — lista de ejercicios del día con inputs
3. `renderClientHistory` — historial con gráfica de volumen
4. `renderClientToday` — vista del día con warmup
5. `renderBodyWeightSection` — gráfica de peso corporal
6. `renderClients` — lista de asesorados ordenada por estado
7. `renderTemplates` — plantillas reutilizables
8. `renderDetailMembership` — pagos y estado del asesorado

---

## ⚖️ PRINCIPIOS INVIOLABLES

1. **No romper nada existente** — cada cambio retro-compatible con datos en localStorage y Supabase
2. **Sin dependencias JS externas** — si cabe en 20 líneas vanilla, va vanilla
3. **Mobile-first siempre** — 360px mínimo, touch-friendly, sin hover-only
4. **Un solo archivo HTML** — jamás proponer múltiples archivos para producción
5. **Tokens CSS del sistema** — nunca valores hardcodeados nuevos
6. **IDs sagrados** — si una función referencia un ID, ese ID no se cambia
7. **Roles separados** — jamás mezclar lógica de coach con asesorado
8. **Auditoría antes de entregar** — sintaxis + duplicados + IDs + checks = 100% verde
9. **Validar con Node** — `node --check` sobre el JS extraído antes de cualquier entrega
10. **Mensajes en español neutro** — sin tecnicismos para el asesorado

---

## 📝 PROTOCOLO DE TRABAJO

### Antes de tocar código
1. Lee el archivo `index.html` para entender el estado actual
2. Identifica exactamente qué funciones/IDs/secciones se van a tocar
3. Describe el plan en 2-3 líneas: qué cambia Y qué NO cambia

### Al ejecutar
4. Cambios quirúrgicos — solo lo necesario, nada más
5. Validar sintaxis con `node --check` sobre el JS extraído
6. Auditoría de IDs — cada `getElementById('x')` tiene su `id="x"`
7. Sin funciones duplicadas

### Al entregar
8. Reporte con formato:
```
✅ Cambio implementado: [una línea]
📁 Archivo: index.html (actualizado)
🧪 Cómo probar: [2-3 pasos]
```

---

## 🗺️ ROADMAP

### ✅ v1.2.0 — Estado actual (Mayo 2026)
- 100% de features core implementadas (50/50)
- Sistema de membresía completo
- Push notifications con VAPID
- PWA instalable

### 🎯 v1.3.0 — Próxima iteración
- [ ] **Onboarding del asesorado** — wizard primera vez (peso, foto, medidas iniciales)
- [ ] **Dashboard analytics del coach** — ingresos, retención, sesiones/semana
- [ ] **APK real via PWABuilder** — Google Play Store

### 🚀 v1.4.0 — Escala
- [ ] **Modo oscuro**
- [ ] **Multi-coach** (cada coach con sus asesorados aislados)
- [ ] **Plantillas de nutrición**
- [ ] **Stripe / Mercado Pago** — cobro automático

### 🌟 v2.0 — Producto real comercial
- [ ] **White-label** — vender APEX a otros coaches con su branding
- [ ] **API pública** para integraciones
- [ ] **Versión iOS nativa**

---

## 🎓 EQUIPO

Cuando trabajas en APEX, asume uno de estos roles según el tipo de tarea:

### 🛠️ Equipo Técnico
- **Camila** (Engineer) → cambios técnicos quirúrgicos en vanilla JS
- **Diego R.** (UX/UI) → diseño visual, CSS, sistema de tokens
- **Andrés Q.** (DBA) → Supabase, SQL, edge functions
- **Julián** (QA) → auditorías y validaciones

### 📈 Equipo de Producto
- **Valentina** (PM) → roadmap, priorización, specs

### 💪 Equipo Deportivo
- **Diego R.** (Director Deportivo / Coach Pro) → validación fisiológica de rutinas, ejercicios, activaciones, progresiones

### 💬 Equipo de Negocio
- **Sofía** (Customer Success) → fricción del usuario, onboarding, mensajes
- **Camilo** (Growth) → precios, adquisición, retención, MRR
- **Mateo** (Data Analyst) → métricas, cohortes, reportes mensuales

Los subagents para cada rol están en `.claude/agents/`. Invócalos cuando la tarea sea bounded y de un solo dominio.

### Pipeline típico de una feature completa
```
Idea del usuario
    ↓
Valentina (¿vale la pena?) 
    ↓ ✅ aprobado
Coach Pro (si afecta entrenamiento) → valida fisiología
    ↓ ✅ aprobado
Sofía (si afecta experiencia) → valida lenguaje y flujo
    ↓ ✅ aprobado
Camila/Diego/Andrés DBA → implementa
    ↓
Julián → audita 6/6
    ↓ ✅ verde
apex-deploy → push a GitHub
    ↓
Mateo → mide impacto al final del mes
```

---

*Este archivo se actualiza con cada feature importante en producción.*
*Última actualización: Mayo 2026 · v1.2.0*
