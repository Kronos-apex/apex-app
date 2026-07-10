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
| `_guiado-suite.mjs` | Suite del GUIADO post-clásica (S3-S22 portados de `_repro-plancha.mjs`, borrado tras F5 — git history): iso/HIIT, finalizar/reiniciar, ánimo, reorden, lastre, embebido, poll, atrás (minimizar v288 / cancelar hold v245), doble sesión, layout xl, tooltip, calentamiento, blindaje. 53/53 | 2026-07-07 |
| `_repro-plancha-visual.mjs` | Verificación visual del cronómetro isométrico (banner ámbar) | 2026-07-03 |
| `_verify-water.mjs` | Tarjeta Hábitos 💧 agua (v300): contador, piso 0, meta cumplida, meta del plan del coach, re-render. 7/7 | 2026-07-09 |
| `_verify-qwcfg.mjs` | HIIT rápido configurable (v301): preset Máquina, modal prellenado, atrás, clamps, preset sin HIIT directo. 6/6 | 2026-07-09 |
| `_verify-news.mjs` | Novedades ✨ (v302): tarjeta con tope 3, Entendido descarta, no resucita, visto parcial. 4/4 | 2026-07-09 |
| `_verify-f5a.mjs` | F5: guiado único en Hoy, flag retirado, Perfil sin interruptor (login real) | 2026-07-06 |
| `_test-coach-back.mjs` | Stepping del atrás del COACH (paneles + p-detail), 20/20 | 2026-06-30 |
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
- Navegar de APP a APP#hash es same-document (no re-parsea `_OAUTH_RET`) → pasar por about:blank.
