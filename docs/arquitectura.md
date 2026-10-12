# 📐 ARQUITECTURA — detalle completo de pantallas, paneles, secciones y modales

> Movido de `CLAUDE.md` el 2026-10-12 para que cada sesión no cargue 635 KB (pedido del PO:
> «adelgaza el claude md sin perder información»). **El texto de abajo es el original, sin cambios.**
> CLAUDE.md conserva la versión corta. Cambio de arquitectura → aquí y, si cambia el mapa, también la versión corta.

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
- `#p-detail` — Ficha del asesorado. **v707: en cinco PESTAÑAS** (`detailTab`, atributo `data-dtab` del panel + CSS `.dt-sec`; cambiar de pestaña NO empuja historial): **Resumen** (notas y dolor, `#d-sum` = semana contra su plan + estado del plan + «Para revisar» que lleva a su pestaña — `detailSummary` pura, `renderDetailSummary` va al FINAL de `openDetail` porque lee lo que las tarjetas decidieron mostrar —, hábitos, mensajes, datos) · **Entreno** (rutinas, descarga, nivel, plan de choque, récords, historial, progreso, historia) · **Comida** (revisión, plan con los 3 botones de compartir, registro) · **Cuerpo** (valoración, medidas, fotos) · **Pagos** (nivel de acceso, membresía). Entrar abre Resumen; re-pintar la misma ficha se queda en su pestaña; el atrás la recuerda (`snap.dtab`). Un salto directo a un bloque abre antes SU pestaña (`_pulseGo`→Entreno, notificación de mensaje→Resumen)
- `#p-templates` — Biblioteca de plantillas reutilizables
- `#p-exercises` — **374 ejercicios** precargados (buscador + tandas de 30 desde v405) (e1–e381, con huecos; la repoblación de v547-v550 sumó +127 en 4 lotes; e141–e164 = principiante peso corporal casa/parque; **e165–e214 = 50 nuevos: 16 movilidad/calentamiento + 25 HIIT/funcional + 9 antebrazo/trapecio/grip**, con imagen 1:1 + mapa muscular + modalidad), filtros por músculo. El **Full Body** lleva puesto dedicado de **glúteo** (`Aislamiento`, 2.º slot, v430 — para todos, también quien entrena ≤2 días). El generador aplica **gate por nivel** (`EX_LEVEL`/`_levelGate` en avi-core.js): Principiante solo P, Intermedio P+I, Avanzado todo
- `#p-msgs` — Bandeja con badges de no leídos

### Secciones del Asesorado (6 — la barra de abajo lleva 5 desde v710: Comunidad se entra desde Progreso)
- `#cn-today` — Entrenamiento del día + activación auto + timer. **v503 EL HÉROE (dirección B «El Compromiso», 1 de 3):** cuando el entreno de hoy llega COLAPSADO (v447), `renderTodayHead(client, rutina)` deja de pintar el saludo y pinta el **héroe esmeralda a sangre** en `#cn-today-head` —saludo + racha + arranque FUNDIDOS— con la lista numerada (tope 6 filas; lo que sobra se resume) y un solo CTA; `#cn-today-body` queda vacío. Modelo PURO en avi-core (`todayHeroModel`/`exDoseShort`/`heroTitleSize`; `hiitCfg`/`holdSecsOf` se mudaron ahí por eso). **NO se pinta** con sesión en curso, en día 1 (manda `#cn-firstrun`), en descanso, con «ya entrenaste», sin plan ni con rutina vacía. Harness `_verify-hero.mjs` (20). **v366/v367:** si ya TERMINÓ un entreno hoy (`finishedTrainingToday` → exige sesión FINALIZADA `finishedAt`, CUALQUIER rutina cuenta) → colapsa el entreno en la tarjeta `.trained-card` («Ya entrenaste hoy» + «Entrenar otra vez»/«Ver rutinas»); agua/pasos quedan arriba sin scrollear. **Fix v367 (bug cazado por Fable):** una sesión PARCIAL en curso (el auto-guardado de la 1ª serie fecha hoy) NO debe disparar la tarjeta — antes pisaba el entreno al re-renderizar (cambiar ánimo/reordenar/dolor/poll del coach). `sessionFinished(s)` = `finishedAt` o 100%. `CUR.trainAgain`/`overrideRoutine` permiten entrenar de nuevo. **v368 «día que se corrió»:** si una rutina de un día YA PASADO de esta semana quedó sin entrenar → tarjeta `#cn-missday` («Te quedó pendiente esta semana») con 3 acciones: «Entrenar hoy» (override, plan intacto, reusa `startRoutineNow`) · «Mover a hoy en mi plan» (`missMoveToday` = SWAP de días + `sv('ax_c')`) · «Hoy no» (`missMute`, mute por-rutina-por-semana en `ax_missmute_<cid>`, LOCAL). Motor puro `weeklyMissed(client,sessions,now)` en avi-core (día real dayOrder<hoy, no entrenada esta semana por id/nombre). Se calla con override/trainAgain/finishedTrainingToday
- `#cn-routines` — Todas sus rutinas (no solo la del día)
- `#cn-messages` — Chat con el coach
- `#cn-history` — Progreso. **v709: EN PESTAÑAS** (lote 4 del estudio de organización): Resumen (constancia + números) · Historial (gráfica de volumen + hasta 365 sesiones) · Récords (progreso por ejercicio) · Logros (nivel + medallas; si está vacío, `#pg-logros-vacio` dice qué esperar). `progTab`/`progTabKey`, atributo `data-ptab` + CSS `.pg-sec`, el control segmentado de la ficha del coach (`.dt-*`); la pestaña se recuerda (`CUR.progTab`), no empuja historial. `renderClientHistory` pinta también el progreso por ejercicio (antes solo lo pintaba el Perfil). La fila de anclas de v314 se retiró.
- `#cn-profile` — Foto de perfil propia, peso corporal, PRs, datos, fotos progreso, medidas. **v708: EN FILAS** (lote 3 del estudio de organización): cabecera + seis filas con su dato (`#cn-prof-rows`, las de Ajustes `.aj-row`; `profileRowsModel` pura — Mis datos dice edad y estatura, el plan de comida NO lleva cifra, con candado la fila dice lo mismo que `planLockExit`) + «Recomienda AVI». Las seis secciones viven guardadas en `#prof-guardado` y `perfilAbrir(sec)` las MUDA a `#perfil-room` (conservan sus ids); el atrás la cierra (`closePerfilRoom`, repinta las filas). `applyProfileDisclosure` y «Mi seguimiento personal» (`tt-*`) se retiraron. **v704: los AJUSTES ya no viven aquí** — botón «Ajustes» arriba a la derecha (`#cn-aj-btn` → `openAjustes`) que abre las habitaciones `#ajustes-room` (lista agrupada, cada fila con su valor) y `#ajustes-sub-room` (una sección: `sonido`/`tema`/`letra`/`cuenta`/`coach`)
- `#cn-gamif` — Gamificación: nivel permanente (1–5, no se reinicia) + logros (el descuento por adherencia se eliminó el 2026-07-06)
- `#cn-community` — **COMUNIDAD (idea #5, Fase 1 · C3, avi-v373)** — **v710: ya no está en la barra de abajo** (lote 5 del estudio de organización): se entra desde Progreso › Resumen (`#pg-cmty` → `cnOpenCommunity`) y mientras se está ahí la barra marca «Progreso» (`CN_TAB_HOST`). La barra va Hoy · Rutinas · Progreso · Mensajes · Perfil; cada pestaña dice qué abre en `data-cn` y `_cnTabEl` la busca por eso, nunca por posición, y `cnTab` marca la pestaña de la pantalla abierta (no la del botón que llamó). Perfil público OPT-IN (apodo/avatar/código) + amigos por código + ❤️ + bloquear/reportar. **Online-only** (degrada con «Conéctate para ver a tu gente», nunca bloquea entrenar), **gratis para todos los tiers**. Todo en `app-7-community.js` (objeto `CMTY` + `renderCommunity`). Los datos SENSIBLES (peso/fotos/salud/kilos) NUNCA salen de `user_data`: la comunidad vive en tablas `community_*` (C1, RLS estricta). **Snapshot de constancia (racha/nivel/hoy) es SERVER-SIDE** (edge `refresh_snapshot`, decisión #7 → el cliente no lo infla), refrescado con debounce (`cmtyShouldRefresh` 30min) al abrir la pestaña y al terminar entreno. Toda escritura por `AUTH.client()` y SELLADA en localhost (`_cmtySealed`). `esc()` en handle/bio; avatares solo si `cmtyAvatarOk` (prefijo del bucket). NADA en SB_KEYS. Consentimiento propio `CMTY_CONSENT_V` + gate 18/representante. **Solicitud pendiente:** su identidad se muestra vía `friendships.req_handle` (el trigger la graba del perfil del solicitante — la RLS solo deja leer el perfil de un amigo ACEPTADO). **Falta C4 (legal/cierre).**

### Modales activos
- `#m-client` — Crear/editar asesorado (nombre, email, contraseña, teléfono, sexo, edad, actividad, objetivo, nivel, días, notas)
- `#m-routine` — Constructor de rutinas con warmup auto-sugerido
- `#m-picker` — Selector de ejercicios filtrable
- `#m-ex` — CRUD ejercicio con URL imagen/video referencia
- ~~`#m-settings`~~ — **BORRADO en v704**: los datos del coach viven en Ajustes › «Tu cuenta de coach» (`#ajustes-sub-room`, sección `data-aj=coach`); `openSettings()` abre Ajustes. 🔴 Toda ventana `.mdbg` que se abre sobre una habitación sube por `om()` (ver gotcha v704)
- `#m-template` — Crear/editar plantilla de rutina
- `#m-tpl-picker` — Aplicar plantilla a asesorado
- `#m-notif` — Programar notificaciones locales
- `#m-exref` — Modal de referencia visual del ejercicio
- `#m-backup` — Backup/restore JSON con estadísticas

---
