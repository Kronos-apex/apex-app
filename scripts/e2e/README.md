# Harnesses E2E de AVI (CDP + Chrome headless)

Harnesses de regresión y verificación visual que antes vivían sueltos en `Desktop/AVI/`
(solo en la PC de Camilo). Versionados aquí desde 2026-07-06 para que sobrevivan a la máquina.

## Requisitos (asumen la PC actual — Windows)

- Chrome en `C:/Program Files/Google/Chrome/Application/chrome.exe`
- Python en PATH (levantan `python -m http.server` sobre la carpeta del repo)
- Paquete `ws` resoluble (vive en `Desktop/AVI/node_modules` — Node lo encuentra subiendo directorios)
- **Credenciales de la cuenta de prueba** en `%USERPROFILE%\.avi\e2e-creds.json`:
  `{"email":"...","pass":"..."}` (o env vars `AVI_E2E_EMAIL`/`AVI_E2E_PASS`).
  Jamás hardcodearlas: el repo es público.
  - ⚠️ **Usar SIEMPRE la cuenta QA dedicada `qa-harness@apex.com`** (creada 2026-07-08,
    aislada bajo un coach QA que NO aparece en el panel de Camilo) — **NUNCA la cuenta de
    un asesorado real.** Antes se usaba `samuel@apex.com` (real) y un harness le borró las
    rutinas (incidente 2026-07-08). Refuerzo de raíz: el sello `cloudWriteSealed` corta toda
    escritura a la nube en localhost, así que aunque un harness mute datos NO toca producción.
    Detalle de las cuentas QA: `%USERPROFILE%\.avi\qa-accounts.txt`.

Correr: `node scripts/e2e/<harness>.mjs` (algunos aceptan flags; ver cabecera de cada uno).

## Qué cubre cada uno

| Harness | Cobertura | Sesión |
|---|---|---|
| `_repro-back.mjs` | Botón atrás Android/TWA — capas de overlays (v223) | 2026-06-29 |
| `_repro-back-v243.mjs` | Atrás con ficha técnica/lightbox como capas propias, 17/17 | 2026-06-30 |
| `_repro-glink-v244.mjs` | Retorno de "Conectar mi Google" — toasts éxito/error, 13/13 | 2026-07-02 |
| `_guiado-suite.mjs` | Suite del GUIADO post-clásica (S3-S22 portados de `_repro-plancha.mjs`, borrado tras F5 — git history): iso/HIIT, finalizar/reiniciar, ánimo, reorden, lastre, embebido, poll, atrás (minimizar v288 / cancelar hold v245), doble sesión, layout xl, tooltip (SVG v308), calentamiento, blindaje. Setup marca ax_news_seen (el tour v304 salía en medio). 53/53 | 2026-07-10 |
| `_repro-plancha-visual.mjs` | Verificación visual del cronómetro isométrico (banner ámbar) | 2026-07-03 |
| `_verify-water.mjs` | Tarjeta Hábitos 💧 agua (v300): contador, piso 0, meta cumplida, meta del plan del coach, re-render. 7/7 | 2026-07-09 |
| `_verify-qwcfg.mjs` | HIIT rápido configurable (v301): preset Máquina, modal prellenado, atrás, clamps, preset sin HIIT directo. 6/6 | 2026-07-09 |
| `_verify-news.mjs` | Tour guiado de novedades (v304+v305): slides con pasos/dots/SVG, Listo/atrás marcan visto, visto parcial, CTA deep-link, espera bienvenida y reintenta con CSS real, filtro coach:true para libres (v316). 10/10 + screenshots. ⚠️ Expectativas atadas al CONTENIDO de AVI_NEWS — actualizar al podar/agregar entradas | 2026-07-10 |
| `_verify-icons-f2.mjs` | Íconos SVG F2 en Hoy (v306): botón QW, chip de racha, nudge push, 7 tarjetas de biblioteca, banner de descanso. 5/5 + screenshots | 2026-07-10 |
| `_verify-icons-f3.mjs` | Íconos SVG F3 (v307): 24 t-ic estáticos (parte A sin login), Constancia, títulos y héroe del Perfil. 5/5 + screenshots | 2026-07-10 |
| `_shot-f4.mjs` | Shot visual del guiado real (rutina inyectada, tooltip fresco) — el paso que cazó 🔄/✅ en v309. Correr tras CUALQUIER cambio visual del guiado | 2026-07-10 |
| `_shot-f5.mjs` | Shot visual del panel del coach (home + p-detail forzados con la cuenta QA) | 2026-07-10 |
| `_verify-v313.mjs` | Estudio mejoras 1-2 (v313): orden de Hoy por tipo de día + cierre compartible (botón, lienzo 1080×1920, imagen real vía _wfLastCanvas). 5/5 + shots | 2026-07-10 |
| `_verify-v314.mjs` | Estudio mejoras 3+5 (v314): anclas de Progreso (oculta sin sesiones, sticky al ras de la barra — el scroller es .cnbody —, chips por contenido, salto con scroll-margin) + micro-pop al marcar (3 rutas, cascada vs checkDone, reduced-motion). 10/10 + shots | 2026-07-10 |
| `_verify-v315.mjs` | Estudio mejora 4 (v315): Rutinas con foto — .rc-photo del primer ejercicio con foto (46% derecho, máscara, full opacidad), fallback sin foto/Libre, acordeón vivo, chevron con contraste, padding anti-nombres-largos. 6/6 + shots claro/oscuro | 2026-07-10 |
| `_verify-v316.mjs` | Estudio mejora 6 (v316): respuestas rápidas del chat — 4 chips ≥36px, envío por la ruta única _clientSend (DB+burbuja+push espiado), textarea intacto, candado sin coach oculta chips, vacío no envía. 5/5 + shots | 2026-07-10 |
| `_verify-v321.mjs` | Chat del coach de pantalla completa (v321): openCoachChat aterriza en el último msg, notif/bandeja abren el chat (no el perfil), leído sincronizado (C3 EJERCE el sv() REAL — no stub — y espera la subida a SB_KEYS), badge no-leídos por el mapa, atrás cierra el chat al tope, anti-ráfaga _msgNotifSince, scroll respeta posición salvo forceBottom. 9/9 + shots claro/oscuro | 2026-07-11 |
| `_verify-v320.mjs` | Fix notificaciones del ASESORADO (v320, gemelo del coach v318): stub Notification/subscribePush + espía toast, `_pushCtx` window-accesible (var). aviAskPush toast honesto, self-heal ensureClientPush forzado 1×/sesión (reintenta si falla), lazo cerrado (fallo→"Activando…"→cura→"¡Listo!"), estado 'denied' con instrucciones, guard loggedAs. 9/9 | 2026-07-11 |
| `_verify-v319.mjs` | Estudio mejora 8 (v319, CIERRA el estudio 8/8): números tabulares. Verifica que .wf-stat-val (Plus Jakarta) recibe tabular-nums, DOCUMENTA que tabular-nums es inerte en Anton (mismo ancho con/sin → por eso no se aplica a stats del coach), timers siguen JetBrains Mono, y transiciones de pestaña presentes (fadeIn) para ambos roles. 4/4 + shots | 2026-07-11 |
| `_verify-v318.mjs` | Fix push del coach (v318): tarjeta "activa notificaciones" (#h-push-nudge) estados default/denied/granted, self-heal forzado 1×/sesión, toast HONESTO condicionado a éxito, subscribePush(force) devuelve boolean. Patrón preview-SIN-login con stub de Notification/subscribePush + espía de toast. 9/9 + shots claro/oscuro | 2026-07-11 |
| `_verify-v317.mjs` | Estudio mejora 7 (v317): orden inteligente de asesorados en el coach — patrón preview-SIN-login (inyecta asesorados fake + renderClients directo, cero rate-limit). Orden por atención (dolor→vencido→por vencer→inactivo→al día→suspendido al fondo), chips por razón, desempate por nombre, NO muta DB.clients, determinismo entre renders, "aún no estrena" solo veterano con rutinas, suspendido sin chip. 14/14 + shots claro/oscuro | 2026-07-11 |
| `_verify-f5a.mjs` | F5: guiado único en Hoy, flag retirado, Perfil sin interruptor (login real) | 2026-07-06 |
| `_test-coach-back.mjs` | Stepping del atrás del COACH (paneles + p-detail), 20/20. Setup cierra el tour de novedades (se comía el 1er atrás) | 2026-07-10 |
| `_shot-nutri.mjs` | Habitación de Nutrición llena (estimación y plan del coach) | 2026-06-30 |
| `_shots-rooms.mjs` | Screenshots de las 7 habitaciones (.sroom) | 2026-06-29 |
| `_walk-samuel.mjs` / `_walk-live.mjs` / `_walk-train.mjs` | Recorridos del asesorado (hoy/en vivo/entreno) | 2026-06-25 |
| `_walk-progreso.mjs` / `_walk-advstats.mjs` / `_walk-split.mjs` / `_walk-room.mjs` | Recorridos de progreso/estadísticas/split/habitaciones | 2026-06-28 |

> `qa-julian.mjs` se borró el 2026-07-08: era el audit estático pre-modularización (v146),
> escaneaba el `index.html` (que ya casi no tiene JS) y quedó superado por el pre-commit hook
> (11 checks sobre los módulos reales, `scripts/hooks/pre-commit`). El hook es la única fuente
> de verdad del audit estático.

## Gotchas conocidos (del CLAUDE.md)

- El poll de 15s del cliente PISA rutinas inyectadas → stub `UD.loadOwn=async()=>null`.
- `cnTodayGuard` salta re-renders de Hoy → llamar `renderClientToday(c)` directo tras inyectar.
- Logins repetidos de la cuenta de prueba se rate-limitan → los harnesses usan perfil Chrome temporal.
  Afinado 2026-07-10: la ventana aguanta ~3 logins de app seguidos (cada login de la app hace ~2
  requests de token) y **los intentos fallidos REINICIAN la ventana** — reintentar a los 5 min la
  mantiene cerrada; esperar ~10 min limpios sí la abre. Antes de quemar una corrida, sondear con
  un POST directo a `auth/v1/token?grant_type=password` (creds de `~/.avi/e2e-creds.json` + la
  key pública `SB_KEY`): 200 = ventana probablemente limpia, 429 = seguir esperando.
- Navegar de APP a APP#hash es same-document (no re-parsea `_OAUTH_RET`) → pasar por about:blank.
- Los Chrome headless HUÉRFANOS se acumulan entre corridas (chrome.kill() no siempre mata el árbol
  en Windows) y con ~14 vivos el login del harness deja de completar aunque el rate-limit esté
  limpio (2026-07-10: corridas que PARECÍAN rate-limited y no lo eran — el probe daba 200).
  Limpiar antes de diagnosticar: `Get-Process chrome | Where-Object {$_.MainWindowTitle -eq ''} | Stop-Process -Force`.
- El headless NUEVO de Chrome corre con `prefers-reduced-motion: reduce` POR DEFECTO → cualquier
  check de animaciones ve `animation-name:none`. Forzar en el setup:
  `Emulation.setEmulatedMedia {features:[{name:'prefers-reduced-motion',value:'no-preference'}]}`
  (patrón en `_verify-v314.mjs`).
