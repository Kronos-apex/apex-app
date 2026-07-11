# 🗺️ Plan de sesiones — AVI (plan VIVO)

> Escrito el 2026-07-10 al cierre de la sesión v314→v316 (Fable 5), para que las
> próximas sesiones (Opus o cualquier modelo) arranquen con objetivo claro y cero
> arqueología. **Al completar una sesión: marcarla aquí, mover el hito a
> `docs/bitacora.md` y actualizar el footer de CLAUDE.md.** Este archivo se poda
> cuando todo esté hecho.

---

## ⚡ PROTOCOLO DE ARRANQUE (cada sesión, sin excepción)

1. Leer `CLAUDE.md` completo — en especial **🛡️ DOCTRINA** (anti-complacencia, bugs
   de raíz, barra PREMIUM, radar al cierre) y **🧠 GOTCHAS VIGENTES**.
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

**Recordatorio a Camilo cada sesión (obligatorio hasta que lo haga): 2FA en GitHub
y Supabase — solo él puede activarlo.**

---

## 📋 SESIÓN A — Mejora 7 del estudio: orden inteligente de asesorados (coach)

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

## 📋 SESIÓN B — Mejora 8 del estudio: transiciones + números tabulares (CIERRA el estudio)

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

## 📋 SESIÓN C — Deuda técnica corta (limpieza, ~1 sesión)

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

## 📋 SESIÓN D — Simulacro de RESTORE (crítico, nunca ensayado)

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

## 📋 SESIÓN E — Re-barrido XSS (~190 innerHTML)

**Objetivo:** pase completo de seguridad sobre los `innerHTML` con datos de usuario
(el último fue v1.3; la app creció ×3 desde entonces).

- **Cómo:** inventario por módulo (grep `innerHTML` + clasificar: estático seguro /
  datos internos / DATOS DE USUARIO), verificar `esc()` en los de usuario, harness
  con nombres/notas maliciosos (`<img onerror>`, comillas) en cliente fake.
  Documentar el inventario para que el próximo barrido sea diff, no censo.

## 📋 SESIÓN F — Hábitos parte 2: 👟 pasos manuales (producto)

**Objetivo:** registro MANUAL de pasos en la tarjeta `#cn-habits` (misma tarjeta,
decisión Camilo 2026-07-09; Google Fit NO viable — API muerta).

- **Cómo:** patrón calcado de agua (v300): lógica pura en avi-core (meta por
  asesorado con default sensato, registro diario, poda 30d) + tests, UI en la misma
  tarjeta, datos en `client.habits.steps` (viaja como painCare), respetar plan del
  coach si existe. AVI_NEWS SÍ (capacidad nueva) + `_verify-water.mjs` como plantilla.
- **Antes de construir:** confirmar con Camilo el default de meta (¿8.000?) y si
  quiere recordatorio push (eso agranda el alcance a daily-notifs).

## 📋 SESIÓN G — Coach ve adherencia de hábitos en p-detail

**Objetivo:** los datos de agua (y pasos si F ya salió) YA sincronizan en
`client.habits` — mostrárselos al coach en el detalle del asesorado (mini-fila de
7 días, % de la semana). Pequeño, alto valor para el coach.

---

## 🧍 PENDIENTES QUE DEPENDEN DE CAMILO (recordar, no construir)

- 🔐 **2FA GitHub + Supabase** (cada sesión hasta que esté).
- 📱 Probar en su celular: v313 compartir · v314 anclas+pop · v315 rutinas con foto ·
  v316 respuestas rápidas (4 versiones sin su ojo al cierre 2026-07-10).
- ⚖️ Abogado para `legal/` + decidir sobre botones descargar/eliminar datos.
- 🏪 Play Store (cuenta dev US$25, Data Safety) — cuando él quiera.
- 📉 Retención: ~8/22 nunca entrenaron; lead caliente josegutierrezpe19@gmail.com.
- Supabase Dashboard → Auth → leaked-password protection.

## 📦 CONTEXTO RÁPIDO DE LO RECIÉN DESPLEGADO (v313→v316)

Estudio de interfaz (Artifact aprobado por Camilo) — 6 de 8 mejoras EN PROD:
Hoy reordenado + cierre compartible (v313) · anclas Progreso + micro-pop (v314) ·
Rutinas con foto (v315) · respuestas rápidas chat (v316). Detalle: bitácora partes
15-18. Deudas conscientes anotadas ahí: chevron claro si foto 404 futura (v315),
COACH_SELF chatea consigo mismo (preexistente), doble tap repite chip (aceptado),
toast optimista offline (patrón global).
