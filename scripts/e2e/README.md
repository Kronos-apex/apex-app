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

Correr: `node scripts/e2e/<harness>.mjs` (algunos aceptan flags; ver cabecera de cada uno).

## Qué cubre cada uno

| Harness | Cobertura | Sesión |
|---|---|---|
| `_repro-back.mjs` | Botón atrás Android/TWA — capas de overlays (v223) | 2026-06-29 |
| `_repro-back-v243.mjs` | Atrás con ficha técnica/lightbox como capas propias, 17/17 | 2026-06-30 |
| `_repro-glink-v244.mjs` | Retorno de "Conectar mi Google" — toasts éxito/error, 13/13 | 2026-07-02 |
| `_repro-plancha.mjs` | Máquina de estados isométrico/HIIT × clásica/guiado + regresión S1z | 2026-07-03 |
| `_repro-plancha-visual.mjs` | Verificación visual del cronómetro isométrico (banner ámbar) | 2026-07-03 |
| `_test-coach-back.mjs` | Stepping del atrás del COACH (paneles + p-detail), 20/20 | 2026-06-30 |
| `_shot-nutri.mjs` | Habitación de Nutrición llena (estimación y plan del coach) | 2026-06-30 |
| `_shots-rooms.mjs` | Screenshots de las 7 habitaciones (.sroom) | 2026-06-29 |
| `_walk-samuel.mjs` / `_walk-live.mjs` / `_walk-train.mjs` | Recorridos del asesorado (hoy/en vivo/entreno) | 2026-06-25 |
| `_walk-progreso.mjs` / `_walk-advstats.mjs` / `_walk-split.mjs` / `_walk-room.mjs` | Recorridos de progreso/estadísticas/split/habitaciones | 2026-06-28 |
| `qa-julian.mjs` | Audit estático complementario (sin credenciales) | 2026-06-13 |

## Gotchas conocidos (del CLAUDE.md)

- El poll de 15s del cliente PISA rutinas inyectadas → stub `UD.loadOwn=async()=>null`.
- `cnTodayGuard` salta re-renders de Hoy → llamar `renderClientToday(c)` directo tras inyectar.
- Logins repetidos de la cuenta de prueba se rate-limitan → los harnesses usan perfil Chrome temporal.
- Navegar de APP a APP#hash es same-document (no re-parsea `_OAUTH_RET`) → pasar por about:blank.
