---
name: avi-run
description: Levanta AVI en un navegador headless y confirma que arranca de verdad. Úsalo cuando el usuario diga "levanta AVI", "corre la app", "run", "confirma que carga", o después de tocar index.html / avi-core.js / sw.js para verificar que no quedó rota.
---

# AVI Run — Smoke test de arranque en navegador

AVI es una PWA estática (un solo `index.html` + `avi-core.js` + `sw.js`). No
hay build ni dev server: "correrla" significa **servirla por HTTP y cargarla en
un navegador real** para ver que arranca, que `avi-core.js` quedó disponible y
que no hay recursos rotos. Esto atrapa errores que los tests de Node NO ven
(p.ej. que `index.html` no cargue el `<script src>`, o un handler roto).

## Cuándo activar este skill

- "Levanta AVI" / "corre la app" / "run"
- "Confirma que carga / que no se rompió"
- Después de editar `index.html`, `avi-core.js`, `sw.js` o `manifest.json`

## Procedimiento

Ejecuta el script versionado. Usa Puppeteer (dependencia en `AVI/node_modules`;
Node la resuelve subiendo de directorio, así que corre desde `apex-app/`):

```bash
node scripts/smoke-run.mjs
```

El script:
1. Sirve `apex-app/` bajo el prefijo `/apex-app/` (para que `manifest.json` e
   `icons/` resuelvan igual que en GitHub Pages — evita 404 falsos).
2. Abre `index.html` en Chromium headless y espera la inicialización.
3. Verifica que las **7 funciones de `avi-core.js`** existan en el `window` y
   devuelvan valores correctos (`getIccLabel(0.90,'M')="Riesgo moderado"`,
   `calcMacrosSugeridos(...)=2520`).
4. Confirma que la app **renderizó** (no pantalla en blanco).
5. Reporta errores de consola y recursos HTTP ≥400 (ignora `favicon.ico`, que
   es una petición automática del navegador).
6. Guarda `scripts/avi-smoke.png` y sale con código **0** (OK) o **1** (falló).

## Cómo interpretar

- **🟢 SMOKE OK (exit 0)** — La app arranca, `avi-core.js` cargó, sin recursos
  rotos. Listo.
- **🔴 SMOKE FALLÓ (exit 1)** — Mira la sección que falló:
  - `[1]` funciones ausentes → `index.html` no está cargando `avi-core.js`
    (revisa el `<script src="avi-core.js">` antes del `<script>` inline).
  - `[2]` no renderizó → error de JS en el arranque; abre `avi-smoke.png`.
  - `[3]` recurso ≥400 → falta un archivo (icono, manifest, etc.).

Siempre **mira el screenshot** (`scripts/avi-smoke.png`) antes de declarar éxito.

## Notas / gotchas

- **No es reemplazo de `avi.test.js`.** Los tests prueban la lógica pura; este
  skill prueba que la app **arranca** en un navegador. Corre ambos.
- **`avi-core.js` se carga como `<script src>`** antes del `<script>` inline.
  Si agregas otro `<script src>`, recuerda que los parsers que extraen el JS
  inline deben buscar `</script>` *después* del `<script>` inline
  (`c.find('</script>', c.find('<script>'))`), no el primero.
- El puerto es `8099`. Si queda ocupado, mata el proceso node previo.
